"""Add training-only regional visitor quantiles to exported metadata.

Run locally after export_lstm_for_service.py; the large training CSV is not
shipped to Render. The May blind-test labels are never used for thresholds.
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

import numpy as np

from poi_mapping import POI_TO_REGION

ROOT = Path(__file__).resolve().parent
TRAIN = Path("/Users/charcychalamet/IdeaProjects/Data_Cleaning/engineered_data/tourist_flow_15min_train_engineered.csv")


def enrich(source: Path = TRAIN, metadata_path: Path = ROOT / "artifacts" / "metadata.json") -> None:
    values = defaultdict(list)
    wanted = set(POI_TO_REGION.values())
    with source.open(encoding="utf-8-sig", newline="") as source_file:
        for row in csv.DictReader(source_file):
            region = row["景點編號"]
            if region in wanted and row["總人次"]:
                values[region].append(float(row["總人次"]))
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["spot_quantiles"] = {
        region: {"p50_count": float(np.quantile(counts, 0.50)),
                 "p85_count": float(np.quantile(counts, 0.85))}
        for region, counts in values.items()
    }
    if set(metadata["spot_quantiles"]) != wanted:
        raise ValueError("Training counts missing for one or more mapped regions")
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Added training-only visitor quantiles for {len(wanted)} regions")


if __name__ == "__main__":
    enrich()
