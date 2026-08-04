'use client';

/**
 * Shared, card-local tooltip. Every explorer card renders ONE <OecdTip> inside a
 * `position: relative` container and drives it with `{ x, y, flip, lines }`
 * state. Card-local (not a portal) so it needs no scroll tracking; it follows
 * the cursor with an 8px offset and flips horizontally near the card's right
 * edge. Pointer-events are disabled so it never eats the hover it describes.
 *
 * `lines`: [{ label, value, tone? }] — tone 'pos' | 'neg' colours the value.
 */
export default function OecdTip({ tip }) {
  if (!tip || !tip.lines?.length) return null;
  return (
    <div
      className={`oecd-tip ${tip.flip ? 'is-flip' : ''}`}
      style={{ left: tip.x, top: tip.y }}
      role="presentation"
    >
      {tip.title ? <div className="oecd-tip-title">{tip.title}</div> : null}
      {tip.lines.map((ln, i) => (
        <div className="oecd-tip-row" key={i}>
          {ln.label != null ? <span className="oecd-tip-k">{ln.label}</span> : null}
          {ln.value != null ? (
            <span
              className={`oecd-tip-v oecd-num ${
                ln.tone === 'pos' ? 'is-pos' : ln.tone === 'neg' ? 'is-neg' : ''
              }`}
            >
              {ln.value}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Build tooltip state from a pointer event, positioned in the container's local
 * coordinate space. `flip` when within 130px of the right edge so a wide tip
 * doesn't overflow the card.
 */
export function tipFromEvent(e, containerEl, payload) {
  if (!containerEl) return null;
  const rect = containerEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const flip = x > rect.width - 130;
  return {
    x: x + (flip ? -8 : 8),
    y: y + 8,
    flip,
    ...payload,
  };
}

/** Build tooltip state from an element's box (for keyboard focus, which carries
 *  no cursor coordinates) — anchored at the element's bottom-left. */
export function tipFromElement(el, containerEl, payload) {
  if (!el || !containerEl) return null;
  const rect = containerEl.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  const x = box.left - rect.left;
  const y = box.bottom - rect.top;
  const flip = x > rect.width - 130;
  return { x: x + (flip ? -8 : 8), y: y + 4, flip, ...payload };
}

/** Build tooltip state anchored at explicit local coords (for SVG crosshairs). */
export function tipAt(localX, localY, containerEl, payload) {
  const width = containerEl?.clientWidth ?? 0;
  const flip = localX > width - 130;
  return {
    x: localX + (flip ? -8 : 8),
    y: localY + 8,
    flip,
    ...payload,
  };
}
