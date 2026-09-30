"""Small HTTP inference service for the exported Holiday+Weather LSTM.

The archived May inputs support an exact retrospective one-step prediction.
Recent official observations also support live predictions when 48 hours of
continuous history is available; future slots use labeled recursive inference.
Unsupported places and unavailable data are omitted rather than invented.
"""

import json
import os
from hashlib import sha256
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np

from lstm_runtime import LSTMRuntime
from live_features import MACAU_TZ, LiveSource, feature_row, holiday_stage
from poi_mapping import POI_TO_REGION

ROOT = Path(__file__).resolve().parent
ARTIFACTS = ROOT / "artifacts"


def minute_number(date_str: str, time_str: str) -> int:
    timestamp = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    if timestamp.minute % 15:
        raise ValueError("A 15-minute forecast slot is required")
    return int((timestamp - datetime(1970, 1, 1)).total_seconds() // 60)


class Predictor:
    def __init__(self, artifacts: Path = ARTIFACTS):
        self.metadata = json.loads((artifacts / "metadata.json").read_text(encoding="utf-8"))
        weights_path = artifacts / "lstm_weights.npz"
        self.model_sha256 = sha256(weights_path.read_bytes()).hexdigest()
        self.model = LSTMRuntime(weights_path)
        self.live = LiveSource()
        self.feature_scale = np.asarray(self.metadata["feature_scale"], dtype=np.float32)
        self.feature_offset = np.asarray(self.metadata["feature_offset"], dtype=np.float32)
        self.history = {}
        with np.load(artifacts / "may_inputs.npz", allow_pickle=False) as archive:
            for region in set(POI_TO_REGION.values()):
                minutes = archive[f"{region}_minutes"].copy()
                features = archive[f"{region}_features"].copy()
                if len(minutes) != len(features):
                    raise ValueError(f"Broken May archive for {region}")
                self.history[region] = (minutes, features)

    def _scaled_sequence(self, records, target_index, region, rain_by_hour):
        lookback = int(self.metadata["lookback"])
        if target_index < lookback * 2:
            raise ValueError("48 hours of continuous observations are required")
        minutes = [row[0] for row in records[target_index - lookback * 2:target_index]]
        if any(b - a != 15 for a, b in zip(minutes, minutes[1:])):
            raise ValueError("Government observations contain a missing slot")
        rows = [feature_row(records, index, region, rain_by_hour)
                for index in range(target_index - lookback, target_index)]
        columns = self.metadata["feature_columns"]
        raw = np.asarray([[row[column] for column in columns] for row in rows], dtype=np.float32)
        return raw * self.feature_scale + self.feature_offset

    def _unscale(self, scaled: float, region: str) -> float:
        spot_meta = self.metadata["spot_scalers"][region]
        return max(0.0, (float(scaled) - spot_meta["offset"]) / spot_meta["scale"])

    def _live_prediction(self, region: str, target_minute: int, context: dict):
        if region not in context:
            context[region] = self.live.data_for(region, target_minute)
        records, rain_by_hour = context[region]
        predictions = context.setdefault((region, "predictions"), {})
        if target_minute in predictions:
            return predictions[target_minute], "lstm_live_recursive"
        by_minute = {row[0]: index for index, row in enumerate(records)}
        latest_minute = records[-1][0]
        if target_minute <= latest_minute:
            index = by_minute.get(target_minute)
            if index is None:
                raise ValueError("No observation at the requested slot")
            sequence = self._scaled_sequence(records, index, region, rain_by_hour)
            scaled = self.model.predict_scaled(sequence[None, :, :])[0]
            return self._unscale(scaled, region), "lstm_live_one_step"

        if target_minute - latest_minute > 480 or (target_minute - latest_minute) % 15:
            raise ValueError("Unsupported future horizon")
        while records[-1][0] < target_minute:
            next_minute = records[-1][0] + 15
            sequence = self._scaled_sequence(records, len(records), region, rain_by_hour)
            scaled = self.model.predict_scaled(sequence[None, :, :])[0]
            count = self._unscale(scaled, region)
            # The next input row needs a congestion level; use the nearest
            # observed level by count rather than assigning a new label.
            nearest = min(records[-96:], key=lambda row: abs(row[1] - count))
            records.append((next_minute, count, nearest[2]))
            predictions[next_minute] = count
        return predictions[target_minute], "lstm_live_recursive"

    def predict(self, requests: list[dict]) -> dict:
        results = {}
        sequences = []
        accepted = []
        live_requests = []
        lookback = int(self.metadata["lookback"])
        for item in requests[:128]:
            if not isinstance(item, dict):
                continue
            request_id = str(item.get("request_id", ""))
            poi_id = str(item.get("poi_id", ""))
            region = POI_TO_REGION.get(poi_id)
            if not request_id or not region or request_id in results:
                continue
            try:
                target_minute = minute_number(str(item["date_str"]), str(item["visit_time"]))
            except (KeyError, TypeError, ValueError):
                continue
            minutes, features = self.history[region]
            target_index = int(np.searchsorted(minutes, target_minute))
            if target_index >= len(minutes) or minutes[target_index] != target_minute:
                live_requests.append((request_id, item, region, target_minute))
                continue
            if target_index < lookback:
                continue
            window_minutes = minutes[target_index - lookback:target_index]
            if not np.all(np.diff(window_minutes) == 15) or target_minute - window_minutes[-1] != 15:
                continue
            sequences.append(features[target_index - lookback:target_index])
            accepted.append((request_id, item, region))

        scaled_predictions = self.model.predict_scaled(np.stack(sequences)) if accepted else []
        for scaled_prediction, (request_id, item, region) in zip(scaled_predictions, accepted):
            predicted = self._unscale(scaled_prediction, region)
            results[request_id] = self._response(request_id, item, region, predicted,
                                                 "lstm_historical_one_step")

        live_context = {}
        for request_id, item, region, target_minute in sorted(live_requests, key=lambda row: row[3]):
            try:
                predicted, source = self._live_prediction(region, target_minute, live_context)
                results[request_id] = self._response(request_id, item, region, predicted, source)
            except (ValueError, OSError, KeyError, IndexError, TimeoutError):
                # Missing government or weather observations must not be
                # represented as a model forecast.
                continue
        return results

    def _response(self, request_id, item, region, predicted, source):
        spot_meta = self.metadata["spot_scalers"][region]
        quantiles = self.metadata.get("spot_quantiles", {}).get(region)
        # Map training-region count quantiles onto a comparable 0–100 congestion
        # score. The route planner uses this score for crowd penalties; dividing
        # by the training maximum would make even p85 crowds look comfortable.
        train_max = (1.0 - spot_meta["offset"]) / spot_meta["scale"]
        crowd_level = ("comfortable" if predicted < quantiles["p50_count"] else
                       "moderate" if predicted < quantiles["p85_count"] else "crowded") if quantiles else None
        if quantiles:
            p50 = quantiles["p50_count"]
            p85 = quantiles["p85_count"]
            if predicted < p50:
                crowd_score = 50.0 * predicted / p50 if p50 > 0 else 0.0
            elif predicted < p85:
                crowd_score = 50.0 + 35.0 * (predicted - p50) / (p85 - p50)
            else:
                crowd_score = 85.0 + 15.0 * (predicted - p85) / max(1.0, train_max - p85)
        else:
            crowd_score = 100.0 * predicted / train_max
        return {
            "request_id": request_id,
            "id": item.get("id"),
            "poi_id": item.get("poi_id"),
            "date_str": item["date_str"],
            "visit_time": item["visit_time"],
            "predicted_people": round(predicted),
            "crowd_ratio": round(float(np.clip(crowd_score, 0, 100)), 2),
            "crowd_status_key": crowd_level,
            "p50_count": quantiles["p50_count"] if quantiles else None,
            "p85_count": quantiles["p85_count"] if quantiles else None,
            "region_id": region,
            "region_name": spot_meta["name"],
            "source": source,
        }


class Handler(BaseHTTPRequestHandler):
    predictor: Predictor

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json(200, {"status": "ok", "model_loaded": True,
                             "model_sha256": self.predictor.model_sha256,
                             "mode": "May historical and live when official history is available",
                             "supported_pois": len(POI_TO_REGION)})
        elif self.path == "/realtime":
            try:
                now = datetime.now(MACAU_TZ).replace(tzinfo=None)
                current_minute = int((now - datetime(1970, 1, 1)).total_seconds() // 60)
                previous_hour = current_minute - 60 - (current_minute - 60) % 60
                rain = self.predictor.live._weather()[previous_hour]
                pre, inside, post = holiday_stage(now.date())
                stage = "pre" if pre else "in" if inside else "post" if post else "none"
                self._json(200, {"date": now.date().isoformat(),
                                 "rainfall_prev_1h_mm": rain,
                                 "holiday_stage": stage,
                                 "description": "Open-Meteo previous-hour precipitation and forecast holiday calendar"})
            except (ValueError, OSError, KeyError, TimeoutError):
                self._json(503, {"error": "live_weather_unavailable"})
        else:
            self._json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        if self.path not in ("/predict", "/P2323343_LinYuxuan/predict"):
            self._json(404, {"error": "not_found"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 512_000:
                self._json(413, {"error": "invalid_request_size"})
                return
            payload = json.loads(self.rfile.read(size))
            if not isinstance(payload, dict):
                self._json(400, {"error": "invalid_request"})
                return
            spots = payload.get("spots")
            if not isinstance(spots, list) or len(spots) > 128:
                self._json(400, {"error": "invalid_spots"})
                return
            self._json(200, {"predictions": self.predictor.predict(spots)})
        except (ValueError, TypeError, KeyError):
            self._json(400, {"error": "invalid_request"})


if __name__ == "__main__":
    Handler.predictor = Predictor()
    port = int(os.environ.get("PORT", "8000"))
    print(f"LSTM inference ready on {port}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
