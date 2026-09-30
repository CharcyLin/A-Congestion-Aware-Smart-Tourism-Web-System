"""Checks for forecast-only publication and the required live provenance."""

import json
import unittest
from datetime import date, datetime, timedelta
from urllib.error import HTTPError
from unittest.mock import patch

from collect_derived_forecasts import (PacedLiveSource, SourceRateLimited,
                                       build_snapshot, continuous_tail,
                                       publish_snapshot)
from live_features import LiveSource, MACAU_TZ, minute_number


class FakeLiveSource:
    rate_limited = False

    def __init__(self, records):
        self.records = records

    def data_for(self, region, target):
        return list(self.records), {}


class FakePredictor:
    model_sha256 = "a" * 64

    def __init__(self, records):
        self.live = FakeLiveSource(records)

    def _live_prediction(self, region, target, context):
        return 1000.0, "lstm_live_recursive"


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 9, 30, 12, 10, tzinfo=MACAU_TZ)
        latest = minute_number(datetime(2026, 9, 30, 12, 0))
        self.records = [(latest - (191 - index) * 15, 500.0 + index, 2)
                        for index in range(192)]

    def test_continuous_history_must_be_complete_and_fresh(self):
        now_minute = minute_number(self.now.replace(tzinfo=None))
        self.assertEqual(continuous_tail(self.records, now_minute)["continuous_history_slots"], 192)
        broken = list(self.records)
        broken[30] = (broken[30][0] - 15, broken[30][1], broken[30][2])
        self.assertIsNone(continuous_tail(broken, now_minute))
        stale = [(minute - 120, count, level) for minute, count, level in self.records]
        self.assertIsNone(continuous_tail(stale, now_minute))

    def test_snapshot_contains_only_future_model_outputs_and_metadata(self):
        snapshot = build_snapshot(FakePredictor(self.records), self.now, self.now)
        self.assertEqual(snapshot["timezone"], "Asia/Macau")
        self.assertEqual(len(snapshot["forecasts"]), 17)
        self.assertEqual(snapshot["provenance"]["S14"]["observed_through"],
                         "2026-09-30T12:00")
        first = snapshot["forecasts"]["S14"]["2026-09-30T12:15"]
        self.assertEqual(first, {"predicted_people": 1000,
                                 "source": "lstm_live_recursive"})
        encoded = json.dumps(snapshot)
        self.assertNotIn("500.0", encoded)
        self.assertNotIn("rainfall", encoded)
        self.assertNotIn("totalCount", encoded)

    def test_partial_run_cannot_replace_a_good_snapshot(self):
        snapshot = build_snapshot(FakePredictor(self.records), self.now, self.now)
        snapshot["forecasts"] = {"S14": snapshot["forecasts"]["S14"]}
        with patch("collect_derived_forecasts._github_request") as request:
            with self.assertRaisesRegex(ValueError, "need 12"):
                publish_snapshot(snapshot, "owner/repo", "token", "b" * 40)
            request.assert_not_called()

    def test_collection_crossing_quarter_hour_removes_expired_slots(self):
        finished = self.now + timedelta(minutes=20)
        snapshot = build_snapshot(FakePredictor(self.records), self.now, finished)
        self.assertEqual(snapshot["generated_at"], "2026-09-30T12:30:00+08:00")
        self.assertNotIn("2026-09-30T12:15", snapshot["forecasts"]["S14"])
        self.assertNotIn("2026-09-30T12:30", snapshot["forecasts"]["S14"])
        self.assertIn("2026-09-30T12:45", snapshot["forecasts"]["S14"])

    def test_http_429_stops_subsequent_upstream_requests(self):
        source = PacedLiveSource()
        error = HTTPError("https://example.org", 429, "Too Many Requests", None, None)
        with patch.object(LiveSource, "_get_json", side_effect=error) as upstream:
            with self.assertRaises(SourceRateLimited):
                source._get_json("https://example.org", {})
            with self.assertRaises(SourceRateLimited):
                source._get_json("https://example.org", {})
            self.assertEqual(upstream.call_count, 1)

    def test_midnight_collection_fetches_four_calendar_days(self):
        class MidnightClock(datetime):
            @classmethod
            def now(cls, tz=None):
                return datetime(2026, 10, 1, 0, 25, tzinfo=MACAU_TZ)

        source = PacedLiveSource()

        def readings(region, day):
            self.assertEqual(region, "S14")
            count = (0 if day == date(2026, 10, 1) else
                     94 if day == date(2026, 9, 30) else 96)
            start = minute_number(datetime.combine(day, datetime.min.time()))
            return [(start + index * 15, 500.0, 2) for index in range(count)]

        with patch("collect_derived_forecasts.datetime", MidnightClock), \
             patch.object(source, "_day", side_effect=readings) as get_day, \
             patch.object(source, "_weather", return_value={}):
            rows, _ = source.data_for("S14", minute_number(datetime(2026, 10, 1, 0, 30)))

        self.assertEqual({call.args[1] for call in get_day.call_args_list},
                         {date(2026, 9, 28), date(2026, 9, 29),
                          date(2026, 9, 30), date(2026, 10, 1)})
        self.assertIsNotNone(continuous_tail(rows, minute_number(datetime(2026, 10, 1, 0, 25))))


if __name__ == "__main__":
    unittest.main()
