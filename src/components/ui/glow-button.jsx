'use client';

/*
 * Glow Button, adapted from "Glow Button" by Louis Studios (21st.dev,
 * https://studios.lou15.com). Ported to plain JSX for this repo (no
 * TypeScript, Tailwind or shadcn), styles moved to glow-button.css, and a
 * light tone added (Nov 19th, 2026):
 *
 *   tone="dark"  the original black pill; rim lights add up with
 *                plus-lighter, so they only read on a dark surface.
 *   tone="light" a white pill for light surfaces (the auth pages): the rim
 *                lights blend normally and the "white" light is a deep core
 *                colour, so the sweep stays visible on white.
 *
 * The motion (163 reference frames, monotone cubic curves, pill rim geometry)
 * is unchanged. It respects prefers-reduced-motion, pauses offscreen and
 * holds still when disabled.
 */
import * as React from 'react';
import './glow-button.css';

// Motion, measured from the reference at 30 fps: 163 frames per loop.
// Each light is placed at a conic angle around the centre (0 = top, clockwise),
// so it drifts along the long edges and whips round the rounded ends.
const FRAMES = 163;

// prettier-ignore
const TRACKS = {
  // White light: rests at the top, eases into a lap, whips over the top corner, lingers, laps again, settles.
  white: [[0, 10], [12, 15], [20, 33], [30, 87], [40, 166], [48, 206], [56, 274], [62, 351], [66, 363], [70, 381],
          [80, 513], [88, 567], [96, 630], [104, 689], [110, 707], [124, 716], [140, 722], [152, 727]],
  // How far the colored light runs ahead of the white one, in degrees.
  lead: [[0, 89], [16, 91], [24, 88], [32, 76], [40, 64], [48, 60], [56, 56], [64, 49], [72, 47], [80, 46], [88, 38],
         [96, 26], [110, 30], [140, 42], [148, 46], [152, 62], [156, 80], [160, 90]],
  // Colored light fades into the white one for the hold, then splits off again.
  tint: [[0, 1], [30, 1], [50, 0.85], [54, 0.7], [57, 0.9], [62, 0.5], [68, 0.45], [76, 0.7], [84, 0.22], [94, 0.1],
         [100, 0], [142, 0], [148, 0.3], [154, 0.75], [160, 1]],
  // White light lengthens and picks up pink fringes once it gets going, and keeps them through the hold.
  bright: [[0, 0], [14, 0.05], [24, 0.5], [36, 1], [140, 1], [150, 0.6], [158, 0.15], [162, 0]],
};

// Light along the rim. Rows are [distance in button heights, white, blue, magenta],
// sampled from the reference; positive distance is clockwise (ahead).
// prettier-ignore
const REST = [
  [0, 1, 0, 0], [0.165, 1, 0, 0], [0.22, 0.8, 0.15, 0], [0.27, 0.62, 0.18, 0], [0.32, 0.48, 0.15, 0.05],
  [0.37, 0.38, 0.15, 0.07], [0.42, 0.28, 0.2, 0.1], [0.47, 0.2, 0.2, 0.1], [0.52, 0.15, 0.2, 0.08],
  [0.62, 0.1, 0.2, 0.05], [0.72, 0.07, 0.17, 0.03], [0.87, 0.03, 0.15, 0.02], [1.03, 0, 0.14, 0.01],
  [1.2, 0, 0.08, 0], [1.32, 0, 0, 0],
];
// prettier-ignore
const BRIGHT = [
  [0, 1.2, 0, 0], [0.31, 1.2, 0, 0], [0.37, 0.85, 0.05, 0.2], [0.42, 0.55, 0.05, 0.45], [0.47, 0.32, 0.15, 0.5],
  [0.52, 0.18, 0.3, 0.45], [0.57, 0.1, 0.4, 0.35], [0.62, 0.06, 0.55, 0.2], [0.67, 0.05, 0.45, 0.12],
  [0.72, 0.06, 0.25, 0.08], [0.77, 0.08, 0.1, 0.03], [0.82, 0.06, 0.07, 0.02], [0.88, 0.04, 0.05, 0],
  [0.99, 0.015, 0.01, 0], [1.07, 0, 0, 0],
];
// Blue lead-in, hot magenta core, violet trail, long faint purple tail.
// prettier-ignore
const TINT = [
  [-1.1, 0, 0, 0], [-0.96, 0, 0.27, 0], [-0.83, 0, 0.6, 0], [-0.69, 0, 0.95, 0], [-0.56, 0, 1, 0],
  [-0.43, 0, 1, 0.12], [-0.36, 0, 0.9, 0.3], [-0.3, 0, 0.5, 0.6], [-0.23, 0, 0.3, 0.8], [-0.165, 0.03, 0.05, 1],
  [0.23, 0.03, 0.05, 1], [0.3, 0, 0.15, 0.8], [0.36, 0, 0.3, 0.6], [0.43, 0, 0.45, 0.35], [0.5, 0, 0.55, 0.22],
  [0.56, 0, 0.45, 0.18], [0.69, 0, 0.37, 0.17], [0.83, 0, 0.33, 0.15], [0.96, 0, 0.17, 0.15], [1.09, 0, 0.17, 0.1],
  [1.36, 0, 0.12, 0.07], [1.62, 0, 0.07, 0.04], [2.15, 0, 0, 0],
];

// Frame where the colored light starts to move; hover playback begins here.
const HOVER_START = 8;

// Fritsch-Carlson monotone cubic over one periodic loop: smooth, no overshoot, no seam.
function periodic(points, lap = 0) {
  const p = [
    ...points.slice(-2).map(([x, y]) => [x - FRAMES, y - lap]),
    ...points,
    ...points.slice(0, 2).map(([x, y]) => [x + FRAMES, y + lap]),
  ];
  const n = p.length;
  const h = p.slice(0, -1).map((q, i) => p[i + 1][0] - q[0]);
  const d = p.slice(0, -1).map((q, i) => (p[i + 1][1] - q[1]) / h[i]);
  const m = p.map((_, i) => {
    if (i === 0) return d[0];
    if (i === n - 1) return d[n - 2];
    if (d[i - 1] * d[i] <= 0) return 0;
    return (
      (3 * (h[i - 1] + h[i])) / ((2 * h[i] + h[i - 1]) / d[i - 1] + (h[i] + 2 * h[i - 1]) / d[i])
    );
  });
  return (x) => {
    let i = 0;
    while (i < n - 2 && p[i + 1][0] <= x) i++;
    const t = (x - p[i][0]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * p[i][1] +
      (t3 - 2 * t2 + t) * h[i] * m[i] +
      (-2 * t3 + 3 * t2) * p[i + 1][1] +
      (t3 - t2) * h[i] * m[i + 1]
    );
  };
}

const CURVES = {
  white: periodic(TRACKS.white, 720),
  lead: periodic(TRACKS.lead),
  tint: periodic(TRACKS.tint),
  bright: periodic(TRACKS.bright),
};

// Linear lookup in a light table; zero outside it.
function light(table, d, out, k) {
  if (d <= table[0][0] || d >= table[table.length - 1][0]) return;
  let i = 1;
  while (table[i][0] < d) i++;
  const a = table[i - 1];
  const b = table[i];
  const t = (d - a[0]) / (b[0] - a[0]);
  for (let c = 1; c < 4; c++) out[c - 1] += k * (a[c] + (b[c] - a[c]) * t);
}

// Pill rim of a w × h box: arc length (clockwise from top centre) ↔ point, conic angle → arc length.
function pill(w, h) {
  const r = h / 2;
  const L = Math.max(w - h, 0);
  const P = 2 * L + 2 * Math.PI * r;

  function point(s) {
    s = ((s % P) + P) % P;
    if (s < L / 2) return [s, -r];
    s -= L / 2;
    if (s < Math.PI * r) return [L / 2 + r * Math.sin(s / r), -r * Math.cos(s / r)];
    s -= Math.PI * r;
    if (s < L) return [L / 2 - s, r];
    s -= L;
    if (s < Math.PI * r) return [-L / 2 - r * Math.sin(s / r), r * Math.cos(s / r)];
    return [-L / 2 + s - Math.PI * r, -r];
  }

  // Where the ray from the centre at `deg` meets the rim.
  function along(deg) {
    const lap = Math.floor(deg / 360);
    const th = ((deg - lap * 360) * Math.PI) / 180;
    const dx = Math.sin(th);
    const dy = -Math.cos(th);
    const t = Math.abs(dy) > 1e-9 ? r / Math.abs(dy) : Infinity;
    let s;
    if (Math.abs(t * dx) <= L / 2) {
      const x = t * dx;
      s = dy < 0 ? (x >= 0 ? x : P + x) : L / 2 + Math.PI * r + (L / 2 - x);
    } else {
      const ox = dx > 0 ? L / 2 : -L / 2;
      const k = dx * ox;
      const u = k + Math.sqrt(k * k - ox * ox + r * r);
      const px = u * dx - ox;
      const py = u * dy;
      s =
        dx > 0 ? L / 2 + r * Math.atan2(px, -py) : 1.5 * L + Math.PI * r + r * Math.atan2(-px, py);
    }
    return s + lap * P;
  }

  return { P, point, along };
}

function hex(c, fallback) {
  const m = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(c.trim());
  if (!m) return fallback;
  const v = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
}

// Where a light sits on the rim at frame f, and how it is drawn there. Arcs run a little
// shorter round the rounded ends, and stretch and dim as they whip past like a motion streak.
function shape(rim, h, f, which) {
  const deg = (t) => CURVES.white(t) + (which ? CURVES.lead(t) : 0);
  const a = deg(f);
  const v = Math.abs(rim.along(deg(f + 0.5)) - rim.along(deg(f - 0.5))) / h; // button heights per frame
  const ends = 0.65 + 0.35 * Math.abs(Math.cos((a * Math.PI) / 180));
  return { s: rim.along(a), scale: ends * (1 + 1.6 * v), gain: 1 / (1 + (v / 0.5) ** 4) };
}

// One frame of the glow as a conic-gradient: the rim is sampled evenly by length
// and each sample's stop sits at its exact angle, so arcs keep their length on any shape.
// Dark tone: white core light, colour + alpha that add up under plus-lighter.
// Light tone: the core light takes `core`, and each sample is the weighted mix of
// the three lights with alpha from their summed strength (normal blending).
function paint(rim, h, f, blue, magenta, core, lightTone) {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const bright = clamp(CURVES.bright(f));
  const tint = clamp(CURVES.tint(f));
  const A = shape(rim, h, f, 0);
  const B = shape(rim, h, f, 1);
  const n = Math.ceil(rim.P / (h / 20));
  const wrap = (d) => ((((d + rim.P / 2) % rim.P) + rim.P) % rim.P) - rim.P / 2;
  const colors = [];
  const lit = [];
  const deg = [];
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * rim.P;
    const [x, y] = rim.point(s);
    deg.push(i === n ? 360 : ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360);
    const c = [0, 0, 0];
    const dA = Math.abs(wrap(s - A.s)) / (h * A.scale);
    light(REST, dA, c, (1 - bright) * A.gain);
    light(BRIGHT, dA, c, bright * A.gain);
    light(TINT, wrap(s - B.s) / (h * B.scale), c, tint * B.gain);
    let a;
    let rgb;
    if (lightTone) {
      const w = c[0] + c[1] + c[2];
      a = Math.min(1, w);
      rgb =
        w > 0
          ? [0, 1, 2].map((k) => (core[k] * c[0] + blue[k] * c[1] + magenta[k] * c[2]) / w)
          : [0, 0, 0];
    } else {
      rgb = [0, 1, 2].map((k) => Math.min(255, 255 * c[0] + blue[k] * c[1] + magenta[k] * c[2]));
      a = Math.max(...rgb) / 255;
      rgb = rgb.map((v) => (a > 0 ? v / a : 0));
    }
    lit.push(a > 0.004);
    colors.push(
      a > 0.004
        ? `rgb(${rgb.map((v) => Math.round(v)).join(' ')} / ${a.toFixed(3)})`
        : 'transparent',
    );
  }
  const stops = [];
  for (let i = 0; i <= n; i++) {
    if (i === 0 || i === n || lit[i] || lit[i - 1] || lit[i + 1])
      stops.push(`${colors[i]} ${deg[i].toFixed(2)}deg`);
  }
  return `conic-gradient(${stops.join(',')})`;
}

/* Brand defaults (Ezana emerald family) for the light tone; the original
   blue/magenta pair for the dark tone. */
const DEFAULTS = {
  dark: { colors: ['#3b2cff', '#f050ff'], core: '#ffffff' },
  light: { colors: ['#10b981', '#6ee7b7'], core: '#047857' },
};

/**
 * Pill button whose rim carries soft lights that sweep round and settle.
 * Props: trigger ("always" | "hover"), duration (seconds per loop),
 * colors ([tint A, tint B] as hex), core (hex, the leading light),
 * tone ("dark" | "light"), plus any <button> attribute.
 */
export const GlowButton = React.forwardRef(function GlowButton(
  {
    trigger = 'always',
    duration = 5.4,
    tone = 'dark',
    colors,
    core,
    type = 'button',
    className,
    children,
    ...props
  },
  ref,
) {
  const local = React.useRef(null);
  React.useImperativeHandle(ref, () => local.current);
  const preset = DEFAULTS[tone] || DEFAULTS.dark;
  const [blue, magenta] = colors || preset.colors;
  const coreHex = core || preset.core;
  const lightTone = tone === 'light';
  const disabled = !!props.disabled;

  React.useEffect(() => {
    const el = local.current;
    if (!el) return undefined;
    const tints = [hex(blue, [16, 185, 129]), hex(magenta, [110, 231, 183])];
    const coreRgb = hex(coreHex, [4, 120, 87]);
    const fps = FRAMES / Math.max(duration, 0.5); // reference frames per second
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rim = pill(1, 1);
    let h = 1;
    let frame = 0; // position in the loop, in reference frames (may run past FRAMES)
    let from = 0; // frame and clock time when playback last started
    let start = 0;
    let raf = 0;
    let hovered = false;
    let visible = true;
    let stopAt = Infinity; // hover mode: frame to settle on after the pointer leaves

    const draw = () =>
      el.style.setProperty(
        '--glow-arcs',
        paint(rim, h, frame % FRAMES, tints[0], tints[1], coreRgb, lightTone),
      );

    function tick(now) {
      raf = 0;
      frame = from + (now - start) * 0.001 * fps;
      if (frame >= stopAt) {
        frame = 0;
        stopAt = Infinity;
        draw();
        return;
      }
      draw();
      raf = requestAnimationFrame(tick);
    }

    function sync() {
      const still = motion.matches || el.disabled;
      const play = !still && visible && (trigger === 'always' || hovered || stopAt < Infinity);
      if (still) frame = 0;
      if (play && !raf) {
        from = frame;
        start = performance.now();
        raf = requestAnimationFrame(tick);
      }
      if (!play && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (!raf) draw();
    }

    // Hover mode starts from rest and, on leave, finishes the loop so the glow settles home.
    const enter = () => {
      hovered = true;
      if (trigger === 'hover' && frame % FRAMES === 0) frame = HOVER_START;
      stopAt = Infinity;
      sync();
    };
    const leave = () => {
      hovered = el.matches(':hover') || el.matches(':focus-visible');
      if (!hovered && trigger === 'hover' && raf) stopAt = Math.ceil(frame / FRAMES) * FRAMES;
      sync();
    };

    const resize = () => {
      h = el.offsetHeight || 1;
      rim = pill(el.offsetWidth || 1, h);
      if (!raf) draw();
    };

    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('focus', enter);
    el.addEventListener('blur', leave);
    motion.addEventListener('change', sync);
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(el);
    resize();
    sync();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('focus', enter);
      el.removeEventListener('blur', leave);
      motion.removeEventListener('change', sync);
      ro.disconnect();
      io.disconnect();
    };
  }, [trigger, duration, blue, magenta, coreHex, lightTone, disabled]);

  const cls = ['glow-btn', lightTone ? 'glow-btn--light' : '', className].filter(Boolean).join(' ');
  return (
    <button ref={local} type={type} className={cls} {...props}>
      <span className="glow-fx" data-layer="haze" aria-hidden="true">
        <span className="glow-ring" />
      </span>
      <span className="glow-fx" data-layer="bloom" aria-hidden="true">
        <span className="glow-ring" />
      </span>
      <span className="glow-fx" aria-hidden="true">
        <span className="glow-ring" />
      </span>
      <span className="glow-label">{children}</span>
    </button>
  );
});

export default GlowButton;
