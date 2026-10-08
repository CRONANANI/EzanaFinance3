/**
 * Area-proportional two-set Venn geometry. Pure, no imports, so the check
 * script can test it. Circle areas match |A| and |B| and the lens area
 * matches |A ∩ B| (the distance between centres is found by bisection).
 * Returns SVG paths for the three regions in a viewBox of `width` x `height`.
 */

/** Area of the lens between circles of radius r1, r2 whose centres are d apart. */
export function lensArea(r1, r2, d) {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const c = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return a + b - c;
}

/** The centre distance at which the lens area equals `overlap`. */
export function distanceFor(r1, r2, overlap) {
  let lo = Math.abs(r1 - r2);
  let hi = r1 + r2;
  if (overlap <= 0) return hi;
  if (overlap >= Math.PI * Math.min(r1, r2) ** 2) return lo;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (lensArea(r1, r2, mid) > overlap) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const f = (v) => Math.round(v * 100) / 100;
const circle = (cx, cy, r) =>
  `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

/**
 * Layout for regions of sizes onlyA, both, onlyB.
 * { a: { cx, cy, r }, b: {...}, paths: { a, both, b }, label: { a, both, b } }.
 * Empty regions get a null path. Sizes of zero everywhere return null.
 */
export function vennLayout(onlyA, both, onlyB, { width = 420, height = 260, pad = 14 } = {}) {
  const A = onlyA + both;
  const B = onlyB + both;
  if (A <= 0 && B <= 0) return null;
  /* Unit radii from areas, then scale the pair to fit the box. */
  const r1u = Math.sqrt(Math.max(A, 0) / Math.PI);
  const r2u = Math.sqrt(Math.max(B, 0) / Math.PI);
  const du = A > 0 && B > 0 ? distanceFor(r1u, r2u, both) : r1u + r2u;
  const spanX = Math.max(r1u + du + r2u, 2 * r1u, 2 * r2u);
  const spanY = 2 * Math.max(r1u, r2u);
  const k = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const r1 = r1u * k;
  const r2 = r2u * k;
  const d = du * k;
  const cy = height / 2;
  /* Centre the pair horizontally. */
  const left = Math.min(-r1, d - r2);
  const right = Math.max(r1, d + r2);
  const xa = (width - (right - left)) / 2 - left;
  const xb = xa + d;
  const a = { cx: xa, cy, r: r1 };
  const b = { cx: xb, cy, r: r2 };

  const paths = { a: null, both: null, b: null };
  const label = {
    a: { x: xa - r1 / 2, y: cy },
    both: { x: (xa + r1 + xb - r2) / 2, y: cy },
    b: { x: xb + r2 / 2, y: cy },
  };

  if (!(A > 0)) {
    paths.b = circle(xb, cy, r2);
    label.b = { x: xb, y: cy };
    return { a, b, paths, label };
  }
  if (!(B > 0)) {
    paths.a = circle(xa, cy, r1);
    label.a = { x: xa, y: cy };
    return { a, b, paths, label };
  }
  if (d >= r1 + r2 - 1e-6) {
    /* Disjoint. */
    paths.a = circle(xa, cy, r1);
    paths.b = circle(xb, cy, r2);
    label.a = { x: xa, y: cy };
    label.b = { x: xb, y: cy };
    return { a, b, paths, label };
  }
  if (d <= Math.abs(r1 - r2) + 1e-6) {
    /* One set inside the other: the lens is the smaller circle. */
    const small = r1 <= r2 ? a : b;
    const big = r1 <= r2 ? b : a;
    const ring = `${circle(big.cx, cy, big.r)}${circle(small.cx, cy, small.r)}`;
    paths.both = circle(small.cx, cy, small.r);
    if (r1 <= r2) paths.b = ring;
    else paths.a = ring;
    label.both = { x: small.cx, y: cy };
    label[r1 <= r2 ? 'b' : 'a'] = {
      x: big.cx + ((r1 <= r2 ? 1 : -1) * (big.r + small.r)) / 2,
      y: cy,
    };
    return { a, b, paths, label, evenodd: true };
  }

  /* Proper overlap: the two intersection points, top (P1) and bottom (P2). */
  const x = xa + (d * d + r1 * r1 - r2 * r2) / (2 * d);
  const h = Math.sqrt(Math.max(r1 * r1 - (x - xa) ** 2, 0));
  const p1 = `${f(x)} ${f(cy - h)}`;
  const p2 = `${f(x)} ${f(cy + h)}`;
  const R1 = f(r1);
  const R2 = f(r2);
  const bigOuterA = x > xa ? 1 : 0; // A's arc outside B spans more than half the circle
  const bigInnerA = x < xa ? 1 : 0; // A's arc inside B
  const bigInnerB = x > xb ? 1 : 0; // B's arc inside A
  const bigOuterB = x < xb ? 1 : 0; // B's arc outside A
  paths.a = `M${p1}A${R1} ${R1} 0 ${bigOuterA} 0 ${p2}A${R2} ${R2} 0 ${bigInnerB} 1 ${p1}Z`;
  paths.both = `M${p1}A${R1} ${R1} 0 ${bigInnerA} 1 ${p2}A${R2} ${R2} 0 ${bigInnerB} 1 ${p1}Z`;
  paths.b = `M${p1}A${R2} ${R2} 0 ${bigOuterB} 1 ${p2}A${R1} ${R1} 0 ${bigInnerA} 0 ${p1}Z`;
  label.a = { x: (xa - r1 + Math.min(x, xb - r2)) / 2, y: cy };
  label.b = { x: (Math.max(x, xa + r1) + xb + r2) / 2, y: cy };
  label.both = { x: (xb - r2 + xa + r1) / 2, y: cy };
  return { a, b, paths, label };
}
