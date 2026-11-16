/**
 * Which pitches have sealed ballots right now: those attached to a committee
 * meeting whose ballot is blind and which has not been closed. Read with the
 * signed-in member's client. A leaf module (it imports only the pure rules),
 * so any server reader of ballots can use it.
 */
import { isBlindOpen } from './ballot-privacy.js';

/**
 * Ids of the committee meetings whose ballot is blind and still open, among
 * the meetings these pitch rows are attached to. One query, and none at all
 * when no row has a meeting.
 */
export async function loadSealedMeetingIds(supabase, orgId, rows) {
  const ids = [...new Set((rows || []).map((r) => r?.ic_meeting_id).filter(Boolean))];
  if (!ids.length) return new Set();
  const { data, error } = await supabase
    .from('org_ic_meetings')
    .select('id, ballot_type, status')
    .eq('org_id', orgId)
    .in('id', ids);
  /* If the meetings cannot be read, treat every attached pitch as sealed:
     hiding a tally by mistake is recoverable, showing one is not. */
  if (error) return new Set(ids);
  return new Set((data || []).filter(isBlindOpen).map((m) => m.id));
}

/** Pitch ids in the org whose ballots are sealed right now. */
export async function loadSealedPitchIds(supabase, orgId) {
  const { data: meetings, error } = await supabase
    .from('org_ic_meetings')
    .select('id, ballot_type, status')
    .eq('org_id', orgId);
  if (error) return null; // unknown: callers must then leave ballot figures out
  const sealed = (meetings || []).filter(isBlindOpen).map((m) => m.id);
  if (!sealed.length) return new Set();
  const { data: rows, error: rowsError } = await supabase
    .from('org_pitches')
    .select('id')
    .eq('org_id', orgId)
    .in('ic_meeting_id', sealed);
  if (rowsError) return null;
  return new Set((rows || []).map((r) => r.id));
}
