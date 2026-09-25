/**
 * Sonar band geometry: the measured spec as a continuous system.
 *
 * 04-SPEC.md section 1 gives a vertical budget measured at four anchors, and
 * every column sums exactly to its viewport height. 07-EZANA-INTEGRATION.md
 * asks for that table to be reproduced at the anchors and interpolated
 * everywhere else, so the band is sized on real screens rather than on the
 * four the designer happened to own.
 *
 * It prescribes a single linear `clamp()` per value. That cannot work, and the
 * arithmetic says so: the three desktop anchors are not collinear in width.
 * Fitting a line through 1366 and 1920 and reading it at 1440 undershoots every
 * value, by 6.40 on the headline box and 63.01 on the work area, because the
 * 1440 column is deliberately generous. Its own worked example,
 * `clamp(48px, calc(2.17vw + 18.3px), 60px)`, lands 48.00 at 1366 and 59.96 at
 * 1920 and then 49.55 at 1440 where the table says 56: a 6.45px miss against a
 * stated tolerance of 1px.
 *
 * So the interpolation is piecewise between adjacent anchors instead. That
 * reproduces all four columns exactly, 0px rather than within 1px, and still
 * moves smoothly through every width between them.
 *
 * The work area is never interpolated. It is the remainder after every other
 * zone is taken out of the viewport height, which is what makes the budget sum
 * at any height rather than only at the four the table lists. At the anchor
 * heights that remainder equals the table's work value by construction.
 */

/* The four measured columns, from 04-SPEC.md section 1 and the prototype's BP
   table, with one deliberate departure: the headline runs at 0.65 of the
   spec's size at Noah's direction, so `head` and `headFs` are 20/50 at 390,
   31/34 at 1366, 36/40 at 1440 and 39/42 at 1920 where the spec says 30/76,
   48/52, 56/60 and 60/64. Nothing else moves, and nothing needs to: the work
   area is the budget's remainder, so the height the smaller headline frees
   flows into it and the column still sums.

   `g3`, the gap between the subhead and the work area, is raised on the three
   desktop anchors for a second reason. The mini orbital needs 180px of header
   zone measured from the eyebrow row down to the work area, and after the
   headline shrank there was 134 at 1366, 152 at 1440 and 168 at 1920. The
   shortfall goes into g3 rather than anywhere else precisely because the work
   area is the remainder: 24 to 70, 28 to 56 and 32 to 44 buys the map its
   room and the column still sums to the viewport. The phone keeps its 14,
   since the orbital is hidden in stage 2 there. Order matters: the interpolation walks it. */
export const ANCHORS = [
  {
    w: 390,
    h: 844,
    phone: true,
    gutter: 16,
    content: 358,
    nav: 56,
    padTop: 14,
    eyebrow: 14,
    g1: 10,
    head: 50,
    headFs: 20,
    g2: 8,
    sub: 60,
    subFs: 13,
    /* The table prints g4 as 0 for the phone, but its own derived arrow-row
       offset only resolves with 14, and the prototype's phone branch adds the
       same 14 by hand. Taking the derived value as the real one: it is the one
       that makes 844 sum. */
    g3: 14,
    g4: 14,
    arrow: 44,
    padBot: 14,
    pingH: 50,
    /* The phone stacks, so it has no three-column grid and no orbital region.
       Carried anyway so every field is defined at every anchor. */
    colL: 358,
    colC: 358,
    colR: 358,
    gap: 16,
    restRegion: 358,
    orbRest: 300,
    orbMini: 152,
    chartH: 190,
    newsH: 210,
    rowH: 44,
    rowGap: 6,
  },
  {
    w: 1366,
    h: 768,
    gutter: 40,
    content: 1286,
    nav: 64,
    padTop: 24,
    eyebrow: 16,
    g1: 14,
    head: 34,
    headFs: 31,
    g2: 10,
    sub: 44,
    subFs: 15,
    g3: 70,
    g4: 14,
    arrow: 44,
    padBot: 20,
    colL: 376,
    colC: 408,
    colR: 454,
    gap: 24,
    restRegion: 486,
    orbRest: 400,
    orbMini: 152,
    pingH: 52,
    chartH: 204,
    newsH: 222,
    rowH: 42,
    rowGap: 6,
  },
  {
    w: 1440,
    h: 900,
    gutter: 40,
    content: 1360,
    nav: 64,
    padTop: 32,
    eyebrow: 16,
    g1: 16,
    head: 40,
    headFs: 36,
    g2: 12,
    sub: 48,
    subFs: 16,
    g3: 56,
    g4: 16,
    arrow: 48,
    padBot: 24,
    colL: 400,
    colC: 432,
    colR: 480,
    gap: 24,
    restRegion: 512,
    orbRest: 440,
    orbMini: 176,
    pingH: 56,
    chartH: 248,
    newsH: 272,
    rowH: 54,
    rowGap: 6,
  },
  {
    w: 1920,
    h: 1080,
    gutter: 240,
    content: 1440,
    nav: 64,
    padTop: 40,
    eyebrow: 18,
    g1: 18,
    head: 42,
    headFs: 39,
    g2: 14,
    sub: 52,
    subFs: 17,
    g3: 44,
    g4: 20,
    arrow: 52,
    padBot: 32,
    colL: 420,
    colC: 456,
    colR: 516,
    gap: 24,
    restRegion: 540,
    orbRest: 520,
    orbMini: 200,
    pingH: 60,
    chartH: 320,
    newsH: 338,
    rowH: 69,
    rowGap: 8,
  },
];

/* Interpolated per width. The work area is excluded on purpose: it is derived
   from what is left, never interpolated. */
const LERPED = [
  'gutter',
  'nav',
  'padTop',
  'eyebrow',
  'g1',
  'head',
  'headFs',
  'g2',
  'sub',
  'subFs',
  'g3',
  'g4',
  'arrow',
  'padBot',
  'pingH',
  'chartH',
  'newsH',
  'rowH',
  'rowGap',
  'gap',
  'colL',
  'colC',
  'colR',
  'restRegion',
  'orbRest',
  'orbMini',
];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* Width-driven values, piecewise between the two bracketing anchors. Outside
   the range the nearest column holds, which is what caps 1920's numbers rather
   than extrapolating a 3440 headline to something absurd. */
function interpolate(vw) {
  const first = ANCHORS[0];
  const last = ANCHORS[ANCHORS.length - 1];
  if (vw <= first.w) return { ...first };
  if (vw >= last.w) return { ...last };

  let i = 0;
  while (i < ANCHORS.length - 2 && vw > ANCHORS[i + 1].w) i += 1;
  const a = ANCHORS[i];
  const b = ANCHORS[i + 1];
  const t = (vw - a.w) / (b.w - a.w);

  const out = { phone: vw < 768 };
  for (const k of LERPED) out[k] = lerp(a[k], b[k], t);
  return out;
}

/**
 * Tier, by width AND height together, per 07 section C.3. Height matters as
 * much as width here: the lock only holds if the composition fits, and a
 * 1440x720 window is a harder case than a 1366x768 laptop.
 */
export function tierFor(vw, vh) {
  if (vw < 1024 && vh < 560) return 'unlocked';
  if (vw < 768) return 'phone';
  if (vw < 1024) return 'tablet';
  if (vh < 700) return 'short';
  if (vw >= 1600 && vh >= 960) return 'tall';
  if (vw >= 1366 && vh >= 800) return 'standard';
  return 'compact';
}

/**
 * The full geometry for a viewport. Every zone in px, plus the derived offsets
 * the spec lists, plus the tier.
 *
 * `navPx` is the real measured nav height where the caller has one, because the
 * spec says to read it rather than assume it. It falls back to the anchor's.
 */
export function geometryFor(vw, vh, navPx) {
  const g = interpolate(vw);
  const tier = tierFor(vw, vh);

  g.tier = tier;
  if (typeof navPx === 'number' && navPx > 0) g.nav = navPx;

  /* Short desktop: the header gives up its slack first, because a subhead line
     is worth less than a legible card. Paddings to their minimums and the
     subhead to one line, per 07 C.3. */
  if (tier === 'short') {
    g.padTop = Math.min(g.padTop, 16);
    g.padBot = Math.min(g.padBot, 16);
    g.g3 = Math.min(g.g3, 16);
    g.sub = Math.min(g.sub, 24);
    g.rowH = 36;
  }

  /* Content box: capped at 1440 and centred, so extra width past the
     tall-desktop anchor becomes gutter rather than wider cards.

     The gutter is then whatever is left over, not the fluid minimum. Those
     differ everywhere between 1440 and 1920: the fluid value clamps at 40
     while the cap has already pushed the real space to 80 at 1600 and 240 at
     1920. Reporting 40 there understated the room outside the content box,
     which matters to anything placed in it. */
  const gutterMin = clamp(vw * 0.0278, 16, 40);
  g.content = Math.min(1440, vw - 2 * Math.round(gutterMin));
  g.gutter = (vw - g.content) / 2;

  /* The three Live columns divide the content box in the spec's proportions,
     which reproduces 400/432/480, 376/408/454 and 420/456/516 within rounding
     and divides anything else the same way. */
  const usable = g.content - 2 * g.gap;
  const share = (f) => (usable * f) / (400 + 432 + 480);
  if (!g.phone) {
    g.colL = Math.round(share(400));
    g.colC = Math.round(share(432));
    /* The last column takes the remainder so the three plus their gaps equal
       the content box exactly, with no rounding crumb at the right edge. */
    g.colR = g.content - 2 * g.gap - g.colL - g.colC;
    g.restRegion = g.colC + g.gap + g.colR - (g.colL + 60) + g.gap;
  }

  /* Derived offsets, exactly as 04-SPEC.md section 1 lists them. */
  g.headTop = g.nav + g.padTop + g.eyebrow + g.g1;
  g.subTop = g.headTop + g.head + g.g2;
  g.workTop = g.subTop + g.sub + g.g3;
  g.arrowTop = vh - g.padBot - g.arrow;
  /* The remainder, which is what makes the column sum at any height rather than
     only at the four in the table. */
  g.work = Math.max(0, g.arrowTop - g.g4 - g.workTop);
  g.workBot = g.workTop + g.work;
  g.synH = g.work - g.pingH - 12;

  /* Orbital: fluid between the anchors, with the spec's own floors and
     ceilings so it never goes illegible or swallows the work area. */
  g.orbRest = clamp(Math.min(vw * 0.305, vh * 0.58), 360, 520);
  g.orbMini = clamp(vw * 0.122, 140, 200);
  if (g.phone) g.orbMini = 152;
  /* Sized from the diameter, not the viewBox, because both become unreadable
     if they scale with it. 04-SPEC.md section 4. */
  g.orbIcon = Math.max(13, g.orbRest * 0.045);
  g.orbIconMini = Math.max(13, g.orbMini * 0.045);
  g.orbHub = Math.max(62, g.orbRest * 0.2);
  g.orbHubMini = Math.max(62, g.orbMini * 0.2);
  g.orbHubLabel = Math.max(12, g.orbRest * 0.048);
  g.orbHubLabelMini = Math.max(12, g.orbMini * 0.048);

  /* The mini orbital parks against the top of the header block, so the eyebrow
     hairline and the kicker have to stop clear of it. The spec resolves the
     conflict this way rather than dropping the orbital to 144. */
  g.headMax = g.phone ? g.content : g.content - g.orbMini - 32;

  /* The right stack splits the work area in the spec's 248:272 proportion, so
     the two cards plus their 16 gap always equal the work area exactly. */
  const stack = g.work - 16;
  g.chartH = Math.round((stack * 248) / 520);
  g.newsH = stack - g.chartH;

  /* Dataset rows fill the sourced-matches card. All eight are always listed, so
     the height is derived from the space rather than set per tier.

     The spec's 42px floor is calibrated exactly for the 1366 work area of 442:
     eight rows and seven gaps come to 378 inside a 382 box, four to spare. Any
     shorter work area overflows it, and plenty of real viewports are shorter,
     1280x720 among them at a 334 box. A tier constant cannot express that, so
     the height is continuous and the floor only catches the extreme.

     Below 42 the row drops its detail text and shows the chip and flag alone,
     which is the treatment 07 C.3 gives the short tier, applied when the space
     actually calls for it rather than when the viewport happens to be short. */
  const rowsBox = g.work - 32 - 16 - 12;
  g.rowH = clamp((rowsBox - 7 * g.rowGap) / 8, 28, 69);
  g.rowDetail = g.rowH >= 42;
  /* At the floor on a very short desktop window even eight minimal rows do not
     fit. The list then scrolls thinly inside the card, which is the same
     absorber the synthesis body uses: never a clipped card, never a dropped
     dataset. */
  g.rowsScroll = 8 * g.rowH + 7 * g.rowGap > rowsBox + 0.5;

  return g;
}

/** Every zone in the order the spec's table lists them, for verification. */
export function zoneSum(g) {
  return (
    g.nav +
    g.padTop +
    g.eyebrow +
    g.g1 +
    g.head +
    g.g2 +
    g.sub +
    g.g3 +
    g.work +
    g.g4 +
    g.arrow +
    g.padBot
  );
}
