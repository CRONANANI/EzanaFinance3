/**
 * Brokerage account page (/trading): pure view helpers.
 *
 * Read-only presentation logic for the page: which state an account status
 * puts the member in, how broker position rows and linked holdings map to
 * table rows, their totals, and number and date formatting. Nothing here
 * talks to the network or moves money. Suite: scripts/check-trading-account.mjs
 */

const NA = 'N/A';

/** Finite number from a number or numeric string, else null. */
export function num(v) {
  if (v == null || v === '' || typeof v === 'boolean') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const money2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $1,234.56, or N/A. Negative values read -$1,234.56. */
export function fmtMoney(v) {
  const n = num(v);
  if (n === null) return NA;
  return `${n < 0 ? '-' : ''}$${money2.format(Math.abs(n))}`;
}

/** +$244.50, -$38.25, $0.00, or N/A. */
export function fmtSignedMoney(v) {
  const n = num(v);
  if (n === null) return NA;
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}$${money2.format(Math.abs(n))}`;
}

/** +2.77%, -0.86%, 0.00%, or N/A. Takes a percentage, not a fraction. */
export function fmtSignedPct(v) {
  const n = num(v);
  if (n === null) return NA;
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

/** A price or per-share figure with two decimals and no currency sign. */
export function fmtPrice(v) {
  const n = num(v);
  return n === null ? NA : money2.format(n);
}

const qtyFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

/** Share quantity: whole shares stay whole, fractions keep up to 4 decimals. */
export function fmtQty(v) {
  const n = num(v);
  return n === null ? NA : qtyFmt.format(n);
}

/** 'up', 'down' or 'flat' for colouring. The sign is always printed too. */
export function tone(v) {
  const n = num(v);
  if (n === null || n === 0) return 'flat';
  return n > 0 ? 'up' : 'down';
}

function validDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Nov 15, 2026, or N/A. */
export function fmtDate(v) {
  const d = validDate(v);
  if (!d) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Nov 15, 2026, 16:24 in the reader's own time zone, or N/A. */
export function fmtDateTime(v) {
  const d = validDate(v);
  if (!d) return NA;
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmtDate(d)}, ${time}`;
}

/** Last four characters of an account number behind a mask, or N/A. */
export function maskAccountNumber(v) {
  const s = v == null ? '' : String(v).trim();
  if (!s) return NA;
  return `****${s.slice(-4)}`;
}

/* ── Account status ─────────────────────────────────────────────────── */

const ACTIVE = new Set(['ACTIVE', 'APPROVED']);
const REFUSED = new Set(['REJECTED']);
const CLOSED = new Set(['ACCOUNT_CLOSED', 'DISABLED', 'INACTIVE']);

const STATUS_LABELS = {
  ACTIVE: 'Active',
  APPROVED: 'Approved',
  CREATING: 'Being created',
  SUBMITTED: 'Submitted',
  ONBOARDING: 'Onboarding',
  APPROVAL_PENDING: 'Approval pending',
  SUBMISSION_FAILED: 'Submission failed',
  ACTION_REQUIRED: 'Action required',
  EDITED: 'Edited',
  ACCOUNT_UPDATED: 'Account updated',
  AML_REVIEW: 'In review',
  REJECTED: 'Not approved',
  ACCOUNT_CLOSED: 'Closed',
  DISABLED: 'Disabled',
  INACTIVE: 'Inactive',
};

/** The broker's status word in sentence case ("APPROVAL_PENDING" reads "Approval pending"). */
export function statusLabel(status) {
  const key = String(status || '')
    .trim()
    .toUpperCase();
  if (!key) return NA;
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  const words = key.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Which state of the page an account row puts the member in.
 * 'none' (no account), 'active', 'refused', 'closed', or 'review' for every
 * other status, so an unknown status never unlocks the active view.
 */
export function accountPhase(account) {
  if (!account) return 'none';
  const key = String(account.account_status || '')
    .trim()
    .toUpperCase();
  if (ACTIVE.has(key)) return 'active';
  if (REFUSED.has(key)) return 'refused';
  if (CLOSED.has(key)) return 'closed';
  return 'review';
}

/* ── Ezana account positions (broker rows, snake_case) ──────────────── */

/** One broker position row to the table's shape. Fractions become percentages. */
export function mapPosition(p) {
  const pct = (v) => {
    const n = num(v);
    return n === null ? null : n * 100;
  };
  return {
    symbol: String(p?.symbol || '').toUpperCase(),
    qty: num(p?.qty),
    avgEntry: num(p?.avg_entry_price),
    current: num(p?.current_price),
    marketValue: num(p?.market_value),
    costBasis: num(p?.cost_basis),
    unrealized: num(p?.unrealized_pl),
    unrealizedPct: pct(p?.unrealized_plpc),
    todayPct: pct(p?.change_today),
  };
}

const sumOf = (rows, key) => {
  let total = 0;
  for (const r of rows) {
    if (r[key] === null || r[key] === undefined) return null;
    total += r[key];
  }
  return total;
};

/**
 * Totals for a positions table. A total is null (shown as N/A) when any row
 * is missing that figure, so a partial sum is never printed as the whole.
 */
export function positionTotals(rows) {
  if (!rows.length) {
    return { marketValue: null, costBasis: null, unrealized: null, unrealizedPct: null };
  }
  const marketValue = sumOf(rows, 'marketValue');
  const costBasis = sumOf(rows, 'costBasis');
  const unrealized = sumOf(rows, 'unrealized');
  const unrealizedPct =
    unrealized !== null && costBasis !== null && costBasis > 0
      ? (unrealized / costBasis) * 100
      : null;
  return { marketValue, costBasis, unrealized, unrealizedPct };
}

/* ── Linked outside accounts ────────────────────────────────────────── */

/** One aggregated linked holding to the table's shape. */
export function mapLinkedHolding(h) {
  const qty = num(h?.totalQuantity);
  const marketValue = num(h?.totalValue);
  const rawCost = num(h?.totalCostBasis);
  /* A cost basis of zero means the institution did not report one. */
  const costBasis = rawCost !== null && rawCost > 0 ? rawCost : null;
  const price = num(h?.lastPrice);
  const gain = costBasis !== null && marketValue !== null ? marketValue - costBasis : null;
  return {
    symbol: String(h?.ticker || '').toUpperCase(),
    name: h?.name || '',
    qty,
    avgCost: costBasis !== null && qty !== null && qty > 0 ? costBasis / qty : null,
    price: price !== null && price > 0 ? price : null,
    marketValue,
    costBasis,
    gain,
    gainPct: gain !== null ? (gain / costBasis) * 100 : null,
    pricing: h?.freshness === 'end_of_day' ? 'End of day' : 'Intraday',
  };
}

/** Totals across linked holdings; cost and gain are null if any holding lacks a cost basis. */
export function linkedTotals(rows) {
  if (!rows.length) return { marketValue: null, costBasis: null, gain: null, gainPct: null };
  const marketValue = sumOf(rows, 'marketValue');
  const costBasis = sumOf(rows, 'costBasis');
  const gain = marketValue !== null && costBasis !== null ? marketValue - costBasis : null;
  return {
    marketValue,
    costBasis,
    gain,
    gainPct: gain !== null && costBasis > 0 ? (gain / costBasis) * 100 : null,
  };
}

/** Sentence-case account type ("investment" reads "Investment"), or an empty string. */
export function accountTypeLabel(type) {
  const s = String(type || '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/* ── Sorting ────────────────────────────────────────────────────────── */

/** Sorted copy of rows by key. Missing values always sort last. */
export function sortRows(rows, key, dir = 'asc') {
  const mult = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    const ea = va === null || va === undefined || va === '';
    const eb = vb === null || vb === undefined || vb === '';
    if (ea && eb) return 0;
    if (ea) return 1;
    if (eb) return -1;
    if (typeof va === 'string' || typeof vb === 'string') {
      return mult * String(va).localeCompare(String(vb));
    }
    return mult * (va - vb);
  });
}
