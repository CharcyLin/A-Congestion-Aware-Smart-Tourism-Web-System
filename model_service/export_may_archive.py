"""Export the May blind-test input features, without targets, for historical demos.

Run after export_lstm_for_service.py has written artifacts/metadata.json.
The May archive is never used to fit model weights or feature scaling.
"""

import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np

from poi_mapping import POI_TO_REGION

ROOT = Path(__file__).resolve().parent
SOURCE = Path("/Users/charcychalamet/IdeaProjects/Data_Cleaning/engineered_data/tourist_flow_15min_may_engineered.csv")


def export(source: Path = SOURCE, output: Path = ROOT / "artifacts" / "may_inputs.npz") -> None:
    metadata = json.loads((output.parent / "metadata.json").read_text(encoding="utf-8"))
    columns = metadata["feature_columns"]
    scale = np.asarray(metadata["feature_scale"], dtype=np.float32)
    offset = np.asarray(metadata["feature_offset"], dtype=np.float32)
    wanted = set(POI_TO_REGION.values())
    timestamps = defaultdict(list)
    features = defaultdict(list)

    with source.open(encoding="utf-8-sig", newline="") as source_file:
        for row in csv.DictReader(source_file):
            region = row["景點編號"]
            if region not in wanted:
                continue
            timestamp = datetime.fromisoformat(row["datetime"])
            raw = [float(row[column]) if row[column] else metadata["feature_fill"][column] for column in columns]
            timestamps[region].append(int((timestamp - datetime(1970, 1, 1)).total_seconds() // 60))
            features[region].append(raw)

    output.parent.mkdir(parents=True, exist_ok=True)
    arrays = {}
    for region in sorted(wanted):
        if region not in features:
            raise ValueError(f"Missing May rows for {region}")
        order = np.argsort(timestamps[region])
        arrays[f"{region}_minutes"] = np.asarray(timestamps[region], dtype=np.int32)[order]
        arrays[f"{region}_features"] = (
            np.asarray(features[region], dtype=np.float32)[order] * scale + offset
        ).astype(np.float32)
    np.savez_compressed(output, **arrays)
    print(json.dumps({"archive_bytes": output.stat().st_size, "regions": len(wanted)}, ensure_ascii=False))


if __name__ == "__main__":
    export()
