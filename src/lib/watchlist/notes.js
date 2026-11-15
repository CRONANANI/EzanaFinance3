/**
 * "Why I'm watching" notes (Market Monitor 2.0): the validation shared by the
 * note modal and /api/watchlists/notes. Pure: no React, no DOM, no fetch.
 * A note belongs to one user and one asset (type + ticker), so it follows the
 * asset across lists. Plain text only.
 */
import { ITEM_TYPES } from '@/lib/watchlist/asset-classes';

export const NOTE_LIMITS = { hypothesis: 600, risks: 400, metrics: 400, catalysts: 400 };
export const NOTE_FIELDS = Object.keys(NOTE_LIMITS);
export const NOTE_LABELS = {
  hypothesis: 'Hypothesis',
  risks: 'Risks or opportunities',
  metrics: 'Metrics to watch',
  catalysts: 'Catalysts',
};

const ALLOWED = new Set([...NOTE_FIELDS, 'reviewOn', 'type', 'ticker']);
const TICKER_RE = /^[A-Z0-9][A-Z0-9.=^-]{0,14}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Trim, drop control characters, keep single blank lines at most. */
export function cleanNoteText(v) {
  if (typeof v !== 'string') return '';
  return v
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The asset a note is about. Returns { ok, type, ticker } or { ok: false, error }. */
export function parseNoteKey(raw) {
  const type = typeof raw?.type === 'string' ? raw.type.toLowerCase() : '';
  const ticker = typeof raw?.ticker === 'string' ? raw.ticker.trim().toUpperCase() : '';
  if (!ITEM_TYPES.includes(type)) return { ok: false, error: 'Unknown asset type.' };
  if (!TICKER_RE.test(ticker)) return { ok: false, error: 'Unknown asset.' };
  return { ok: true, type, ticker };
}

/**
 * Clean a note from the modal or a request body.
 * Returns { ok, note: { type, ticker, hypothesis, risks, metrics, catalysts, reviewOn } }
 * or { ok: false, error, field? }.
 */
export function parseNote(raw, { today = new Date().toISOString().slice(0, 10) } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { ok: false, error: 'Invalid note.' };
  for (const k of Object.keys(raw)) {
    if (!ALLOWED.has(k)) return { ok: false, error: `Unknown field: ${k}.` };
  }
  const key = parseNoteKey(raw);
  if (!key.ok) return key;

  const note = { type: key.type, ticker: key.ticker };
  for (const f of NOTE_FIELDS) {
    if (raw[f] != null && typeof raw[f] !== 'string')
      return { ok: false, field: f, error: `${NOTE_LABELS[f]} must be text.` };
    const text = cleanNoteText(raw[f]);
    if (text.length > NOTE_LIMITS[f])
      return {
        ok: false,
        field: f,
        error: `${NOTE_LABELS[f]} is too long (max ${NOTE_LIMITS[f]} characters).`,
      };
    note[f] = text;
  }

  let reviewOn = null;
  if (raw.reviewOn != null && raw.reviewOn !== '') {
    const d = String(raw.reviewOn);
    const valid = DATE_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
    if (!valid) return { ok: false, field: 'reviewOn', error: 'Pick a valid review date.' };
    if (d < today)
      return { ok: false, field: 'reviewOn', error: 'The review date must be today or later.' };
    reviewOn = d;
  }
  note.reviewOn = reviewOn;

  if (NOTE_FIELDS.every((f) => !note[f]))
    return { ok: false, error: 'Write something in at least one field.' };
  return { ok: true, note };
}

/** The line the panel shows: the hypothesis, else the first field that has text. */
export function noteHeadline(note) {
  if (!note) return '';
  for (const f of NOTE_FIELDS) if (note[f]) return note[f];
  return '';
}

/** Add a catalyst line to a note's Catalysts field without going over its limit. */
export function appendCatalyst(current, line) {
  const add = cleanNoteText(line);
  const base = cleanNoteText(current);
  if (!add || base.split('\n').includes(add)) return base;
  const next = base ? `${base}\n${add}` : add;
  return next.length > NOTE_LIMITS.catalysts ? base : next;
}
