"""Build LSTM inputs from recent official 15-minute counts and hourly rain.

Future slots are produced recursively from the last real count. That is a
different evaluation setting from the one-step May blind test and is labeled
separately in API responses.
"""

import json
import math
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

import numpy as np

REGION_INDOOR = {
    "S1": 0, "S5": 0, "S6": 1, "S10": 0, "S11": 1, "S12": 0,
    "S14": 0, "S16": 1, "S38": 0, "S41": 1, "S42": 0, "S45": 0,
    "S48": 0, "S51": 0, "S59": 1, "S72": 1, "S73": 0,
}
CORE_BLOCKS = [
    (date(2026, 2, 16), date(2026, 2, 23)),
    (date(2026, 5, 1), date(2026, 5, 5)),
    (date(2026, 10, 1), date(2026, 10, 7)),
]
MACAU_TZ = ZoneInfo("Asia/Macau")
EPOCH = datetime(1970, 1, 1)


def minute_number(timestamp: datetime) -> int:
    return int((timestamp - EPOCH).total_seconds() // 60)


def timestamp_from_minute(minute: int) -> datetime:
    return EPOCH + timedelta(minutes=minute)


def holiday_stage(day: date) -> tuple[int, int, int]:
    if any(start <= day <= end for start, end in CORE_BLOCKS):
        return (0, 1, 0)
    if any(start - timedelta(days=3) <= day < start for start, _ in CORE_BLOCKS):
        return (1, 0, 0)
    if any(end < day <= end + timedelta(days=3) for _, end in CORE_BLOCKS):
        return (0, 0, 1)
    return (0, 0, 0)


def feature_row(records: list[tuple[int, float, int]], index: int,
                region: str, rain_by_hour: dict[int, float]) -> dict[str, float]:
    if index < 96:
        raise ValueError("Feature row needs 24 hours of preceding counts")
    minute, count, level = records[index]
    ts = timestamp_from_minute(minute)
    hour, day_of_week, month = ts.hour, ts.weekday(), ts.month
    pre, inside, post = holiday_stage(ts.date())
    previous_rain_hour = minute - 60 - (minute - 60) % 60
    if previous_rain_hour not in rain_by_hour:
        raise ValueError("Missing hourly weather")
    last_four = np.asarray([records[index - k][1] for k in (0, 1, 2, 3)], dtype=float)
    last_eight = [records[index - k][1] for k in range(8)]
    return {
        "時間代碼": float(hour * 100),
        "擁擠度(lv)": float(level),
        "hour": float(hour), "minute": float(ts.minute),
        "day_of_week": float(day_of_week), "day_of_month": float(ts.day),
        "month": float(month), "quarter": float((month - 1) // 3 + 1),
        "is_weekend": float(day_of_week >= 5),
        "holiday_stage_pre": float(pre), "holiday_stage_in": float(inside),
        "holiday_stage_post": float(post),
        "hour_sin": math.sin(2 * math.pi * hour / 24),
        "hour_cos": math.cos(2 * math.pi * hour / 24),
        "day_of_week_sin": math.sin(2 * math.pi * day_of_week / 7),
        "day_of_week_cos": math.cos(2 * math.pi * day_of_week / 7),
        "month_sin": math.sin(2 * math.pi * month / 12),
        "month_cos": math.cos(2 * math.pi * month / 12),
        "flow_lag_1": float(records[index - 1][1]),
        "flow_lag_2": float(records[index - 2][1]),
        "flow_lag_4": float(records[index - 4][1]),
        "flow_lag_8": float(records[index - 8][1]),
        "flow_lag_96": float(records[index - 96][1]),
        "rolling_mean_4": float(last_four.mean()),
        "rolling_std_4": float(last_four.std(ddof=1)),
        "rolling_max_4": float(last_four.max()),
        "rolling_mean_8": float(np.mean(last_eight)),
        "is_indoor": float(REGION_INDOOR[region]),
        "rainfall_prev_1h_mm": float(rain_by_hour[previous_rain_hour]),
    }


class LiveSource:
    def __init__(self):
        self.day_cache: dict[tuple[str, str], tuple[float, list[tuple[int, float, int]]]] = {}
        self.weather_cache: tuple[float, dict[int, float]] | None = None

    @staticmethod
    def _get_json(url: str, params: dict) -> dict:
        request = Request(f"{url}?{urlencode(params)}", headers={
            "User-Agent": "Mozilla/5.0 (compatible; MacauTourismRoute/1.0)",
            "Referer": "https://www.macaotourism.gov.mo/en/sightseeing/other-attractions/",
        })
        with urlopen(request, timeout=5) as response:
            return json.load(response)

    def _day(self, region: str, day: date) -> list[tuple[int, float, int]]:
        key = (region, day.isoformat())
        cached = self.day_cache.get(key)
        if cached and time.monotonic() - cached[0] < 900:
            return cached[1]
        payload = self._get_json("https://www.macaotourism.gov.mo/api/scenic/open/scenicHeat", {
            "id": region, "ds": day.strftime("%Y%m%d"), "hourly": "0",
        })
        rows = []
        for entry in payload.get("data", []):
            if entry.get("regionId") != region:
                continue
            for reading in entry.get("conjestions", []):
                # Each reading carries its own date. Never shift a cached
                # observation from another day into the requested day.
                reported_day = str(reading.get("ds", "")).replace("-", "")
                if reported_day != day.strftime("%Y%m%d"):
                    continue
                hhmm = str(reading.get("hhmm", ""))
                if len(hhmm) != 4 or not hhmm.isdigit():
                    continue
                hour, minute = int(hhmm[:2]), int(hhmm[2:])
                count = reading.get("totalCount")
                level = reading.get("lv")
                if hour > 23 or minute not in (0, 15, 30, 45) or count is None or level is None:
                    continue
                try:
                    count, level = float(count), int(level)
                except (TypeError, ValueError):
                    continue
                if math.isfinite(count) and count >= 0 and 0 <= level <= 5:
                    reading_minute = minute_number(datetime.combine(day, datetime.min.time()) +
                                                   timedelta(hours=hour, minutes=minute))
                    if reading_minute <= minute_number(datetime.now(MACAU_TZ).replace(tzinfo=None)):
                        rows.append((reading_minute, count, level))
        rows = sorted({row[0]: row for row in rows}.values())
        self.day_cache[key] = (time.monotonic(), rows)
        return rows

    def _weather(self) -> dict[int, float]:
        cached = self.weather_cache
        if cached and time.monotonic() - cached[0] < 900:
            return cached[1]
        payload = self._get_json("https://api.open-meteo.com/v1/forecast", {
            "latitude": 22.1987, "longitude": 113.5439,
            "hourly": "precipitation", "past_days": 4, "forecast_days": 2,
            "timezone": "Asia/Macau",
        })
        hourly = payload.get("hourly", {})
        rain = {}
        for stamp, value in zip(hourly.get("time", []), hourly.get("precipitation", [])):
            if value is not None:
                rain[minute_number(datetime.fromisoformat(stamp))] = float(value)
        self.weather_cache = (time.monotonic(), rain)
        return rain

    def data_for(self, region: str, target_minute: int) -> tuple[list[tuple[int, float, int]], dict[int, float]]:
        now = datetime.now(MACAU_TZ).replace(tzinfo=None)
        now_minute = minute_number(now)
        if target_minute < now_minute - 1440 or target_minute > now_minute + 480:
            raise ValueError("Live target is outside supported time range")
        today = now.date()
        dates = [today - timedelta(days=offset) for offset in range(3, -1, -1)]
        records = {}
        # The four official daily requests are network-bound. Fetch them in
        # parallel so a cold route preview does not wait for four serial APIs.
        with ThreadPoolExecutor(max_workers=4) as pool:
            daily_rows = list(pool.map(lambda day: self._day(region, day), dates))
        for rows_for_day in daily_rows:
            for row in rows_for_day:
                records[row[0]] = row
        rows = sorted(records.values())
        if len(rows) < 192:
            raise ValueError("Not enough official 15-minute observations")
        return rows, self._weather()
