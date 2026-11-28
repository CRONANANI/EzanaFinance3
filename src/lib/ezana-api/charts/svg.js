/**
 * Chart model -> standalone SVG string (pure). Self-contained: concrete
 * colours from THEMES and generic font stacks, so it renders anywhere (an
 * IDE preview, a browser, a notebook) without the app's CSS.
 */
import { THEMES, formatValue } from './models';

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const SANS = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const PAD = 24;
const HEAD = 70;
const FOOT = 40;

const maxAbs = (xs) => xs.reduce((m, v) => (v == null ? m : Math.max(m, Math.abs(v))), 0);

/** Fill for a value: brand green or red, stronger with magnitude. */
export function cellFill(v, max, t, diverging = true) {
  if (v == null) return { fill: t.empty, opacity: 1 };
  const k = max ? Math.min(1, Math.abs(v) / max) : 0;
  const colour = !diverging || v >= 0 ? t.positive : t.negative;
  return { fill: colour, opacity: 0.18 + 0.72 * k };
}

function frame(model, t, width, height, body) {
  const note = model.note
    ? `<text x="${PAD}" y="${height - 24}" fill="${t.muted}" font-size="11" font-family="${SANS}">${esc(model.note)}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(model.title)}">
<rect width="100%" height="100%" fill="${t.bg}"/>
<text x="${PAD}" y="${PAD + 14}" fill="${t.text}" font-size="18" font-weight="600" font-family="${SANS}">${esc(model.title)}</text>
<text x="${PAD}" y="${PAD + 34}" fill="${t.muted}" font-size="12" font-family="${SANS}">${esc(model.subtitle)}</text>
${body}
${note}
<text x="${PAD}" y="${height - 10}" fill="${t.muted}" font-size="10" font-family="${SANS}">${esc(model.source)}</text>
</svg>`;
}

function heatmap(model, t, width) {
  const labelW = 72;
  const headH = 26;
  const cellH = 30;
  const cols = model.cols.length || 1;
  const cellW = (width - PAD * 2 - labelW) / cols;
  const height = HEAD + headH + model.rows.length * cellH + FOOT + (model.note ? 14 : 0);
  const max = maxAbs(model.values.flat());
  const parts = [];
  model.cols.forEach((c, j) => {
    parts.push(
      `<text x="${PAD + labelW + j * cellW + cellW / 2}" y="${HEAD + 16}" text-anchor="middle" fill="${t.muted}" font-size="11" font-family="${MONO}">${esc(c)}</text>`,
    );
  });
  model.rows.forEach((r, i) => {
    const y = HEAD + headH + i * cellH;
    const hi = model.rowHighlight === i;
    parts.push(
      `<text x="${PAD + labelW - 10}" y="${y + cellH / 2 + 4}" text-anchor="end" fill="${hi ? t.accent : t.text}" font-size="12" font-weight="600" font-family="${MONO}">${esc(r)}</text>`,
    );
    model.values[i].forEach((v, j) => {
      const x = PAD + labelW + j * cellW;
      const { fill, opacity } = cellFill(v, max, t, model.diverging);
      parts.push(
        `<rect x="${x + 2}" y="${y + 2}" width="${cellW - 4}" height="${cellH - 4}" rx="4" fill="${fill}" fill-opacity="${opacity.toFixed(3)}"/>`,
        `<text x="${x + cellW / 2}" y="${y + cellH / 2 + 4}" text-anchor="middle" fill="${t.text}" font-size="11" font-family="${MONO}">${esc(formatValue(v, model.unit))}</text>`,
      );
    });
  });
  return { height, body: parts.join('\n') };
}

function hbars(model, t, width) {
  const labelW = 72;
  const rowH = 24;
  const height = HEAD + 10 + model.categories.length * rowH + FOOT;
  const plotW = width - PAD * 2 - labelW - 60;
  const max = maxAbs(model.values) || 1;
  const zeroX = PAD + labelW + (model.diverging ? plotW / 2 : 0);
  const scale = (model.diverging ? plotW / 2 : plotW) / max;
  const parts = [
    `<line x1="${zeroX}" y1="${HEAD + 4}" x2="${zeroX}" y2="${height - FOOT + 4}" stroke="${t.grid}"/>`,
  ];
  model.categories.forEach((c, i) => {
    const v = model.values[i];
    const y = HEAD + 10 + i * rowH;
    parts.push(
      `<text x="${PAD + labelW - 10}" y="${y + 15}" text-anchor="end" fill="${t.text}" font-size="12" font-family="${MONO}">${esc(c)}</text>`,
    );
    if (v == null) return;
    const w = Math.abs(v) * scale;
    const x = v >= 0 ? zeroX : zeroX - w;
    parts.push(
      `<rect x="${x}" y="${y + 3}" width="${Math.max(1, w)}" height="${rowH - 8}" rx="3" fill="${v >= 0 ? t.positive : t.negative}" fill-opacity="0.85"/>`,
      `<text x="${v >= 0 ? x + w + 6 : x - 6}" y="${y + 15}" text-anchor="${v >= 0 ? 'start' : 'end'}" fill="${t.muted}" font-size="11" font-family="${MONO}">${esc(formatValue(v, model.unit))}</text>`,
    );
  });
  return { height, body: parts.join('\n') };
}

function vbars(model, t, width) {
  const plotH = 260;
  const height = HEAD + plotH + 58 + FOOT;
  const count = model.categories.length || 1;
  const slot = (width - PAD * 2) / count;
  const vals = model.values.map((v) => v ?? 0);
  const maxPos = Math.max(0, ...vals);
  const maxNeg = Math.max(0, ...vals.map((v) => -v));
  const span = maxPos + maxNeg || 1;
  const top = HEAD + 28;
  const zeroY = top + (maxPos / span) * plotH;
  const parts = [
    `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${t.muted}" stroke-width="2"/></pattern></defs>`,
    `<line x1="${PAD}" y1="${zeroY}" x2="${width - PAD}" y2="${zeroY}" stroke="${t.grid}"/>`,
  ];
  model.categories.forEach((c, i) => {
    const v = model.values[i];
    const cx = PAD + i * slot + slot / 2;
    parts.push(
      `<text x="${cx}" y="${top + plotH + 22}" text-anchor="middle" fill="${t.muted}" font-size="11" font-family="${MONO}">${esc(c)}</text>`,
    );
    if (v == null) return;
    const h = (Math.abs(v) / span) * plotH;
    const y = v >= 0 ? zeroY - h : zeroY;
    const bw = Math.min(48, slot * 0.7);
    const fill = v >= 0 ? t.positive : t.negative;
    parts.push(
      `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${Math.max(1, h)}" rx="3" fill="${fill}" fill-opacity="0.85"/>`,
    );
    if (model.incomplete?.[i]) {
      parts.push(
        `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${Math.max(1, h)}" rx="3" fill="url(#hatch)" fill-opacity="0.6"/>`,
      );
    }
    parts.push(
      `<text x="${cx}" y="${v >= 0 ? y - 6 : y + h + 14}" text-anchor="middle" fill="${t.text}" font-size="10" font-family="${MONO}">${esc(formatValue(v, model.unit))}</text>`,
    );
  });
  return { height, body: parts.join('\n') };
}

function line(model, t, width) {
  const plotH = 260;
  const height = HEAD + plotH + 40 + FOOT;
  const left = PAD + 44;
  const right = width - PAD;
  const top = HEAD + 10;
  const pts = model.points;
  const [y0, y1] = model.yDomain || [
    Math.min(...pts.map((p) => p.y)),
    Math.max(...pts.map((p) => p.y)),
  ];
  const parts = [];
  for (let k = 0; k <= 4; k += 1) {
    const v = y0 + ((y1 - y0) * k) / 4;
    const y = top + plotH - (plotH * k) / 4;
    parts.push(
      `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${t.grid}"/>`,
      `<text x="${left - 8}" y="${y + 4}" text-anchor="end" fill="${t.muted}" font-size="11" font-family="${MONO}">${esc(formatValue(v, model.unit))}</text>`,
    );
  }
  if (pts.length) {
    const t0 = Date.parse(pts[0].x);
    const t1 = Date.parse(pts[pts.length - 1].x) || t0 + 1;
    const sx = (x) => left + ((Date.parse(x) - t0) / (t1 - t0 || 1)) * (right - left);
    const sy = (y) => top + plotH - ((y - y0) / (y1 - y0 || 1)) * plotH;
    const d = pts
      .map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
      .join(' ');
    parts.push(`<path d="${d}" fill="none" stroke="${t.positive}" stroke-width="2"/>`);
    [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]].forEach((p, i) => {
      parts.push(
        `<text x="${sx(p.x)}" y="${top + plotH + 22}" text-anchor="${['start', 'middle', 'end'][i]}" fill="${t.muted}" font-size="11" font-family="${MONO}">${esc(p.x.slice(0, 10))}</text>`,
      );
    });
  }
  return { height, body: parts.join('\n') };
}

/** Render a chart model to an SVG string. */
export function renderSvg(model, theme = 'dark', { width = 960 } = {}) {
  const t = THEMES[theme] || THEMES.dark;
  const draw =
    model.kind === 'heatmap'
      ? heatmap
      : model.kind === 'line'
        ? line
        : model.horizontal
          ? hbars
          : vbars;
  const { height, body } = draw(model, t, width);
  return frame(model, t, width, height, body);
}
