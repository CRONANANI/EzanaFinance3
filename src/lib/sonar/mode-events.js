/**
 * Sonar research-mode events (Nov 2026): one row per classification and per
 * choice (deep offered, accepted, quick chosen, Go deeper shown or clicked,
 * sign-up required, deep quota reached) in public.sonar_mode_events. They
 * become labels for the classifier's evaluation set.
 *
 * Never fails a request: every write is bounded by the caller and errors are
 * swallowed. Guests are recorded by salted IP hash only, never a raw IP.
 */
import { MODE_VERSION } from '@/lib/sonar/research-mode';

export const MODE_EVENT_ACTIONS = new Set([
  'classified',
  'offered_deep',
  'accepted_deep',
  'chose_quick',
  'go_deeper_shown',
  'go_deeper_clicked',
  'signup_gate',
  'deep_quota',
]);
export const CLIENT_ACTIONS = new Set([
  'offered_deep',
  'accepted_deep',
  'chose_quick',
  'go_deeper_shown',
  'go_deeper_clicked',
]);
const MODES = new Set(['quick', 'standard', 'deep']);
const CONFIDENCE = new Set(['clear', 'borderline']);

/** The row for an event, or null when it is invalid. Pure. */
export function modeEventRow({
  query,
  action,
  predictedMode,
  confidence,
  score = null,
  triggers = [],
  ranMode = null,
  details = {},
  queryId = null,
  userId = null,
  ipHash = null,
  version = MODE_VERSION,
}) {
  const q = String(query || '')
    .trim()
    .slice(0, 600);
  if (!q || !MODE_EVENT_ACTIONS.has(action)) return null;
  if (!MODES.has(predictedMode) || !CONFIDENCE.has(confidence)) return null;
  const n = Number(score);
  return {
    query_id: queryId || null,
    user_id: userId || null,
    ip_hash: userId ? null : ipHash || null,
    query_text: q,
    classifier_version: String(version || MODE_VERSION).slice(0, 40),
    predicted_mode: predictedMode,
    confidence,
    score: Number.isFinite(n) ? n : null,
    triggers: (Array.isArray(triggers) ? triggers : [])
      .map((x) => String(x).slice(0, 60))
      .slice(0, 12),
    action,
    ran_mode: MODES.has(ranMode) ? ranMode : null,
    details: details && typeof details === 'object' && !Array.isArray(details) ? details : {},
  };
}

/** The event fields of a classification. */
export function fromClassification(c) {
  return {
    predictedMode: c?.mode,
    confidence: c?.confidence,
    score: c?.score,
    triggers: c?.triggers || [],
    version: c?.version,
  };
}

/** Write one event. Resolves true when stored, false otherwise; never throws. */
export async function logModeEvent(admin, event) {
  try {
    const row = modeEventRow(event);
    if (!row || !admin) return false;
    const { error } = await admin.from('sonar_mode_events').insert(row);
    return !error;
  } catch {
    return false;
  }
}
