/**
 * Cron overlap lock + run log + failure capture (reliability audit P2-14).
 *
 *   export const GET = cronRoute('ingest-fec', run, { ttlSeconds: 900 });
 *
 * cronRoute checks the Bearer CRON_SECRET (constant time, no ?key=), then
 * withCronLock:
 *   1. claims public.cron_locks[name] through try_cron_lock(); if another run
 *      holds it, returns 200 { skipped: 'locked' } without running;
 *   2. writes a 'running' ingest_runs row at the start and finishes it at the
 *      end, so a run the platform kills stays visible as 'running';
 *   3. on a throw, records the error in failed_jobs and returns 500;
 *   4. releases the lock.
 *
 * Session advisory locks do not survive supabase-js (each call is its own
 * HTTP request), hence the lock row with an expiry: a crashed run's lock
 * frees itself after ttlSeconds.
 *
 * Until the migration is applied (no try_cron_lock), the job still runs,
 * unlocked, with a warning: deploying code first never stops the crons.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { isCronAuthorized } from '@/lib/cron/auth';
import { recordFailedJob } from '@/lib/cron/failed-jobs';
import { cronRunOutcome } from '@/lib/cron/outcome';

const MISSING_FN = new Set(['PGRST202', '42883', '42P01']);

async function tryLock(admin, name, ttlSeconds, holder) {
  const { data, error } = await admin.rpc('try_cron_lock', {
    p_name: name,
    p_ttl_seconds: ttlSeconds,
    p_holder: holder,
  });
  if (error) {
    if (MISSING_FN.has(error.code)) {
      console.warn(`[cron-lock] ${name}: try_cron_lock missing; running unlocked`);
      return { ok: true, held: false };
    }
    console.warn(`[cron-lock] ${name}: ${error.message}; running unlocked`);
    return { ok: true, held: false };
  }
  return { ok: data === true, held: data === true };
}

async function release(admin, name, holder) {
  const { error } = await admin.rpc('release_cron_lock', { p_name: name, p_holder: holder });
  if (error && !MISSING_FN.has(error.code)) {
    console.warn(`[cron-lock] ${name}: release failed: ${error.message}`);
  }
}

async function startRun(admin, name) {
  try {
    const { data, error } = await admin
      .from('ingest_runs')
      .insert({ source: name, status: 'running' })
      .select('id')
      .single();
    if (error) {
      console.warn(`[cron-run] ${name}: ${error.message}`);
      return null;
    }
    return data.id;
  } catch {
    return null;
  }
}

async function finishRun(admin, id, name, fields) {
  if (!id) return;
  const { error } = await admin
    .from('ingest_runs')
    .update({ ...fields, finished_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.warn(`[cron-run] ${name}: ${error.message}`);
}

export async function withCronLock(name, ttlSeconds, fn, { lockKey = name } = {}) {
  let admin;
  try {
    admin = getAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const holder = `${name}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const lock = await tryLock(admin, lockKey, ttlSeconds, holder);
  if (!lock.ok) return NextResponse.json({ ok: true, skipped: 'locked' }, { status: 200 });

  const runId = await startRun(admin, name);
  try {
    const res = await fn();
    let body = null;
    try {
      body = await res.clone().json();
    } catch {
      body = null;
    }
    await finishRun(admin, runId, name, cronRunOutcome(body, res.status));
    return res;
  } catch (e) {
    const message = String(e?.message || e).slice(0, 2000);
    console.error(`[cron] ${name} failed:`, e);
    await finishRun(admin, runId, name, { status: 'failed', note: message.slice(0, 500) });
    await recordFailedJob({ job: `cron:${name}`, error: message, payload: null });
    return NextResponse.json({ ok: false, error: message.slice(0, 300) }, { status: 500 });
  } finally {
    if (lock.held) await release(admin, lockKey, holder);
  }
}

/** Auth + lock + log for a cron route handler. */
export function cronRoute(name, handler, { ttlSeconds = 900 } = {}) {
  return async function cron(request, context) {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    /* Scheduled variants of one route (different query strings, e.g.
       ingest-sec-filings?families=insider vs ?families=institutional) lock
       separately; the run log keeps the route name. */
    let search = '';
    try {
      const u = new URL(request.url);
      u.searchParams.sort();
      search = u.searchParams.toString();
    } catch {
      search = '';
    }
    const lockKey = search ? `${name}?${search}` : name;
    return withCronLock(name, ttlSeconds, () => handler(request, context), { lockKey });
  };
}
