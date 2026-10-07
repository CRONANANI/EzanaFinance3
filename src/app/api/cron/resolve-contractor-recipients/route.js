import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';

/**
 * Resolves contract recipients to their USAspending parent, then to a ticker.
 *
 * The search endpoint the ingests use never returns a parent; the recipient
 * profile does. For each recipient_id on an award that has no row in
 * contractor_recipients yet (biggest dollars first), this fetches
 * GET /api/v2/recipient/{id}/, stores name / UEI / parent / business types,
 * then runs contractor_resolve_tickers() so the new rows get a ticker from
 * contractor_tickers + contractor_ticker_prefixes.
 *
 * Resumable and idempotent: each run takes up to `max` recipients (default
 * 150, cap 400; ~250 ms each, so 150 fits well inside the 300 s budget) and
 * reports how many remain. A 404 or a network failure is stored on the row
 * (error = 'http 404' / 'fetch') so the run moves on and the recipient is not
 * retried every hour; `?retry=1` clears errored rows first.
 *
 * Auth: CRON_SECRET bearer or ?key=. Weekly schedule in vercel.json; run by
 * hand in a loop after a backfill until remaining = 0.
 *
 *   /api/cron/resolve-contractor-recipients?max=150
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const PROFILE_URL = 'https://api.usaspending.gov/api/v2/recipient/';
const MAX_DEFAULT = 150;
const MAX_CAP = 400;
const FETCH_TIMEOUT_MS = 15000;
const POLITE_DELAY_MS = 200;
const BUDGET_MS = 240000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

/* recipient_id is a UUID plus -P / -C / -R; nothing else is ever put in a URL. */
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[PCR]$/i;

async function fetchProfile(id) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${PROFILE_URL}${encodeURIComponent(id)}/`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 429 || res.status >= 500)
      return { ok: false, status: res.status, retry: true };
    if (!res.ok) return { ok: false, status: res.status, retry: false };
    return { ok: true, status: res.status, json: await res.json() };
  } catch {
    return { ok: false, status: 0, retry: true };
  } finally {
    clearTimeout(timer);
  }
}

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

function toRow(id, p, fallbackName) {
  const parents = Array.isArray(p?.parents) ? p.parents : [];
  const first = parents[0] || {};
  return {
    recipient_id: id,
    name: str(p?.name) || fallbackName || null,
    uei: str(p?.uei),
    recipient_level:
      str(p?.recipient_level)?.toUpperCase()?.slice(0, 1) || id.slice(-1).toUpperCase(),
    parent_id: str(p?.parent_id) || str(first.parent_id),
    parent_name: str(p?.parent_name) || str(first.parent_name),
    parent_uei: str(p?.parent_uei) || str(first.parent_uei),
    business_types: Array.isArray(p?.business_types)
      ? p.business_types.filter((x) => typeof x === 'string').slice(0, 50)
      : null,
    error: null,
    resolved_at: new Date().toISOString(),
    tickered_at: null,
  };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const max = Math.min(Math.max(Number(searchParams.get('max')) || MAX_DEFAULT, 1), MAX_CAP);
  const admin = getAdminClient();
  const started = Date.now();

  if (searchParams.get('retry') === '1') {
    await admin.from('contractor_recipients').delete().not('error', 'is', null);
  }

  const { data: todo, error: todoErr } = await admin.rpc('contractor_recipients_todo', {
    p_limit: max,
  });
  if (todoErr) {
    return NextResponse.json(
      { error: 'contractor_recipients_todo failed; is migration 20261003140000 applied?' },
      { status: 500 },
    );
  }

  let fetched = 0;
  let failed = 0;
  let skippedBadId = 0;
  const errors = [];
  for (const t of todo || []) {
    if (Date.now() - started > BUDGET_MS) break;
    const id = String(t.recipient_id || '');
    if (!ID_RE.test(id)) {
      skippedBadId += 1;
      // eslint-disable-next-line no-await-in-loop
      await admin
        .from('contractor_recipients')
        .upsert(
          { recipient_id: id, name: t.recipient_name, error: 'bad id' },
          { onConflict: 'recipient_id' },
        );
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const r = await fetchProfile(id);
    let row;
    if (r.ok) {
      row = toRow(id, r.json, t.recipient_name);
      fetched += 1;
    } else {
      failed += 1;
      if (errors.length < 10) errors.push(`${id}: http ${r.status}`);
      if (r.retry) {
        // Transient: leave no row, the next run picks it up again.
        // eslint-disable-next-line no-await-in-loop
        await sleep(POLITE_DELAY_MS * 4);
        continue;
      }
      row = {
        recipient_id: id,
        name: t.recipient_name,
        error: `http ${r.status}`,
        resolved_at: new Date().toISOString(),
      };
    }
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('contractor_recipients')
      .upsert(row, { onConflict: 'recipient_id' });
    if (error && errors.length < 10) errors.push(`upsert ${id}: ${error.message}`);
    // eslint-disable-next-line no-await-in-loop
    await sleep(POLITE_DELAY_MS);
  }

  const { data: resolved, error: resErr } = await admin.rpc('contractor_resolve_tickers');
  if (resErr && errors.length < 10) errors.push(`resolve: ${resErr.message}`);

  // New tickers change which awards resolve; refresh the hub's copy of them.
  const { error: mvErr } = await admin.rpc('refresh_contract_award_tickers');
  if (mvErr && errors.length < 10) errors.push(`refresh awards mv: ${mvErr.message}`);
  revalidateTag('hubs');

  const { data: remainingRows } = await admin.rpc('contractor_recipients_todo', { p_limit: 1000 });
  const remaining = Array.isArray(remainingRows) ? remainingRows.length : null;

  return NextResponse.json({
    fetched,
    failed,
    skippedBadId,
    tickersResolved: resolved ?? 0,
    remaining: remaining === 1000 ? '1000+' : remaining,
    done: remaining === 0,
    ms: Date.now() - started,
    errors,
  });
}
