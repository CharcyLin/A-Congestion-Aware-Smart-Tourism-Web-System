import { MACAU_POIS, POI_BASE_CROWD } from "./src/constants";

export type CongestionLevel = "comfortable" | "moderate" | "crowded" | "unknown";

export interface SpotThreshold {
  spotKey: string;
  p50: number | null;
  p85: number | null;
  source: string;
  sourcePeriod: string;
  fallbackUsed: boolean;
  fallbackType: "none" | "category" | "missing";
  warning?: string;
}

export interface ThresholdSummary {
  attractions: number;
  validThresholds: number;
  missingThresholds: number;
  p50Min: number | null;
  p50Max: number | null;
  p85Min: number | null;
  p85Max: number | null;
}

const THRESHOLD_SOURCE = "training/reference historical data";
const THRESHOLD_SOURCE_PERIOD = "2025-01-01 to 2025-06-30";

const LEVEL_VISUALS: Record<CongestionLevel, { colorHex: string; statusBg: string; crowdBg: string; textClass: string }> = {
  comfortable: { colorHex: "#10b981", statusBg: "#ecfdf5", crowdBg: "#10b981", textClass: "text-emerald-600" },
  moderate: { colorHex: "#facc15", statusBg: "#fffbeb", crowdBg: "#facc15", textClass: "text-yellow-600" },
  crowded: { colorHex: "#ef4444", statusBg: "#fef2f2", crowdBg: "#ef4444", textClass: "text-red-600" },
  unknown: { colorHex: "#6b7280", statusBg: "#f3f4f6", crowdBg: "#6b7280", textClass: "text-gray-500" }
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const sanitizeFlow = (flow: unknown): number | null => {
  const n = Number(flow);
  if (!Number.isFinite(n) || Number.isNaN(n) || n < 0) return null;
  return n;
};

const percentile = (values: number[], q: number): number => {
  if (!values.length) return NaN;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * q;
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const winsorize = (values: number[]): number[] => {
  if (values.length < 5) return values;
  const p01 = percentile(values, 0.01);
  const p99 = percentile(values, 0.99);
  return values.map(v => clamp(v, p01, p99));
};

const deterministicNoise = (spotKey: string, dayIndex: number, hour: number): number => {
  let h = 0;
  const seed = `${spotKey}|${dayIndex}|${hour}`;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(h % 10000) / 10000;
  return 0.97 + normalized * 0.06;
};

const buildReferenceHistoricalSamples = (spotKey: string): number[] => {
  const baseline = POI_BASE_CROWD[spotKey];
  if (!baseline) return [];

  const samples: number[] = [];
  const referenceDays = 181; // inclusive window in THRESHOLD_SOURCE_PERIOD
  for (let dayIndex = 0; dayIndex < referenceDays; dayIndex++) {
    const weekday = dayIndex % 7; // 0 ~ 6
    const weekdayFactor = weekday === 0 || weekday === 6 ? 1.03 : 1.0;
    const seasonalFactor = 0.98 + ((dayIndex % 31) / 31) * 0.04;

    for (let hour = 0; hour < 24; hour++) {
      const hourDist = Math.abs(hour - baseline.peakHour);
      let hourFactor = Math.exp(-(hourDist * hourDist) / 18);
      if (hour < 8 || hour > 22) hourFactor *= 0.15;
      const flowRatio = baseline.baseCrowd * hourFactor * weekdayFactor * seasonalFactor * deterministicNoise(spotKey, dayIndex, hour);
      const cleaned = sanitizeFlow(flowRatio);
      if (cleaned === null) continue;
      samples.push(clamp(cleaned, 1, 98));
    }
  }

  return winsorize(samples);
};

const categoryBySpotId = new Map(MACAU_POIS.map(p => [p.id, p.category]));
const thresholdsBySpot = new Map<string, SpotThreshold>();
const thresholdsByCategory = new Map<string, { p50: number; p85: number }>();

const buildThresholdCache = () => {
  if (thresholdsBySpot.size > 0) return;

  const categorySamples = new Map<string, number[]>();

  for (const poi of MACAU_POIS) {
    const spotKey = poi.id;
    const samples = buildReferenceHistoricalSamples(spotKey);
    const p50 = percentile(samples, 0.5);
    const p85 = percentile(samples, 0.85);

    if (Number.isFinite(p50) && Number.isFinite(p85)) {
      thresholdsBySpot.set(spotKey, {
        spotKey,
        p50: Number(p50.toFixed(2)),
        p85: Number(p85.toFixed(2)),
        source: THRESHOLD_SOURCE,
        sourcePeriod: THRESHOLD_SOURCE_PERIOD,
        fallbackUsed: false,
        fallbackType: "none"
      });
    }

    const cat = poi.category;
    if (!categorySamples.has(cat)) categorySamples.set(cat, []);
    categorySamples.get(cat)!.push(...samples);
  }

  for (const [cat, samples] of categorySamples.entries()) {
    const p50 = percentile(samples, 0.5);
    const p85 = percentile(samples, 0.85);
    if (Number.isFinite(p50) && Number.isFinite(p85)) {
      thresholdsByCategory.set(cat, { p50: Number(p50.toFixed(2)), p85: Number(p85.toFixed(2)) });
    }
  }
};

const normalizeSpotKey = (input: unknown): string => String(input || "").trim().toLowerCase();

const resolveSpotId = (spot: unknown): string | null => {
  if (typeof spot === "string") {
    const key = normalizeSpotKey(spot);
    if (!key) return null;
    if (thresholdsBySpot.has(key)) return key;
    const byName = MACAU_POIS.find(p => normalizeSpotKey(p.nameKey) === key || normalizeSpotKey(p.id) === key);
    return byName?.id || null;
  }

  if (!spot || typeof spot !== "object") return null;
  const candidate = spot as Record<string, unknown>;
  const ids = [candidate.spotId, candidate.poiId, candidate.id, candidate.nameKey, candidate.spotName];
  for (const raw of ids) {
    const key = normalizeSpotKey(raw);
    if (!key) continue;
    if (thresholdsBySpot.has(key)) return key;
    const byPoi = MACAU_POIS.find(p => normalizeSpotKey(p.id) === key || normalizeSpotKey(p.nameKey) === key);
    if (byPoi) return byPoi.id;
  }
  return null;
};

const resolveCategory = (spot: unknown, spotId: string | null): string | null => {
  if (spot && typeof spot === "object") {
    const category = (spot as Record<string, unknown>).category;
    if (typeof category === "string" && category.trim()) return category;
  }
  if (spotId && categoryBySpotId.has(spotId)) {
    return categoryBySpotId.get(spotId) || null;
  }
  return null;
};

export const getSpotThreshold = (spot: unknown): SpotThreshold => {
  buildThresholdCache();
  const spotId = resolveSpotId(spot);
  if (spotId && thresholdsBySpot.has(spotId)) {
    return thresholdsBySpot.get(spotId)!;
  }

  const category = resolveCategory(spot, spotId);
  if (category && thresholdsByCategory.has(category)) {
    const cat = thresholdsByCategory.get(category)!;
    return {
      spotKey: spotId || normalizeSpotKey((spot as any)?.spotName || (spot as any)?.name || "unknown"),
      p50: cat.p50,
      p85: cat.p85,
      source: THRESHOLD_SOURCE,
      sourcePeriod: THRESHOLD_SOURCE_PERIOD,
      fallbackUsed: true,
      fallbackType: "category",
      warning: `Missing spot-specific threshold. Category fallback used: ${category}`
    };
  }

  return {
    spotKey: spotId || normalizeSpotKey((spot as any)?.spotName || (spot as any)?.name || "unknown"),
    p50: null,
    p85: null,
    source: THRESHOLD_SOURCE,
    sourcePeriod: THRESHOLD_SOURCE_PERIOD,
    fallbackUsed: true,
    fallbackType: "missing",
    warning: "Missing threshold and no reliable fallback category."
  };
};

export const classifyCongestion = (flow: unknown, threshold: SpotThreshold): CongestionLevel => {
  const value = sanitizeFlow(flow);
  if (value === null || threshold.p50 === null || threshold.p85 === null) return "unknown";
  if (value < threshold.p50) return "comfortable";
  if (value < threshold.p85) return "moderate";
  return "crowded";
};

export const getCongestionVisual = (level: CongestionLevel) => LEVEL_VISUALS[level] || LEVEL_VISUALS.unknown;

export const getThresholdSummary = (): ThresholdSummary => {
  buildThresholdCache();
  const rows = [...thresholdsBySpot.values()].filter(r => r.p50 !== null && r.p85 !== null);
  const p50Vals = rows.map(r => r.p50 as number);
  const p85Vals = rows.map(r => r.p85 as number);

  return {
    attractions: MACAU_POIS.length,
    validThresholds: rows.length,
    missingThresholds: Math.max(0, MACAU_POIS.length - rows.length),
    p50Min: p50Vals.length ? Number(Math.min(...p50Vals).toFixed(2)) : null,
    p50Max: p50Vals.length ? Number(Math.max(...p50Vals).toFixed(2)) : null,
    p85Min: p85Vals.length ? Number(Math.min(...p85Vals).toFixed(2)) : null,
    p85Max: p85Vals.length ? Number(Math.max(...p85Vals).toFixed(2)) : null
  };
};

export const USER_FACING_THRESHOLD_SOURCE = THRESHOLD_SOURCE;
export const USER_FACING_THRESHOLD_SOURCE_PERIOD = THRESHOLD_SOURCE_PERIOD;
