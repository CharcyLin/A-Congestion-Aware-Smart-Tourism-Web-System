import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { buildSync } from 'esbuild';

const require = createRequire(import.meta.url);
const source = buildSync({
  entryPoints: ['server.ts'], bundle: true, platform: 'node', format: 'cjs',
  packages: 'external', write: false
}).outputFiles[0].text;

function createApi({ model = false } = {}) {
  const handlers = new Map();
  const calls = [];
  const app = {
    use() {}, get() {}, listen() {},
    post(path, handler) { handlers.set(path, handler); }
  };
  const express = Object.assign(() => app, { json() {}, static() {} });
  vm.runInNewContext(source, {
    require: name => name === 'express' ? express : name === 'vite' ? {} : require(name),
    module: { exports: {} }, exports: {},
    process: { env: { NODE_ENV: 'production', LSTM_SERVICE_URL: model ? 'http://model.test' : '' }, cwd: () => process.cwd() },
    console: { info() {}, warn() {}, log() {}, error() {} },
    AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, body: options?.body ? JSON.parse(options.body) : null });
      if (url.includes('directions-matrix')) {
        return { ok: true, json: async () => ({ durations: [[0, 600, 1200], [600, 0, 900], [1200, 900, 0]] }) };
      }
      if (url.includes('/predict')) {
        const { spots } = JSON.parse(options.body);
        return { ok: true, json: async () => ({ predictions: Object.fromEntries(spots.map(spot => [spot.id, {
          predicted_people: spot.id === 'start' ? 0 : Number(spot.visit_time.slice(0, 2)) * 100,
          crowd_ratio: 30
        }])) }) };
      }
      throw new Error(`Unexpected network request: ${url}`);
    }
  });
  return {
    calls,
    async preview(overrides = {}) {
      let status = 200;
      let body;
      await handlers.get('/api/route/optimize')({ body: {
        waypoints: [
          { id: 'start', type: 'start', poiId: 'hotel_lisboa', nameKey: 'hotel_lisboa', lat: 22.1899, lng: 113.5437 },
          { id: 'a', type: 'dest', poiId: 'cunha', nameKey: 'cunha', lat: 22.1534, lng: 113.5566, durationMinutes: 60 },
          { id: 'b', type: 'dest', poiId: 'ruins', nameKey: 'ruins', lat: 22.1976, lng: 113.5408, durationMinutes: 45 }
        ],
        startTime: '10:00', date: '2026-09-27', transportMode: 'walk', previewOnly: true,
        ...overrides
      } }, { status(code) { status = code; return this; }, json(value) { body = value; return this; } });
      // Normalize values from the VM's separate realm for deep comparisons.
      return JSON.parse(JSON.stringify({ status, body }));
    }
  };
}

test('preview preserves draft order and accumulates travel and stay times without fetching geometry', async () => {
  const api = createApi();
  const { status, body } = await api.preview({ keepOrder: false });
  assert.equal(status, 200);
  assert.deepEqual(body.optimizedWaypoints.map(w => w.id), ['start', 'a', 'b']);
  assert.deepEqual(body.optimizedWaypoints.map(w => w.arrivalTime), ['10:00', '10:10', '11:25']);
  assert.equal(body.summary.isReordered, false);
  assert.equal(body.routeGeoJSON, null);
  assert.equal(api.calls.length, 1);
});

test('departure time and previous visit duration change arrival forecasts', async () => {
  const api = createApi();
  const { body: morning } = await api.preview();
  const { body: afternoon } = await api.preview({ startTime: '13:00' });
  assert.equal(afternoon.optimizedWaypoints[1].arrivalTime, '13:10');
  assert.notEqual(afternoon.optimizedWaypoints[1].predictedPeople, morning.optimizedWaypoints[1].predictedPeople);
  const waypoints = morning.optimizedWaypoints.map(w => ({ ...w, durationMinutes: w.id === 'a' ? 120 : w.durationMinutes }));
  const { body: longer } = await api.preview({ waypoints });
  assert.equal(longer.optimizedWaypoints[2].arrivalTime, '12:25');
  assert.notEqual(longer.optimizedWaypoints[2].predictedPeople, morning.optimizedWaypoints[2].predictedPeople);
});

test('reordering recomputes each destination at its new arrival time', async () => {
  const api = createApi();
  const { body: original } = await api.preview();
  const [start, first, second] = original.optimizedWaypoints;
  const { body } = await api.preview({ waypoints: [start, second, first] });
  assert.deepEqual(body.optimizedWaypoints.map(w => w.id), ['start', 'b', 'a']);
  assert.equal(body.optimizedWaypoints[2].arrivalTime, '11:10');
  assert.notEqual(body.optimizedWaypoints[2].predictedPeople, first.predictedPeople);
});

test('external model receives actual arrival times and next-day dates, including the starting point', async () => {
  const api = createApi({ model: true });
  const { body } = await api.preview({ startTime: '23:50' });
  const request = api.calls.find(call => call.url.includes('/predict')).body;
  assert.deepEqual(request.spots.map(s => [s.id, s.visit_time, s.date_str]), [
    ['start', '23:50', '2026-09-27'], ['a', '00:00', '2026-09-28'], ['b', '01:15', '2026-09-28']
  ]);
  assert.equal(body.optimizedWaypoints[0].predictedPeople, 0);
  assert.equal(body.optimizedWaypoints[1].predictedPeople, 0);
  assert.equal(body.optimizedWaypoints[2].predictedPeople, 100);
});

test('starting-point-only drafts are predicted without a travel request', async () => {
  const api = createApi();
  const { status, body } = await api.preview({ waypoints: [{ id: 'start', type: 'start', poiId: 'hotel_lisboa', lat: 22.1899, lng: 113.5437 }] });
  assert.equal(status, 200);
  assert.ok(Number.isFinite(body.optimizedWaypoints[0].predictedPeople));
  assert.equal(api.calls.length, 0);
});

test('invalid departure times do not produce misleading predictions', async () => {
  const api = createApi();
  assert.equal((await api.preview({ startTime: '' })).status, 400);
  assert.equal((await api.preview({ startTime: '25:00' })).status, 400);
  assert.equal(api.calls.length, 0);
});
