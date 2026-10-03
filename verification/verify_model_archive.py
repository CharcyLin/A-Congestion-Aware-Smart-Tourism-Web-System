"""Audit the saved deployment model without contacting external services."""
import hashlib
import json
import math
import os
import platform
import resource
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "model_service"))
import numpy as np
from poi_mapping import POI_TO_REGION
from server import Predictor


def checksum(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class NoNetwork:
    def data_for(self, *args):
        raise AssertionError("Archived verification must not use network data")


def main():
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "verification/results/archive.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    files = sorted((ROOT / "model_service/artifacts").glob("*"))
    metadata = json.loads((ROOT / "model_service/artifacts/metadata.json").read_text())
    evaluation = json.loads((ROOT / "model_service/artifacts/blind_test_report.json").read_text())
    columns = metadata["feature_columns"]
    assert len(columns) == 29 and columns == metadata["model_feature_columns"]
    for key in ("feature_scale", "feature_offset"):
        assert len(metadata[key]) == len(columns)
        assert np.isfinite(metadata[key]).all()
    assert all(column in metadata["feature_fill"] for column in columns)
    assert metadata["training_protocol"]["may_blind_test_used_for_selection"] is False
    predictor = Predictor()
    predictor.live = NoNetwork()
    predictor.snapshot = None
    assert predictor.model_sha256 == evaluation["weight_sha256"]
    region_checks = {}
    for region in sorted(set(POI_TO_REGION.values())):
        assert region in metadata["spot_scalers"] and region in metadata["spot_quantiles"]
        minutes, features = predictor.history[region]
        assert features.shape == (len(minutes), len(columns))
        assert np.isfinite(features).all() and np.all(np.diff(minutes) == 15)
        assert metadata["spot_scalers"][region]["scale"] > 0
        region_checks[region] = {"rows": len(minutes), "continuous_15_min": True}
    requests = [dict(request_id=f"q{i}", id=f"destination_{i}", poi_id=poi,
                     date_str="2026-05-03", visit_time=slot)
                for i, (poi, slot) in enumerate((poi, slot) for poi in
                    ["ruins", "a_ma_temple", "macau_tower"] for slot in ["10:30", "12:00"])]
    forecasts = predictor.predict(requests)
    assert len(forecasts) == len(requests)
    for item in requests:
        forecast = forecasts[item["request_id"]]
        for key in ("request_id", "id", "poi_id", "date_str", "visit_time"):
            assert forecast[key] == item[key]
        assert forecast["region_id"] == POI_TO_REGION[item["poi_id"]]
        assert forecast["source"] == "lstm_historical_one_step"
        assert math.isfinite(forecast["predicted_people"]) and forecast["predicted_people"] >= 0
    pois = sorted(POI_TO_REGION)
    batch = [dict(request_id=f"batch_{i}", id=f"destination_{i}", poi_id=pois[i % len(pois)],
                  date_str="2026-05-03", visit_time=f"{9+i//4%8:02d}:{i%4*15:02d}")
             for i in range(128)]
    timings = []
    for _ in range(3):
        start = time.perf_counter()
        response = predictor.predict(batch)
        timings.append(time.perf_counter() - start)
        assert len(response) == 128
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    rss_mib = rss / (1024 ** 2) if platform.system() == "Darwin" else rss / 1024
    sources = [ROOT / "model_service" / name for name in
               ["server.py", "lstm_runtime.py", "live_features.py", "forecast_snapshot.py",
                "poi_mapping.py", "requirements.txt", "export_may_archive.py", "enrich_quantiles.py"]]
    training_root = Path("/Users/charcychalamet/IdeaProjects/Data_Cleaning")
    sources += [training_root / name for name in
                ["export_lstm_for_service.py", "model_training_evaluation.py", "golden_week_ablation_test.py"]]
    record = {
        "checked_at_utc": datetime.now(timezone.utc).isoformat(), "status": "passed",
        "website_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "model_sha256": predictor.model_sha256, "model_version": "holiday_weather_" + predictor.model_sha256[:12],
        "artifacts": [{"path": str(p.relative_to(ROOT)), "bytes": p.stat().st_size,
                       "sha256": checksum(p)} for p in files if p.is_file()],
        "source_files": [{"path": str(p), "sha256": checksum(p)} for p in sources],
        "feature_count": len(columns), "lookback": metadata["lookback"],
        "supported_pois": len(POI_TO_REGION), "regions": region_checks,
        "training_protocol": metadata["training_protocol"], "evaluation": evaluation,
        "historical_identity_checks": {"queries": requests, "predictions": forecasts, "passed": 6},
        "local_resource_check": {"platform": platform.platform(), "python": sys.version.split()[0],
                                 "numpy": np.__version__, "batch_size": 128, "repetitions": 3,
                                 "batch_seconds": timings, "peak_process_rss_mib": rss_mib,
                                 "scope": "Local archived inference; not Render memory or live-data latency"}}
    output.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"status": "passed", "model_sha256": predictor.model_sha256,
                      "supported_regions": len(region_checks), "identity_checks_passed": 6,
                      "local_resource_check": record["local_resource_check"], "record": str(output)}, indent=2))


if __name__ == "__main__":
    main()
