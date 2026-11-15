/**
 * "Why I'm watching" notes, server side (Market Monitor 2.0). The route under
 * /api/watchlists/notes stays thin and calls these. Every query runs on the
 * caller's RLS-scoped client (`db`) and is also filtered by the session user
 * id, so a note is only ever read or written by its owner.
 */
import { parseNote, parseNoteKey } from '@/lib/watchlist/notes';

const COLS = 'item_type, ticker, hypothesis, risks, metrics, catalysts, review_on, updated_at';

export class NoteError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field || null;
  }
}

const noteOut = (r) => ({
  type: r.item_type,
  ticker: r.ticker,
  hypothesis: r.hypothesis || '',
  risks: r.risks || '',
  metrics: r.metrics || '',
  catalysts: r.catalysts || '',
  reviewOn: r.review_on || null,
  updatedAt: r.updated_at || null,
});

const keyOrThrow = (raw) => {
  const key = parseNoteKey(raw);
  if (!key.ok) throw new NoteError(400, key.error);
  return key;
};

/** The caller's note for one asset, or null. */
export async function getNote(db, userId, raw) {
  const { type, ticker } = keyOrThrow(raw);
  const { data, error } = await db
    .from('user_watchlist_notes')
    .select(COLS)
    .eq('user_id', userId)
    .eq('item_type', type)
    .eq('ticker', ticker)
    .maybeSingle();
  if (error) throw error;
  return data ? noteOut(data) : null;
}

/** The caller's notes for every item in one of their lists. */
export async function listNotesForList(db, userId, listId) {
  if (!listId || typeof listId !== 'string') throw new NoteError(400, 'listId is required.');
  const { data: items, error: iErr } = await db
    .from('user_watchlist_items')
    .select('type, ticker')
    .eq('list_id', listId)
    .eq('user_id', userId);
  if (iErr) throw iErr;
  const keys = new Set((items || []).map((i) => `${i.type}:${i.ticker}`));
  if (!keys.size) return [];
  const { data, error } = await db
    .from('user_watchlist_notes')
    .select(COLS)
    .eq('user_id', userId)
    .in('ticker', [...new Set((items || []).map((i) => i.ticker))]);
  if (error) throw error;
  return (data || []).filter((r) => keys.has(`${r.item_type}:${r.ticker}`)).map(noteOut);
}

/** Create or replace the caller's note for one asset. */
export async function saveNote(db, userId, body) {
  const parsed = parseNote(body);
  if (!parsed.ok) throw new NoteError(400, parsed.error, parsed.field);
  const n = parsed.note;
  const { data, error } = await db
    .from('user_watchlist_notes')
    .upsert(
      {
        user_id: userId,
        item_type: n.type,
        ticker: n.ticker,
        hypothesis: n.hypothesis,
        risks: n.risks,
        metrics: n.metrics,
        catalysts: n.catalysts,
        review_on: n.reviewOn,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_type,ticker' },
    )
    .select(COLS)
    .single();
  if (error) throw error;
  return noteOut(data);
}

/** Delete the caller's note for one asset. Deleting a note that is not there is fine. */
export async function deleteNote(db, userId, raw) {
  const { type, ticker } = keyOrThrow(raw);
  const { error } = await db
    .from('user_watchlist_notes')
    .delete()
    .eq('user_id', userId)
    .eq('item_type', type)
    .eq('ticker', ticker);
  if (error) throw error;
  return { ok: true };
}
