/**
 * /api/admin/industries: the industry data admin area (review queue, metric,
 * facility and risk entry, awards, ingest runs). Admins only (ADMIN_EMAILS
 * or app_metadata.role = 'admin'); anyone else gets a 404. Writes use the
 * service role after that check; every write lands in industry_audit and
 * every approval busts the `industry:<id>` cache tag.
 */
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient, getAuthUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import {
  canApprove,
  metricKey,
  parseCsv,
  projectGroupWarnings,
  validateFacility,
  validateMetric,
  validateRisk,
} from '@/lib/industry-admin/validate';
import {
  normalizeRecipient,
  parseAmount,
  awardStatusFromLabel,
  isSplitAward,
  slugify,
} from '@/lib/ingest/chips/normalize';
import { matchAward, upsertAndMatch } from '@/lib/ingest/chips/persist';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const NOT_FOUND = () => NextResponse.json({ error: 'Not found' }, { status: 404 });
const TABLES = {
  metrics: 'industry_metrics',
  facilities: 'industry_facilities',
  risks: 'industry_risks',
};
const JOBS = {
  chips_usaspending: '/api/cron/chips-usaspending',
  chips_nist: '/api/cron/chips-nist',
};
const requireSecondAdmin = () => process.env.INDUSTRY_REQUIRE_SECOND_ADMIN === 'true';

async function adminUser(request) {
  const user = await getAuthUser(request).catch(() => null);
  if (!user) return null;
  return user.app_metadata?.role === 'admin' || isAdminUser(user) ? user : null;
}

async function audit(admin, table, rowId, action, before, after, actor) {
  await admin
    .from('industry_audit')
    .insert({
      table_name: table,
      row_id: rowId,
      action,
      before: before || null,
      after: after || null,
      actor,
    })
    .then(
      () => {},
      () => {},
    );
}

function bust(industryId) {
  try {
    revalidateTag(`industry:${industryId || 'semiconductors'}`);
  } catch {
    /* outside a request scope */
  }
}

async function resolveQueue(admin, id, user, status, note) {
  await admin
    .from('industry_review_queue')
    .update({
      status,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      resolution_note: note || null,
    })
    .eq('id', id);
}

export async function GET(request) {
  const user = await adminUser(request);
  if (!user) return NOT_FOUND();
  const admin = getAdminClient();
  const url = new URL(request.url);
  const tab = url.searchParams.get('tab') || 'queue';
  const industry = url.searchParams.get('industry') || 'semiconductors';
  const meta = async () => {
    const [{ data: stages }, { data: companies }, { data: industries }] = await Promise.all([
      admin
        .from('industry_stages')
        .select('id, label, ord')
        .eq('industry_id', industry)
        .order('ord'),
      admin
        .from('industry_companies')
        .select('company_name, ticker, stage_id')
        .eq('industry_id', industry),
      admin.from('industries').select('id, label'),
    ]);
    return { stages: stages || [], companies: companies || [], industries: industries || [] };
  };
  let rows = [];
  let extra = {};
  if (tab === 'queue') {
    const { data } = await admin
      .from('industry_review_queue')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(300);
    rows = data || [];
    const facIds = rows.filter((r) => r.ref_table === 'industry_facilities').map((r) => r.ref_id);
    const awardIds = rows.filter((r) => r.ref_table === 'chips_awards').map((r) => r.ref_id);
    const [{ data: facs }, { data: awards }] = await Promise.all([
      facIds.length ? admin.from('industry_facilities').select('*').in('id', facIds) : { data: [] },
      awardIds.length
        ? admin
            .from('chips_awards')
            .select(
              'id, source, recipient_name, status, amount_usd, amount_text, city, state_code, source_url',
            )
            .in('id', awardIds)
        : { data: [] },
    ]);
    extra = { facilities: facs || [], awards: awards || [] };
  } else if (tab === 'metrics') {
    const { data } = await admin
      .from('industry_metrics')
      .select('*')
      .eq('industry_id', industry)
      .order('as_of', { ascending: false })
      .limit(500);
    rows = data || [];
  } else if (tab === 'facilities') {
    const { data } = await admin
      .from('industry_facilities')
      .select('*')
      .eq('industry_id', industry)
      .order('state_code')
      .limit(1000);
    rows = data || [];
    extra = { warnings: projectGroupWarnings(rows) };
  } else if (tab === 'awards') {
    const { data } = await admin
      .from('chips_awards')
      .select('*')
      .order('amount_usd', { ascending: false, nullsFirst: false })
      .limit(500);
    rows = data || [];
    const ids = rows.map((r) => r.id);
    const { data: links } = ids.length
      ? await admin
          .from('chips_award_facilities')
          .select('award_id, facility_id')
          .in('award_id', ids)
      : { data: [] };
    extra = { links: links || [] };
  } else if (tab === 'risks') {
    const { data } = await admin
      .from('industry_risks')
      .select('*')
      .eq('industry_id', industry)
      .limit(500);
    rows = data || [];
  } else if (tab === 'runs') {
    const { data } = await admin
      .from('ingest_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(60);
    rows = data || [];
  }
  return NextResponse.json(
    {
      ok: true,
      tab,
      rows,
      ...extra,
      meta: await meta(),
      requireSecondAdmin: requireSecondAdmin(),
      userId: user.id,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request) {
  const user = await adminUser(request);
  if (!user) return NOT_FOUND();
  const admin = getAdminClient();
  const body = await request.json().catch(() => ({}));
  const bad = (error, status = 400) => NextResponse.json({ ok: false, error }, { status });

  switch (body.action) {
    case 'confirm_alias': {
      const { data: item } = await admin
        .from('industry_review_queue')
        .select('*')
        .eq('id', body.queue_id)
        .maybeSingle();
      if (!item) return bad('queue item not found', 404);
      const { data: award } = await admin
        .from('chips_awards')
        .select('*')
        .eq('id', item.ref_id)
        .maybeSingle();
      if (!award) return bad('award not found', 404);
      const company = String(body.company_name || '').trim();
      if (!company) return bad('pick a company');
      const alias = {
        alias: normalizeRecipient(award.recipient_name),
        uei: award.recipient_uei || null,
        company_name: company,
        ticker:
          String(body.ticker || '')
            .trim()
            .toUpperCase() || null,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      };
      const { data: saved, error } = await admin
        .from('recipient_aliases')
        .upsert(alias, { onConflict: 'alias' })
        .select('*')
        .maybeSingle();
      if (error) return bad('could not save the alias', 500);
      await audit(admin, 'recipient_aliases', saved.id, 'insert', null, saved, user.id);
      await resolveQueue(admin, item.id, user, 'resolved', `alias -> ${company}`);
      /* Re-run matching for every award from this recipient. */
      const { data: same } = await admin
        .from('chips_awards')
        .select('*')
        .ilike('recipient_name', award.recipient_name);
      const ctx = { queued: 0 };
      for (const a of same || []) {
        // eslint-disable-next-line no-await-in-loop
        await matchAward(admin, a, ctx);
      }
      return NextResponse.json({ ok: true, rematched: (same || []).length, queued: ctx.queued });
    }

    case 'resolve_queue': {
      const { data: item } = await admin
        .from('industry_review_queue')
        .select('*')
        .eq('id', body.queue_id)
        .maybeSingle();
      if (!item) return bad('queue item not found', 404);
      const note = String(body.note || '').trim();
      if (['amount_conflict', 'status_conflict'].includes(item.kind) && !note)
        return bad('a note is required');
      const status = body.resolution === 'dismissed' ? 'dismissed' : 'resolved';
      await resolveQueue(admin, item.id, user, status, note);
      await audit(
        admin,
        'industry_review_queue',
        item.id,
        status === 'resolved' ? 'approve' : 'delete',
        item,
        { status, note },
        user.id,
      );
      return NextResponse.json({ ok: true });
    }

    case 'approve_row':
    case 'reject_row': {
      const table = TABLES[body.table];
      if (!table) return bad('unknown table');
      const { data: before } = await admin.from(table).select('*').eq('id', body.id).maybeSingle();
      if (!before) return bad('row not found', 404);
      if (body.action === 'approve_row') {
        if (!canApprove(user.id, before.entered_by, { requireSecondAdmin: requireSecondAdmin() })) {
          return bad('a second admin must approve your own entry', 403);
        }
        const patch = { review_status: 'approved' };
        if (table === 'industry_facilities' && body.patch) {
          const v = validateFacility({ ...before, ...body.patch });
          if (!v.ok) return bad(v.errors.join('; '));
          Object.assign(patch, v.row);
        }
        const { data: after } = await admin
          .from(table)
          .update(patch)
          .eq('id', body.id)
          .select('*')
          .maybeSingle();
        await audit(
          admin,
          table,
          body.id,
          before.supersedes ? 'supersede' : 'approve',
          before,
          after,
          user.id,
        );
        const { data: open } = await admin
          .from('industry_review_queue')
          .select('id')
          .eq('ref_id', body.id)
          .eq('status', 'open');
        for (const q of open || []) {
          // eslint-disable-next-line no-await-in-loop
          await resolveQueue(admin, q.id, user, 'resolved', 'approved');
        }
        bust(before.industry_id);
        return NextResponse.json({ ok: true, row: after });
      }
      await admin.from(table).delete().eq('id', body.id);
      await audit(admin, table, body.id, 'delete', before, null, user.id);
      const { data: open } = await admin
        .from('industry_review_queue')
        .select('id')
        .eq('ref_id', body.id)
        .eq('status', 'open');
      for (const q of open || []) {
        // eslint-disable-next-line no-await-in-loop
        await resolveQueue(admin, q.id, user, 'dismissed', 'rejected');
      }
      return NextResponse.json({ ok: true });
    }

    case 'create_metric':
    case 'bulk_metrics': {
      const inputs = body.action === 'create_metric' ? [body.row || {}] : parseCsv(body.csv);
      const checked = inputs.map((r, i) => ({
        line: i + 1,
        ...validateMetric({ industry_id: body.industry_id, ...r }),
      }));
      const valid = checked.filter((c) => c.ok);
      const rejected = checked
        .filter((c) => !c.ok)
        .map((c) => ({ line: c.line, errors: c.errors }));
      if (body.action === 'bulk_metrics' && !body.commit) {
        return NextResponse.json({ ok: true, preview: valid.map((c) => c.row), rejected });
      }
      if (body.action === 'create_metric' && rejected.length)
        return bad(rejected[0].errors.join('; '));
      const inserted = [];
      for (const c of valid) {
        /* A newer row for the same key supersedes the approved one; the old
           row stays as history. */
        // eslint-disable-next-line no-await-in-loop
        const { data: prior } = await admin
          .from('industry_metrics')
          .select('*')
          .eq('industry_id', c.row.industry_id)
          .eq('metric', c.row.metric)
          .eq('review_status', 'approved');
        const match = (prior || []).find((p) => metricKey(p) === metricKey(c.row));
        // eslint-disable-next-line no-await-in-loop
        const { data: row, error } = await admin
          .from('industry_metrics')
          .insert({
            ...c.row,
            review_status: 'pending',
            entered_by: user.id,
            supersedes: match?.id || null,
          })
          .select('*')
          .maybeSingle();
        if (error || !row) continue;
        inserted.push(row);
        // eslint-disable-next-line no-await-in-loop
        await audit(admin, 'industry_metrics', row.id, 'insert', null, row, user.id);
        // eslint-disable-next-line no-await-in-loop
        await admin.from('industry_review_queue').insert({
          kind: 'manual_submission',
          ref_table: 'industry_metrics',
          ref_id: row.id,
          details: {
            metric: row.metric,
            value: row.value,
            unit: row.unit,
            supersedes: row.supersedes,
          },
        });
      }
      return NextResponse.json({ ok: true, inserted: inserted.length, rejected });
    }

    case 'save_facility': {
      const v = validateFacility({ industry_id: body.industry_id, ...(body.row || {}) });
      if (!v.ok) return bad(v.errors.join('; '));
      if (body.id) {
        const { data: before } = await admin
          .from('industry_facilities')
          .select('*')
          .eq('id', body.id)
          .maybeSingle();
        if (!before) return bad('row not found', 404);
        /* An edit sends the row back to review. */
        const { data: after } = await admin
          .from('industry_facilities')
          .update({ ...v.row, review_status: 'pending', entered_by: user.id })
          .eq('id', body.id)
          .select('*')
          .maybeSingle();
        await audit(admin, 'industry_facilities', body.id, 'update', before, after, user.id);
        return NextResponse.json({ ok: true, row: after });
      }
      const { data: row, error } = await admin
        .from('industry_facilities')
        .insert({ ...v.row, review_status: 'pending', entered_by: user.id })
        .select('*')
        .maybeSingle();
      if (error || !row) return bad('could not save the facility', 500);
      await audit(admin, 'industry_facilities', row.id, 'insert', null, row, user.id);
      await admin.from('industry_review_queue').insert({
        kind: 'manual_submission',
        ref_table: 'industry_facilities',
        ref_id: row.id,
        details: { company_name: row.company_name, city: row.city, state_code: row.state_code },
      });
      const { data: group } = await admin
        .from('industry_facilities')
        .select('project_group, announced_investment_usd')
        .eq('project_group', row.project_group);
      return NextResponse.json({ ok: true, row, warnings: projectGroupWarnings(group || []) });
    }

    case 'create_risk': {
      const v = validateRisk({ industry_id: body.industry_id, ...(body.row || {}) });
      if (!v.ok) return bad(v.errors.join('; '));
      const { data: row, error } = await admin
        .from('industry_risks')
        .insert({ ...v.row, review_status: 'pending', entered_by: user.id })
        .select('*')
        .maybeSingle();
      if (error || !row) return bad('could not save the risk', 500);
      await audit(admin, 'industry_risks', row.id, 'insert', null, row, user.id);
      await admin.from('industry_review_queue').insert({
        kind: 'manual_submission',
        ref_table: 'industry_risks',
        ref_id: row.id,
        details: { title: row.title, confidence: row.confidence },
      });
      return NextResponse.json({ ok: true, row });
    }

    case 'import_nist_csv': {
      /* Manual fallback for the NIST page: company,state_code,city,label,amount_text,source_url
         where label is the published "Award Amount" or "Proposed Award Amount". */
      const rows = parseCsv(body.csv)
        .filter((r) => r.company && r.source_url)
        .map((r) => {
          const sites = String(r.sites || `${r.city || ''}|${r.state_code || ''}`)
            .split(';')
            .map((s) => {
              const [city, st] = s.split('|');
              return { city: city?.trim() || null, state_code: st?.trim().toUpperCase() || null };
            });
          return {
            source: 'nist',
            source_record_id: slugify(
              r.company,
              sites.map((s) => `${s.city || ''} ${s.state_code}`).join(' '),
            ),
            recipient_name: r.company,
            status: awardStatusFromLabel(r.label || 'Award Amount'),
            amount_text: r.amount_text || null,
            amount_usd: parseAmount(r.amount_text),
            is_split_award: isSplitAward(r.amount_text) || sites.length > 1,
            sites,
            city: sites[0]?.city || null,
            state_code: sites[0]?.state_code || null,
            source_url: r.source_url,
            raw: { csv: r, entered_by: user.id },
          };
        });
      if (!body.commit) return NextResponse.json({ ok: true, preview: rows });
      const ctx = await upsertAndMatch(admin, rows);
      return NextResponse.json({ ok: true, ...ctx });
    }

    case 'run_job': {
      const path = JOBS[body.job];
      if (!path) return bad('unknown job');
      if (!process.env.CRON_SECRET) return bad('CRON_SECRET is not set', 500);
      const origin = new URL(request.url).origin;
      const res = await fetch(`${origin}${path}`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => null);
      const out = res ? await res.json().catch(() => ({})) : { ok: false, error: 'unreachable' };
      return NextResponse.json({ ok: Boolean(res?.ok), result: out });
    }

    default:
      return bad('unknown action');
  }
}
