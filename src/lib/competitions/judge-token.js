import crypto from 'node:crypto';

/**
 * Judge magic-link tokens. Judges have no account — this token IS the credential.
 * We store only its SHA-256 hash; the raw token appears once, in the invite link.
 * If the DB leaks, the raw tokens don't. Verification hashes the presented token
 * and looks it up. Server-only (never import into client code).
 */

/** Mint a high-entropy, URL-safe token. Returns { raw, hash }. */
export function mintJudgeToken() {
  const raw = crypto.randomBytes(32).toString('base64url'); // ~43 chars
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

/** Read the judge token from ?token=, the x-judge-token header, or a Bearer. */
export function tokenFromRequest(request) {
  try {
    const q = new URL(request.url).searchParams.get('token');
    if (q) return q;
  } catch {
    /* ignore */
  }
  const header = request.headers.get('x-judge-token');
  if (header) return header;
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/**
 * Resolve a raw token to its judge, or null. This IS the auth boundary, so it is
 * exhaustive: unknown hash, revoked, or expired all return null. Uses the
 * service-role client (bypasses RLS — judges have no auth.uid()).
 */
export async function resolveJudge(admin, rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 20) return null;
  const { data } = await admin
    .from('pitch_judges')
    .select('id, competition_id, full_name, firm, title, token_revoked, token_expires_at')
    .eq('token_hash', hashToken(rawToken))
    .maybeSingle();
  if (!data) return null;
  if (data.token_revoked) return null;
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) return null;
  return data;
}

/** The rooms a judge is assigned to (ids), via pitch_room_judges. */
export async function judgeRoomIds(admin, judgeId) {
  const { data } = await admin.from('pitch_room_judges').select('room_id').eq('judge_id', judgeId);
  return (data || []).map((r) => r.room_id);
}

/** True iff `teamId` is a team assigned to one of the judge's rooms. The single
 *  authorization check every team-scoped judge request must pass. */
export async function judgeCanAccessTeam(admin, judgeId, teamId) {
  const roomIds = await judgeRoomIds(admin, judgeId);
  if (!roomIds.length) return false;
  const { data } = await admin
    .from('pitch_teams')
    .select('id')
    .eq('id', teamId)
    .in('room_id', roomIds)
    .maybeSingle();
  return !!data;
}
