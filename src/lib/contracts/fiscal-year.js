/**
 * Federal fiscal years (October to September). Pure, so client and server
 * code can share it without pulling in the warehouse client.
 */
export const HISTORY_YEARS = 10;

/** The fiscal year the federal government is in on `date` (October starts it). */
export function currentFiscalYear(date = new Date()) {
  return date.getUTCMonth() >= 9 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
}
