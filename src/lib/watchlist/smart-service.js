/**
 * Smart Watchlist service (Nov 2026), server only. The routes under
 * /api/watchlists/smart stay thin and call these.
 *
 * Reads and writes the user owns go through the caller's RLS-scoped client
 * (`db`); the engine run uses the service-role client (`admin`) with the rule
 * already verified as the caller's.
 */
import { runSmartRule, previewRule } from '@/lib/watchlist/smart-engine';
import { sanitizeRule } from '@/lib/watchlist/smart-rules';

const MAX_LABEL = 80;
const RUN_COOLDOWN_MS = 2 * 60000;

export class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const cleanLabel = (v) => {
  const label = typeof v === 'string' ? v.trim() : '';
  if (!label) throw new ServiceError(400, 'Give the smart watchlist a name.');
  if (label.length > MAX_LABEL)
    throw new ServiceError(400, `Name too long (max ${MAX_LABEL} characters).`);
  return label;
};

const ruleOut = (r) => ({
  id: r.id,
  listId: r.list_id,
  assetClass: r.asset_class,
  match: r.match,
  conditions: r.conditions,
  maxItems: r.max_items,
  notify: r.notify,
  enabled: r.enabled,
  lastRunAt: r.last_run_at,
  lastRunAdded: r.last_run_added,
  lastError: r.last_error,
});

async function ownRule(db, userId, ruleId) {
  const { data, error } = await db
    .from('smart_watchlist_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ServiceError(404, 'Smart watchlist not found.');
  return data;
}

/** Rules with their list labels, plus the latest auto-adds across all smart lists. */
export async function listSmart(db, userId, { limit = 20 } = {}) {
  const [
    { data: rules, error: rErr },
    { data: events, error: eErr },
    { data: lists, error: lErr },
  ] = await Promise.all([
    db.from('smart_watchlist_rules').select('*').eq('user_id', userId).order('created_at'),
    db
      .from('smart_watchlist_events')
      .select('id, list_id, item_type, ticker, name, reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db.from('user_watchlists').select('id, label').eq('user_id', userId),
  ]);
  if (rErr) throw rErr;
  if (eErr) throw eErr;
  if (lErr) throw lErr;
  const label = new Map((lists || []).map((l) => [l.id, l.label]));
  return {
    rules: (rules || []).map((r) => ({
      ...ruleOut(r),
      label: label.get(r.list_id) || 'Smart watchlist',
    })),
    events: (events || []).map((e) => ({
      id: e.id,
      listId: e.list_id,
      listLabel: label.get(e.list_id) || 'Smart watchlist',
      type: e.item_type,
      ticker: e.ticker,
      name: e.name,
      reason: e.reason,
      at: e.created_at,
    })),
  };
}

/** Create a list and its rule, then run it once. */
export async function createSmart(db, admin, userId, body) {
  const label = cleanLabel(body?.label);
  const r = sanitizeRule(body?.rule);
  if (!r.ok) throw new ServiceError(400, r.error);

  const { data: positions } = await db
    .from('user_watchlists')
    .select('sort_order')
    .eq('user_id', userId);
  const nextSort = Math.max(0, ...(positions || []).map((p) => Number(p.sort_order) || 0)) + 10;

  const { data: list, error: listErr } = await db
    .from('user_watchlists')
    .insert({ user_id: userId, label, sort_order: nextSort })
    .select('id, label')
    .single();
  if (listErr) {
    if (listErr.code === '23505')
      throw new ServiceError(409, 'You already have a watchlist with that name.');
    throw listErr;
  }

  const { data: rule, error: ruleErr } = await db
    .from('smart_watchlist_rules')
    .insert({ user_id: userId, list_id: list.id, ...r.rule })
    .select('*')
    .single();
  if (ruleErr) {
    await db.from('user_watchlists').delete().eq('id', list.id).eq('user_id', userId);
    throw ruleErr;
  }

  let run = { added: [] };
  let runError = null;
  if (rule.enabled) {
    try {
      run = await runSmartRule(admin, rule);
    } catch (err) {
      runError = String(err?.message || err);
    }
  }
  return {
    watchlist: { id: list.id, label: list.label },
    rule: ruleOut(rule),
    added: run.added,
    runError,
  };
}

/** Edit conditions, caps, notify, enabled or the list name. Re-runs when the rule changed. */
export async function updateSmart(db, admin, userId, ruleId, body) {
  const current = await ownRule(db, userId, ruleId);
  const patch = { updated_at: new Date().toISOString() };
  let ruleChanged = false;

  if (body?.rule) {
    const r = sanitizeRule({ ...body.rule, enabled: body.rule.enabled ?? current.enabled });
    if (!r.ok) throw new ServiceError(400, r.error);
    Object.assign(patch, r.rule);
    ruleChanged = true;
  }
  if (typeof body?.enabled === 'boolean') patch.enabled = body.enabled;
  if (typeof body?.notify === 'boolean') patch.notify = body.notify;

  if (body?.label !== undefined) {
    const label = cleanLabel(body.label);
    const { error } = await db
      .from('user_watchlists')
      .update({ label, updated_at: patch.updated_at })
      .eq('id', current.list_id)
      .eq('user_id', userId);
    if (error) {
      if (error.code === '23505')
        throw new ServiceError(409, 'You already have a watchlist with that name.');
      throw error;
    }
  }

  const { data: rule, error } = await db
    .from('smart_watchlist_rules')
    .update(patch)
    .eq('id', ruleId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;

  let added = [];
  if (rule.enabled && (ruleChanged || (patch.enabled && !current.enabled))) {
    try {
      added = (await runSmartRule(admin, rule)).added;
    } catch {
      /* last_error is stored on the rule */
    }
  }
  return { rule: ruleOut(rule), added };
}

/** Stop a list being smart. Its items stay; it becomes an ordinary list. */
export async function deleteSmart(db, userId, ruleId) {
  await ownRule(db, userId, ruleId);
  const { error } = await db
    .from('smart_watchlist_rules')
    .delete()
    .eq('id', ruleId)
    .eq('user_id', userId);
  if (error) throw error;
  return { ok: true };
}

/** Run now (at most once every two minutes per rule). */
export async function runSmartNow(db, admin, userId, ruleId) {
  const rule = await ownRule(db, userId, ruleId);
  const last = rule.last_run_at ? Date.parse(rule.last_run_at) : 0;
  if (last && Date.now() - last < RUN_COOLDOWN_MS) {
    throw new ServiceError(429, 'This smart watchlist just ran. Try again in a couple of minutes.');
  }
  const run = await runSmartRule(admin, rule);
  return { added: run.added };
}

/** What a draft rule would add now, without saving it. */
export async function previewSmart(admin, body) {
  const r = sanitizeRule(body?.rule);
  if (!r.ok) throw new ServiceError(400, r.error);
  return previewRule(admin, r.rule);
}
