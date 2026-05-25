/**
 * Client-side ELO change event bus.
 * UI surfaces listen for `elo:changed`; award flows emit after success responses.
 */

export const ELO_CHANGE_EVENT = 'elo:changed';

/**
 * @param {object} [detail] - { delta, newRating, oldRating, source }
 */
export function emitEloChanged(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ELO_CHANGE_EVENT, {
      detail: { timestamp: Date.now(), ...detail },
    }),
  );
}

/**
 * @param {(detail: object) => void} handler
 * @returns {() => void} unsubscribe
 */
export function subscribeEloChanged(handler) {
  if (typeof window === 'undefined') return () => {};
  const listener = (e) => handler(e.detail || {});
  window.addEventListener(ELO_CHANGE_EVENT, listener);
  return () => window.removeEventListener(ELO_CHANGE_EVENT, listener);
}
