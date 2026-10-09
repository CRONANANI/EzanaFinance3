/**
 * Motion primitives for the Sonar band: the eased entry scroll that locks the
 * band in, and the demo pointer that travels to the Ping button.
 *
 * Both are driven by requestAnimationFrame and write straight to the DOM, so
 * neither costs a React render per frame. Both are deterministic (no
 * Math.random), and both return a cancel function.
 */

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/* Minimum-jerk profile: the velocity curve human reaching movements follow.
   Starts and ends at zero velocity AND zero acceleration, which is what reads
   as a hand rather than a tween. */
export const minJerk = (t) => t * t * t * (10 - 15 * t + 6 * t * t);

/**
 * Scroll the window to `top` along an ease-out curve.
 *
 * Native `behavior: 'smooth'` has no fixed duration and no completion event,
 * and the old lock froze the body on a 900ms deadline that sometimes landed
 * mid-glide, which is the jump at the moment of lock. This runs to an exact
 * end frame and calls onDone there.
 *
 * Ease-out, not ease-in-out: the visitor is already scrolling down, so the
 * motion should continue their momentum and settle, not stall and restart.
 */
export function animateWindowScroll(top, { duration, onDone } = {}) {
  const root = document.documentElement;
  const from = window.scrollY;
  const delta = top - from;
  const dur =
    typeof duration === 'number'
      ? duration
      : Math.max(420, Math.min(820, 380 + Math.abs(delta) * 0.45));

  /* globals.css sets scroll-behavior: smooth on the root, which would turn
     every per-frame scrollTo below into its own smooth scroll. */
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';

  let raf = 0;
  let start = 0;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    root.style.scrollBehavior = previous;
    onDone?.();
  };
  const frame = (now) => {
    if (!start) start = now;
    const t = Math.min(1, (now - start) / dur);
    window.scrollTo(0, Math.round(from + delta * easeOutCubic(t)));
    if (t < 1) raf = requestAnimationFrame(frame);
    else finish();
  };
  if (Math.abs(delta) < 1) {
    finish();
    return () => {};
  }
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    if (!done) {
      done = true;
      root.style.scrollBehavior = previous;
    }
  };
}

/* Quadratic Bezier point. */
const qb = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

/**
 * Move an absolutely positioned pointer from `from` to `to` like a hand
 * would: a short reaction pause, an arced path (people do not move a mouse in
 * straight lines), a minimum-jerk speed profile, a small overshoot past the
 * target and a correction back onto it, then a dwell before the press.
 *
 * Resolves after the press has visually landed; `onPress` fires at the moment
 * the pointer depresses, so the caller can press the button in the same frame.
 *
 * @param {HTMLElement|SVGElement} el
 * @param {{x:number,y:number}} from
 * @param {{x:number,y:number}} to
 * @param {{ onPress?: () => void, isCancelled?: () => boolean }} opts
 * @returns {{ done: Promise<void>, cancel: () => void }}
 */
export function humanPointer(el, from, to, { onPress, isCancelled } = {}) {
  let raf = 0;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  /* Fitts-flavoured duration: longer reaches take longer, within bounds. */
  const travel = Math.max(520, Math.min(900, 420 + dist * 0.55));
  /* Arc: the control point sits off the midpoint, perpendicular to the line,
     bowed upward for a rightward reach (the wrist pivots, the path curves). */
  const nx = -dy / dist;
  const ny = dx / dist;
  const bow = Math.min(46, dist * 0.12);
  const cx = from.x + dx * 0.5 + nx * -bow;
  const cy = from.y + dy * 0.5 + ny * -bow;
  /* Overshoot a few pixels along the direction of travel, then correct. */
  const over = Math.min(7, dist * 0.02);
  const ox = to.x + (dx / dist) * over;
  const oy = to.y + (dy / dist) * over;

  const set = (x, y, s, o) => {
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${s})`;
    if (o != null) el.style.opacity = String(o);
  };

  /* Phase table, in ms from start. */
  const FADE = 160;
  const REACT = 120;
  const T_MOVE = FADE + REACT;
  const T_CORRECT = T_MOVE + travel;
  const CORRECT = 150;
  const DWELL = 170;
  const T_PRESS = T_CORRECT + CORRECT + DWELL;
  const PRESS = 95;
  const RELEASE = 140;
  const T_END = T_PRESS + PRESS + RELEASE;

  set(from.x, from.y, 1, 0);

  const done = new Promise((resolve) => {
    let start = 0;
    let pressed = false;
    const frame = (now) => {
      if (cancelled || isCancelled?.()) {
        resolve();
        return;
      }
      if (!start) start = now;
      const e = now - start;

      if (e < T_MOVE) {
        /* Fade in where the eye already is, with a 2px settle. */
        const t = Math.min(1, e / FADE);
        set(from.x, from.y + (1 - t) * 2, 1, 0.95 * t);
      } else if (e < T_CORRECT) {
        const t = minJerk((e - T_MOVE) / travel);
        set(qb(from.x, cx, ox, t), qb(from.y, cy, oy, t), 1, 0.95);
      } else if (e < T_CORRECT + CORRECT) {
        const t = minJerk((e - T_CORRECT) / CORRECT);
        set(ox + (to.x - ox) * t, oy + (to.y - oy) * t, 1, 0.95);
      } else if (e < T_PRESS) {
        set(to.x, to.y, 1, 0.95);
      } else if (e < T_PRESS + PRESS) {
        if (!pressed) {
          pressed = true;
          onPress?.();
        }
        const t = (e - T_PRESS) / PRESS;
        set(to.x, to.y, 1 - 0.14 * t, 0.95);
      } else if (e < T_END) {
        const t = (e - T_PRESS - PRESS) / RELEASE;
        set(to.x, to.y, 0.86 + 0.14 * minJerk(t), 0.95);
      } else {
        set(to.x, to.y, 1, 0.95);
        resolve();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });

  return { done, cancel };
}
