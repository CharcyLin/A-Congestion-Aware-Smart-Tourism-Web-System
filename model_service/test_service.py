import sys
import unittest
from datetime import date
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from server import Predictor, minute_number
from live_features import feature_row
from live_features import LiveSource


class FakeModel:
    def predict_scaled(self, sequences):
        assert sequences.shape == (1, 96, 29)
        return np.array([0.5], dtype=np.float32)


class NoLiveData:
    def data_for(self, *_args):
        raise ValueError("No live data in this test")


class KnownLiveData:
    def __init__(self, records, rain):
        self.records = records
        self.rain = rain

    def data_for(self, *_args):
        return list(self.records), self.rain


class DerivedSnapshot:
    def lookup(self, region, target_minute):
        assert region == "S14"
        assert target_minute == minute_number("2026-09-30", "12:30")
        return {"predicted_people": 400.0, "source": "lstm_live_recursive",
                "snapshot_generated_at": "2026-09-30T12:00:00+08:00",
                "observed_through": "2026-09-30T11:45"}


class UnavailableSnapshot:
    def lookup(self, *_args):
        raise ValueError("Snapshot is stale")


class PredictorTests(unittest.TestCase):
    def test_regional_crowd_score_tracks_training_quantiles(self):
        predictor = object.__new__(Predictor)
        predictor.metadata = {
            "spot_scalers": {"S14": {"offset": 0.0, "scale": 0.001, "name": "大三巴片区"}},
            "spot_quantiles": {"S14": {"p50_count": 200.0, "p85_count": 500.0}},
        }
        item = {"id": "dest_1", "poi_id": "ruins", "date_str": "2026-05-02", "visit_time": "12:00"}
        at_p50 = predictor._response("q1", item, "S14", 200.0, "lstm_historical_one_step")
        at_p85 = predictor._response("q2", item, "S14", 500.0, "lstm_historical_one_step")
        self.assertEqual((at_p50["crowd_ratio"], at_p50["crowd_status_key"]), (50.0, "moderate"))
        self.assertEqual((at_p85["crowd_ratio"], at_p85["crowd_status_key"]), (85.0, "crowded"))

    def test_official_api_does_not_shift_another_day_into_requested_day(self):
        source = LiveSource()
        source._get_json = lambda *_args: {"data": [
            {"regionId": "S14", "conjestions": [
                {"ds": "20260502", "hhmm": "1200", "totalCount": 900, "lv": 3},
                {"ds": "20260501", "hhmm": "1215", "totalCount": 100, "lv": 1},
            ]},
        ]}
        readings = source._day("S14", date(2026, 5, 1))
        self.assertEqual(len(readings), 1)
        self.assertEqual(readings[0][1:], (100.0, 1))

    def test_historical_slot_uses_exact_previous_window_and_region_identity(self):
        predictor = object.__new__(Predictor)
        predictor.metadata = {
            "lookback": 96,
            "spot_scalers": {"S14": {"offset": 0.0, "scale": 0.001, "name": "大三巴片区"}},
        }
        predictor.model = FakeModel()
        predictor.live = NoLiveData()
        start = minute_number("2026-05-01", "00:00")
        minutes = np.arange(start, start + 97 * 15, 15, dtype=np.int32)
        predictor.history = {"S14": (minutes, np.zeros((97, 29), dtype=np.float32))}
        requests = [
            {"request_id": "q0", "id": "dest_1", "poi_id": "ruins", "date_str": "2026-05-02", "visit_time": "00:00"},
            {"request_id": "q1", "id": "dest_2", "poi_id": "hotel_lisboa", "date_str": "2026-05-02", "visit_time": "00:00"},
            {"request_id": "q2", "id": "dest_3", "poi_id": "ruins", "date_str": "2026-05-02", "visit_time": "00:15"},
        ]
        result = predictor.predict(requests)
        self.assertEqual(list(result), ["q0"])
        self.assertEqual(result["q0"]["id"], "dest_1")
        self.assertEqual(result["q0"]["predicted_people"], 500)
        self.assertEqual(result["q0"]["region_id"], "S14")

    def test_gap_in_history_is_not_accepted(self):
        predictor = object.__new__(Predictor)
        predictor.metadata = {"lookback": 96}
        predictor.model = FakeModel()
        predictor.live = NoLiveData()
        start = minute_number("2026-05-01", "00:00")
        minutes = np.arange(start, start + 97 * 15, 15, dtype=np.int32)
        minutes[50] += 1
        predictor.history = {"S14": (minutes, np.zeros((97, 29), dtype=np.float32))}
        result = predictor.predict([{"request_id": "q0", "id": "dest_1", "poi_id": "ruins",
                                     "date_str": "2026-05-02", "visit_time": "00:00"}])
        self.assertEqual(result, {})

    def test_live_future_is_recursive_and_labeled(self):
        predictor = object.__new__(Predictor)
        start = minute_number("2026-09-28", "12:00")
        records = [(start + index * 15, 400.0, 2) for index in range(192)]
        rain = {minute: 0.0 for minute in range(start - 120, start + 193 * 15, 60)}
        columns = list(feature_row(records, 96, "S14", rain))
        predictor.metadata = {
            "lookback": 96, "feature_columns": columns,
            "spot_scalers": {"S14": {"offset": 0.0, "scale": 0.001, "name": "大三巴片区"}},
        }
        predictor.model = FakeModel()
        predictor.live = KnownLiveData(records, rain)
        predictor.snapshot = UnavailableSnapshot()
        predictor.feature_scale = np.ones(29, dtype=np.float32)
        predictor.feature_offset = np.zeros(29, dtype=np.float32)
        predictor.history = {"S14": (np.array([minute_number("2026-05-01", "00:00")]),
                                      np.zeros((1, 29), dtype=np.float32))}
        result = predictor.predict([{"request_id": "q0", "id": "dest_1", "poi_id": "ruins",
                                     "date_str": "2026-09-30", "visit_time": "12:30"}])
        self.assertEqual(result["q0"]["predicted_people"], 500)
        self.assertEqual(result["q0"]["source"], "lstm_live_recursive")

    def test_derived_snapshot_response_preserves_exact_poi_and_arrival(self):
        predictor = object.__new__(Predictor)
        predictor.metadata = {
            "lookback": 96,
            "spot_scalers": {"S14": {"offset": 0.0, "scale": 0.001, "name": "大三巴片区"}},
        }
        predictor.live = NoLiveData()
        predictor.snapshot = DerivedSnapshot()
        predictor.history = {"S14": (np.array([minute_number("2026-05-01", "00:00")]),
                                      np.zeros((1, 29), dtype=np.float32))}
        result = predictor.predict([{"request_id": "q0", "id": "dest_1", "poi_id": "ruins",
                                     "date_str": "2026-09-30", "visit_time": "12:30"}])
        self.assertEqual(result["q0"]["predicted_people"], 400)
        self.assertEqual(result["q0"]["poi_id"], "ruins")
        self.assertEqual(result["q0"]["visit_time"], "12:30")
        self.assertEqual(result["q0"]["forecast_origin"], "derived_snapshot")


if __name__ == "__main__":
    unittest.main()
