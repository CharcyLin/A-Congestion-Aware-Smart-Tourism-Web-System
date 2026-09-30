"""Build a short-lived, model-generated forecast snapshot for route previews.

The public output intentionally contains no official count observations or
weather measurements.  The scheduled runner only publishes predictions after
the live source supplies a fresh, continuous 48-hour history for each region.
"""

import base64
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

from live_features import LiveSource, MACAU_TZ, minute_number, timestamp_from_minute
from poi_mapping import POI_TO_REGION
from server import Predictor

SCHEMA_VERSION = 1
BRANCH = "live-data"
FILE_NAME = "forecasts.json"
MIN_PUBLISHABLE_REGIONS = 12
MAX_OBSERVATION_AGE_MINUTES = 90
REQUEST_GAP_SECONDS = 1.5


class SourceRateLimited(OSError):
    """Stop this run after an upstream 429 instead of retrying every region."""


class PacedLiveSource(LiveSource):
    """Fetch four recent official days, spacing requests from a shared runner."""

    def __init__(self):
        super().__init__()
        self._request_lock = threading.Lock()
        self._last_request_at = 0.0
        self.rate_limited = False

    def _get_json(self, url: str, params: dict) -> dict:
        with self._request_lock:
            if self.rate_limited:
                raise SourceRateLimited("an upstream source returned HTTP 429")
            remaining = REQUEST_GAP_SECONDS - (time.monotonic() - self._last_request_at)
            if remaining > 0:
                time.sleep(remaining)
            self._last_request_at = time.monotonic()
            try:
                return super()._get_json(url, params)
            except HTTPError as error:
                if error.code == 429:
                    self.rate_limited = True
                    raise SourceRateLimited("an upstream source returned HTTP 429") from error
                raise

    def data_for(self, region: str, target_minute: int):
        now = datetime.now(MACAU_TZ).replace(tzinfo=None)
        now_minute = minute_number(now)
        if target_minute < now_minute - 1440 or target_minute > now_minute + 480:
            raise ValueError("Live target is outside supported time range")
        dates = [now.date() - timedelta(days=offset) for offset in range(3, -1, -1)]
        # _get_json serializes and spaces the four network calls, even though
        # _day retains the existing thread-safe caching behavior.
        with ThreadPoolExecutor(max_workers=4) as pool:
            daily_rows = list(pool.map(lambda day: self._day(region, day), dates))
        records = {row[0]: row for rows in daily_rows for row in rows}
        rows = sorted(records.values())
        if len(rows) < 192:
            raise ValueError("Not enough official 15-minute observations")
        return rows, self._weather()


def local_slot(minute: int) -> str:
    return timestamp_from_minute(minute).strftime("%Y-%m-%dT%H:%M")


def continuous_tail(records: list[tuple], now_minute: int) -> dict | None:
    """Describe, without copying, the exact observations used by the model."""
    if len(records) < 192:
        return None
    tail = records[-192:]
    minutes = [row[0] for row in tail]
    if any(b - a != 15 for a, b in zip(minutes, minutes[1:])):
        return None
    age = now_minute - minutes[-1]
    if age < 0 or age > MAX_OBSERVATION_AGE_MINUTES:
        return None
    return {
        "observed_through": local_slot(minutes[-1]),
        "continuous_history_start": local_slot(minutes[0]),
        "continuous_history_slots": 192,
    }


def build_snapshot(predictor: Predictor, now: datetime,
                   completed_at: datetime | None = None) -> dict:
    """Predict each region on future quarter-hours, keeping only model output."""
    if now.tzinfo is None:
        raise ValueError("The collection clock must include Asia/Macau timezone")
    local_now = now.astimezone(MACAU_TZ).replace(tzinfo=None)
    now_minute = minute_number(local_now)
    first_target = (now_minute // 15 + 1) * 15
    output = {
        "schema_version": SCHEMA_VERSION,
        "kind": "model_forecast_only",
        "timezone": "Asia/Macau",
        "generated_at": "",
        "model_sha256": predictor.model_sha256,
        "attribution": {
            "crowd_observation_source": "Macao Government Tourism Office Smart Crowd Application",
            "weather_source": "Open-Meteo (CC BY 4.0)",
            "note": "Values are this project's LSTM forecasts, not official measurements or official forecasts.",
        },
        "provenance": {},
        "forecasts": {},
    }
    for region in sorted(set(POI_TO_REGION.values())):
        if getattr(predictor.live, "rate_limited", False):
            break
        try:
            records, rain_by_hour = predictor.live.data_for(region, first_target)
            provenance = continuous_tail(records, now_minute)
            if provenance is None:
                continue
            latest_minute = records[-1][0]
            last_target = min((now_minute + 480) // 15 * 15,
                              latest_minute + 480)
            context = {region: (records, rain_by_hour)}
            region_forecasts = {}
            for target in range(first_target, last_target + 1, 15):
                predicted, source = predictor._live_prediction(region, target, context)
                if source != "lstm_live_recursive":
                    raise ValueError("Unexpected forecast source")
                region_forecasts[local_slot(target)] = {
                    "predicted_people": round(predicted),
                    "source": source,
                }
            if region_forecasts:
                output["provenance"][region] = provenance
                output["forecasts"][region] = region_forecasts
        except SourceRateLimited as error:
            print(f"[forecast-collector] stopped: {error}", file=sys.stderr,
                  flush=True)
            break
        except (ValueError, OSError, KeyError, IndexError, TimeoutError) as error:
            print(f"[forecast-collector] {region}: {type(error).__name__}: {error}",
                  file=sys.stderr, flush=True)
    # Collection can cross a quarter-hour boundary. Record the completion
    # time and discard slots already reached, so every recursive forecast is
    # strictly later than generated_at and all provenance predates it.
    finished = completed_at or datetime.now(MACAU_TZ)
    if finished.tzinfo is None or finished < now:
        raise ValueError("Completion time must be timezone-aware and after collection starts")
    local_finished = finished.astimezone(MACAU_TZ)
    finished_minute = minute_number(local_finished.replace(tzinfo=None))
    output["generated_at"] = local_finished.isoformat(timespec="seconds")
    for region, slots in list(output["forecasts"].items()):
        output["forecasts"][region] = {
            slot: item for slot, item in slots.items()
            if minute_number(datetime.strptime(slot, "%Y-%m-%dT%H:%M")) > finished_minute
        }
        if not output["forecasts"][region]:
            del output["forecasts"][region]
            del output["provenance"][region]
    return output


def _github_request(method: str, path: str, token: str, payload: dict | None = None,
                    allow_missing: bool = False) -> dict | None:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(f"https://api.github.com{path}", data=body, method=method,
                      headers={
                          "Accept": "application/vnd.github+json",
                          "Authorization": f"Bearer {token}",
                          "X-GitHub-Api-Version": "2022-11-28",
                          "Content-Type": "application/json",
                          "User-Agent": "Macao-LSTM-Derived-Forecasts/1.0",
                      })
    try:
        with urlopen(request, timeout=20) as response:
            return json.load(response)
    except HTTPError as error:
        if allow_missing and error.code == 404:
            return None
        raise RuntimeError(f"GitHub API {method} {path} returned HTTP {error.code}") from error


def publish_snapshot(snapshot: dict, repository: str, token: str, base_sha: str) -> None:
    """Write forecasts.json to an isolated public branch, never source data."""
    if not repository or "/" not in repository or not token or not base_sha:
        raise ValueError("GitHub publication configuration is incomplete")
    if len(snapshot["forecasts"]) < MIN_PUBLISHABLE_REGIONS:
        raise ValueError(f"Only {len(snapshot['forecasts'])} regions have valid live forecasts; "
                         f"need {MIN_PUBLISHABLE_REGIONS} to publish")
    repo_path = "/repos/" + "/".join(quote(part, safe="") for part in repository.split("/", 1))
    if _github_request("GET", repo_path, token).get("full_name") != repository:
        raise ValueError("GitHub repository identity does not match the workflow")
    ref = _github_request("GET", f"{repo_path}/git/ref/heads/{BRANCH}", token,
                          allow_missing=True)
    if ref is None:
        _github_request("POST", f"{repo_path}/git/refs", token,
                        {"ref": f"refs/heads/{BRANCH}", "sha": base_sha})
    file_path = f"{repo_path}/contents/{FILE_NAME}"
    prior = _github_request("GET", f"{file_path}?ref={BRANCH}", token,
                            allow_missing=True)
    content = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"),
                         sort_keys=True).encode("utf-8") + b"\n"
    request_body = {
        "message": "Update derived LSTM forecasts",
        "content": base64.b64encode(content).decode("ascii"),
        "branch": BRANCH,
    }
    if prior:
        request_body["sha"] = prior["sha"]
    _github_request("PUT", file_path, token, request_body)


def main() -> int:
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    token = os.environ.get("GITHUB_TOKEN", "")
    base_sha = os.environ.get("GITHUB_SHA", "")
    if os.environ.get("GITHUB_REF") != "refs/heads/main":
        raise RuntimeError("Forecast publication is only allowed from main")
    if not repository or not token or not base_sha:
        raise RuntimeError("This collector must run inside the scheduled GitHub Actions workflow")
    predictor = Predictor()
    predictor.live = PacedLiveSource()
    snapshot = build_snapshot(predictor, datetime.now(MACAU_TZ))
    publish_snapshot(snapshot, repository, token, base_sha)
    print(f"Published forecasts for {len(snapshot['forecasts'])} regions and "
          f"{sum(map(len, snapshot['forecasts'].values()))} future slots")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
