/**
 * Transaction-level federal contract obligations (Sonar 6.5.2, Nov 28 2026).
 *
 * Why this exists: the award tables (usaspending_contract_awards, contract_awards_resolved,
 * company_contract_history, the BigQuery corpus behind it) hold ONE ROW PER AWARD with the
 * USAspending search field "Start Date" (stored in a column named `action_date`) and "Award
 * Amount" (for contracts, obligated to date: cumulative). Obligations incurred in a fiscal
 * year are the signed obligation changes of the award's actions (transactions) dated in that
 * year. USAspending serves those per award at POST /api/v2/transactions/ (already called by
 * lib/usaspending.js for the award page, where only the count is kept).
 *
 * Source fields used (as returned by that endpoint):
 *   id                         the source transaction key (stable; the dedupe key)
 *   action_date                the date of the action (the obligation change)
 *   federal_action_obligation  the signed obligation change of the action (negative for a
 *                              deobligation); null means the action reported no amount
 *   modification_number        '0' for the base award, then P00001...
 *   action_type_description    e.g. "Funding only action", "Change order"
 *
 * Nothing is inferred: an action without an id, a date or a reported amount is rejected with
 * its reason, never turned into a zero, and an incremental amount is never derived from
 * differences between cumulative totals.
 *
 * Ingestion is bounded and OFF: `ingestAwardTransactions` runs only when the caller passes
 * `enabled: true` (the cron route checks SONAR_CONTRACT_TRANSACTIONS_INGEST=1, which is not
 * set, and the route is not scheduled). Tables: docs/sql/sonar-6-5-2/SQL_02 (not applied).
 */

export const TRANSACTIONS_ENDPOINT = 'https://api.usaspending.gov/api/v2/transactions/';
export const TRANSACTION_TABLE = 'usaspending_contract_transactions';
export const TRANSACTION_SYNC_TABLE = 'usaspending_award_transaction_sync';
export const TRANSACTION_VIEW = 'contract_transactions_resolved';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Federal fiscal year of a date: October 1 starts the next fiscal year. */
export function federalFiscalYearOf(date) {
  const d = String(date || '').slice(0, 10);
  if (!DATE_RE.test(d)) return null;
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  return m >= 10 ? y + 1 : y;
}

/**
 * One source action to the stored transaction contract, or a rejection.
 * -> { recordState: 'verified', sourceTransactionId, awardId, transactionActionDate,
 *      signedObligationDeltaUsd, federalFiscalYear, modificationNumber, actionType, source }
 *  | { recordState: 'rejected', reason, sourceTransactionId, awardId }
 */
export function normalizeTransaction(raw, awardId) {
  const id = raw?.id != null && String(raw.id).trim() ? String(raw.id).trim() : null;
  const date = String(raw?.action_date || '').slice(0, 10);
  const amt = raw?.federal_action_obligation;
  const base = { sourceTransactionId: id, awardId: awardId || null };
  if (!awardId) return { ...base, recordState: 'rejected', reason: 'no award id' };
  if (!id) return { ...base, recordState: 'rejected', reason: 'no source transaction id' };
  if (!DATE_RE.test(date)) return { ...base, recordState: 'rejected', reason: 'no action date' };
  if (amt == null || amt === '' || !Number.isFinite(Number(amt)))
    return { ...base, recordState: 'rejected', reason: 'no obligation amount reported' };
  return {
    ...base,
    recordState: 'verified',
    transactionActionDate: date,
    signedObligationDeltaUsd: Number(amt),
    federalFiscalYear: federalFiscalYearOf(date),
    modificationNumber: raw.modification_number != null ? String(raw.modification_number) : null,
    actionType: raw.action_type_description || raw.type_description || null,
    source: { provider: 'USAspending', endpoint: '/api/v2/transactions/' },
  };
}

/**
 * One record per source transaction id. The same id delivered twice with the same values is
 * a duplicate (dropped); with different values it is a conflict (kept out, reported), so a
 * corrected or replacement record can never be summed with the record it replaces.
 * -> { records, duplicates: n, conflicts: [ids] }
 */
export function dedupeTransactions(records = []) {
  const by = new Map();
  let duplicates = 0;
  const conflicts = new Set();
  for (const r of records) {
    if (r?.recordState !== 'verified') continue;
    const prev = by.get(r.sourceTransactionId);
    if (!prev) {
      by.set(r.sourceTransactionId, r);
      continue;
    }
    if (
      prev.signedObligationDeltaUsd === r.signedObligationDeltaUsd &&
      prev.transactionActionDate === r.transactionActionDate
    )
      duplicates += 1;
    else conflicts.add(r.sourceTransactionId);
  }
  for (const id of conflicts) by.delete(id);
  return { records: [...by.values()], duplicates, conflicts: [...conflicts] };
}

/** Database row for one verified transaction (docs/sql/sonar-6-5-2/SQL_02). */
export function transactionRow(t, syncedAt = new Date().toISOString()) {
  return {
    source_transaction_id: t.sourceTransactionId,
    generated_award_id: t.awardId,
    action_date: t.transactionActionDate,
    federal_action_obligation: t.signedObligationDeltaUsd,
    federal_fiscal_year: t.federalFiscalYear,
    modification_number: t.modificationNumber,
    action_type: t.actionType,
    source_provider: 'USAspending',
    source_endpoint: '/api/v2/transactions/',
    synced_at: syncedAt,
  };
}

/**
 * Every action of one award, paged and bounded. A page that fails ends the award as
 * incomplete (never as "no transactions").
 * -> { complete, transactions: [normalized], rejected: [normalized], pages }
 */
export async function fetchAwardTransactions(
  awardId,
  { fetchImpl = fetch, limit = 100, maxPages = 10, signal } = {},
) {
  const transactions = [];
  const rejected = [];
  for (let page = 1; page <= maxPages; page += 1) {
    let res;
    try {
      // eslint-disable-next-line no-await-in-loop
      res = await fetchImpl(TRANSACTIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ award_id: awardId, limit, page, sort: 'action_date', order: 'asc' }),
        signal,
      });
    } catch {
      return { complete: false, transactions, rejected, pages: page - 1, reason: 'request failed' };
    }
    if (!res?.ok)
      return {
        complete: false,
        transactions,
        rejected,
        pages: page - 1,
        reason: `http ${res?.status}`,
      };
    // eslint-disable-next-line no-await-in-loop
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json?.results) ? json.results : [];
    for (const r of rows) {
      const n = normalizeTransaction(r, awardId);
      (n.recordState === 'verified' ? transactions : rejected).push(n);
    }
    if (!json?.page_metadata?.hasNext)
      return { complete: true, transactions, rejected, pages: page };
  }
  return {
    complete: false,
    transactions,
    rejected,
    pages: maxPages,
    reason: `more than ${maxPages} pages`,
  };
}

/**
 * Bounded, idempotent ingestion for a list of awards. OFF unless `enabled` is true.
 * Upserts on source_transaction_id; records per-award completeness in the sync table, which
 * is what lets a reader tell "no actions in the year" (complete award) from "not ingested".
 */
export async function ingestAwardTransactions(
  admin,
  {
    awardIds = [],
    enabled = false,
    fetchImpl = fetch,
    maxAwards = 50,
    delayMs = 250,
    now = () => new Date().toISOString(),
  } = {},
) {
  if (!enabled) return { ok: false, skipped: 'disabled', awards: 0 };
  const ids = [...new Set(awardIds)].slice(0, Math.max(0, Math.min(maxAwards, 200)));
  const out = {
    ok: true,
    awards: 0,
    transactions: 0,
    rejected: 0,
    duplicates: 0,
    conflicts: 0,
    incomplete: 0,
    errors: [],
  };
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    const got = await fetchAwardTransactions(id, { fetchImpl });
    const d = dedupeTransactions(got.transactions);
    const syncedAt = now();
    if (d.records.length) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin.from(TRANSACTION_TABLE).upsert(
        d.records.map((t) => transactionRow(t, syncedAt)),
        { onConflict: 'source_transaction_id' },
      );
      if (error) {
        out.errors.push(`${id}: ${String(error.message).slice(0, 120)}`);
        continue;
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await admin.from(TRANSACTION_SYNC_TABLE).upsert(
      {
        generated_award_id: id,
        synced_at: syncedAt,
        transaction_count: d.records.length,
        rejected_count: got.rejected.length,
        conflict_count: d.conflicts.length,
        complete: got.complete && d.conflicts.length === 0,
        detail: got.complete ? null : got.reason || null,
      },
      { onConflict: 'generated_award_id' },
    );
    out.awards += 1;
    out.transactions += d.records.length;
    out.rejected += got.rejected.length;
    out.duplicates += d.duplicates;
    out.conflicts += d.conflicts.length;
    if (!got.complete) out.incomplete += 1;
    // eslint-disable-next-line no-await-in-loop
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }
  return out;
}
