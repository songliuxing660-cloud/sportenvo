const { test } = require('node:test');
const assert = require('node:assert/strict');
const { capacity, breakEven } = require('../assets/club-planning.js');
const sample = { courts: 4, hours: 3000, fixed: 240000, other: 40000, margin: 25 };
test('booking contribution and ancillary contribution together cover the fixed cost', () => {
  const r = breakEven(sample);
  assert.equal(r.required, 8000);
  assert.equal(r.required * sample.margin + sample.other, sample.fixed);
  assert.equal(r.available, 12000);
  assert.ok(Math.abs(r.occupancy - 66.6666666667) < 1e-6);
});
test('capacity shortfall remains above 100 percent instead of being clamped', () => {
  assert.equal(breakEven({ ...sample, courts: 2 }).occupancy > 100, true);
  assert.equal(capacity({ hours: 3000, demand: 8000 })[0].occupancy > 100, true);
});
test('loss-making ancillary business increases required booking contribution', () => {
  assert.equal(breakEven({ ...sample, other: -10000 }).required, 10000);
});
test('ancillary contribution covering fixed costs needs no negative booking hours', () => {
  assert.equal(breakEven({ ...sample, other: 250000 }).required, 0);
});
test('blank, nonfinite, invalid court count and impossible per-court annual hours are rejected', () => {
  for (const [key, value] of [['hours',''],['fixed',Infinity],['courts',2.5],['courts',0],['hours',9000],['margin',-1]]) {
    assert.throws(() => breakEven({ ...sample, [key]: value }));
  }
});
test('zero margin cannot report a finite break-even threshold', () => {
  assert.throws(() => breakEven({ ...sample, margin: 0 }), /greater than zero/);
});
test('all layouts serve the same entered demand, with capacity proportional to count', () => {
  const rows = capacity({ hours: 3000, demand: 8000 });
  assert.deepEqual(rows.map(r => r.available), [6000,12000,18000,24000]);
  rows.forEach(r => assert.ok(Math.abs(r.available * r.occupancy / 100 - 8000) < 1e-8));
});
test('zero demand is permitted but missing or negative demand is rejected', () => {
  assert.equal(capacity({ hours: 3000, demand: 0 })[0].occupancy, 0);
  assert.throws(() => capacity({ hours: 3000, demand: '' }));
  assert.throws(() => capacity({ hours: 3000, demand: -1 }));
});
