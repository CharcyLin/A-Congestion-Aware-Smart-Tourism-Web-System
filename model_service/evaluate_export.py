"""Evaluate exported weights on the untouched full May blind-test window.

This runs locally and streams one scenic region at a time. It is not needed
on Render and should not be used to tune the exported model on May labels.
"""

import csv
import json
import math
from datetime import datetime
from pathlib import Path

import numpy as np

from lstm_runtime import LSTMRuntime

ROOT = Path(__file__).resolve().parent
SOURCE = Path("/Users/charcychalamet/IdeaProjects/Data_Cleaning/engineered_data/tourist_flow_15min_may_engineered.csv")


def evaluate(source: Path = SOURCE, artifacts: Path = ROOT / "artifacts") -> dict:
    metadata = json.loads((artifacts / "metadata.json").read_text(encoding="utf-8"))
    model = LSTMRuntime(artifacts / "lstm_weights.npz")
    columns = metadata["feature_columns"]
    scale = np.asarray(metadata["feature_scale"], dtype=np.float32)
    offset = np.asarray(metadata["feature_offset"], dtype=np.float32)
    sums = {window: {key: 0.0 for key in ("n", "abs_error", "square_error", "abs_y", "sum_y", "sum_y2")}
            for window in ("all_may", "golden_week_only")}

    def finish_region(region: str, rows: list[dict]) -> None:
        if not rows:
            return
        rows.sort(key=lambda row: row["datetime"])
        features = np.asarray([
            [float(row[column]) if row[column] else metadata["feature_fill"][column]
             for column in columns] for row in rows
        ], dtype=np.float32) * scale + offset
        scaler = metadata["spot_scalers"][region]
        lookback = int(metadata["lookback"])
        for start in range(lookback, len(rows), 128):
            end = min(len(rows), start + 128)
            batch = np.stack([features[index - lookback:index] for index in range(start, end)])
            scaled = model.predict_scaled(batch)
            # Match the original ablation's raw inverse transform. The HTTP
            # service clamps negative visitor counts for display separately.
            predicted = (scaled - scaler["offset"]) / scaler["scale"]
            actual = np.asarray([float(rows[index]["總人次"]) for index in range(start, end)])
            for index, (y_true, y_pred) in enumerate(zip(actual, predicted), start):
                day = rows[index]["datetime"][:10]
                windows = ["all_may"]
                if "2026-05-01" <= day <= "2026-05-05":
                    windows.append("golden_week_only")
                for window in windows:
                    stats = sums[window]
                    error = float(y_true - y_pred)
                    stats["n"] += 1
                    stats["abs_error"] += abs(error)
                    stats["square_error"] += error * error
                    stats["abs_y"] += abs(float(y_true))
                    stats["sum_y"] += float(y_true)
                    stats["sum_y2"] += float(y_true) ** 2

    with source.open(encoding="utf-8-sig", newline="") as source_file:
        reader = csv.DictReader(source_file)
        current_region = None
        region_rows = []
        for row in reader:
            region = row["景點編號"]
            if current_region is not None and region != current_region:
                finish_region(current_region, region_rows)
                region_rows = []
            current_region = region
            region_rows.append(row)
        if current_region:
            finish_region(current_region, region_rows)

    result = {}
    for window, stats in sums.items():
        n = stats["n"]
        sst = stats["sum_y2"] - stats["sum_y"] ** 2 / n
        result[window] = {
            "n": int(n),
            "mae": stats["abs_error"] / n,
            "rmse": math.sqrt(stats["square_error"] / n),
            "wape_percent": 100 * stats["abs_error"] / stats["abs_y"],
            "r2": 1 - stats["square_error"] / sst,
        }
    return result


if __name__ == "__main__":
    print(json.dumps(evaluate(), ensure_ascii=False, indent=2))
