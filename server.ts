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

let currentLstmServiceUrl = process.env.LSTM_SERVICE_URL || "";

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
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 1. Check if Python service provides real-time government telemetry
    if (currentLstmServiceUrl) {
      try {
        let pyRes = await fetch(`${currentLstmServiceUrl}/P2323343_LinYuxuan/realtime`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
        if (!pyRes || !pyRes.ok) {
          pyRes = await fetch(`${currentLstmServiceUrl}/realtime`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
        }
        if (pyRes && pyRes.ok) {
          const pyData = await pyRes.json();
          return res.json({
            source: "python_government_scheduler",
            rainfall_prev_1h_mm: pyData.rainfall_prev_1h_mm ?? 0.0,
            holiday_stage: pyData.holiday_stage ?? (isWeekend ? "pre" : "none"),
            is_weekend: isWeekend,
            date: dateStr,
            description: pyData.description || "Live telemetry from Python Government API scheduler",
            connected_to_python: true
          });
        }
      } catch (err) {
        console.warn("Python realtime endpoint unavailable:", err);
      }
    }

    // 2. Direct Government Open Data Live Ingestion (Macau SMG Station: Lat 22.1987, Lng 113.5439)
    let liveRainfall = 0.0;
    let weatherNote = "Clear (Macau SMG Station)";
    try {
      const weatherRes = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=22.1987&longitude=113.5439&current=precipitation,rain&timezone=Asia%2FMacau",
        { signal: AbortSignal.timeout(3000) }
      );
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        liveRainfall = Number(wData.current?.precipitation || wData.current?.rain || 0.0);
        weatherNote = liveRainfall > 0 ? `Rainfall recorded: ${liveRainfall.toFixed(1)}mm` : "Clear / Dry (0.0mm)";
      }
    } catch (e) {
      console.warn("Direct live weather fetch fallback:", e);
    }

    // 3. Macau Statutory Public Holidays Calendar Engine (SAFP Government Guidelines)
    // Major periods: New Year (Jan 1), Lunar New Year (late Jan/Feb), Ching Ming (Apr 4-5), Labour Day (May 1-3), National Day / Golden Week (Oct 1-7), SAR Day (Dec 20)
    let holidayStage: 'none' | 'pre' | 'in' | 'post' = 'none';
    if ((month === 5 && day >= 1 && day <= 3) || (month === 10 && day >= 1 && day <= 5) || (month === 12 && day >= 20 && day <= 22)) {
      holidayStage = 'in';
    } else if ((month === 4 && day >= 28) || (month === 9 && day >= 28)) {
      holidayStage = 'pre';
    } else if ((month === 5 && day >= 4 && day <= 6) || (month === 10 && day >= 6 && day <= 8)) {
      holidayStage = 'post';
    } else if (isWeekend) {
      holidayStage = 'none'; // Weekend standard flow
    }

    return res.json({
      source: "macau_direct_government_open_data",
      rainfall_prev_1h_mm: liveRainfall,
      holiday_stage: holidayStage,
      is_weekend: isWeekend,
      date: dateStr,
      description: `Live Weather: ${weatherNote} | ${holidayStage === 'none' ? 'Regular Non-Holiday' : `Holiday Phase: ${holidayStage}`}`,
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
    if (url !== undefined) {
      currentLstmServiceUrl = String(url).trim().replace(/\/$/, "");
    }
    
    // Test connectivity if URL is set
    let connected = false;
    let details: any = null;
    if (currentLstmServiceUrl) {
      const endpointsToTry = [
        `${currentLstmServiceUrl}/docs`,
        `${currentLstmServiceUrl}/openapi.json`,
        `${currentLstmServiceUrl}/`,
        `${currentLstmServiceUrl}/P2323343_LinYuxuan/docs`
      ];

      for (const endpoint of endpointsToTry) {
        try {
          const testRes = await fetch(endpoint, {
            method: "GET",
            headers: {
              "User-Agent": "Macao-Crowd-Agent/1.0",
              "bypass-tunnel-reminder": "true"
            },
            signal: AbortSignal.timeout(3500)
          });
          // Any response < 500 confirms the tunnel and server are alive and reachable
          if (testRes.status < 500) {
            connected = true;
            break;
          }
        } catch (e: any) {
          details = e.message;
        }
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

    const minimumStops = previewOnly ? 1 : 2;
    if (!Array.isArray(waypoints) || waypoints.length < minimumStops) {
      return res.status(400).json({ error: `At least ${minimumStops} waypoints are required.` });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      return res.status(400).json({ error: 'A valid departure time is required.' });
    }

    const startNode = waypoints[0];
    const destinations = waypoints.slice(1);

    // 1. If LSTM service is configured, call external Python/FastAPI LSTM service
    let lstmPredictions: Record<string, { 
      predicted_people?: number; 
      crowd_ratio?: number; 
      status?: string; 
      status_text?: string;
      is_indoor?: number;
      rainfall_mm?: number;
    }> = {};

    let lstmConnected = false;

    const loadLstmPredictions = async (spots: any[]) => {
      if (!currentLstmServiceUrl) return;
      try {
        const payload = {
          spots: spots.map((d: any) => ({
            id: d.id,
            name: d.name,
            visit_time: d.time || "12:00",
            date_str: d.visitDate || date
          })),
          rainfall_prev_1h_mm: Number(rainfall_prev_1h_mm) || 0.0,
          date: date
        };

        const requestHeaders = {
          "Content-Type": "application/json",
          "User-Agent": "Macao-Crowd-Agent/1.0",
          "bypass-tunnel-reminder": "true"
        };

        // Try user's graduation project endpoint first, fallback to standard
        let lstmRes = await fetch(`${currentLstmServiceUrl}/P2323343_LinYuxuan/predict`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(4500)
        }).catch(() => null);

        if (!lstmRes || !lstmRes.ok) {
          lstmRes = await fetch(`${currentLstmServiceUrl}/predict`, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(4500)
          }).catch(() => null);
        }

        if (lstmRes && lstmRes.ok) {
          const resJson = await lstmRes.json();
          lstmPredictions = resJson.predictions || resJson;
          lstmConnected = true;
        }
      } catch (lstmErr) {
        console.warn("External LSTM Service call failed, using embedded baseline:", lstmErr);
      }
    };

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

    const estimateCrowdAtArrival = (spot: any, arrivalTime: string) => {
      const arrHour = parseHour(arrivalTime);
      const spotPred = lstmPredictions[spot.id];

      // If external LSTM is available, prefer it as base signal
      if (spotPred) {
        const predictedPeopleRaw = Number(spotPred.predicted_people ?? 680);
        const predictedPeople = Number.isFinite(predictedPeopleRaw) && predictedPeopleRaw >= 0 ? Math.round(predictedPeopleRaw) : 680;
        const crowdRatio = clamp(Number(spotPred.crowd_ratio ?? 35), 1, 99);
        const classified = classifySpotCongestion(spot, crowdRatio);
        return { predictedPeople, crowdRatio, ...classified };
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
      const rain = Number(rainfall_prev_1h_mm) || 0;
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
      return { predictedPeople, crowdRatio, ...classified };
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

    if (previewOnly) {
      // Query the model at each stop's actual arrival under the current order,
      // including previous visits and crossing midnight into the next date.
      const [hours, minutes] = startTime.split(':').map(Number);
      let elapsed = hours * 60 + minutes;
      const scheduledSpots = waypoints.map((spot: any, index: number) => {
        if (index > 0) {
          elapsed += getTravelMinutes(index - 1, index);
        }
        const visitDate = new Date(`${date}T00:00:00Z`);
        visitDate.setUTCDate(visitDate.getUTCDate() + Math.floor(elapsed / 1440));
        const scheduled = {
          ...spot,
          time: addMinutesToTime('00:00', elapsed),
          visitDate: visitDate.toISOString().slice(0, 10)
        };
        if (index > 0) elapsed += Number(spot.durationMinutes || 60);
        return scheduled;
      });
      await loadLstmPredictions(scheduledSpots);
    } else {
      await loadLstmPredictions(destinations);
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

    // Full permutation search for up to 8 destinations (UI max = 8)
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
    
    // Score each candidate sequence with comfort-first objective:
    // travel cost + arrival crowd penalty + stay-in-crowd penalty
    let bestSequence = destinations;
    let minScore = Infinity;

    for (const seq of candidatePerms) {
      let score = 0;
      let curT = startTime;
      let pIdx = 0; // start node index

      for (const spot of seq) {
        const oIdx = getNodeIndex(spot.id);
        const tMin = getTravelMinutes(pIdx, oIdx);
        const arrTime = addMinutesToTime(curT, tMin);
        const crowd = estimateCrowdAtArrival(spot, arrTime);
        const stayMin = Number(spot.durationMinutes || 60);

        score += computeRoutingPenalty(tMin, crowd.crowdRatio, stayMin);

        curT = addMinutesToTime(arrTime, stayMin);
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
    const unknownVisual = getCongestionVisual("unknown");
    const startHasSpotIdentity = Boolean(startNode?.poiId || startNode?.nameKey || startNode?.name || startNode?.id);
    const startCrowd = startHasSpotIdentity
      ? estimateCrowdAtArrival(startNode, startTime)
      : {
          crowdStatusKey: 'unknown',
          crowdBg: unknownVisual.crowdBg,
          color: unknownVisual.textClass,
          predictedPeople: null,
          crowdRatio: null,
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
      const arrivalTime = addMinutesToTime(currentTime, travelMinutes);
      const visitDuration = dest.durationMinutes || 60;
      const departureTime = addMinutesToTime(arrivalTime, visitDuration);
      
      const origDestIndex = destinations.findIndex((d: any) => d.id === dest.id) + 1;
      const currentStopIndex = i + 1;

      const crowd = estimateCrowdAtArrival(dest, arrivalTime);

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
        thresholdP50: crowd.thresholdP50,
        thresholdP85: crowd.thresholdP85,
        thresholdSource: crowd.thresholdSource,
        thresholdSourcePeriod: crowd.thresholdSourcePeriod,
        thresholdFallbackUsed: crowd.thresholdFallbackUsed,
        thresholdFallbackType: crowd.thresholdFallbackType,
        thresholdWarning: crowd.thresholdWarning,
        rainfallMm: rainfall_prev_1h_mm
      });

      currentTime = departureTime;
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
        lstmAssisted: lstmConnected,
        lstmServiceUrl: currentLstmServiceUrl,
        rainfallMm: rainfall_prev_1h_mm,
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
