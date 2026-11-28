/**
 * Provider-data state contract (Sonar 6.4 final integration, Nov 28 2026). Browser-safe.
 *
 * Every response from a route that can fall back to sample data carries the server's own
 * statement of what it returned, in the `x-ezana-data-state` header:
 *
 *   live         the provider answered; the figures are market or reported data
 *   sample       the provider refused and this request was authorized for demonstration
 *                data; every figure is synthetic (lib/market-sample/generators.js)
 *   unavailable  the provider refused and sample data was not authorized; the route's own
 *                empty or error answer stands
 *
 * The header is set by the server after it decided; nothing a client sends can change it.
 */
export const DATA_STATE = Object.freeze({
  LIVE: 'live',
  SAMPLE: 'sample',
  UNAVAILABLE: 'unavailable',
});

export const DATA_STATE_HEADER = 'x-ezana-data-state';

/** The state a response declares; responses without the header are live by default. */
export function dataStateOf(res) {
  const v = res?.headers?.get?.(DATA_STATE_HEADER);
  return v === DATA_STATE.SAMPLE || v === DATA_STATE.UNAVAILABLE ? v : DATA_STATE.LIVE;
}

/** True only for a response the server marked as synthetic. */
export const isSampleResponse = (res) => dataStateOf(res) === DATA_STATE.SAMPLE;

/** A row or series element the generators produced (they all carry `_sample: true`). */
export const isSampleRecord = (x) => Boolean(x && typeof x === 'object' && x._sample === true);
