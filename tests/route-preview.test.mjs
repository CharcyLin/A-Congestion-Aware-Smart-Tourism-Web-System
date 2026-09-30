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

function createApi({ model = false, modelResponder } = {}) {
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
        return { ok: true, json: async () => modelResponder?.(spots) ?? ({ predictions: Object.fromEntries(spots.map(spot => [spot.request_id, {
          id: spot.id,
          date_str: spot.date_str,
          visit_time: spot.visit_time,
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

test('external model receives the 15-minute slots for actual arrivals and next-day dates', async () => {
  const api = createApi({ model: true });
  const { body } = await api.preview({ startTime: '23:50' });
  const request = api.calls.find(call => call.url.includes('/predict')).body;
  assert.deepEqual(request.spots.map(s => [s.id, s.visit_time, s.date_str]), [
    ['start', '23:45', '2026-09-27'], ['a', '00:00', '2026-09-28'], ['b', '01:15', '2026-09-28']
  ]);
  assert.equal(body.optimizedWaypoints[0].predictedPeople, 0);
  assert.equal(body.optimizedWaypoints[1].predictedPeople, 0);
  assert.equal(body.optimizedWaypoints[2].predictedPeople, 100);
  assert.equal(body.summary.lstmAssisted, true);
});

test('route optimization queries each candidate arrival slot and scores its matching model forecast', async () => {
  const api = createApi({ model: true, modelResponder: spots => ({
    predictions: Object.fromEntries(spots.map(spot => [spot.request_id, {
      id: spot.id, date_str: spot.date_str, visit_time: spot.visit_time,
      predicted_people: spot.id === 'start' ? 0 : spot.id === 'a' ? 300 : 200,
      crowd_ratio: spot.id === 'a'
        ? (spot.visit_time === '10:00' ? 95 : 5)
        : spot.id === 'b' ? (spot.visit_time === '11:15' ? 95 : 5) : 30
    }]))
  }) });
  const { status, body } = await api.preview({ previewOnly: false });
  const requested = api.calls.filter(call => call.url.includes('/predict')).flatMap(call => call.body.spots);
  assert.equal(status, 200);
  assert.deepEqual(requested.filter(s => s.id === 'a').map(s => s.visit_time).sort(), ['10:00', '11:15']);
  assert.deepEqual(requested.filter(s => s.id === 'b').map(s => s.visit_time).sort(), ['10:15', '11:15']);
  assert.deepEqual(body.optimizedWaypoints.map(w => w.id), ['start', 'b', 'a']);
  assert.equal(body.optimizedWaypoints[1].predictedPeople, 200);
  assert.equal(body.optimizedWaypoints[2].predictedPeople, 300);
  assert.equal(body.summary.lstmAssisted, true);
});

test('predictions with a mismatched attraction or time are rejected', async () => {
  const api = createApi({ model: true, modelResponder: spots => ({
    predictions: Object.fromEntries(spots.map(spot => [spot.request_id, {
      id: spot.id === 'start' ? 'wrong-spot' : spot.id,
      date_str: spot.date_str,
      visit_time: spot.id === 'start' ? spot.visit_time : '09:45',
      predicted_people: 9999, crowd_ratio: 99
    }]))
  }) });
  const { body } = await api.preview({ previewOnly: false });
  assert.equal(body.summary.lstmAssisted, false);
  assert.ok(body.optimizedWaypoints.every(w => w.predictedPeople !== 9999));
});

test('real model labels and observed-count thresholds reach the route result', async () => {
  const api = createApi({ model: true, modelResponder: spots => ({
    predictions: Object.fromEntries(spots.map(spot => [spot.request_id, {
      id: spot.id, poi_id: spot.poi_id, date_str: spot.date_str, visit_time: spot.visit_time,
      predicted_people: 700, crowd_ratio: 42,
      source: 'lstm_historical_one_step', region_id: 'S14', region_name: '大三巴片区',
      crowd_status_key: 'crowded', p50_count: 300, p85_count: 600
    }]))
  }) });
  const { body } = await api.preview();
  assert.equal(body.optimizedWaypoints[1].predictionSource, 'lstm_historical_one_step');
  assert.equal(body.optimizedWaypoints[1].predictionRegionId, 'S14');
  assert.equal(body.optimizedWaypoints[1].crowdStatusKey, 'crowded');
  assert.equal(body.optimizedWaypoints[1].thresholdP85, 600);
  assert.equal(body.optimizedWaypoints[1].thresholdSource, 'observed training visitor counts');
});

test('a real model response for the wrong POI is discarded', async () => {
  const api = createApi({ model: true, modelResponder: spots => ({
    predictions: Object.fromEntries(spots.map(spot => [spot.request_id, {
      id: spot.id, poi_id: 'ruins', date_str: spot.date_str, visit_time: spot.visit_time,
      predicted_people: 9999, crowd_ratio: 99, source: 'lstm_live_recursive'
    }]))
  }) });
  const { body } = await api.preview();
  assert.notEqual(body.optimizedWaypoints[1].predictedPeople, 9999);
  assert.equal(body.optimizedWaypoints[1].predictionSource, 'embedded_estimate');
});

test('a response keyed only by attraction cannot stand for several arrival slots', async () => {
  const api = createApi({ model: true, modelResponder: spots => ({
    predictions: Object.fromEntries(spots.map(spot => [spot.id, {
      predicted_people: 9999, crowd_ratio: 99
    }]))
  }) });
  const { body } = await api.preview({ previewOnly: false });
  assert.ok(body.optimizedWaypoints.slice(1).every(w => w.predictedPeople !== 9999));
  assert.equal(body.summary.lstmAssisted, false);
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
