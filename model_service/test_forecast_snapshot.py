import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from forecast_snapshot import ForecastSnapshotSource
from live_features import MACAU_TZ, minute_number, timestamp_from_minute

MODEL_SHA = "a" * 64
URL = "https://raw.githubusercontent.com/CharcyLin/A-Congestion-Aware-Smart-Tourism-Web-System/live-data/forecasts.json"


def fixture():
    now = datetime.now(MACAU_TZ)
    now_minute = minute_number(now.replace(tzinfo=None))
    observed = now_minute - now_minute % 15 - 30
    target = now_minute - now_minute % 15 + 15
    observed_at = timestamp_from_minute(observed).strftime("%Y-%m-%dT%H:%M")
    started_at = timestamp_from_minute(observed - 191 * 15).strftime("%Y-%m-%dT%H:%M")
    target_at = timestamp_from_minute(target).strftime("%Y-%m-%dT%H:%M")
    payload = {
        "schema_version": 1,
        "kind": "model_forecast_only",
        "timezone": "Asia/Macau",
        "generated_at": now.isoformat(),
        "model_sha256": MODEL_SHA,
        "provenance": {"S14": {
            "observed_through": observed_at,
            "continuous_history_start": started_at,
            "continuous_history_slots": 192,
        }},
        "forecasts": {"S14": {target_at: {
            "predicted_people": 2919,
            "source": "lstm_live_recursive",
        }}},
    }
    return payload, target


class ForecastSnapshotTests(unittest.TestCase):
    def source(self, payload):
        source = ForecastSnapshotSource(URL, MODEL_SHA)
        source._fetch_json = lambda: payload
        return source

    def test_exact_region_slot_model_and_recent_provenance_are_accepted(self):
        payload, target = fixture()
        result = self.source(payload).lookup("S14", target)
        self.assertEqual(result["predicted_people"], 2919)
        self.assertEqual(result["source"], "lstm_live_recursive")
        self.assertEqual(result["observed_through"], payload["provenance"]["S14"]["observed_through"])

    def test_wrong_region_or_arrival_slot_is_rejected(self):
        payload, target = fixture()
        source = self.source(payload)
        with self.assertRaisesRegex(ValueError, "provenance"):
            source.lookup("S73", target)
        with self.assertRaisesRegex(ValueError, "exact arrival slot"):
            source.lookup("S14", target + 15)

    def test_old_snapshot_or_wrong_checkpoint_is_rejected(self):
        payload, target = fixture()
        payload["generated_at"] = (datetime.now(MACAU_TZ) - timedelta(minutes=46)).isoformat()
        with self.assertRaisesRegex(ValueError, "stale"):
            self.source(payload).lookup("S14", target)
        payload["generated_at"] = datetime.now(MACAU_TZ).isoformat()
        payload["model_sha256"] = "b" * 64
        with self.assertRaisesRegex(ValueError, "different LSTM checkpoint"):
            self.source(payload).lookup("S14", target)

    def test_missing_continuity_or_stale_observation_is_rejected(self):
        payload, target = fixture()
        payload["provenance"]["S14"]["continuous_history_start"] = \
            timestamp_from_minute(target - 191 * 15).strftime("%Y-%m-%dT%H:%M")
        with self.assertRaisesRegex(ValueError, "48-hour"):
            self.source(payload).lookup("S14", target)
        payload, target = fixture()
        old = minute_number(datetime.now(MACAU_TZ).replace(tzinfo=None)) - 120
        old -= old % 15
        payload["provenance"]["S14"]["observed_through"] = \
            timestamp_from_minute(old).strftime("%Y-%m-%dT%H:%M")
        payload["provenance"]["S14"]["continuous_history_start"] = \
            timestamp_from_minute(old - 191 * 15).strftime("%Y-%m-%dT%H:%M")
        with self.assertRaisesRegex(ValueError, "stale"):
            self.source(payload).lookup("S14", target)

    def test_invalid_count_or_mode_is_rejected(self):
        payload, target = fixture()
        slot = timestamp_from_minute(target).strftime("%Y-%m-%dT%H:%M")
        payload["forecasts"]["S14"][slot]["predicted_people"] = float("nan")
        with self.assertRaisesRegex(ValueError, "invalid predicted count"):
            self.source(payload).lookup("S14", target)
        payload["forecasts"]["S14"][slot]["predicted_people"] = 2919
        payload["forecasts"]["S14"][slot]["source"] = "lstm_live_one_step"
        with self.assertRaisesRegex(ValueError, "conflicts"):
            self.source(payload).lookup("S14", target)


if __name__ == "__main__":
    unittest.main()
