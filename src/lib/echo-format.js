/** Echo date formatters (pure; no data dependency). Nov 18 2026: month
    first with an ordinal day, "November 2nd, 2026" (lib/echo-dates.js). */
import { longUsDate } from '@/lib/echo-dates';

export function formatPublishedDate(iso) {
  return longUsDate(iso);
}

export function formatPublishedShort(iso) {
  return longUsDate(iso, { year: false });
}
