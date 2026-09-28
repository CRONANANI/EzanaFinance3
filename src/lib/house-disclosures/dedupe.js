/**
 * De-duplicate House index rows by doc_id.
 *
 * Postgres rejects an `INSERT ... ON CONFLICT DO UPDATE` whose batch names the
 * same conflict key twice ("command cannot affect row a second time"), and it
 * rejects the WHOLE batch, not just the offending row. The Clerk's index files
 * for 2015 onward list some DocIDs more than once inside a single year —
 * amendments and re-posts of the same document — so any 200-row chunk that
 * happened to straddle a repeat took all 200 rows down with it. That is how a
 * 45,774-row run wrote 2008-2014 and 2026 and lost everything in between.
 *
 * Collapsing to one row per doc_id before chunking is the fix, and it belongs
 * here rather than inline in the route so the tie-breaking is testable.
 *
 * Which of the two rows wins:
 *   - the later `filing_date` (ISO `YYYY-MM-DD`, so a string compare is a date
 *     compare);
 *   - a row with no date always loses to one that has a date, because a
 *     missing date is an absence of information, not an earlier filing;
 *   - on a genuine tie, the row that appears later in the file, which is the
 *     Clerk's own "most recently posted" ordering.
 *
 * @param {Array<object>} rows parsed index rows, in file order
 * @returns {{ rows: Array<object>, duplicates: number, duplicateIds: string[] }}
 *   `rows` in first-seen order, `duplicates` the number of rows dropped, and
 *   `duplicateIds` the doc_ids that repeated, in first-seen order.
 */
export function dedupeByDocId(rows) {
  const byId = new Map();
  const seenDuplicate = new Set();
  const duplicateIds = [];
  let duplicates = 0;

  for (const row of rows || []) {
    const id = row?.doc_id;
    /* A row with no doc_id cannot collide on the conflict key, so it is not
       this function's business; pass it through untouched rather than
       collapsing every such row into one. A unique object key keeps it in
       place without ever matching a later row. */
    if (!id) {
      byId.set({}, row);
      continue;
    }
    if (!byId.has(id)) {
      byId.set(id, row);
      continue;
    }
    duplicates += 1;
    if (!seenDuplicate.has(id)) {
      seenDuplicate.add(id);
      duplicateIds.push(id);
    }
    /* The winner takes the loser's slot, so the output keeps the file's
       first-seen ordering while carrying the better row. */
    if (shouldReplace(byId.get(id), row)) byId.set(id, row);
  }

  return { rows: [...byId.values()], duplicates, duplicateIds };
}

/** True when `candidate` (later in file order) should displace `kept`. */
function shouldReplace(kept, candidate) {
  const a = kept?.filing_date || null;
  const b = candidate?.filing_date || null;
  if (a === b) return true; // tie, including both null: later in file order wins
  if (!b) return false; // a dated row already held; an undated one never displaces it
  if (!a) return true; // a date beats no date
  return b > a; // ISO dates compare lexically
}
