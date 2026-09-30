"""Read optional, derived-only live forecasts from a public GitHub raw file.

The collector verifies the original 15-minute observations before publishing.
This service checks the collector's provenance and exact model/region/slot
identity; it never downloads or republishes the original visitor counts.
"""

import json
import math
import time
from datetime import datetime, timedelta
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from live_features import MACAU_TZ, minute_number, timestamp_from_minute

MAX_SNAPSHOT_AGE = timedelta(minutes=45)
MAX_OBSERVATION_AGE = timedelta(minutes=90)
CONTINUOUS_HISTORY_SLOTS = 192


def _local_minute(value: str) -> int:
    if not isinstance(value, str):
        raise ValueError("Invalid Macau-local timestamp")
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M")
    except ValueError as error:
        raise ValueError("Invalid Macau-local timestamp") from error
    if parsed.minute % 15:
        raise ValueError("Snapshot timestamp is not on a 15-minute slot")
    return minute_number(parsed)


class ForecastSnapshotSource:
    def __init__(self, url: str, expected_model_sha256: str):
        self.url = url.strip()
        self.expected_model_sha256 = expected_model_sha256
        self.cached: tuple[float, dict] | None = None
        self.failed: tuple[float, str] | None = None

    def _fetch_json(self) -> dict:
        parsed = urlparse(self.url)
        if parsed.scheme != "https" or parsed.hostname != "raw.githubusercontent.com":
            raise ValueError("Forecast snapshot must use GitHub raw HTTPS")
        request = Request(self.url, headers={"User-Agent": "MacauTourismRoute/1.0"})
        with urlopen(request, timeout=10) as response:
            body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise ValueError("Forecast snapshot exceeds 2 MB")
        return json.loads(body)

    def _snapshot(self, now: datetime) -> tuple[dict, datetime]:
        cached = self.cached
        if cached and time.monotonic() - cached[0] < 60:
            payload = cached[1]
        else:
            failed = self.failed
            if failed and time.monotonic() - failed[0] < 30:
                raise ValueError(failed[1])
            try:
                payload = self._fetch_json()
            except (OSError, ValueError) as error:
                self.failed = (time.monotonic(), f"Snapshot download failed: {error}")
                raise
            self.cached = (time.monotonic(), payload)
            self.failed = None
        if not isinstance(payload, dict) or payload.get("schema_version") != 1 or \
                payload.get("kind") != "model_forecast_only":
            raise ValueError("Invalid derived-forecast snapshot schema")
        if payload.get("timezone") != "Asia/Macau":
            raise ValueError("Forecast snapshot timezone is not Asia/Macau")
        if payload.get("model_sha256") != self.expected_model_sha256:
            raise ValueError("Forecast snapshot was made with a different LSTM checkpoint")
        try:
            generated_at = datetime.fromisoformat(payload["generated_at"])
        except (KeyError, TypeError, ValueError) as error:
            raise ValueError("Forecast snapshot has no valid generated_at") from error
        if generated_at.tzinfo is None or generated_at.utcoffset() != timedelta(hours=8):
            raise ValueError("Forecast snapshot generated_at must have +08:00 offset")
        age = now - generated_at
        if age < -timedelta(minutes=5) or age > MAX_SNAPSHOT_AGE:
            raise ValueError("Forecast snapshot is stale or future-dated")
        return payload, generated_at

    def lookup(self, region: str, target_minute: int) -> dict:
        """Return a matching forecast, or reject it so direct data can be tried."""
        now = datetime.now(MACAU_TZ)
        now_minute = minute_number(now.replace(tzinfo=None))
        if target_minute < now_minute - 15 or target_minute > now_minute + 480:
            raise ValueError("Requested slot is outside snapshot's live forecast window")
        payload, generated_at = self._snapshot(now)
        provenance = payload.get("provenance", {})
        region_provenance = provenance.get(region) if isinstance(provenance, dict) else None
        if not isinstance(region_provenance, dict):
            raise ValueError("Forecast snapshot lacks this region's provenance")
        observed_through = _local_minute(region_provenance.get("observed_through"))
        history_start = _local_minute(region_provenance.get("continuous_history_start"))
        if region_provenance.get("continuous_history_slots") != CONTINUOUS_HISTORY_SLOTS or \
                observed_through - history_start != (CONTINUOUS_HISTORY_SLOTS - 1) * 15:
            raise ValueError("Forecast snapshot lacks a verified 48-hour input window")
        generated_minute = minute_number(generated_at.astimezone(MACAU_TZ).replace(tzinfo=None))
        if observed_through > generated_minute or observed_through > now_minute or \
                now_minute - observed_through > MAX_OBSERVATION_AGE.total_seconds() / 60:
            raise ValueError("Forecast snapshot's latest official observation is stale")
        forecasts = payload.get("forecasts", {})
        region_forecasts = forecasts.get(region) if isinstance(forecasts, dict) else None
        if not isinstance(region_forecasts, dict):
            raise ValueError("Forecast snapshot has no prediction for this region")
        slot = timestamp_from_minute(target_minute).strftime("%Y-%m-%dT%H:%M")
        result = region_forecasts.get(slot)
        if not isinstance(result, dict):
            raise ValueError("Forecast snapshot has no prediction at the exact arrival slot")
        source = result.get("source")
        if source not in ("lstm_live_one_step", "lstm_live_recursive"):
            raise ValueError("Forecast snapshot contains an unsupported prediction mode")
        if (target_minute <= observed_through) != (source == "lstm_live_one_step"):
            raise ValueError("Forecast mode conflicts with observed-through time")
        if source == "lstm_live_recursive" and target_minute <= generated_minute:
            raise ValueError("Recursive forecast slot is not after snapshot generation")
        try:
            count = float(result["predicted_people"])
        except (KeyError, TypeError, ValueError) as error:
            raise ValueError("Forecast snapshot has an invalid predicted count") from error
        if not math.isfinite(count) or count < 0:
            raise ValueError("Forecast snapshot has an invalid predicted count")
        return {
            "predicted_people": count,
            "source": source,
            "snapshot_generated_at": generated_at.isoformat(),
            "observed_through": region_provenance["observed_through"],
        }
