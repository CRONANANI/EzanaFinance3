/**
 * Persistence and matching for the CHIPS award importers. Server only
 * (service-role client). Rules (industry-data-ingest-prompt.md, Steps 2-3):
 *  - upsert raw awards on (source, source_record_id), counting inserts vs
 *    updates; a NIST award whose status or amount changed keeps the old
 *    values in raw.history and is queued as status_conflict;
 *  - recipient -> company only through recipient_aliases (UEI first, then
 *    the normalised alias); no match is queued with fuzzy suggestions and a
 *    company is NEVER auto-created;
 *  - a matched award links to its facility by (company, state, city), or
 *    creates a PENDING facility and queues unmatched_facility;
 *  - an obligated amount more than 5% away from the linked NIST amount is
 *    queued as amount_conflict; neither value overwrites the other.
 */
import { revalidateTag } from 'next/cache';
import { amountsConflict, normalizeRecipient } from '@/lib/ingest/chips/normalize';

export const INDUSTRY_ID = 'semiconductors';

export async function startRun(admin, job) {
  const { data } = await admin.from('ingest_runs').insert({ job }).select('id').maybeSingle();
  return data?.id || null;
}

export async function finishRun(admin, id, patch) {
  if (!id) return;
  await admin
    .from('ingest_runs')
    .update({ finished_at: new Date().toISOString(), ...patch })
    .eq('id', id);
}

async function queue(admin, kind, refTable, refId, details) {
  const { data: open } = await admin
    .from('industry_review_queue')
    .select('id')
    .eq('kind', kind)
    .eq('ref_id', refId)
    .eq('status', 'open')
    .limit(1);
  if (open?.length) return false;
  await admin
    .from('industry_review_queue')
    .insert({ kind, ref_table: refTable, ref_id: refId, details });
  return true;
}

export async function findAlias(admin, { uei, name }) {
  if (uei) {
    const { data } = await admin.from('recipient_aliases').select('*').eq('uei', uei).limit(1);
    if (data?.length) return data[0];
  }
  const alias = normalizeRecipient(name);
  if (!alias) return null;
  const { data } = await admin.from('recipient_aliases').select('*').eq('alias', alias).limit(1);
  return data?.[0] || null;
}

async function suggestions(admin, name) {
  try {
    const { data } = await admin.rpc('industry_company_suggestions', { p_name: name, p_limit: 5 });
    return data || [];
  } catch {
    return [];
  }
}

async function facilityFor(admin, award, alias, site, ctx) {
  let q = admin
    .from('industry_facilities')
    .select('id')
    .eq('industry_id', INDUSTRY_ID)
    .eq('company_name', alias.company_name);
  if (site.state_code) q = q.eq('state_code', site.state_code);
  if (site.city) q = q.ilike('city', site.city);
  const { data } = await q.limit(1);
  if (data?.length) return data[0].id;
  const { data: created } = await admin
    .from('industry_facilities')
    .insert({
      industry_id: INDUSTRY_ID,
      company_name: alias.company_name,
      ticker: alias.ticker || null,
      city: site.city || null,
      state_code: site.state_code || null,
      country: award.country || 'US',
      status: 'announced',
      incentive_type: award.award_type || null,
      source_url: award.source_url,
      as_of: (award.action_date || new Date().toISOString()).slice(0, 10),
      review_status: 'pending',
    })
    .select('id')
    .maybeSingle();
  if (!created?.id) return null;
  if (
    await queue(admin, 'unmatched_facility', 'industry_facilities', created.id, {
      award_id: award.id,
      company_name: alias.company_name,
      city: site.city,
      state_code: site.state_code,
    })
  ) {
    ctx.queued += 1;
  }
  return created.id;
}

/** Match one stored award (row with id) to an alias and facilities. */
export async function matchAward(admin, award, ctx = { queued: 0 }) {
  const alias = await findAlias(admin, { uei: award.recipient_uei, name: award.recipient_name });
  if (!alias) {
    if (
      await queue(admin, 'unmatched_recipient', 'chips_awards', award.id, {
        recipient_name: award.recipient_name,
        normalized: normalizeRecipient(award.recipient_name),
        uei: award.recipient_uei || null,
        suggestions: await suggestions(admin, award.recipient_name),
      })
    ) {
      ctx.queued += 1;
    }
    return { matched: false };
  }
  const sites = award.raw?.sites?.length
    ? award.raw.sites
    : [{ city: award.city, state_code: award.state_code }];
  const facilityIds = [];
  for (const site of sites) {
    // eslint-disable-next-line no-await-in-loop
    const fid = await facilityFor(admin, award, alias, site, ctx);
    if (fid) facilityIds.push(fid);
  }
  if (facilityIds.length) {
    await admin.from('chips_award_facilities').upsert(
      facilityIds.map((facility_id) => ({ award_id: award.id, facility_id })),
      { onConflict: 'award_id,facility_id', ignoreDuplicates: true },
    );
  }
  /* Obligated vs announced: queue a >5% gap, never overwrite. */
  if (award.source === 'usaspending' && facilityIds.length) {
    const { data: links } = await admin
      .from('chips_award_facilities')
      .select('award_id')
      .in('facility_id', facilityIds);
    const ids = [...new Set((links || []).map((l) => l.award_id))].filter((id) => id !== award.id);
    if (ids.length) {
      const { data: nist } = await admin
        .from('chips_awards')
        .select('id, amount_usd, status, source_url')
        .eq('source', 'nist')
        .in('id', ids);
      for (const n of nist || []) {
        if (amountsConflict(award.amount_usd, n.amount_usd)) {
          // eslint-disable-next-line no-await-in-loop
          if (
            await queue(admin, 'amount_conflict', 'chips_awards', award.id, {
              obligated: { amount_usd: award.amount_usd, source_url: award.source_url },
              announced: {
                amount_usd: n.amount_usd,
                status: n.status,
                source_url: n.source_url,
                id: n.id,
              },
            })
          ) {
            ctx.queued += 1;
          }
        }
      }
    }
  }
  return { matched: true, facilities: facilityIds.length };
}

/**
 * Upsert a batch of award rows and match each. Returns run counters.
 * `rows` are chips_awards shapes; NIST rows carry `sites`, kept in raw.
 */
export async function upsertAndMatch(admin, rows) {
  const ctx = { fetched: rows.length, inserted: 0, updated: 0, queued: 0 };
  for (const row of rows) {
    const { sites, _alias, ...rest } = row;
    const record = { ...rest, raw: { ...(rest.raw || {}), ...(sites ? { sites } : {}) } };
    // eslint-disable-next-line no-await-in-loop
    const { data: existing } = await admin
      .from('chips_awards')
      .select('id, status, amount_usd, amount_text, raw')
      .eq('source', record.source)
      .eq('source_record_id', record.source_record_id)
      .maybeSingle();
    let statusChanged = false;
    if (existing) {
      const changed =
        (record.status && existing.status !== record.status) ||
        (record.amount_usd != null && Number(existing.amount_usd) !== Number(record.amount_usd));
      if (changed && record.source === 'nist') {
        statusChanged = true;
        record.raw.history = [
          ...(existing.raw?.history || []),
          {
            status: existing.status,
            amount_usd: existing.amount_usd,
            amount_text: existing.amount_text,
            replaced_at: new Date().toISOString(),
          },
        ];
      } else if (existing.raw?.history) {
        record.raw.history = existing.raw.history;
      }
    }
    record.fetched_at = new Date().toISOString();
    // eslint-disable-next-line no-await-in-loop
    const { data: saved, error } = await admin
      .from('chips_awards')
      .upsert(record, { onConflict: 'source,source_record_id' })
      .select('*')
      .maybeSingle();
    if (error || !saved) continue;
    if (existing) ctx.updated += 1;
    else ctx.inserted += 1;
    if (statusChanged) {
      // eslint-disable-next-line no-await-in-loop
      if (
        await queue(admin, 'status_conflict', 'chips_awards', saved.id, {
          before: record.raw.history[record.raw.history.length - 1],
          after: {
            status: saved.status,
            amount_usd: saved.amount_usd,
            amount_text: saved.amount_text,
          },
          source_url: saved.source_url,
        })
      ) {
        ctx.queued += 1;
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await matchAward(admin, saved, ctx);
  }
  return ctx;
}

export function bustIndustryCache(id = INDUSTRY_ID) {
  try {
    revalidateTag(`industry:${id}`);
  } catch {
    /* outside a request scope (scripts): nothing to bust */
  }
}
