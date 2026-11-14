/**
 * Mock Trading investment theses, server side (Nov 14 2026): list, create,
 * update, activate and delete, behind /api/mock-theses. Also the trade
 * journal's note edit behind PATCH /api/mock-trades/[id].
 *
 * Pure handlers over a Supabase-like client, so a check script can drive them
 * with scripts/lib/mock-supabase.mjs. Each returns { status, body }; errors
 * are { error } with a message safe to show. Every query is filtered by the
 * caller's user id (the routes pass the service-role client after
 * withApiGuard has authenticated the caller). `mock_theses` is owner-select
 * only under RLS; nothing here trusts an id or a flag from the request body.
 *
 * Validation is the shared parseThesis / parseThesisNote in mock-thesis.js,
 * so the Build thesis modal and the server enforce the same limits.
 */

import { THESIS_LIMITS, parseThesis, parseThesisNote, thesisNameKey } from './mock-thesis.js';

const UNIQUE_VIOLATION = '23505';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS =
  'id, name, objective, time_horizon, risk_tolerance, sector_focus, position_rules, max_single_name_pct, is_active, created_at, updated_at';

export const isThesisId = (id) => typeof id === 'string' && UUID_RE.test(id);

const fail = (status, error) => ({ status, body: { error } });
const LIMIT_MSG = `You can keep up to ${THESIS_LIMITS.maxTheses} theses. Delete one to build another.`;
const DUP_MSG = 'You already have a thesis with that name.';

/** A stored row in the shape the page uses (numeric cap as a number). */
export function toThesis(row) {
  return {
    id: row.id,
    name: row.name,
    objective: row.objective || '',
    time_horizon: row.time_horizon,
    risk_tolerance: row.risk_tolerance,
    sector_focus: Array.isArray(row.sector_focus) ? row.sector_focus : [],
    position_rules: row.position_rules || '',
    max_single_name_pct: Number(row.max_single_name_pct),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadAll(client, userId) {
  const { data, error } = await client
    .from('mock_theses')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(toThesis);
}

const listBody = (theses, extra = {}) => ({
  theses,
  activeId: theses.find((t) => t.is_active)?.id || null,
  ...extra,
});

/** GET: { theses, activeId }, oldest first. */
export async function listTheses(client, userId) {
  return { status: 200, body: listBody(await loadAll(client, userId)) };
}

/** The caller's active thesis id, or null (stamped onto new trades). */
export async function getActiveThesisId(client, userId) {
  const { data, error } = await client
    .from('mock_theses')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) return null;
  return data?.id || null;
}

/**
 * POST: create. 409 at the thesis limit or on a duplicate name (ignoring case
 * and spacing). The first thesis becomes the active one.
 */
export async function createThesis(client, userId, body, { sectors } = {}) {
  const parsed = parseThesis(body, { sectors });
  if (!parsed.ok) return fail(400, parsed.error);
  const existing = await loadAll(client, userId);
  if (existing.length >= THESIS_LIMITS.maxTheses) return fail(409, LIMIT_MSG);
  const key = thesisNameKey(parsed.value.name);
  if (existing.some((t) => thesisNameKey(t.name) === key)) return fail(409, DUP_MSG);
  const { data, error } = await client
    .from('mock_theses')
    .insert({ user_id: userId, ...parsed.value, is_active: existing.length === 0 })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return fail(409, DUP_MSG);
    throw new Error(error.message);
  }
  const theses = await loadAll(client, userId);
  return { status: 201, body: listBody(theses, { thesis: toThesis(data) }) };
}

/**
 * Make one thesis the active one: clear the current active row, then set the
 * new one. The partial unique index (one active row per user) guards the
 * second step; a lost race returns 409 and the client refetches.
 */
async function activate(client, userId, id) {
  const all = await loadAll(client, userId);
  const target = all.find((t) => t.id === id);
  if (!target) return fail(404, 'Thesis not found.');
  if (!target.is_active) {
    const { error: offErr } = await client
      .from('mock_theses')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('id', id);
    if (offErr) throw new Error(offErr.message);
    const { error: onErr } = await client
      .from('mock_theses')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
    if (onErr) {
      if (onErr.code === UNIQUE_VIOLATION)
        return fail(409, 'Your theses changed in another tab. Refresh and try again.');
      throw new Error(onErr.message);
    }
  }
  return { status: 200, body: listBody(await loadAll(client, userId)) };
}

/**
 * PATCH: `{ activate: true }` alone switches the active thesis; otherwise the
 * body is a partial edit validated by parseThesis. 404 unless the row is the
 * caller's; 409 on a duplicate name.
 */
export async function updateThesis(client, userId, id, body, { sectors } = {}) {
  if (!isThesisId(id)) return fail(404, 'Thesis not found.');
  if (body && typeof body === 'object' && !Array.isArray(body) && 'activate' in body) {
    if (body.activate !== true || Object.keys(body).length !== 1)
      return fail(400, 'Send { activate: true } on its own.');
    return activate(client, userId, id);
  }
  const parsed = parseThesis(body, { sectors, partial: true });
  if (!parsed.ok) return fail(400, parsed.error);
  const all = await loadAll(client, userId);
  if (!all.some((t) => t.id === id)) return fail(404, 'Thesis not found.');
  if (parsed.value.name) {
    const key = thesisNameKey(parsed.value.name);
    if (all.some((t) => t.id !== id && thesisNameKey(t.name) === key)) return fail(409, DUP_MSG);
  }
  const { data, error } = await client
    .from('mock_theses')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select(COLUMNS)
    .maybeSingle();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return fail(409, DUP_MSG);
    throw new Error(error.message);
  }
  if (!data) return fail(404, 'Thesis not found.');
  return { status: 200, body: listBody(await loadAll(client, userId), { thesis: toThesis(data) }) };
}

/**
 * DELETE: remove the thesis. Trades placed under it keep their note (the
 * foreign key sets thesis_id to null). If it was active, the oldest remaining
 * thesis becomes active.
 */
export async function deleteThesis(client, userId, id) {
  if (!isThesisId(id)) return fail(404, 'Thesis not found.');
  const all = await loadAll(client, userId);
  const target = all.find((t) => t.id === id);
  if (!target) return fail(404, 'Thesis not found.');
  const { error } = await client.from('mock_theses').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
  const rest = all.filter((t) => t.id !== id);
  if (target.is_active && rest.length) return activate(client, userId, rest[0].id);
  return { status: 200, body: listBody(await loadAll(client, userId)) };
}

/**
 * PATCH /api/mock-trades/[id]: `{ thesis_note }` only. An empty note clears
 * it. 404 unless the trade belongs to the caller.
 */
export async function updateTradeNote(client, userId, id, body) {
  if (!isThesisId(id)) return fail(404, 'Trade not found.');
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'Invalid note.');
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'thesis_note')
    return fail(400, 'Send { thesis_note } only.');
  const parsed = parseThesisNote(body.thesis_note);
  if (!parsed.ok) return fail(400, parsed.error);
  const { data, error } = await client
    .from('mock_trades')
    .update({ thesis_note: parsed.value })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, thesis_note')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return fail(404, 'Trade not found.');
  return { status: 200, body: { trade: data } };
}
