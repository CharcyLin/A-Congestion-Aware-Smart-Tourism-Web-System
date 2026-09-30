import { useEffect, useState } from 'react';

type PreviewState = {
  key: string | null;
  status: 'loading' | 'ready' | 'error';
  waypoints: any[];
};

// Keep forecasts separate from the editable route: receiving a forecast must
// neither reorder the draft nor trigger another prediction request.
export function useRoutePreview(request: Record<string, unknown> | null) {
  const key = request ? JSON.stringify(request) : null;
  const [result, setResult] = useState<PreviewState | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    let active = true;
    let deadline: ReturnType<typeof setTimeout>;
    const timer = setTimeout(async () => {
      setResult({ key, status: 'loading', waypoints: [] });
      // A sleeping free-tier model service can take about a minute to wake.
      // Leave room for its 90-second server deadline plus route calculation.
      deadline = setTimeout(() => controller.abort(), 110000);
      try {
        const response = await fetch('/api/route/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: key,
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Route preview failed: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data.optimizedWaypoints)) throw new Error('Invalid route preview');
        if (active) setResult({ key, status: 'ready', waypoints: data.optimizedWaypoints });
      } catch {
        if (active) setResult({ key, status: 'error', waypoints: [] });
      } finally {
        clearTimeout(deadline);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [key]);

  // Hide old results immediately, even before the debounced request starts.
  return key && result?.key === key
    ? result
    : { key, status: key ? 'loading' as const : 'idle' as const, waypoints: [] };
}
