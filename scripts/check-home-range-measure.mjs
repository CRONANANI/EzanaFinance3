#!/usr/bin/env node
/**
 * Home comparison chart: the drag-to-measure maths.
 * Run: node --test scripts/check-home-range-measure.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPoints,
  formatSignedPct,
  measureWindow,
  windowReturn,
} from '../src/lib/home/range-measure.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

const SERIES = [
  { key: 'portfolio', label: 'My Portfolio', color: 'green' },
  { key: 'spx', label: 'S&P 500', color: 'grey' },
];

test('a window return is rebased to the window start, not subtracted', () => {
  /* Up 10% then up 21% from the anchor: the window itself gained 10%. */
  close(windowReturn(10, 21), 10);
  /* A naive subtraction would say 11. */
  assert.notEqual(windowReturn(10, 21), 11);
  close(windowReturn(0, 5), 5);
  close(windowReturn(-20, -10), 12.5);
  close(windowReturn(25, 0), -20);
});

test('a window return needs two finite readings and a positive base', () => {
  assert.equal(windowReturn(null, 5), null);
  assert.equal(windowReturn(5, undefined), null);
  assert.equal(windowReturn(Number.NaN, 5), null);
  assert.equal(windowReturn(-100, 5), null);
});

test('each visible line is measured over the same window', () => {
  const rows = [
    { at: 'd0', portfolio: 0, spx: 0 },
    { at: 'd1', portfolio: 10, spx: 5 },
    { at: 'd2', portfolio: 21, spx: 5 },
    { at: 'd3', portfolio: 15.5, spx: 15.5 },
  ];
  const m = measureWindow(rows, 1, 2, SERIES);
  assert.equal(m.from, 'd1');
  assert.equal(m.to, 'd2');
  close(m.series[0].pct, 10);
  close(m.series[1].pct, 0);
  assert.equal(m.series[0].vsLead, null);
  close(m.series[1].vsLead, -10);
  assert.equal(m.lead.key, 'portfolio');
});

test('dragging right to left measures the same window', () => {
  const rows = [
    { at: 'd0', portfolio: 0, spx: 0 },
    { at: 'd1', portfolio: 4, spx: 2 },
    { at: 'd2', portfolio: 9.2, spx: 3.02 },
  ];
  assert.deepEqual(measureWindow(rows, 2, 0, SERIES), measureWindow(rows, 0, 2, SERIES));
});

test('a click without a drag is not a measurement', () => {
  const rows = [
    { at: 'd0', portfolio: 0 },
    { at: 'd1', portfolio: 1 },
  ];
  assert.equal(measureWindow(rows, 1, 1, SERIES), null);
  assert.equal(measureWindow([], 0, 1, SERIES), null);
  assert.equal(measureWindow(rows, 0.5, 1, SERIES), null);
});

test('indices outside the data are clamped', () => {
  const rows = [
    { at: 'd0', portfolio: 0 },
    { at: 'd1', portfolio: 5 },
    { at: 'd2', portfolio: 10 },
  ];
  const m = measureWindow(rows, -3, 99, [SERIES[0]]);
  assert.equal(m.startIndex, 0);
  assert.equal(m.endIndex, 2);
  close(m.series[0].pct, 10);
});

test('a line missing at an edge is measured from its own first and last readings', () => {
  const rows = [
    { at: 'd0', portfolio: 0 },
    { at: 'd1', portfolio: 2, spx: 0 },
    { at: 'd2', portfolio: 4, spx: 10 },
    { at: 'd3', portfolio: 6 },
  ];
  const m = measureWindow(rows, 0, 3, SERIES);
  close(m.series[1].pct, 10);
});

test('a line with fewer than two readings in the window reports nothing', () => {
  const rows = [
    { at: 'd0', portfolio: 0, spx: 0 },
    { at: 'd1', portfolio: 2 },
    { at: 'd2', portfolio: 4 },
  ];
  const m = measureWindow(rows, 0, 2, SERIES);
  assert.equal(m.series[1].pct, null);
  assert.equal(m.series[1].vsLead, null);
  close(m.series[0].pct, 4);
});

test('formatting never invents a number and never prints a negative zero', () => {
  assert.equal(formatSignedPct(4.214), '+4.21%');
  assert.equal(formatSignedPct(-0.3), '-0.30%');
  assert.equal(formatSignedPct(-0.001), '+0.00%');
  assert.equal(formatSignedPct(null), 'n/a');
  assert.equal(formatSignedPct(Number.NaN), 'n/a');
  assert.equal(formatPoints(1.2), '+1.20 pts');
  assert.equal(formatPoints(-2.345), '-2.35 pts');
  assert.equal(formatPoints(null), '');
});
