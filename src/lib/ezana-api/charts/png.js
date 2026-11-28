/**
 * Chart model -> PNG (server only), via next/og (satori + resvg, bundled with
 * Next, default font included). Laid out with flexbox divs; the line plot is
 * an inline SVG path. Same model and colours as svg.js.
 */
import { createElement as h } from 'react';
import { ImageResponse } from 'next/og';
import { THEMES, formatValue } from './models';
import { cellFill } from './svg';

const W = 960;
const box = (style, ...children) => h('div', { style: { display: 'flex', ...style } }, ...children);
const maxAbs = (xs) => xs.reduce((m, v) => (v == null ? m : Math.max(m, Math.abs(v))), 0);

function heatmap(model, t) {
  const max = maxAbs(model.values.flat());
  const head = box(
    { flexDirection: 'row', marginLeft: 72 },
    ...model.cols.map((c) =>
      box({ flex: 1, justifyContent: 'center', color: t.muted, fontSize: 13 }, c),
    ),
  );
  const rows = model.rows.map((r, i) =>
    box(
      { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
      box(
        {
          width: 72,
          justifyContent: 'flex-end',
          paddingRight: 10,
          fontSize: 14,
          fontWeight: 700,
          color: model.rowHighlight === i ? t.accent : t.text,
        },
        r,
      ),
      ...model.values[i].map((v) => {
        const { fill, opacity } = cellFill(v, max, t, model.diverging);
        return box(
          {
            flex: 1,
            height: 30,
            marginLeft: 4,
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
          },
          box({
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: fill,
            opacity,
            borderRadius: 4,
          }),
          box({ color: t.text, fontSize: 13 }, formatValue(v, model.unit)),
        );
      }),
    ),
  );
  return {
    height: 110 + 30 + model.rows.length * 34 + 36 + (model.note ? 20 : 0),
    body: box({ flexDirection: 'column' }, head, ...rows),
  };
}

function hbars(model, t) {
  const max = maxAbs(model.values) || 1;
  const half = model.diverging;
  const rows = model.categories.map((c, i) => {
    const v = model.values[i];
    const pct = v == null ? 0 : (Math.abs(v) / max) * (half ? 50 : 100);
    const bar = box({
      width: `${pct}%`,
      height: 16,
      background: v >= 0 ? t.positive : t.negative,
      borderRadius: 3,
    });
    const label = box(
      { color: t.muted, fontSize: 12, marginLeft: 6, marginRight: 6 },
      formatValue(v, model.unit),
    );
    const track = half
      ? box(
          { flex: 1, flexDirection: 'row' },
          box(
            { width: '50%', justifyContent: 'flex-end', alignItems: 'center' },
            ...(v < 0 ? [label, bar] : []),
          ),
          box(
            { width: '50%', alignItems: 'center', borderLeft: `1px solid ${t.grid}` },
            ...(v >= 0 ? [bar, label] : []),
          ),
        )
      : box({ flex: 1, alignItems: 'center' }, bar, label);
    return box(
      { flexDirection: 'row', alignItems: 'center', height: 24 },
      box(
        { width: 72, justifyContent: 'flex-end', paddingRight: 10, fontSize: 13, color: t.text },
        c ?? '–',
      ),
      track,
    );
  });
  return {
    height: 110 + model.categories.length * 24 + 48,
    body: box({ flexDirection: 'column' }, ...rows),
  };
}

function vbars(model, t) {
  const plotH = 260;
  const vals = model.values.map((v) => v ?? 0);
  const maxPos = Math.max(0, ...vals);
  const maxNeg = Math.max(0, ...vals.map((v) => -v));
  const span = maxPos + maxNeg || 1;
  const cols = model.categories.map((c, i) => {
    const v = model.values[i];
    const hPos = v != null && v > 0 ? (v / span) * plotH : 0;
    const hNeg = v != null && v < 0 ? (-v / span) * plotH : 0;
    const fill = v >= 0 ? t.positive : t.negative;
    return box(
      { flex: 1, flexDirection: 'column', alignItems: 'center' },
      box(
        {
          height: (maxPos / span) * plotH + 18,
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
        },
        ...(v > 0
          ? [box({ fontSize: 11, color: t.text, marginBottom: 2 }, formatValue(v, model.unit))]
          : []),
        box({
          width: 36,
          height: hPos,
          background: fill,
          borderRadius: 3,
          opacity: model.incomplete?.[i] ? 0.45 : 0.9,
        }),
      ),
      box(
        {
          height: (maxNeg / span) * plotH,
          flexDirection: 'column',
          alignItems: 'center',
          borderTop: `1px solid ${t.grid}`,
        },
        box({
          width: 36,
          height: hNeg,
          background: fill,
          borderRadius: 3,
          opacity: model.incomplete?.[i] ? 0.45 : 0.9,
        }),
        ...(v < 0
          ? [box({ fontSize: 11, color: t.text, marginTop: 2 }, formatValue(v, model.unit))]
          : []),
      ),
      box({ fontSize: 12, color: t.muted, marginTop: 6 }, c),
    );
  });
  return { height: 110 + plotH + 100, body: box({ flexDirection: 'row' }, ...cols) };
}

function line(model, t) {
  const plotW = W - 48 - 60;
  const plotH = 240;
  const pts = model.points;
  const [y0, y1] = model.yDomain || [
    Math.min(...pts.map((p) => p.y)),
    Math.max(...pts.map((p) => p.y)),
  ];
  let d = '';
  if (pts.length) {
    const t0 = Date.parse(pts[0].x);
    const t1 = Date.parse(pts[pts.length - 1].x);
    const sx = (x) => ((Date.parse(x) - t0) / (t1 - t0 || 1)) * plotW;
    const sy = (y) => plotH - ((y - y0) / (y1 - y0 || 1)) * plotH;
    d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  }
  const axis = box(
    {
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: plotH,
      width: 52,
      paddingRight: 8,
      alignItems: 'flex-end',
    },
    ...[4, 3, 2, 1, 0].map((k) =>
      box({ fontSize: 11, color: t.muted }, formatValue(y0 + ((y1 - y0) * k) / 4, model.unit)),
    ),
  );
  const svg = h(
    'svg',
    { width: plotW, height: plotH, viewBox: `0 0 ${plotW} ${plotH}` },
    ...[0, 1, 2, 3, 4].map((k) =>
      h('line', {
        key: k,
        x1: 0,
        x2: plotW,
        y1: (plotH * k) / 4,
        y2: (plotH * k) / 4,
        stroke: t.grid,
      }),
    ),
    d ? h('path', { d, fill: 'none', stroke: t.positive, strokeWidth: 2 }) : null,
  );
  const xs = pts.length
    ? box(
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginLeft: 60,
          marginTop: 6,
          color: t.muted,
          fontSize: 11,
        },
        box({}, pts[0].x.slice(0, 10)),
        box({}, pts[pts.length - 1].x.slice(0, 10)),
      )
    : box({});
  return {
    height: 110 + plotH + 70,
    body: box({ flexDirection: 'column' }, box({ flexDirection: 'row' }, axis, svg), xs),
  };
}

/** Render a chart model to PNG bytes (Uint8Array). */
export async function renderPng(model, theme = 'dark') {
  const t = THEMES[theme] || THEMES.dark;
  const draw =
    model.kind === 'heatmap'
      ? heatmap
      : model.kind === 'line'
        ? line
        : model.horizontal
          ? hbars
          : vbars;
  const { height, body } = draw(model, t);
  const root = box(
    {
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: t.bg,
      padding: 24,
      fontFamily: 'sans-serif',
    },
    box({ fontSize: 22, fontWeight: 700, color: t.text }, model.title),
    box({ fontSize: 14, color: t.muted, marginTop: 4, marginBottom: 16 }, model.subtitle),
    body,
    model.note ? box({ fontSize: 12, color: t.muted, marginTop: 10 }, model.note) : box({}),
    box({ fontSize: 11, color: t.muted, marginTop: 'auto' }, model.source),
  );
  const res = new ImageResponse(root, { width: W, height: Math.max(220, Math.ceil(height)) });
  return new Uint8Array(await res.arrayBuffer());
}
