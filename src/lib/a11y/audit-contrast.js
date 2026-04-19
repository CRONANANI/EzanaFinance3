/**
 * Dev-only contrast auditor. Walks the DOM inside a scope selector and
 * logs any text node whose computed color fails WCAG AA against its
 * nearest opaque ancestor background.
 *
 * Usage:
 *   useEffect(() => {
 *     if (process.env.NODE_ENV !== 'production') {
 *       const t = setTimeout(() => auditContrast('.er-page'), 600);
 *       return () => clearTimeout(t);
 *     }
 *   }, [dependencies]);
 *
 * Rules applied (simplified WCAG 2.1):
 *   - Normal text (<14pt bold / <18pt regular) → ratio >= 4.5
 *   - Large text                                → ratio >= 3.0
 *   - Elements with `data-contrast-ignore` are skipped (use on
 *     decorative tick labels, flag emojis, etc.).
 *
 * The auditor is best-effort — it ignores elements with
 * semi-transparent backgrounds (it can't know what's behind them),
 * and Recharts SVG text is also skipped because the chart background
 * is an SVG rect that doesn't register as a CSS background.
 */

function parseRgb(str) {
  if (!str) return null;
  const m = str.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(',').map((s) => Number(s.trim()));
  if (parts.length < 3) return null;
  const [r, g, b, a = 1] = parts;
  return { r, g, b, a };
}

function relLuminance({ r, g, b }) {
  const srgb = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(fg, bg) {
  const L1 = relLuminance(fg);
  const L2 = relLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Walk up the DOM until we find an opaque background color. */
function resolveBackground(el) {
  let cur = el;
  while (cur && cur !== document.documentElement) {
    const style = getComputedStyle(cur);
    const bg = parseRgb(style.backgroundColor);
    if (bg && bg.a >= 0.95) return bg;
    cur = cur.parentElement;
  }
  // fallback: document body (best guess for the page background)
  const bodyBg = parseRgb(getComputedStyle(document.body).backgroundColor);
  return bodyBg || { r: 13, g: 15, b: 19, a: 1 };
}

function isLargeText(el) {
  const style = getComputedStyle(el);
  const sizePx = parseFloat(style.fontSize);
  const weight = Number(style.fontWeight) || 400;
  // WCAG: >=18pt (24px) OR >=14pt bold (~18.66px + bold)
  if (sizePx >= 24) return true;
  if (sizePx >= 18.66 && weight >= 700) return true;
  return false;
}

/** Only elements that own direct text content (not just nested containers). */
function ownsDirectText(el) {
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').trim().length > 0) {
      return true;
    }
  }
  return false;
}

export function auditContrast(scopeSelector = '.er-page') {
  if (typeof document === 'undefined') return { checked: 0, failed: [] };
  const scope = document.querySelector(scopeSelector);
  if (!scope) return { checked: 0, failed: [] };

  const all = scope.querySelectorAll(
    '*:not(svg):not(svg *):not(i.bi):not([data-contrast-ignore]):not([data-contrast-ignore] *)',
  );

  let checked = 0;
  const failed = [];

  all.forEach((el) => {
    if (!ownsDirectText(el)) return;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return;
    const fg = parseRgb(style.color);
    if (!fg || fg.a < 0.5) return;
    const bg = resolveBackground(el);
    const ratio = contrastRatio(fg, bg);
    const threshold = isLargeText(el) ? 3.0 : 4.5;
    checked += 1;
    if (ratio < threshold) {
      el.setAttribute('data-contrast-fail', ratio.toFixed(2));
      failed.push({
        el,
        ratio: Number(ratio.toFixed(2)),
        threshold,
        fg: `rgb(${fg.r},${fg.g},${fg.b})`,
        bg: `rgb(${bg.r},${bg.g},${bg.b})`,
        text: (el.textContent || '').trim().slice(0, 60),
      });
    } else {
      el.removeAttribute('data-contrast-fail');
    }
  });

  if (failed.length > 0) {
    // eslint-disable-next-line no-console
    console.groupCollapsed(
      `[contrast] ${failed.length} element(s) fail WCAG AA in ${scopeSelector}`,
    );
    for (const f of failed) {
      // eslint-disable-next-line no-console
      console.warn(
        `${f.ratio}:1 (needs ${f.threshold}:1) — "${f.text}"  fg=${f.fg}  bg=${f.bg}`,
        f.el,
      );
    }
    // eslint-disable-next-line no-console
    console.groupEnd();
  } else {
    // eslint-disable-next-line no-console
    console.info(`[contrast] ${scopeSelector} — ${checked} element(s) pass WCAG AA`);
  }

  return { checked, failed };
}

export default auditContrast;
