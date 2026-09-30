import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  classifyCongestion,
  getCongestionVisual,
  getSpotThreshold,
  getThresholdSummary,
  USER_FACING_THRESHOLD_SOURCE,
  USER_FACING_THRESHOLD_SOURCE_PERIOD
} from "./congestionThresholds";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Mapbox Token (prefer environment variable, fallback to user provided token)
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || "pk.eyJ1IjoiY2hhcmN5bGluIiwiYSI6ImNtdWNuOXVwYjBjbncyd29nNzVtNmxpNjkifQ.1-s7bQXe91QYzcKFM-TVtQ";

// Map profile mapper
const getMapboxProfile = (mode: string) => {
  switch (mode) {
    case 'car':
      return 'driving-traffic';
    case 'walk':
      return 'walking';
    case 'bike':
      return 'cycling';
    case 'transit':
    default:
      return 'driving';
  }
};

let currentLstmServiceUrl = (process.env.LSTM_SERVICE_URL || "").trim().replace(/\/+$/, "");
const MODEL_COLD_START_TIMEOUT_MS = 90000;

// Health Check & System Status
app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    hasMapboxToken: Boolean(MAPBOX_TOKEN),
    hasLstmService: Boolean(currentLstmServiceUrl),
    lstmServiceUrl: currentLstmServiceUrl,
    project: "P2323343_LinYuxuan"
  });
});

// Auto-detected Real-Time Government Weather & Holiday API
app.get("/api/realtime/environment", async (_req, res) => {
  try {
    const now = new Date();
    const dateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Macau", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(now);
    const dateValues = Object.fromEntries(dateParts.map(part => [part.type, part.value]));
    const dateStr = `${dateValues.year}-${dateValues.month}-${dateValues.day}`;
    const [year, month, day] = dateStr.split("-").map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 is Sunday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 1. Use the same previous-hour rain and holiday calendar as live LSTM inputs.
    if (currentLstmServiceUrl) {
      try {
        const pyRes = await fetch(`${currentLstmServiceUrl}/realtime`, { signal: AbortSignal.timeout(7000) });
        if (pyRes.ok) {
          const pyData = await pyRes.json();
          const rain = Number(pyData.rainfall_prev_1h_mm);
          if (pyData.rainfall_prev_1h_mm != null && Number.isFinite(rain) && rain >= 0) {
            return res.json({
              source: "python_live_weather_calendar",
              rainfall_prev_1h_mm: rain,
              weather_available: true,
              holiday_stage: pyData.holiday_stage ?? "none",
              is_weekend: isWeekend,
              date: dateStr,
              description: pyData.description || "Live weather and forecast holiday calendar",
              connected_to_python: true
            });
          }
        }
      } catch (err) {
        console.warn("Python realtime endpoint unavailable:", err);
      }
    }

    // 2. Direct Open-Meteo fallback uses the last completed Macao hour,
    // matching the model's rainfall_prev_1h_mm feature.
    let liveRainfall: number | null = null;
    let weatherNote = "Live rainfall unavailable";
    try {
      const hourParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Macau", hour: "2-digit", hourCycle: "h23"
      }).formatToParts(now);
      const hour = Number(hourParts.find(part => part.type === "hour")?.value);
      const previousHourStamp = new Date(Date.UTC(year, month - 1, day, hour - 1))
        .toISOString().slice(0, 13) + ":00";
      const weatherRes = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=22.1987&longitude=113.5439&hourly=precipitation&past_days=4&forecast_days=2&timezone=Asia%2FMacau",
        { signal: AbortSignal.timeout(3000) }
      );
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        const hourIndex = Array.isArray(wData.hourly?.time)
          ? wData.hourly.time.indexOf(previousHourStamp) : -1;
        const reportedRain = hourIndex >= 0 ? wData.hourly?.precipitation?.[hourIndex] : null;
        const parsedRain = Number(reportedRain);
        if (reportedRain != null && Number.isFinite(parsedRain) && parsedRain >= 0) {
          liveRainfall = parsedRain;
          weatherNote = parsedRain > 0 ? `Previous-hour rainfall: ${parsedRain.toFixed(1)}mm` : "No rainfall in previous hour (0.0mm)";
        }
      }
    } catch (e) {
      console.warn("Direct live weather fetch fallback:", e);
    }

    // 3. Calendar fallback uses the same known 2026 core windows and three-day
    // pre/post stages as the model. Other future holidays need a new calendar.
    let holidayStage: 'none' | 'pre' | 'in' | 'post' = 'none';
    const todayMs = Date.UTC(year, month - 1, day);
    for (const [first, last] of [['2026-02-16', '2026-02-23'], ['2026-05-01', '2026-05-05'], ['2026-10-01', '2026-10-07']]) {
      const firstMs = Date.parse(`${first}T00:00:00Z`);
      const lastMs = Date.parse(`${last}T00:00:00Z`);
      if (todayMs >= firstMs && todayMs <= lastMs) holidayStage = 'in';
      else if (todayMs >= firstMs - 3 * 86400000 && todayMs < firstMs) holidayStage = 'pre';
      else if (todayMs > lastMs && todayMs <= lastMs + 3 * 86400000) holidayStage = 'post';
      if (holidayStage !== 'none') break;
    }

    return res.json({
      source: liveRainfall === null ? "weather_unavailable_calendar_fallback" : "open_meteo_calendar_fallback",
      rainfall_prev_1h_mm: liveRainfall,
      weather_available: liveRainfall !== null,
      holiday_stage: holidayStage,
      is_weekend: isWeekend,
      date: dateStr,
      description: `${weatherNote} | ${holidayStage === 'none' ? 'Regular Non-Holiday' : `Holiday Phase: ${holidayStage}`}`,
      connected_to_python: false
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update or test LSTM Service URL dynamically from UI
app.post("/api/config/lstm", async (req, res) => {
  try {
    const { url } = req.body;
    // The public deployment uses only the operator-configured Render URL.
    // Letting anonymous visitors change this would redirect server requests.
    if (url !== undefined && process.env.NODE_ENV !== "production") {
      currentLstmServiceUrl = String(url).trim().replace(/\/+$/, "");
    }
    
    // Test connectivity if URL is set
    let connected = false;
    let details: any = null;
    if (currentLstmServiceUrl) {
      try {
        const testRes = await fetch(`${currentLstmServiceUrl}/health`, {
          method: "GET",
          headers: { "User-Agent": "Macao-Crowd-Agent/1.0" },
          signal: AbortSignal.timeout(MODEL_COLD_START_TIMEOUT_MS)
        });
        const health = testRes.ok ? await testRes.json() : null;
        connected = Boolean(health?.model_loaded === true && health?.status === "ok");
        details = health?.mode || (testRes.ok ? "Model not loaded" : `HTTP ${testRes.status}`);
      } catch (e: any) {
        details = e.message;
      }
    }

    res.json({
      success: true,
      lstmServiceUrl: currentLstmServiceUrl,
      connected,
      details
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Proxy Mapbox Matrix API (Duration & Distance Matrix)
 * Avoids exposing token to browser and handles CORS/rate limiting securely.
 */
app.post("/api/mapbox/matrix", async (req, res) => {
  try {
    const { coordinates, profile = 'driving' } = req.body;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ error: "At least 2 coordinates [lng, lat] are required." });
    }

    const mapboxProfile = getMapboxProfile(profile);
    const coordsString = coordinates.map((c: [number, number]) => `${c[0]},${c[1]}`).join(";");
    const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/${mapboxProfile}/${coordsString}?annotations=duration,distance&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: "Mapbox Matrix API error", details: errText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Matrix API error:", error);
    return res.status(500).json({ error: "Internal server error calculating matrix", message: error.message });
  }
});

/**
 * Proxy Mapbox Directions API (Real Street Network Geometry Polyline)
 */
app.post("/api/mapbox/directions", async (req, res) => {
  try {
    const { coordinates, profile = 'driving' } = req.body;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ error: "At least 2 coordinates [lng, lat] are required." });
    }

    const mapboxProfile = getMapboxProfile(profile);
    const coordsString = coordinates.map((c: [number, number]) => `${c[0]},${c[1]}`).join(";");
    const url = `https://api.mapbox.com/directions/v5/mapbox/${mapboxProfile}/${coordsString}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: "Mapbox Directions API error", details: errText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Directions API error:", error);
    return res.status(500).json({ error: "Internal server error fetching directions", message: error.message });
  }
});

/**
 * Intelligent Route Planning & LSTM Model Integration Endpoint
 * Receives:
 * - waypoints: [{ id, name, lat, lng, durationMinutes }]
 * - startTime: e.g. "10:00"
 * - transportMode: "car" | "transit" | "walk" | "bike"
 * 
 * Works with Mapbox Matrix for real travel times, and hooks into external LSTM model if configured.
 */
app.post("/api/route/optimize", async (req, res) => {
  try {
    const { 
      waypoints, 
      startTime = "10:00", 
      transportMode = "transit",
      rainfall_prev_1h_mm = 0.0,
      date = new Date().toISOString().split("T")[0],
      holidayStage = 'none',
      keepOrder = false,
      previewOnly = false
    } = req.body;
    const routeRainfall = rainfall_prev_1h_mm !== null && rainfall_prev_1h_mm !== '' &&
      Number.isFinite(Number(rainfall_prev_1h_mm)) && Number(rainfall_prev_1h_mm) >= 0
      ? Number(rainfall_prev_1h_mm) : null;

    const minimumStops = previewOnly ? 1 : 2;
    if (!Array.isArray(waypoints) || waypoints.length < minimumStops) {
      return res.status(400).json({ error: `At least ${minimumStops} waypoints are required.` });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      return res.status(400).json({ error: 'A valid departure time is required.' });
    }

    const startNode = waypoints[0];
    const destinations = waypoints.slice(1);

    // Each prediction belongs to one attraction at one forecast time, not just an attraction ID.
    type CrowdPrediction = { predicted_people: number; crowd_ratio: number; region_id?: string; region_name?: string;
      source?: string; crowd_status_key?: "comfortable" | "moderate" | "crowded";
      p50_count?: number; p85_count?: number };
    const lstmPredictions = new Map<string, CrowdPrediction>();
    const forecastSlot = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      return `${String(hours).padStart(2, "0")}:${String(Math.floor(minutes / 15) * 15).padStart(2, "0")}`;
    };
    const predictionKey = (id: unknown, visitDate: string, visitTime: string) =>
      JSON.stringify([String(id), visitDate, forecastSlot(visitTime)]);

    // 2. Fetch real travel times matrix from Mapbox
    const allCoords = waypoints
      .map((w: any) => [Number(w.lng), Number(w.lat)])
      .map((c: [number, number]) => [
        isNaN(c[0]) || c[0] === 0 ? 113.5437 : c[0],
        isNaN(c[1]) || c[1] === 0 ? 22.1899 : c[1]
      ]);
    const mapboxProfile = getMapboxProfile(transportMode);
    const coordsString = allCoords.map((c: [number, number]) => `${c[0]},${c[1]}`).join(";");
    const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/${mapboxProfile}/${coordsString}?annotations=duration,distance&access_token=${MAPBOX_TOKEN}`;

    let durationMatrix: number[][] = [];
    try {
      const matrixRes = waypoints.length > 1
        ? await fetch(matrixUrl, { signal: AbortSignal.timeout(4500) })
        : null;
      if (matrixRes?.ok) {
        const matrixData = await matrixRes.json();
        durationMatrix = matrixData.durations || [];
      }
    } catch (e) {
      console.warn("Mapbox Matrix fetch failed, using distance estimation:", e);
    }

    // Helper: calculate time addition
    const addMinutesToTime = (timeStr: string, minutesToAdd: number) => {
      const [h, m] = timeStr.split(":").map(Number);
      const totalMin = h * 60 + m + Math.round(minutesToAdd);
      const newH = Math.floor(totalMin / 60) % 24;
      const newM = totalMin % 60;
      return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
    };

    const parseHour = (timeStr: string) => {
      const [h, m] = String(timeStr || "10:00").split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return 10;
      return Math.max(0, Math.min(23, h + (m / 60)));
    };

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

    const getHolidayFactor = () => {
      if (holidayStage === 'in') return 1.35;
      if (holidayStage === 'pre') return 1.15;
      if (holidayStage === 'post') return 1.08;
      // Fallback from date pattern if stage not explicitly provided
      const monthDay = String(date).slice(5);
      if (['10-01', '10-02', '10-03', '05-01', '05-02'].includes(monthDay)) return 1.30;
      return 1.0;
    };

    const inferIndoor = (spotKey: string) => {
      const indoorKeys = ['venetian', 'parisian', 'londoner', 'galaxy', 'wynn', 'lisboa', 'studio_city', 'sands', 'hotel', 'resort', 'mall', 'museum', 'port', 'terminal'];
      return indoorKeys.some(k => spotKey.includes(k));
    };

    const thresholdFallbackSpots = new Set<string>();
    const classifySpotCongestion = (spot: any, flowRatio: number) => {
      const threshold = getSpotThreshold({
        spotId: spot.poiId || spot.id || spot.nameKey || spot.name,
        spotName: spot.name || spot.nameKey || spot.id,
        category: spot.category
      });
      const crowdStatusKey = classifyCongestion(flowRatio, threshold);
      const visuals = getCongestionVisual(crowdStatusKey);

      if (threshold.fallbackUsed) {
        thresholdFallbackSpots.add(String(spot.name || spot.nameKey || spot.id || "unknown-spot"));
      }

      return {
        crowdStatusKey,
        crowdBg: visuals.crowdBg,
        color: visuals.textClass,
        thresholdP50: threshold.p50,
        thresholdP85: threshold.p85,
        thresholdSource: threshold.source,
        thresholdSourcePeriod: threshold.sourcePeriod,
        thresholdFallbackUsed: threshold.fallbackUsed,
        thresholdFallbackType: threshold.fallbackType,
        thresholdWarning: threshold.warning
      };
    };

    const estimateCrowdAtArrival = (spot: any, arrivalTime: string, arrivalDate: string) => {
      const arrHour = parseHour(arrivalTime);
      const spotPred = lstmPredictions.get(predictionKey(spot.id, arrivalDate, arrivalTime));

      // If external LSTM is available, prefer it as base signal
      if (spotPred) {
        const predictedPeople = Math.round(spotPred.predicted_people);
        const crowdRatio = spotPred.crowd_ratio;
        const hasCountThresholds = Boolean(spotPred.crowd_status_key &&
          Number.isFinite(spotPred.p50_count) && Number.isFinite(spotPred.p85_count));
        const classified = hasCountThresholds
          ? (() => {
              const visuals = getCongestionVisual(spotPred.crowd_status_key!);
              return { crowdStatusKey: spotPred.crowd_status_key!, crowdBg: visuals.crowdBg,
                color: visuals.textClass, thresholdP50: spotPred.p50_count!,
                thresholdP85: spotPred.p85_count!, thresholdSource: "observed training visitor counts",
                thresholdSourcePeriod: "2025–2026 engineered training windows",
                thresholdFallbackUsed: false, thresholdFallbackType: "none", thresholdWarning: undefined };
            })()
          : classifySpotCongestion(spot, crowdRatio);
        return { predictedPeople, crowdRatio, predictionSource: spotPred.source || "external_lstm",
          predictionRegionId: spotPred.region_id || null, predictionRegionName: spotPred.region_name || null,
          ...classified };
      }

      // Embedded fallback model: hour + holiday + rainfall + spot type
      const spotKey = (spot.nameKey || spot.poiId || spot.name || "").toLowerCase();
      const isIndoor = inferIndoor(spotKey);
      const holidayFactor = getHolidayFactor();

      let baseRatio = 35;
      let capacity = 2600;
      let peakHour = 14.5;
      if (spotKey.includes('venetian') || spotKey.includes('parisian') || spotKey.includes('londoner') || spotKey.includes('studio_city')) {
        baseRatio = 55; capacity = 9500; peakHour = 15.5;
      } else if (spotKey.includes('ruins') || spotKey.includes('senado') || spotKey.includes('cunha')) {
        baseRatio = 52; capacity = 3400; peakHour = 13.5;
      } else if (spotKey.includes('tower') || spotKey.includes('science') || spotKey.includes('museum')) {
        baseRatio = 40; capacity = 2800; peakHour = 14.0;
      } else if (spotKey.includes('beach') || spotKey.includes('hac_sa') || spotKey.includes('coloane')) {
        baseRatio = 28; capacity = 2200; peakHour = 16.0;
      }

      const hourDist = Math.abs(arrHour - peakHour);
      const hourFactor = Math.exp(-(hourDist * hourDist) / 14);
      const dayFactor = arrHour < 8 || arrHour > 22 ? 0.28 : 1.0;

      let rainFactor = 1.0;
      // The embedded estimate uses a dry assumption when weather is unknown;
      // the response still exposes null so callers cannot mistake it for observed 0 mm.
      const rain = routeRainfall ?? 0;
      if (rain > 10) {
        rainFactor = isIndoor ? 1.18 : 0.58;
      } else if (rain > 0) {
        rainFactor = isIndoor ? 1.08 : 0.82;
      }

      const crowdRatio = clamp(
        Math.round(baseRatio * (0.55 + hourFactor * 0.9) * dayFactor * rainFactor * holidayFactor),
        1,
        97
      );
      const predictedPeople = Math.round((crowdRatio / 100) * capacity);
      const classified = classifySpotCongestion(spot, crowdRatio);
      return { predictedPeople, crowdRatio, predictionSource: "embedded_estimate",
        predictionRegionId: null, predictionRegionName: null, ...classified };
    };

    const nodeIndexById = new Map<string, number>();
    waypoints.forEach((w: any, idx: number) => nodeIndexById.set(String(w.id), idx));
    const getNodeIndex = (id: string) => {
      const idx = nodeIndexById.get(String(id));
      if (typeof idx === 'number' && idx >= 0) return idx;
      const found = waypoints.findIndex((w: any) => w.id === id);
      return found >= 0 ? found : 0;
    };

    const getTravelMinutes = (fromIdx: number, toIdx: number) => {
      const sec = durationMatrix?.[fromIdx]?.[toIdx];
      if (Number.isFinite(sec) && Number(sec) > 0) {
        return Math.max(5, Math.round(Number(sec) / 60));
      }
      return 15;
    };

    const [departureHour, departureMinute] = startTime.split(":").map(Number);
    const departureMinutes = departureHour * 60 + departureMinute;
    const baseDateMs = Date.parse(`${date}T00:00:00Z`);
    const dateAtMinutes = (absoluteMinutes: number) =>
      new Date(baseDateMs + Math.floor(absoluteMinutes / 1440) * 86400000).toISOString().slice(0, 10);

    // Full permutation search for up to 8 destinations (UI max = 8).
    const getPermutations = (arr: any[]): any[][] => {
      const result: any[][] = [];
      const used = new Array(arr.length).fill(false);
      const path: any[] = [];

      const dfs = () => {
        if (path.length === arr.length) {
          result.push([...path]);
          return;
        }
        for (let i = 0; i < arr.length; i++) {
          if (used[i]) continue;
          used[i] = true;
          path.push(arr[i]);
          dfs();
          path.pop();
          used[i] = false;
        }
      };

      dfs();
      return result;
    };

    const candidatePerms = (keepOrder || previewOnly)
      ? [destinations]
      : (destinations.length <= 8 ? getPermutations(destinations) : [destinations]);

    type ModelQuery = { request_id: string; id: string; poi_id: string; name: string; visit_time: string; date_str: string };
    const scheduledQueries = new Map<string, ModelQuery>();
    const addScheduledQuery = (spot: any, absoluteMinutes: number) => {
      const visitTime = forecastSlot(addMinutesToTime("00:00", absoluteMinutes));
      const visitDate = dateAtMinutes(absoluteMinutes);
      const key = predictionKey(spot.id, visitDate, visitTime);
      if (!scheduledQueries.has(key)) {
        scheduledQueries.set(key, {
          request_id: `q${scheduledQueries.size}`,
          id: String(spot.id),
          poi_id: String(spot.poiId || ""),
          name: String(spot.name || spot.nameKey || spot.id),
          visit_time: visitTime,
          date_str: visitDate
        });
      }
    };

    if (currentLstmServiceUrl) {
      // An ETA selects its 15-minute forecast slot. Reuse the same model query
      // across candidate orders only when attraction, date and slot all match.
      addScheduledQuery(startNode, departureMinutes);
      for (const sequence of candidatePerms) {
        let elapsed = departureMinutes;
        let previousIndex = 0;
        for (const spot of sequence) {
          const spotIndex = getNodeIndex(spot.id);
          elapsed += getTravelMinutes(previousIndex, spotIndex);
          addScheduledQuery(spot, elapsed);
          elapsed += Math.round(Number(spot.durationMinutes || 60));
          previousIndex = spotIndex;
        }
      }

      const allQueries = [...scheduledQueries.values()];
      const queryCountById = new Map<string, number>();
      for (const query of allQueries) {
        queryCountById.set(query.id, (queryCountById.get(query.id) || 0) + 1);
      }
      const batches: ModelQuery[][] = [];
      for (let index = 0; index < allQueries.length; index += 128) {
        batches.push(allQueries.slice(index, index + 128));
      }

      const requestBatch = async (batch: ModelQuery[]) => {
        const payload = {
          spots: batch,
          rainfall_prev_1h_mm: routeRainfall,
          date
        };
        for (const endpoint of ["/predict"]) {
          try {
            const response = await fetch(`${currentLstmServiceUrl}${endpoint}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "Macao-Crowd-Agent/1.0",
                "bypass-tunnel-reminder": "true"
              },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(MODEL_COLD_START_TIMEOUT_MS)
            });
            if (!response.ok) continue;

            const data = await response.json();
            const predictions = data?.predictions ?? data;
            if (!predictions || typeof predictions !== "object") continue;
            let matched = 0;
            for (const query of batch) {
              const value: any = Array.isArray(predictions)
                ? predictions.find((item: any) => item?.request_id === query.request_id || (
                    item?.request_id === undefined && item?.id === query.id &&
                    item?.date_str === query.date_str && item?.visit_time === query.visit_time
                  ))
                : predictions[query.request_id] ?? (
                    queryCountById.get(query.id) === 1 ? predictions[query.id] : undefined
                  );
              if (!value || typeof value !== "object" ||
                  (value.request_id !== undefined && value.request_id !== query.request_id) ||
                  (value.id !== undefined && String(value.id) !== query.id) ||
                  (value.poi_id !== undefined && String(value.poi_id) !== query.poi_id) ||
                  (String(value.source || "").startsWith("lstm_") && value.poi_id === undefined) ||
                  (value.date_str !== undefined && value.date_str !== query.date_str) ||
                  (value.visit_time !== undefined && value.visit_time !== query.visit_time) ||
                  typeof value.predicted_people !== "number" || !Number.isFinite(value.predicted_people) || value.predicted_people < 0 ||
                  typeof value.crowd_ratio !== "number" || !Number.isFinite(value.crowd_ratio) ||
                  value.crowd_ratio < 0 || value.crowd_ratio > 100) {
                continue;
              }
              lstmPredictions.set(predictionKey(query.id, query.date_str, query.visit_time), {
                predicted_people: value.predicted_people,
                crowd_ratio: value.crowd_ratio,
                region_id: typeof value.region_id === "string" ? value.region_id : undefined,
                region_name: typeof value.region_name === "string" ? value.region_name : undefined,
                source: typeof value.source === "string" ? value.source : undefined,
                crowd_status_key: ["comfortable", "moderate", "crowded"].includes(value.crowd_status_key)
                  ? value.crowd_status_key : undefined,
                p50_count: typeof value.p50_count === "number" ? value.p50_count : undefined,
                p85_count: typeof value.p85_count === "number" ? value.p85_count : undefined
              });
              matched++;
            }
            if (matched > 0) return;
          } catch (error) {
            console.warn("External LSTM prediction request failed:", error);
          }
        }
      };

      // Serial batches reuse the model service's cached official observations.
      // Parallel cold batches would fetch the same four days many times on a
      // free instance and needlessly increase memory and API pressure.
      for (const batch of batches) {
        await requestBatch(batch);
      }
      if (lstmPredictions.size === 0) {
        console.warn("LSTM service returned no matching attraction/time predictions; using embedded estimates.");
      }
    }

    // Route-scoring penalty is intentionally independent from user-facing classification thresholds.
    const computeRoutingPenalty = (travelMinutes: number, crowdRatio: number, stayMinutes: number) => {
      let penalty = 0;
      penalty += travelMinutes * 1.2;
      penalty += crowdRatio * 2.8;
      penalty += stayMinutes * Math.max(0, crowdRatio - 40) * 0.012;
      if (crowdRatio >= 80) {
        penalty += 95;
      } else if (crowdRatio >= 65) {
        penalty += 35;
      }
      return penalty;
    };

    // Score each candidate sequence with comfort-first objective:
    // travel cost + arrival crowd penalty + stay-in-crowd penalty
    let bestSequence = destinations;
    let minScore = Infinity;

    for (const seq of candidatePerms) {
      let score = 0;
      let elapsed = departureMinutes;
      let pIdx = 0; // start node index

      for (const spot of seq) {
        const oIdx = getNodeIndex(spot.id);
        const tMin = getTravelMinutes(pIdx, oIdx);
        const arrivalMinutes = elapsed + tMin;
        const arrTime = addMinutesToTime("00:00", arrivalMinutes);
        const crowd = estimateCrowdAtArrival(spot, arrTime, dateAtMinutes(arrivalMinutes));
        const stayMin = Number(spot.durationMinutes || 60);

        score += computeRoutingPenalty(tMin, crowd.crowdRatio, stayMin);

        elapsed = arrivalMinutes + Math.round(stayMin);
        pIdx = oIdx;
      }

      if (score < minScore) {
        minScore = score;
        bestSequence = seq;
      }
    }

    const reorderedDestinations = bestSequence;
    const thresholdSummary = getThresholdSummary();
    console.info("[route-optimize] threshold metadata", {
      threshold_source: USER_FACING_THRESHOLD_SOURCE,
      threshold_source_period: USER_FACING_THRESHOLD_SOURCE_PERIOD,
      threshold_summary: thresholdSummary
    });

    const optimizedWaypoints: any[] = [];
    let currentTime = startTime;
    let currentMinutes = departureMinutes;
    const unknownVisual = getCongestionVisual("unknown");
    const startHasSpotIdentity = Boolean(startNode?.poiId || startNode?.nameKey || startNode?.name || startNode?.id);
    const startCrowd = startHasSpotIdentity
      ? estimateCrowdAtArrival(startNode, startTime, dateAtMinutes(departureMinutes))
      : {
          crowdStatusKey: 'unknown',
          crowdBg: unknownVisual.crowdBg,
          color: unknownVisual.textClass,
          predictedPeople: null,
          crowdRatio: null,
          predictionSource: "unavailable",
          predictionRegionId: null,
          predictionRegionName: null,
          thresholdP50: null,
          thresholdP85: null,
          thresholdSource: USER_FACING_THRESHOLD_SOURCE,
          thresholdSourcePeriod: USER_FACING_THRESHOLD_SOURCE_PERIOD,
          thresholdFallbackUsed: true,
          thresholdFallbackType: "missing",
          thresholdWarning: "Missing threshold and no reliable fallback category."
        };

    // Start node
    optimizedWaypoints.push({
      ...startNode,
      time: startTime,
      arrivalTime: startTime,
      departureTime: startTime,
      crowdStatusKey: startCrowd.crowdStatusKey,
      crowdBg: startCrowd.crowdBg,
      color: startCrowd.color,
      predictedPeople: startCrowd.predictedPeople,
      crowdRatio: startCrowd.crowdRatio,
      predictionSource: startCrowd.predictionSource || "embedded_estimate",
      predictionRegionId: startCrowd.predictionRegionId || null,
      predictionRegionName: startCrowd.predictionRegionName || null,
      thresholdP50: startCrowd.thresholdP50,
      thresholdP85: startCrowd.thresholdP85,
      thresholdSource: startCrowd.thresholdSource,
      thresholdSourcePeriod: startCrowd.thresholdSourcePeriod,
      thresholdFallbackUsed: startCrowd.thresholdFallbackUsed,
      thresholdFallbackType: startCrowd.thresholdFallbackType,
      thresholdWarning: startCrowd.thresholdWarning
    });

    // Compute chain of travel + visit durations
    let prevIndex = 0;
    for (let i = 0; i < reorderedDestinations.length; i++) {
      const dest = reorderedDestinations[i];
      const origIndex = getNodeIndex(dest.id);
      
      // Travel duration from previous node
      let travelMinutes = getTravelMinutes(prevIndex, origIndex);

      // Arrival time = previous departure + travel time
      const arrivalMinutes = currentMinutes + travelMinutes;
      const arrivalTime = addMinutesToTime("00:00", arrivalMinutes);
      const visitDuration = dest.durationMinutes || 60;
      const departureTime = addMinutesToTime(arrivalTime, visitDuration);
      
      const origDestIndex = destinations.findIndex((d: any) => d.id === dest.id) + 1;
      const currentStopIndex = i + 1;

      const crowd = estimateCrowdAtArrival(dest, arrivalTime, dateAtMinutes(arrivalMinutes));

      optimizedWaypoints.push({
        ...dest,
        time: arrivalTime,
        arrivalTime,
        departureTime,
        durationMinutes: visitDuration,
        travelMinutesFromPrev: travelMinutes,
        stopIndex: currentStopIndex,
        origDestIndex,
        isReordered: origDestIndex !== currentStopIndex,
        crowdStatusKey: crowd.crowdStatusKey,
        crowdBg: crowd.crowdBg,
        color: crowd.color,
        bg: crowd.crowdBg,
        predictedPeople: crowd.predictedPeople,
        crowdRatio: crowd.crowdRatio,
        predictionSource: crowd.predictionSource,
        predictionRegionId: crowd.predictionRegionId,
        predictionRegionName: crowd.predictionRegionName,
        thresholdP50: crowd.thresholdP50,
        thresholdP85: crowd.thresholdP85,
        thresholdSource: crowd.thresholdSource,
        thresholdSourcePeriod: crowd.thresholdSourcePeriod,
        thresholdFallbackUsed: crowd.thresholdFallbackUsed,
        thresholdFallbackType: crowd.thresholdFallbackType,
        thresholdWarning: crowd.thresholdWarning,
        rainfallMm: routeRainfall
      });

      currentTime = departureTime;
      currentMinutes = arrivalMinutes + Math.round(Number(visitDuration));
      prevIndex = origIndex;
    }

    // Also fetch directions polyline for the optimized sequence
    const optCoords = optimizedWaypoints
      .map((w: any) => [Number(w.lng), Number(w.lat)])
      .map((c: [number, number]) => [
        isNaN(c[0]) || c[0] === 0 ? 113.5437 : c[0],
        isNaN(c[1]) || c[1] === 0 ? 22.1899 : c[1]
      ]);
    let routeGeoJSON: any = null;
    if (!previewOnly) {
      try {
        const optCoordsString = optCoords.map((c: [number, number]) => `${c[0]},${c[1]}`).join(";");
        const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/${mapboxProfile}/${optCoordsString}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        const dirRes = await fetch(dirUrl);
        if (dirRes.ok) {
          const dirData = await dirRes.json();
          if (dirData.routes && dirData.routes[0]) {
            routeGeoJSON = dirData.routes[0].geometry;
            if (routeGeoJSON && Array.isArray(routeGeoJSON.coordinates)) {
              routeGeoJSON.coordinates = routeGeoJSON.coordinates.filter(
                (c: any) => Array.isArray(c) && c.length >= 2 && !isNaN(Number(c[0])) && !isNaN(Number(c[1])) && Number(c[0]) !== 0 && Number(c[1]) !== 0
              );
            }
          }
        }
      } catch (e) {
        console.warn("Mapbox Directions geometry fetch failed:", e);
      }
    }

    const isAnyReordered = reorderedDestinations.some((d: any, idx: number) => d.id !== destinations[idx]?.id);

    return res.json({
      optimizedWaypoints,
      routeGeoJSON,
      summary: {
        totalStops: optimizedWaypoints.length,
        estimatedEndTime: currentTime,
        isReordered: isAnyReordered,
        lstmAssisted: optimizedWaypoints.slice(1).some((stop: any) =>
          stop.predictionSource !== "embedded_estimate" && stop.predictionSource !== "unavailable"),
        lstmServiceUrl: currentLstmServiceUrl,
        rainfallMm: routeRainfall,
        weatherInputAvailable: routeRainfall !== null,
        threshold_source: USER_FACING_THRESHOLD_SOURCE,
        threshold_source_period: USER_FACING_THRESHOLD_SOURCE_PERIOD,
        thresholdSummary,
        fallbackThresholdSpots: [...thresholdFallbackSpots],
        project: "P2323343_LinYuxuan"
      }
    });
  } catch (error: any) {
    console.error("Optimize Route error:", error);
    return res.status(500).json({ error: "Failed to optimize route", details: error.message });
  }
});

// Production static file handling or Development Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
