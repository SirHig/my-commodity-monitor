import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTS, summarize, buildItem, buildPayload } from './deskbuddy.mjs';

test('INSTRUMENTS has the 7 ids in display order', () => {
  assert.deepEqual(
    INSTRUMENTS.map((i) => i.id),
    ['wti', 'brent', 'aluminum', 'nickel', 'hrc', 'hdpe', 'lldpe']
  );
});

test('aluminum converts USD/MT to USD/lb with 4 decimals', () => {
  const al = INSTRUMENTS.find((i) => i.id === 'aluminum');
  assert.equal(al.divisor, 2204.62);
  assert.equal(al.decimals, 4);
  assert.equal(al.unit, 'USD/lb');
});

test('summarize computes price, change and percent from last two points', () => {
  const s = summarize([70, 71, 72.5], 22, 2);
  assert.equal(s.price, 72.5);
  assert.equal(s.chg, 1.5);
  assert.equal(s.pct, 2.11);
  assert.deepEqual(s.spark, [70, 71, 72.5]);
});

test('summarize keeps only the last sparkLen points and drops non-finite values', () => {
  const s = summarize([1, null, 2, NaN, 3, 4], 3, 2);
  assert.deepEqual(s.spark, [2, 3, 4]);
  assert.equal(s.price, 4);
});

test('summarize throws with fewer than 2 values', () => {
  assert.throws(() => summarize([5], 22, 2), /not enough data/);
  assert.throws(() => summarize([], 22, 2), /not enough data/);
});

test('summarize handles a zero previous value without dividing by zero', () => {
  const s = summarize([0, 5], 22, 2);
  assert.equal(s.pct, 0);
});

test('buildItem returns an OK item', () => {
  const inst = INSTRUMENTS[0];
  const item = buildItem(inst, [70, 71]);
  assert.deepEqual(item, {
    id: 'wti', name: 'WTI', unit: 'USD/bbl',
    price: 71, chg: 1, pct: 1.43, spark: [70, 71],
  });
});

test('buildItem returns an error item when series is null or too short', () => {
  const inst = INSTRUMENTS[0];
  assert.deepEqual(buildItem(inst, null), { id: 'wti', name: 'WTI', unit: 'USD/bbl', error: true });
  assert.deepEqual(buildItem(inst, [1]), { id: 'wti', name: 'WTI', unit: 'USD/bbl', error: true });
});

test('buildPayload wraps items with version and ISO timestamp', () => {
  const p = buildPayload([{ id: 'x' }], new Date(Date.UTC(2026, 8, 26, 14, 15, 0)));
  assert.deepEqual(p, { v: 1, asOf: '2026-09-26T14:15:00.000Z', items: [{ id: 'x' }] });
});

test('a full 7-item payload with 22-point sparks stays under 4 KB', () => {
  const series = Array.from({ length: 22 }, (_, i) => 1234.56 + i);
  const items = INSTRUMENTS.map((inst) => buildItem(inst, series.slice(-inst.sparkLen - 1)));
  const size = Buffer.byteLength(JSON.stringify(buildPayload(items, new Date())));
  assert.ok(size < 4096, `payload is ${size} bytes`);
});
