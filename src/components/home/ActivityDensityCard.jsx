'use client';

/**
 * Activity density card (home, Morning Brief band, Nov 2026).
 *
 * A year of the signed-in user's activity on Ezana as a heat map that folds
 * up into an isometric skyline and back down. One scene, not two charts:
 * every day is a box on a grid; the flat view is the grid seen straight
 * down, the 3D view the same grid seen from the corner. Switching views
 * swings one camera between the two while each week's bars rise (or
 * settle) in a wave from the oldest week to the newest.
 *
 * Colour rule: a day you logged in gets the base emerald; the more you did
 * that day (Sonar pings, posts, likes, saves, paper and logged trades,
 * watchlist adds, completed lessons), the deeper the colour. No login and
 * no action leaves the day empty. Levels come from lib/activity-density.js.
 *
 * Layout (Nov 2026, v3): the title sits over the four stats, which run on
 * one line as compact, transparent tiles exactly as tall as the flat heat
 * map beside them (the canvas publishes its flat height as --adc-flat-h).
 * The legend, the 2D / 3D toggle and the chart fill the right, and the flat
 * grid is right-aligned so its last week lines up with the page's right
 * edge (the same edge as the logout icon in the top nav). Each stat shows the member's percentile on Ezana and links to the
 * matching analytics section of their profile (#activity-active-days,
 * #activity-busiest-day, #activity-longest-streak, #activity-current-streak).
 * The same card renders on the profile page (variant="profile"), where the
 * stats jump to those sections in place.
 *
 * Interaction: hover or tap a day for its record, arrow keys walk the grid,
 * hover a legend swatch to isolate that level, and in 3D drag to orbit
 * (double-click resets). The chosen view is remembered per browser.
 *
 * Ported from the "Contribution Skyline" component (TypeScript, utility classes,
 * shadcn) to Ezana's stack: plain JSX, page-scoped `adc-` CSS, theme tokens
 * only (the canvas reads its colours from hidden token swatches), Bootstrap
 * Icons, prefers-reduced-motion respected, no generated sample data: a
 * new account shows an honest, mostly empty year.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  ACTIVITY_STAT_KEYS,
  ELEV_3D,
  ELEV_RANGE,
  YAW_3D,
  YAW_RANGE,
  barHeight,
  buildGrid,
  camera,
  computeStats,
  dayMs,
  easeInOutCubic,
  lerp,
  luminance,
  mixRGB,
  monthLabels,
  parseCssColor,
  percentileLabel,
  project,
  riseAt,
  smoothstep,
} from '@/lib/activity-density';
import './activity-density.css';

const VIEW_KEY = 'ezana.home.activityView';
const DURATION = 1300;
/* Canvas heights (px): the flat heat map, and the 3D skyline when toggled. */
const H2_MAX = 108;
const H3_MAX = 260;
const LOCALE = 'en-US';
const FG_FALLBACK = [23, 23, 23];
const BG_FALLBACK = [255, 255, 255];
const LEVEL_NAMES = [
  'No activity',
  'Logged in',
  'Light activity',
  'Moderate activity',
  'Heavy activity',
];

const rgbString = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

const pointInQuad = (p, o, x, y) => {
  let sign = 0;
  for (let k = 0; k < 4; k++) {
    const ax = p[o + k * 2];
    const ay = p[o + k * 2 + 1];
    const bx = p[o + ((k + 1) % 4) * 2];
    const by = p[o + ((k + 1) % 4) * 2 + 1];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(cross) < 1e-9) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return sign !== 0;
};

const quadPath = (ctx, p, o, r) => {
  if (r < 0.3) {
    ctx.moveTo(p[o], p[o + 1]);
    ctx.lineTo(p[o + 2], p[o + 3]);
    ctx.lineTo(p[o + 4], p[o + 5]);
    ctx.lineTo(p[o + 6], p[o + 7]);
    ctx.closePath();
    return;
  }
  ctx.moveTo((p[o + 6] + p[o]) / 2, (p[o + 7] + p[o + 1]) / 2);
  for (let k = 0; k < 4; k++) {
    const b = (k + 1) % 4;
    ctx.arcTo(p[o + k * 2], p[o + k * 2 + 1], p[o + b * 2], p[o + b * 2 + 1], r);
  }
  ctx.closePath();
};

/* One centred stat: label, value + unit, and a small date line. */
function StatRank({ pct, pending }) {
  if (pending) return <div className="adc-stat__rank is-pending" aria-hidden="true" />;
  const label = percentileLabel(pct);
  if (!label) return <div className="adc-stat__rank is-empty">Not ranked yet</div>;
  return (
    <div
      className="adc-stat__rank"
      title={`Higher than about ${Math.round(pct)}% of Ezana members`}
    >
      <i className="bi bi-bar-chart-line" aria-hidden="true" />
      {label}
    </div>
  );
}

function Stat({ label, value, unit, sub, pct, pending, href }) {
  const rank = percentileLabel(pct);
  const body = (
    <>
      <div className="adc-stat__label">{label}</div>
      <div className="adc-stat__line">
        <span className="adc-stat__value">{value}</span>
        <span className="adc-stat__unit">{unit}</span>
      </div>
      <div className="adc-stat__sub">{sub}</div>
      <StatRank pct={pct} pending={pending} />
      {href ? <i className="bi bi-arrow-up-right adc-stat__go" aria-hidden="true" /> : null}
    </>
  );
  if (!href) return <div className="adc-stat">{body}</div>;
  const aria = `${label}: ${value} ${unit}, ${sub}. ${
    rank ? `${rank} on Ezana` : pending ? 'Percentile loading' : 'Not ranked yet'
  }. Open activity analytics.`;
  // In-page anchors on the profile; a route on home.
  return href.startsWith('#') ? (
    <a className="adc-stat adc-stat--link" href={href} aria-label={aria}>
      {body}
    </a>
  ) : (
    <Link className="adc-stat adc-stat--link" href={href} aria-label={aria}>
      {body}
    </Link>
  );
}

function readView() {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    return v === '3d' || v === '2d' ? v : null;
  } catch {
    return null;
  }
}

const EMPTY_PAYLOAD = {
  days: [],
  end: null,
  percentiles: null,
  profileSlug: null,
  isOwn: true,
  breakdown: null,
  errorCode: null,
};

/**
 * @param {object}   props
 * @param {string}   [props.className]
 * @param {'home'|'profile'} [props.variant] home (default) links each stat to
 *   the member's profile; profile links to the sections below it.
 * @param {string}   [props.userId] whose activity (profile pages); defaults to the viewer.
 * @param {(state: object) => void} [props.onData] receives
 *   { status, model, percentiles, breakdown, isOwn, errorCode } whenever it changes.
 */
export function ActivityDensityCard({ className = '', variant = 'home', userId = null, onData }) {
  const { user } = useAuth();
  const [payload, setPayload] = useState({ status: 'loading', ...EMPTY_PAYLOAD });
  const isProfile = variant === 'profile';

  // Fetch the year once per signed-in user (and per profile). Login history
  // for today is recorded by useLoginHistory on the same page, so a fresh
  // login shows.
  useEffect(() => {
    if (!user) {
      setPayload({ status: 'ready', ...EMPTY_PAYLOAD });
      return undefined;
    }
    let cancelled = false;
    const qs = new URLSearchParams({ days: '371' });
    if (userId) qs.set('userId', userId);
    if (isProfile) qs.set('include', 'breakdown');
    (async () => {
      try {
        const res = await fetch(`/api/activity-density?${qs}`, { credentials: 'include' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw Object.assign(new Error(String(res.status)), { code: err?.error || null });
        }
        const data = await res.json();
        if (!cancelled)
          setPayload({
            status: 'ready',
            days: Array.isArray(data.days) ? data.days : [],
            end: data.end || null,
            percentiles: data.percentiles || null,
            profileSlug: data.profileSlug || null,
            isOwn: data.isOwn !== false,
            breakdown: Array.isArray(data.breakdown) ? data.breakdown : null,
            errorCode: null,
          });
      } catch (err) {
        if (!cancelled)
          setPayload({ status: 'error', ...EMPTY_PAYLOAD, errorCode: err?.code || null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, userId, isProfile]);

  const endKey = payload.end ? dayMs(payload.end) : dayMs(Date.now());
  const model = useMemo(() => {
    const grid = buildGrid(payload.days, endKey, 0);
    return {
      ...grid,
      stats: computeStats(grid.cells),
      months: monthLabels(grid.cells, grid.weeks, LOCALE),
    };
  }, [payload.days, endKey]);

  // Hand the parsed year to the profile analytics (stable callback not required).
  const onDataRef = useRef(onData);
  onDataRef.current = onData;
  useEffect(() => {
    onDataRef.current?.({
      status: payload.status,
      model,
      percentiles: payload.percentiles,
      breakdown: payload.breakdown,
      isOwn: payload.isOwn,
      errorCode: payload.errorCode,
    });
  }, [model, payload]);

  const [view, setViewState] = useState('2d');
  useEffect(() => {
    const saved = readView();
    if (saved) setViewState(saved);
  }, []);
  const setView = (v) => {
    setViewState(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* per-browser nicety only */
    }
  };

  const [active, setActive] = useState(-1);
  const [legendLevel, setLegendLevel] = useState(-1);
  const [announce, setAnnounce] = useState('');

  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const probeRef = useRef(null);
  const engine = useRef(null);

  const nf = useMemo(() => new Intl.NumberFormat(LOCALE), []);
  const df = useMemo(
    () => new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    [],
  );
  const dfy = useMemo(
    () =>
      new Intl.DateTimeFormat(LOCALE, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    [],
  );
  const dfl = useMemo(
    () =>
      new Intl.DateTimeFormat(LOCALE, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    [],
  );
  const actionsText = (n) => `${nf.format(n)} ${n === 1 ? 'action' : 'actions'}`;
  const dayText = (c) =>
    c.count > 0 ? actionsText(c.count) : c.login ? 'Logged in' : 'No activity';
  const describe = (i) => {
    const c = model.cells[i];
    if (!c) return '';
    return `${dayText(c)} on ${dfl.format(dayMs(c.date))}`;
  };

  // Everything the render loop reads, refreshed every render so it never closes over stale values.
  const cfg = useRef(null);
  cfg.current = {
    model,
    legendLevel,
    target: view === '3d' ? 1 : 0,
    setActive,
    setAnnounce,
    describe,
  };

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const tip = tipRef.current;
    const probes = probeRef.current;
    if (!root || !stage || !canvas || !tip || !probes) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = reduceMq.matches;

    // morph: t is linear time 0 (2D) -> 1 (3D); the camera eases it, the bars wave it
    let t = 0;
    let target = 0;
    let entered = false;
    // orbit offsets, eased toward their goals
    let yaw = 0;
    let elev = 0;
    let yawGoal = 0;
    let elevGoal = 0;
    // layout
    let W = 0;
    let H2 = 0;
    let H3 = 0;
    let Hmax = 0;
    let lastH = -1;
    let dpr = 1;
    let gutter = 30;
    let labelW = 30;
    let font = '10px sans-serif';
    // colours: [empty, login, light, moderate, heavy] x rgb, eased toward the goal
    const col = new Float32Array(15);
    const colGoal = new Float32Array(15);
    let colReady = false;
    let fg = FG_FALLBACK;
    let bg = BG_FALLBACK;
    // cells
    let n = 0;
    let weeks = 0;
    let wk = new Float32Array(0);
    let dy = new Float32Array(0);
    let lv = new Uint8Array(0);
    let hgt = new Float32Array(0);
    let zs = new Float32Array(0);
    let hover = new Float32Array(0);
    let dim = new Float32Array(0);
    let polys = new Float32Array(0);
    let faces = new Uint8Array(0);
    let order = [];
    let months = [];
    let weekdayRows = [];
    // interaction
    let hovered = -1;
    let pinned = -1;
    let activeIdx = -1;
    let tipW = 0;
    let raf = 0;
    let last = 0;

    const load = () => {
      const m = cfg.current.model;
      n = m.cells.length;
      weeks = m.weeks;
      if (wk.length !== n) {
        wk = new Float32Array(n);
        dy = new Float32Array(n);
        lv = new Uint8Array(n);
        hgt = new Float32Array(n);
        zs = new Float32Array(n);
        hover = new Float32Array(n);
        dim = new Float32Array(n);
        polys = new Float32Array(n * 24);
        faces = new Uint8Array(n);
        order = Array.from({ length: n }, (_, i) => i);
      }
      for (let i = 0; i < n; i++) {
        const c = m.cells[i];
        wk[i] = c.week;
        dy[i] = c.day;
        lv[i] = c.level;
        hgt[i] = barHeight(c.count, c.login, m.max);
      }
      months = m.months;
      const wf = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', timeZone: 'UTC' });
      weekdayRows = [];
      for (let d = 0; d < 7 && d < n; d++) {
        const dow = new Date(dayMs(m.cells[d].date)).getUTCDay();
        if (dow === 1 || dow === 3 || dow === 5)
          weekdayRows.push({ day: d, label: wf.format(dayMs(m.cells[d].date)) });
      }
      if (hovered >= n) hovered = -1;
      if (pinned >= n) pinned = -1;
    };

    // Colours come from the theme: the card's own ink and ground, and five
    // hidden swatches styled by the --adc-l0..4 tokens in activity-density.css.
    const retheme = () => {
      const cs = getComputedStyle(root);
      fg = parseCssColor(cs.color) || FG_FALLBACK;
      bg = parseCssColor(cs.backgroundColor) || (luminance(fg) > 0.5 ? [10, 10, 10] : BG_FALLBACK);
      font = `400 10px ${cs.fontFamily || 'sans-serif'}`;
      const sw = Array.from(probes.children).map(
        (el) => parseCssColor(getComputedStyle(el).backgroundColor) || mixRGB(bg, fg, 0.1),
      );
      for (let k = 0; k < 5; k++) for (let ch = 0; ch < 3; ch++) colGoal[k * 3 + ch] = sw[k][ch];
      if (!colReady || reduced) {
        col.set(colGoal);
        colReady = true;
      }
      ctx.font = font;
      labelW =
        Math.ceil(Math.max(20, ...weekdayRows.map((r) => ctx.measureText(r.label).width))) + 8;
      kick();
    };

    // Projected extent of the scene for camera e.
    const extent = (cam, e, full) => {
      const w = lerp(0.78, 0.9, e);
      const off = (1 - w) / 2;
      let minx = Infinity;
      let maxx = -Infinity;
      let miny = Infinity;
      let maxy = -Infinity;
      const add = (x, y, z) => {
        const p = project(cam, x, y, z);
        if (p[0] < minx) minx = p[0];
        if (p[0] > maxx) maxx = p[0];
        if (p[1] < miny) miny = p[1];
        if (p[1] > maxy) maxy = p[1];
      };
      for (let i = 0; i < n; i++) {
        const x0 = wk[i] + off;
        const y0 = dy[i] + off;
        const z = full ? hgt[i] * e : zs[i];
        add(x0, y0, z);
        add(x0 + w, y0, z);
        add(x0, y0 + w, z);
        add(x0 + w, y0 + w, 0);
        add(x0, y0 + w, 0);
        add(x0 + w, y0, 0);
      }
      // room for the month labels that run along the front edge in 3D
      add(0, 7 + 1.5 * e, 0);
      add(weeks, 7 + 1.5 * e, 0);
      return { minx, maxx, miny, maxy };
    };

    const relayout = () => {
      const w = Math.round(stage.clientWidth);
      if (!w || !n) return;
      W = w;
      // Narrow cards give the weekday column to the grid; rows get too tight to label.
      gutter = W < 520 ? 0 : labelW;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const b2 = extent(camera(0), 0, true);
      // Nov 2026: the card is half its first height. The flat grid is capped
      // at H2_MAX and centred (cells shrink instead of spanning the width).
      H2 = Math.min(
        H2_MAX,
        20 + 4 + ((b2.maxy - b2.miny) / (b2.maxx - b2.minx)) * (W - gutter - 4),
      );
      const b3 = extent(camera(1), 1, true);
      const natural = ((b3.maxy - b3.miny) / (b3.maxx - b3.minx)) * (W - 40) + 40;
      H3 = Math.max(Math.min(natural, W * 0.32, H3_MAX), Math.min(natural, 180));
      Hmax = Math.ceil(Math.max(H2, H3));
      // The stats beside the chart line up with the flat grid's cells: they
      // start under the month labels (top pad 2 + label row 20) and end at
      // the last weekday row (bottom pad 2). draw() uses the same pads at e=0.
      root.style.setProperty('--adc-grid-top', '22px');
      root.style.setProperty('--adc-flat-h', `${Math.max(0, Math.round(H2 - 24))}px`);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(Hmax * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${Hmax}px`;
      lastH = -1;
      draw();
    };

    const draw = () => {
      if (!W || !n) return;
      const e = easeInOutCubic(t);
      const cam = camera(e, yaw, elev);
      const Hc = lerp(H2, H3, e);
      if (Math.abs(Hc - lastH) > 0.2) {
        stage.style.height = `${Hc.toFixed(1)}px`;
        lastH = Hc;
      }
      for (let i = 0; i < n; i++) zs[i] = riseAt(t, wk[i], weeks, dy[i]) * hgt[i];
      const b = extent(cam, e, false);
      const pad = lerp(2, 20, e);
      const left = pad + gutter * (1 - e);
      const top = pad + 20 * (1 - e);
      // Flush right when flat (the grid's last week meets the page edge);
      // centred in the 3D skyline.
      const padR = lerp(0, 20, e);
      const aw = W - left - padR;
      const ah = Hc - top - pad;
      const bw = Math.max(1e-6, b.maxx - b.minx);
      const bh = Math.max(1e-6, b.maxy - b.miny);
      const s = Math.min(aw / bw, ah / bh);
      const ox = left + (aw - bw * s) * lerp(1, 0.5, e) - b.minx * s;
      const oy = top + (ah - bh * s) / 2 - b.miny * s;
      const { cs, sn, se, ce } = cam;
      const px = (x, y) => ox + (x * cs - y * sn) * s;
      const py = (x, y, z) => oy + ((x * sn + y * cs) * se - z * ce) * s;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, Hmax);

      order.sort(
        (a, c) =>
          (wk[a] + 0.5) * sn + (dy[a] + 0.5) * cs - ((wk[c] + 0.5) * sn + (dy[c] + 0.5) * cs),
      );

      const w = lerp(0.78, 0.9, e);
      const off = (1 - w) / 2;
      const radius = lerp(0.17, 0.03, e) * s;
      const outline = (1 - e) * 0.07;
      const lift = 0.7 * e;
      const ex = col[0];
      const ey = col[1];
      const ez = col[2];

      for (let k = 0; k < n; k++) {
        const i = order[k];
        const x0 = wk[i] + off;
        const y0 = dy[i] + off;
        const x1 = x0 + w;
        const y1 = y0 + w;
        const z = zs[i] + hover[i] * lift;
        const o = i * 24;
        // top
        polys[o] = px(x0, y0);
        polys[o + 1] = py(x0, y0, z);
        polys[o + 2] = px(x1, y0);
        polys[o + 3] = py(x1, y0, z);
        polys[o + 4] = px(x1, y1);
        polys[o + 5] = py(x1, y1, z);
        polys[o + 6] = px(x0, y1);
        polys[o + 7] = py(x0, y1, z);
        // +y face (left on screen)
        polys[o + 8] = px(x0, y1);
        polys[o + 9] = py(x0, y1, 0);
        polys[o + 10] = px(x1, y1);
        polys[o + 11] = py(x1, y1, 0);
        polys[o + 12] = polys[o + 4];
        polys[o + 13] = polys[o + 5];
        polys[o + 14] = polys[o + 6];
        polys[o + 15] = polys[o + 7];
        // +x face (right on screen)
        polys[o + 16] = px(x1, y0);
        polys[o + 17] = py(x1, y0, 0);
        polys[o + 18] = polys[o + 10];
        polys[o + 19] = polys[o + 11];
        polys[o + 20] = polys[o + 4];
        polys[o + 21] = polys[o + 5];
        polys[o + 22] = polys[o + 2];
        polys[o + 23] = polys[o + 3];

        const tall = z * ce * s;
        let f = 0;
        if (tall > 0.35 && w * cs * s > 0.35) f |= 1;
        if (tall > 0.35 && w * sn * s > 0.35) f |= 2;
        faces[i] = f;

        const L = lv[i] * 3;
        let r = col[L];
        let g = col[L + 1];
        let bl = col[L + 2];
        const d = dim[i];
        if (d > 0.002) {
          r += (ex - r) * 0.72 * d;
          g += (ey - g) * 0.72 * d;
          bl += (ez - bl) * 0.72 * d;
        }
        const hv = hover[i];
        if (hv > 0.002) {
          const m = 0.16 * hv;
          r += (fg[0] - r) * m;
          g += (fg[1] - g) * m;
          bl += (fg[2] - bl) * m;
        }
        if (f & 1) {
          ctx.beginPath();
          quadPath(ctx, polys, o + 8, 0);
          ctx.fillStyle = rgbString(r * 0.84, g * 0.84, bl * 0.84);
          ctx.fill();
        }
        if (f & 2) {
          ctx.beginPath();
          quadPath(ctx, polys, o + 16, 0);
          ctx.fillStyle = rgbString(r * 0.68, g * 0.68, bl * 0.68);
          ctx.fill();
        }
        ctx.beginPath();
        quadPath(ctx, polys, o, radius);
        ctx.fillStyle = rgbString(r, g, bl);
        ctx.fill();
        if (outline > 0.004) {
          ctx.strokeStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},${outline.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (hv > 0.02) {
          ctx.strokeStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},${(0.85 * hv).toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Labels: along the top and left in 2D, along the front edge in 3D. They fade, never pop.
      const muted = mixRGB(bg, fg, 0.55);
      const mutedRgba = (a) =>
        `rgba(${Math.round(muted[0])},${Math.round(muted[1])},${Math.round(muted[2])},${a.toFixed(3)})`;
      ctx.font = font;
      const a2 = 1 - smoothstep(0, 0.4, e);
      const a3 = smoothstep(0.62, 1, e);
      if (a2 > 0.004) {
        ctx.fillStyle = mutedRgba(a2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        let edge = -Infinity;
        for (const m of months) {
          const x = px(m.week + off, -0.3);
          const tw = ctx.measureText(m.label).width;
          if (x < edge || x + tw > W) continue;
          ctx.fillText(m.label, x, py(m.week + off, -0.3, 0) - 3);
          edge = x + tw + 6;
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        if (gutter > 0)
          for (const r of weekdayRows)
            ctx.fillText(r.label, px(0, r.day + 0.5) - 6, py(0, r.day + 0.5, 0));
      }
      if (a3 > 0.004) {
        ctx.fillStyle = mutedRgba(a3);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        let edge = -Infinity;
        for (const m of months) {
          const x = px(m.week + 0.5, 7.3);
          if (x < edge || x + ctx.measureText(m.label).width > W) continue;
          ctx.fillText(m.label, x, py(m.week + 0.5, 7.3, 0) + 2);
          edge = x + ctx.measureText(m.label).width + 10;
        }
      }

      // Tooltip rides the active cell through morphs and orbits.
      if (activeIdx >= 0 && activeIdx < n) {
        const i = activeIdx;
        const z = zs[i] + hover[i] * lift;
        const tx = px(wk[i] + 0.5, dy[i] + 0.5);
        const ty = Math.min(
          py(wk[i] + off, dy[i] + off, z),
          py(wk[i] + off + w, dy[i] + off, z),
          py(wk[i] + off, dy[i] + off + w, z),
        );
        const half = tipW / 2;
        const cx = Math.min(W - half - 2, Math.max(half + 2, tx));
        tip.style.transform = `translate(${(cx - half).toFixed(1)}px,${(ty - 8).toFixed(1)}px) translateY(-100%)`;
        tip.style.setProperty('--adc-arrow', `${(tx - cx + half).toFixed(1)}px`);
      }
    };

    const tick = (now) => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      let moving = false;

      if (t !== target) {
        const step = reduced ? 1 : (dt * 1000) / DURATION;
        t = target > t ? Math.min(target, t + step) : Math.max(target, t - step);
        moving = true;
      }

      const ko = reduced ? 1 : 1 - Math.exp(-dt * 12);
      yaw += (yawGoal - yaw) * ko;
      elev += (elevGoal - elev) * ko;
      if (Math.abs(yawGoal - yaw) > 1e-4 || Math.abs(elevGoal - elev) > 1e-4) moving = true;
      else {
        yaw = yawGoal;
        elev = elevGoal;
      }

      const kc = reduced ? 1 : 1 - Math.exp(-dt * 7);
      for (let k = 0; k < 15; k++) {
        const d = colGoal[k] - col[k];
        if (Math.abs(d) > 0.4) {
          col[k] += d * kc;
          moving = true;
        } else col[k] = colGoal[k];
      }

      const kh = reduced ? 1 : 1 - Math.exp(-dt * 16);
      const kd = reduced ? 1 : 1 - Math.exp(-dt * 10);
      const leg = cfg.current.legendLevel;
      for (let i = 0; i < n; i++) {
        const hg = i === activeIdx ? 1 : 0;
        const dg = leg >= 0 && lv[i] !== leg ? 1 : 0;
        const h = hover[i];
        const d = dim[i];
        if (h !== hg) {
          hover[i] = Math.abs(hg - h) < 0.003 ? hg : h + (hg - h) * kh;
          moving = true;
        }
        if (d !== dg) {
          dim[i] = Math.abs(dg - d) < 0.003 ? dg : d + (dg - d) * kd;
          moving = true;
        }
      }

      draw();
      if (moving) raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    // The active day is the hovered one, else the pinned one (tap, click or keyboard).
    const refreshActive = () => {
      const next = hovered >= 0 ? hovered : pinned;
      if (next === activeIdx) return;
      activeIdx = next;
      cfg.current.setActive(next);
      kick();
    };

    const hit = (x, y) => {
      for (let k = n - 1; k >= 0; k--) {
        const i = order[k];
        const o = i * 24;
        if (pointInQuad(polys, o, x, y)) return i;
        if (faces[i] & 1 && pointInQuad(polys, o + 8, x, y)) return i;
        if (faces[i] & 2 && pointInQuad(polys, o + 16, x, y)) return i;
      }
      return -1;
    };

    const local = (ev) => {
      const r = canvas.getBoundingClientRect();
      return [ev.clientX - r.left, ev.clientY - r.top];
    };

    let drag = null;
    const orbitOn = () => target === 1;

    const onDown = (ev) => {
      if (ev.button !== 0) return;
      const can = orbitOn();
      drag = {
        id: ev.pointerId,
        x: ev.clientX,
        y: ev.clientY,
        yaw: yawGoal,
        elev: elevGoal,
        moved: false,
        orbit: can,
        mouse: ev.pointerType === 'mouse',
      };
      if (can) {
        try {
          canvas.setPointerCapture(ev.pointerId);
        } catch {
          /* capture is a nicety */
        }
      }
    };

    const onMove = (ev) => {
      if (drag && drag.orbit && ev.pointerId === drag.id) {
        const dx = ev.clientX - drag.x;
        const dyy = ev.clientY - drag.y;
        if (drag.moved || Math.hypot(dx, dyy) > 4) {
          drag.moved = true;
          yawGoal = Math.min(
            YAW_RANGE[1] - YAW_3D,
            Math.max(YAW_RANGE[0] - YAW_3D, drag.yaw + dx * 0.006),
          );
          if (drag.mouse)
            elevGoal = Math.min(
              ELEV_RANGE[1] - ELEV_3D,
              Math.max(ELEV_RANGE[0] - ELEV_3D, drag.elev + dyy * 0.004),
            );
          canvas.style.cursor = 'grabbing';
          hovered = -1;
          refreshActive();
          kick();
          return;
        }
      }
      if (ev.pointerType !== 'mouse') return;
      const [x, y] = local(ev);
      const i = hit(x, y);
      if (i !== hovered) {
        hovered = i;
        refreshActive();
      }
      canvas.style.cursor = orbitOn() ? 'grab' : i >= 0 ? 'pointer' : 'default';
    };

    const onUp = (ev) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const wasMoved = drag.moved;
      drag = null;
      if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
      canvas.style.cursor = orbitOn() ? 'grab' : 'default';
      if (wasMoved) return;
      const [x, y] = local(ev);
      const i = hit(x, y);
      pinned = i === pinned ? -1 : i;
      if (ev.pointerType !== 'mouse') hovered = -1;
      refreshActive();
    };

    const onCancel = () => {
      drag = null;
    };

    const onLeave = () => {
      if (drag) return;
      hovered = -1;
      refreshActive();
    };

    const onDbl = () => {
      yawGoal = 0;
      elevGoal = 0;
      kick();
    };

    const onKey = (ev) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'];
      if (!keys.includes(ev.key) || !n) return;
      ev.preventDefault();
      if (ev.key === 'Escape') {
        pinned = -1;
        hovered = -1;
        refreshActive();
        return;
      }
      let i = pinned >= 0 ? pinned : activeIdx >= 0 ? activeIdx : n - 1;
      if (pinned >= 0 || activeIdx >= 0) {
        if (ev.key === 'ArrowLeft') i -= 7;
        if (ev.key === 'ArrowRight') i += 7;
        if (ev.key === 'ArrowUp') i -= 1;
        if (ev.key === 'ArrowDown') i += 1;
        if (ev.key === 'Home') i = 0;
        if (ev.key === 'End') i = n - 1;
      }
      i = Math.max(0, Math.min(n - 1, i));
      pinned = i;
      hovered = -1;
      refreshActive();
      cfg.current.setAnnounce(cfg.current.describe(i));
    };

    const onBlur = () => {
      pinned = -1;
      refreshActive();
    };

    const setTarget = () => {
      const goal = cfg.current.target;
      if (!entered) return;
      if (goal !== target) {
        target = goal;
        if (goal === 0) {
          yawGoal = 0;
          elevGoal = 0;
        }
        canvas.style.cursor = orbitOn() ? 'grab' : 'default';
        kick();
      }
    };

    load();
    retheme();
    relayout();

    // The 3D view rises out of the flat one the first time it is seen.
    const enter = () => {
      if (entered) return;
      entered = true;
      if (reduced) t = cfg.current.target;
      setTarget();
    };
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting)) {
            enter();
            io?.disconnect();
          }
        },
        { threshold: 0.35 },
      );
      io.observe(stage);
    } else enter();

    const ro = new ResizeObserver(() => {
      if (Math.round(stage.clientWidth) !== W) relayout();
    });
    ro.observe(stage);

    // Theme changes (body.light-mode) blend the colours rather than flip them.
    const mo = new MutationObserver(retheme);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const onReduce = () => {
      reduced = reduceMq.matches;
      kick();
    };
    reduceMq.addEventListener('change', onReduce);

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('dblclick', onDbl);
    canvas.addEventListener('keydown', onKey);
    canvas.addEventListener('blur', onBlur);

    engine.current = {
      kick: () => {
        setTarget();
        kick();
      },
      load: () => {
        load();
        retheme();
        relayout();
      },
      tipWidth: (w) => {
        tipW = w;
        draw();
      },
    };

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      ro.disconnect();
      mo.disconnect();
      reduceMq.removeEventListener('change', onReduce);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('dblclick', onDbl);
      canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('blur', onBlur);
      engine.current = null;
    };
    // The loop reads everything else through cfg; it is built once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.current?.kick();
  }, [view, legendLevel]);

  useEffect(() => {
    engine.current?.load();
  }, [model]);

  // The tooltip's width keeps it inside the card; measure it when its text changes.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (tip && active >= 0) engine.current?.tipWidth(tip.offsetWidth);
  }, [active, model]);

  const { stats } = model;
  const range = (a, b, withYear = false) => {
    if (!a || !b) return 'None yet';
    const f = withYear ? dfy : df;
    return `${f.format(dayMs(a))} to ${f.format(dayMs(b))}`;
  };
  const is3d = view === '3d';
  const pctPending = payload.status === 'loading';
  const pct = payload.percentiles || {};
  const statHref = (anchor) => {
    if (isProfile) return `#${anchor}`;
    return payload.profileSlug
      ? `/profile/${encodeURIComponent(payload.profileSlug)}#${anchor}`
      : null;
  };
  const statBlocks = [
    {
      label: 'Active days',
      value: nf.format(stats.activeDays),
      unit: stats.activeDays === 1 ? 'day' : 'days',
      sub: 'in the last year',
    },
    {
      label: 'Busiest day',
      value: nf.format(stats.busiest.count),
      unit: stats.busiest.count === 1 ? 'action' : 'actions',
      sub: stats.busiest.date ? df.format(dayMs(stats.busiest.date)) : 'None yet',
    },
    {
      label: 'Longest streak',
      value: nf.format(stats.longest.days),
      unit: stats.longest.days === 1 ? 'day' : 'days',
      sub: range(stats.longest.start, stats.longest.end),
    },
    {
      label: 'Current streak',
      value: nf.format(stats.current.days),
      unit: stats.current.days === 1 ? 'day' : 'days',
      sub: range(stats.current.start, stats.current.end),
    },
  ].map((b, i) => {
    const { key, anchor } = ACTIVITY_STAT_KEYS[i];
    return { ...b, pct: pct[key] ?? null, pending: pctPending, href: statHref(anchor) };
  });
  const hint = is3d
    ? 'Drag to orbit. Double-click to reset.'
    : 'Hover a day for details. Arrow keys to explore.';
  const activeCell = active >= 0 ? model.cells[active] : null;

  return (
    <section
      ref={rootRef}
      className={`adc adc--split adc--${isProfile ? 'profile' : 'home'} ${className}`.trim()}
      aria-labelledby="adc-title"
      aria-busy={payload.status === 'loading'}
    >
      {/* Theme swatches the canvas reads its five level colours from. */}
      <span ref={probeRef} className="adc-probes" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`adc-sw adc-sw--${i}`} />
        ))}
      </span>

      <div className="adc-grid">
        {/* Left: title, then the four stats on one line, as tall as the chart. */}
        <div className="adc-side">
          <header className="adc-head">
            <div className="adc-head__text">
              <div className="adc-eyebrow">{payload.isOwn ? 'Your activity' : 'Activity'}</div>
              <h3 id="adc-title" className="adc-title">
                <span className="adc-num">{nf.format(stats.activeDays)}</span> active{' '}
                {stats.activeDays === 1 ? 'day' : 'days'} and{' '}
                <span className="adc-num">{nf.format(stats.total)}</span>{' '}
                {stats.total === 1 ? 'action' : 'actions'} in the last year
                {payload.status === 'error' ? (
                  <span className="adc-title__note">
                    {payload.errorCode === 'activity_private'
                      ? ' This member keeps their activity private.'
                      : ' Activity could not be loaded.'}
                  </span>
                ) : null}
              </h3>
            </div>
          </header>

          <ul className="adc-stats" aria-label="Activity stats">
            {statBlocks.map((b) => (
              <li key={b.label} className="adc-stats__item">
                <Stat {...b} />
              </li>
            ))}
          </ul>
        </div>

        {/* Right: legend and the 2D / 3D toggle, then the chart. */}
        <div className="adc-main">
          <div className="adc-head__tools">
            <div className="adc-legend" onMouseLeave={() => setLegendLevel(-1)}>
              <span>Less</span>
              {LEVEL_NAMES.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  className={`adc-sw adc-sw--${i} adc-legend__sw`}
                  aria-label={`Highlight days with ${name.toLowerCase()}`}
                  aria-pressed={legendLevel === i}
                  title={name}
                  onMouseEnter={() => setLegendLevel(i)}
                  onFocus={() => setLegendLevel(i)}
                  onBlur={() => setLegendLevel(-1)}
                  onClick={() => setLegendLevel((l) => (l === i ? -1 : i))}
                />
              ))}
              <span>More</span>
            </div>
            <div className="adc-toggle" role="group" aria-label="Chart view">
              <span className={`adc-toggle__thumb${is3d ? ' is-3d' : ''}`} aria-hidden="true" />
              {['2d', '3d'].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`adc-toggle__btn${view === v ? ' is-on' : ''}`}
                  aria-pressed={view === v}
                  aria-label={v === '2d' ? 'Flat heat map' : '3D skyline'}
                  title={v === '2d' ? 'Flat heat map' : '3D skyline'}
                  onClick={() => setView(v)}
                >
                  <i
                    className={`bi ${v === '2d' ? 'bi-grid-3x3-gap-fill' : 'bi-box'}`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="adc-stagewrap">
            <div ref={stageRef} className="adc-stage" style={{ height: H2_MAX }}>
              <canvas
                ref={canvasRef}
                tabIndex={0}
                role="img"
                aria-label={`${nf.format(stats.activeDays)} active days and ${actionsText(stats.total)} between ${range(stats.first, stats.last, true)}, shown as a ${is3d ? '3D skyline' : 'heat map'}. ${hint}`}
                title={hint}
                className="adc-canvas"
                style={{ touchAction: is3d ? 'pan-y' : 'auto' }}
              />
            </div>

            <div
              ref={tipRef}
              role="tooltip"
              aria-hidden={!activeCell}
              className={`adc-tip${activeCell ? ' is-on' : ''}`}
            >
              {activeCell ? (
                <>
                  <strong>{dayText(activeCell)}</strong>
                  <span className="adc-tip__date"> on {dfy.format(dayMs(activeCell.date))}</span>
                </>
              ) : (
                ' '
              )}
              <span className="adc-tip__arrow" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="adc-sr">
        {announce}
      </p>
    </section>
  );
}

export default ActivityDensityCard;
