import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { hasLdaKey, createLdaBudget, listFilings } from '@/lib/lobbying/client';
import { mapFilingRow, loadFilings } from '@/lib/lobbying/ingest-rows';
import { LOBBYING_TOPICS } from '@/lib/lobbying/topics';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * GET /api/cron/ingest-lobbying-topics?topics=ai&years=2026,2025,2024
 *
 * Topic ingest (Nov 2026). For each topic phrase, walks the LDA filings whose
 * specific issue descriptions match it (filing_specific_lobbying_issues) and
 * upserts them through the same row mapper and quality gate as the quarterly
 * ingest, so their specific_issues text is stored. One cursor per
 * (topic, year, phrase) in lobbying_topic_ingest; a phrase is complete when
 * the API has no next page. Once complete, each run re-reads the newest two
 * pages (newest first) to pick up new filings.
 *
 * This lets Sonar answer "who lobbies hardest on AI" from every filing that
 * names AI, without waiting for the full 288k-filing text backfill.
 * Auth: Bearer cron secret (cronRoute).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_DEADLINE_MS = 240_000;
const REQUEST_BUDGET = 300;
const PAGE_SIZE = 100;

async function walk(admin, budget, { topic, year, query, state }, errors) {
  let page = state?.complete ? 0 : state?.last_page || 0;
  let rows = state?.rows_fetched || 0;
  let total = state?.total_count ?? null;
  let complete = Boolean(state?.complete);
  const refresh = complete;
  let pages = 0;
  for (;;) {
    if (budget.remaining < 2 || Date.now() > budget.deadlineAt) break;
    if (refresh && pages >= 2) break;
    page += 1;
    const res = await listFilings(
      {
        filingYear: year,
        specificIssues: query,
        ordering: refresh ? '-dt_posted' : 'filing_uuid',
        page,
        pageSize: PAGE_SIZE,
      },
      { budget },
    );
    pages += 1;
    if (!res.ok) {
      errors.push(`${topic} ${year} "${query}" p${page}: ${res.error}`);
      return {
        state: {
          last_page: page - 1,
          rows_fetched: rows,
          total_count: total,
          complete,
          last_status: 'failed',
        },
        fatal: Boolean(res.authRejected || res.rateLimited),
      };
    }
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    if (typeof res.data?.count === 'number') total = res.data.count;
    if (results.length) {
      const loaded = await loadFilings(admin, results.map(mapFilingRow));
      if (!loaded.ok) {
        errors.push(`${topic} ${year} "${query}" p${page}: rejected (${loaded.reason})`);
        return {
          state: {
            last_page: page - 1,
            rows_fetched: rows,
            total_count: total,
            complete,
            last_status: 'rejected',
          },
        };
      }
      if (!refresh) rows += results.length;
    }
    if (!res.data?.next || !results.length) {
      if (!refresh) complete = true;
      break;
    }
  }
  return {
    state: {
      last_page: refresh ? state.last_page : page,
      rows_fetched: rows,
      total_count: total,
      complete,
      last_status: 'ok',
    },
  };
}

async function run(request) {
  if (!hasLdaKey()) {
    return NextResponse.json({ ok: false, error: 'LDA key not configured' }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const topics = (searchParams.get('topics') || 'ai')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => LOBBYING_TOPICS[t]);
  const now = new Date().getUTCFullYear();
  const years = (searchParams.get('years') || `${now},${now - 1},${now - 2}`)
    .split(',')
    .map((y) => Number(y))
    .filter((y) => y > 2000 && y <= now);
  const admin = getAdminClient();
  const budget = createLdaBudget(REQUEST_BUDGET);
  budget.deadlineAt = Date.now() + RUN_DEADLINE_MS;
  const errors = [];
  const { data: states } = await admin
    .from('lobbying_topic_ingest')
    .select('*')
    .in('topic', topics);
  const byKey = new Map((states || []).map((s) => [`${s.topic}|${s.year}|${s.query}`, s]));
  const summary = [];
  outer: for (const topic of topics) {
    for (const year of years) {
      for (const query of LOBBYING_TOPICS[topic].queries) {
        const state = byKey.get(`${topic}|${year}|${query}`) || null;
        const { state: next, fatal } = await walk(
          admin,
          budget,
          { topic, year, query, state },
          errors,
        );
        await admin
          .from('lobbying_topic_ingest')
          .upsert(
            { topic, year, query, ...next, updated_at: new Date().toISOString() },
            { onConflict: 'topic,year,query' },
          );
        summary.push({
          topic,
          year,
          query,
          complete: next.complete,
          rows: next.rows_fetched,
          total: next.total_count,
        });
        if (fatal || budget.remaining < 2 || Date.now() > budget.deadlineAt) break outer;
      }
    }
  }
  return NextResponse.json({
    ok: errors.length === 0,
    requests: budget.used,
    summary,
    errors: errors.slice(0, 10),
  });
}

export const GET = cronRoute('ingest-lobbying-topics', run, { ttlSeconds: 360 });
