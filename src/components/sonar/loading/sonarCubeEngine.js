/**
 * Sonar cube engine
 * ------------------------------------------------------------------
 * Framework-agnostic Canvas 2D renderer for the Sonar research cube.
 * One translucent cube (the "shell"), a seven-colour neural network
 * inside it (one cluster per Ezana data dimension) and a synthesis
 * core at the centre.
 *
 * Colours are NOT hardcoded here. They are read at start-up from CSS
 * custom properties on `colorSource` (any CSS colour, resolved to RGB):
 * the seven dimension colours of src/lib/datasets/taxonomy.js, the brand
 * green (--brand-ezana-green), and the cube's shell, core and spark tokens in
 * src/app/theme-variables.css. Ported from the Claude Design handoff
 * (Nov 2026); the changes are the token names and the sprite's white
 * centre becoming a token too.
 *
 * Usage:
 *   const engine = createSonarCube(canvas, {
 *     colorSource: canvas.parentElement,
 *     dimensionVars: ['--emerald', '--info', ...7 total],
 *     reducedMotion: false,
 *   });
 *   engine.setActive(2);   // focus a dimension (0-6), -1 = all, null = self-cycle
 *   engine.setStage(1);    // 0-3, grows the synthesis core
 *   engine.complete();     // result arrived: flare + converge
 *   engine.destroy();
 */

const CUBE_V = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];
const CUBE_E = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];
const CUBE_F = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [3, 2, 6, 7],
  [0, 3, 7, 4],
  [1, 2, 6, 5],
];

const NODES_PER_DIM = 14;
const HUB_RADIUS = 0.55; // distance of each dimension's hub from centre (cube half-size = 1)
const NODE_LIMIT = 0.88; // nodes fill the cube out to this bound, just inside the glass
const CORE_CLEARANCE = 0.22; // empty zone around the synthesis core
const MAX_PULSES = 170;
const SEED = 20261105; // fixed seed: every user sees the same network, like a brand mark

/* A colour token as [r, g, b]. `name` is a custom property (`--emerald`); the
   token may hold any CSS colour, so it is resolved through a probe element. */
function readRgb(el, name) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  if (raw) {
    const probe = document.createElement('span');
    probe.style.display = 'none';
    probe.style.color = `var(${name})`;
    el.appendChild(probe);
    const m = getComputedStyle(probe).color.match(/rgba?\(([^)]+)\)/);
    probe.remove();
    const parts = m
      ? m[1]
          .split(/[\s,/]+/)
          .filter(Boolean)
          .map(Number)
      : [];
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return parts.slice(0, 3).map(Math.round);
    }
  }
  // Visible failure instead of a silent fallback colour, so a missing token is caught in review.
  console.warn('[SonarCube] Missing or invalid colour token', name);
  return [128, 128, 128];
}

function makeSprite(c, spark) {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${spark[0]},${spark[1]},${spark[2]},0.95)`);
  gr.addColorStop(0.1, `rgba(${c[0]},${c[1]},${c[2]},0.95)`);
  gr.addColorStop(0.32, `rgba(${c[0]},${c[1]},${c[2]},0.26)`);
  gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return cv;
}

function buildNetwork() {
  let s = SEED;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  // Hubs: one per dimension, evenly spaced on a Fibonacci sphere. Indices 0-6.
  const nodes = [];
  const hubs = [];
  for (let d = 0; d < 7; d++) {
    const k = (d + 0.5) / 7;
    const phi = Math.acos(1 - 2 * k);
    const th = Math.PI * (1 + Math.sqrt(5)) * d;
    hubs.push([
      HUB_RADIUS * Math.sin(phi) * Math.cos(th),
      HUB_RADIUS * Math.cos(phi),
      HUB_RADIUS * Math.sin(phi) * Math.sin(th),
    ]);
    nodes.push({
      ox: hubs[d][0],
      oy: hubs[d][1],
      oz: hubs[d][2],
      d,
      ph: rnd() * 6.283,
      sz: 1.6,
      hub: true,
      y: 0,
    });
  }
  // Remaining nodes fill the whole cube volume evenly. Each point joins the dimension whose hub
  // is nearest, so every dimension owns a region of the cube (out to the corners) while the
  // regions still touch and interleave at their borders.
  const counts = [1, 1, 1, 1, 1, 1, 1];
  for (let guard = 0; guard < 50000 && counts.some((c) => c < NODES_PER_DIM); guard++) {
    const x = (rnd() * 2 - 1) * NODE_LIMIT,
      y = (rnd() * 2 - 1) * NODE_LIMIT,
      z = (rnd() * 2 - 1) * NODE_LIMIT;
    if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < CORE_CLEARANCE) continue; // keep the core readable
    let best = 0,
      bd = Infinity;
    for (let d = 0; d < 7; d++) {
      const dx = x - hubs[d][0],
        dy = y - hubs[d][1],
        dz = z - hubs[d][2];
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bd) {
        bd = dist;
        best = d;
      }
    }
    if (counts[best] >= NODES_PER_DIM) continue;
    counts[best]++;
    nodes.push({
      ox: x,
      oy: y,
      oz: z,
      d: best,
      ph: rnd() * 6.283,
      sz: 0.6 + rnd() * 0.8,
      hub: false,
      y: 0,
    });
  }
  const core = nodes.length;
  nodes.push({ ox: 0, oy: 0, oz: 0, d: -1, ph: 0, sz: 2, hub: true, y: 0 });

  const d2 = (a, b) => {
    const x = a.ox - b.ox,
      y = a.oy - b.oy,
      z = a.oz - b.oz;
    return x * x + y * y + z * z;
  };
  const edges = [];
  const seen = new Set();
  const add = (a, b, type) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ a, b, type }); // type 0 = intra-dimension, 1 = cross-dimension, 2 = hub -> core
  };
  for (let i = 0; i < core; i++) {
    const n = nodes[i];
    const same = [],
      other = [];
    for (let j = 0; j < core; j++) if (j !== i) (nodes[j].d === n.d ? same : other).push(j);
    same.sort((p, q) => d2(n, nodes[p]) - d2(n, nodes[q]));
    add(i, same[0], 0);
    add(i, same[1], 0);
    if (rnd() < 0.35) add(i, same[2], 0);
    other.sort((p, q) => d2(n, nodes[p]) - d2(n, nodes[q]));
    if (rnd() < 0.5) add(i, other[0], 1);
    if (n.hub) add(i, core, 2);
  }
  for (let d = 0; d < 7; d++) add(d, (d + 2) % 7, 1); // hub-to-hub bridges (hubs are nodes 0-6)

  const intra = [[], [], [], [], [], [], []],
    cross = [],
    coreE = [];
  edges.forEach((e, idx) => {
    if (e.type === 0) intra[nodes[e.a].d].push(idx);
    else if (e.type === 1) cross.push(idx);
    else coreE.push(idx);
  });
  return { nodes, edges, core, intra, cross, coreE };
}

export function createSonarCube(canvas, options = {}) {
  const {
    colorSource = canvas.parentElement || canvas,
    dimensionVars = [],
    accentVar = '--brand-ezana-green',
    shellVar = '--sonar-cube-shell',
    coreVar = '--sonar-cube-core',
    sparkVar = '--sonar-cube-spark',
    reducedMotion = false,
  } = options;

  if (dimensionVars.length !== 7)
    throw new Error('[SonarCube] dimensionVars must list exactly 7 CSS variables');

  const ctx = canvas.getContext('2d');
  const net = buildNetwork();
  const { nodes: N, edges: Ed, core } = net;

  const rgb = dimensionVars.map((v) => readRgb(colorSource, v));
  const accent = readRgb(colorSource, accentVar);
  const shell = readRgb(colorSource, shellVar);
  const coreRgb = readRgb(colorSource, coreVar);
  const spark = readRgb(colorSource, sparkVar);
  const sprites = rgb.map((c) => makeSprite(c, spark));
  const coreSprite = makeSprite(coreRgb, spark);
  const A = accent.join(',');
  const SH = shell.join(',');
  const CO = coreRgb.join(',');

  const P = new Float32Array(N.length * 4);
  const flash = new Float32Array(Ed.length);
  const energy = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3];
  const pulses = [];

  let active = null; // null = self-cycle, -1 = all dimensions, 0-6 = focused dimension
  let stage = 0;
  let completed = false;
  let flareAt = -1;
  let lastActive;
  let lastFlash = 0;
  let T = 0,
    lt = 0;
  let W = 0,
    H = 0,
    dpr = 1;
  let mx = 0,
    my = 0,
    px = 0,
    py = 0;
  let raf = 0;
  let destroyed = false;

  const fit = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  };
  fit();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
  if (ro) ro.observe(canvas);

  const onMove = (ev) => {
    if (ev.pointerType && ev.pointerType !== 'mouse') return; // parallax is desktop-only
    const r = canvas.getBoundingClientRect();
    mx = (ev.clientX - r.left) / r.width - 0.5;
    my = (ev.clientY - r.top) / r.height - 0.5;
  };
  const onLeave = () => {
    mx = 0;
    my = 0;
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);

  const burst = (d) => {
    if (d == null || d < 0) return;
    let n = 0;
    for (const idx of net.cross) {
      const e = Ed[idx];
      if (N[e.a].d === d || N[e.b].d === d) {
        flash[idx] = 1;
        if (++n >= 5) break;
      }
    }
  };

  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    if (!W || !H) return;

    const dt = lt ? Math.min(48, now - lt) : 16;
    lt = now;
    const sp = reducedMotion ? 0.35 : 1;
    T += dt * sp;

    const focus = completed ? -1 : active == null ? Math.floor(T / 2200) % 7 : active;
    if (focus !== lastActive) {
      lastActive = focus;
      burst(focus);
    }
    const st = completed ? 3 : stage;

    // energy per dimension eases toward its target: focused = full, others idle near 20%, never dark
    const kE = 1 - Math.pow(0.955, dt / 16);
    for (let d = 0; d < 7; d++) {
      const target =
        focus < 0
          ? completed
            ? 1
            : 0.72
          : d === focus
            ? 1
            : 0.2 + 0.07 * Math.sin(T * 0.0011 + d * 1.7);
      energy[d] += (target - energy[d]) * kE;
    }
    const decay = Math.pow(0.962, dt / 16);
    for (let i = 0; i < flash.length; i++) flash[i] *= decay;
    if (T - lastFlash > 1500) {
      lastFlash = T;
      for (let k = 0; k < 2; k++) {
        const e = net.cross[Math.floor(Math.random() * net.cross.length)];
        flash[e] = Math.max(flash[e], 0.85);
      }
    }

    px += (mx - px) * 0.05;
    py += (my - py) * 0.05;
    const yaw = T * 0.00011 + px * 0.6; // ~57 s per revolution
    const pitch = 0.4 + Math.sin(T * 0.00016) * 0.07 + py * 0.35; // high three-quarter view, breathing +-4deg
    const cyw = Math.cos(yaw),
      syw = Math.sin(yaw),
      cp = Math.cos(pitch),
      spt = Math.sin(pitch);
    const S = Math.min(W, H),
      cx = W / 2,
      cyc = H / 2 - S * 0.03;
    const cam = 4.2,
      f = S * 0.262 * cam,
      sc = S / 700;
    const proj = (x, y, z, o) => {
      const x1 = x * cyw - z * syw,
        z1 = x * syw + z * cyw;
      const y2 = y * cp - z1 * spt,
        z2 = y * spt + z1 * cp;
      const k = f / (cam - z2);
      o[0] = cx + x1 * k;
      o[1] = cyc - y2 * k;
      o[2] = z2;
      o[3] = k;
      return o;
    };
    const dn01 = (z) => Math.max(0, Math.min(1, (z + 1.6) / 3.2));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);

    // floor shadow
    ctx.save();
    ctx.translate(cx, cyc + S * 0.445);
    ctx.scale(1, 0.12);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.3);
    g.addColorStop(0, `rgba(${A},0.18)`);
    g.addColorStop(1, `rgba(${A},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, S * 0.3, 0, 6.2832);
    ctx.fill();
    ctx.restore();

    // ---- LAYER 1: SHELL ----
    const V = CUBE_V.map((v) => proj(v[0], v[1], v[2], [0, 0, 0, 0]));
    for (const fc of CUBE_F) {
      const z = (V[fc[0]][2] + V[fc[1]][2] + V[fc[2]][2] + V[fc[3]][2]) / 4;
      ctx.fillStyle = `rgba(${SH},${z > 0 ? 0.024 : 0.012})`;
      ctx.beginPath();
      ctx.moveTo(V[fc[0]][0], V[fc[0]][1]);
      for (let j = 1; j < 4; j++) ctx.lineTo(V[fc[j]][0], V[fc[j]][1]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineWidth = 1;
    for (const [ia, ib] of CUBE_E) {
      const a = V[ia],
        b = V[ib];
      const z = (a[2] + b[2]) / 2;
      ctx.setLineDash(z < -0.35 ? [2, 4] : []); // back edges dashed like a drafting view
      ctx.strokeStyle = `rgba(${SH},${(0.08 + 0.26 * dn01(z)).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) {
      const v = V[i];
      ctx.strokeStyle = `rgba(${SH},${(0.3 + 0.6 * dn01(v[2])).toFixed(3)})`;
      ctx.beginPath();
      for (const e of CUBE_E) {
        if (e[0] !== i && e[1] !== i) continue;
        const o = V[e[0] === i ? e[1] : e[0]];
        ctx.moveTo(v[0], v[1]);
        ctx.lineTo(v[0] + (o[0] - v[0]) * 0.1, v[1] + (o[1] - v[1]) * 0.1);
      }
      ctx.stroke();
    }
    // sonar sweep plane (9 s period)
    const sy = Math.sin(T * 0.0007) * 0.86;
    const q = [
      [-0.97, sy, -0.97],
      [0.97, sy, -0.97],
      [0.97, sy, 0.97],
      [-0.97, sy, 0.97],
    ].map((p) => proj(p[0], p[1], p[2], [0, 0, 0, 0]));
    ctx.fillStyle = `rgba(${A},0.035)`;
    ctx.strokeStyle = `rgba(${A},0.22)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    for (let j = 1; j < 4; j++) ctx.lineTo(q[j][0], q[j][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ---- LAYER 2: NETWORK (additive light) ----
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(cx, cyc, 0, cx, cyc, S * 0.4);
    g.addColorStop(0, `rgba(${A},${(0.07 + 0.03 * st).toFixed(3)})`);
    g.addColorStop(1, `rgba(${A},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - S * 0.4, cyc - S * 0.4, S * 0.8, S * 0.8);

    const tmp = [0, 0, 0, 0];
    for (let i = 0; i < N.length; i++) {
      const n = N[i];
      const x = n.ox + 0.035 * Math.sin(T * 0.0005 + n.ph);
      const y = n.oy + 0.035 * Math.sin(T * 0.00043 + n.ph * 1.3);
      const z = n.oz + 0.035 * Math.cos(T * 0.00047 + n.ph * 0.7);
      n.y = y;
      proj(x, y, z, tmp);
      P[i * 4] = tmp[0];
      P[i * 4 + 1] = tmp[1];
      P[i * 4 + 2] = tmp[2];
      P[i * 4 + 3] = tmp[3];
    }

    for (let i = 0; i < Ed.length; i++) {
      const e = Ed[i],
        Ai = e.a * 4,
        Bi = e.b * 4;
      const df = 0.45 + 0.55 * Math.max(0, Math.min(1, ((P[Ai + 2] + P[Bi + 2]) / 2 + 1) / 2));
      let c,
        a,
        w = 0.8;
      if (e.type === 0) {
        const d = N[e.a].d;
        c = rgb[d];
        a = (0.05 + 0.22 * energy[d]) * df;
      } else if (e.type === 1) {
        a = (0.03 + 0.55 * flash[i]) * df;
        w = 0.7 + 1.1 * flash[i];
        if (flash[i] > 0.08) {
          // cross-dimensional link: gradient between the two dimension colours
          const ca = rgb[N[e.a].d],
            cb = rgb[N[e.b].d];
          const gr = ctx.createLinearGradient(P[Ai], P[Ai + 1], P[Bi], P[Bi + 1]);
          gr.addColorStop(0, `rgba(${ca[0]},${ca[1]},${ca[2]},${a.toFixed(3)})`);
          gr.addColorStop(1, `rgba(${cb[0]},${cb[1]},${cb[2]},${a.toFixed(3)})`);
          ctx.strokeStyle = gr;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(P[Ai], P[Ai + 1]);
          ctx.lineTo(P[Bi], P[Bi + 1]);
          ctx.stroke();
          continue;
        }
        c = shell;
      } else {
        const d = N[e.a].d;
        c = rgb[d];
        a = (0.04 + (st >= 2 ? 0.2 : 0.07) * energy[d]) * df;
      }
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(P[Ai], P[Ai + 1]);
      ctx.lineTo(P[Bi], P[Bi + 1]);
      ctx.stroke();
    }

    // pulses: light packets travelling along links
    const R = Math.random,
      rate = reducedMotion ? 0.4 : 1;
    if (pulses.length < MAX_PULSES) {
      for (let d = 0; d < 7; d++) {
        if (R() < energy[d] * 0.2 * rate * (dt / 16)) {
          const L = net.intra[d];
          if (L.length)
            pulses.push({
              e: L[Math.floor(R() * L.length)],
              t: 0,
              v: 0.0007 + R() * 0.0008,
              f: R() < 0.5,
            });
        }
      }
      if (R() < 0.06 * rate)
        pulses.push({
          e: net.cross[Math.floor(R() * net.cross.length)],
          t: 0,
          v: 0.0005 + R() * 0.0005,
          f: R() < 0.5,
        });
      const coreRate = completed ? 0.5 : st >= 2 ? 0.16 : 0.04;
      if (R() < coreRate * rate)
        pulses.push({
          e: net.coreE[Math.floor(R() * net.coreE.length)],
          t: 0,
          v: 0.0006 + R() * 0.0005,
          f: true,
        });
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += p.v * dt * sp;
      if (p.t >= 1) {
        pulses.splice(i, 1);
        continue;
      }
      const e = Ed[p.e];
      const from = p.f ? e.a : e.b,
        to = p.f ? e.b : e.a;
      const a = from * 4,
        b = to * 4;
      const cd = N[from].d >= 0 ? N[from].d : N[to].d;
      const fade = Math.sin(p.t * Math.PI);
      for (let k = 0; k < 4; k++) {
        const tt = Math.max(0, p.t - k * 0.035);
        const x = P[a] + (P[b] - P[a]) * tt,
          y = P[a + 1] + (P[b + 1] - P[a + 1]) * tt;
        const r = (k === 0 ? 7 : 5 - k) * sc;
        ctx.globalAlpha = Math.max(0, fade * (k === 0 ? 0.95 : 0.35 - k * 0.08));
        ctx.drawImage(sprites[cd], x - r, y - r, r * 2, r * 2);
      }
    }

    // nodes
    for (let i = 0; i < core; i++) {
      const n = N[i],
        o = i * 4,
        d = n.d,
        en = energy[d];
      const dn = Math.max(0, Math.min(1, (P[o + 2] + 1) / 2));
      const boost = Math.max(0, 1 - Math.abs(n.y - sy) / 0.1); // sweep plane lights nodes it crosses
      const r = (2 + 2.2 * n.sz) * (0.7 + 0.5 * dn) * (0.85 + 0.5 * en) * sc;
      ctx.globalAlpha = Math.min(1, (0.22 + 0.7 * en + 0.6 * boost) * (0.5 + 0.5 * dn));
      ctx.drawImage(sprites[d], P[o] - r * 2.4, P[o + 1] - r * 2.4, r * 4.8, r * 4.8);
      if (n.hub) {
        const c = rgb[d];
        ctx.globalAlpha = 0.2 + 0.45 * en;
        ctx.strokeStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(P[o], P[o + 1], r * 1.9 + Math.sin(T * 0.003 + d) * 0.8, 0, 6.2832);
        ctx.stroke();
      }
    }

    // ---- LAYER 3: SYNTHESIS CORE ----
    const co = core * 4;
    const flare = flareAt >= 0 ? 1 + 1.6 * Math.exp(-(T - flareAt) / 380) : 1;
    const cr = (9 + 3 * st) * sc * (1 + 0.12 * Math.sin(T * 0.0035)) * flare;
    ctx.globalAlpha = Math.min(1, 0.5 + 0.1 * st + (flare - 1) * 0.3);
    ctx.drawImage(coreSprite, P[co] - cr * 3, P[co + 1] - cr * 3, cr * 6, cr * 6);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = `rgb(${CO})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.lineDashOffset = -T * 0.01;
    ctx.beginPath();
    ctx.ellipse(P[co], P[co + 1], cr * 3.2, cr * 3.2 * 0.42, 0, 0, 6.2832);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  raf = requestAnimationFrame(frame);

  return {
    setActive(i) {
      active = i == null ? null : i;
    },
    setStage(n) {
      stage = Math.max(0, Math.min(3, n | 0));
    },
    complete() {
      if (completed) return;
      completed = true;
      flareAt = T;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    },
  };
}
