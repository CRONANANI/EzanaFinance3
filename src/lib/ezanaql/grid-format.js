/**
 * Cell formatting for the EzanaQL results grid, by the column type the
 * engine reports (money, int, float, date, bool, string, or null when it
 * cannot tell). Display only: CSV and JSON exports carry the raw values.
 *
 *   formatCell(1272663951.02, 'money') → '$1,272,663,951'
 *   formatCell(16, 'int')              → '16'
 *   formatCell('2026-10-30', 'date')   → 'Oct 30, 2026'
 *
 * Money shows whole dollars at $1,000 and above (the cents on a $1.27B award
 * are noise), two decimals below. A number in an untyped column still gets
 * separators, since a bare 1272663951.02 reads as a mistake.
 */
const NUMERIC = new Set(['money', 'int', 'float']);

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const two = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const upToTwo = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function isNumericType(type) {
  return NUMERIC.has(type);
}

export function formatDate(v) {
  const s = String(v ?? '').slice(0, 10);
  const d = new Date(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime())) return String(v ?? '');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatMoney(n) {
  const abs = Math.abs(n);
  const body = abs >= 1000 ? whole.format(abs) : two.format(abs);
  return `${n < 0 ? '-' : ''}$${body}`;
}

export function formatCell(value, type) {
  if (value == null || value === '') return '·';
  if (type === 'bool' || typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'date') return formatDate(value);
  const n = typeof value === 'number' ? value : Number(value);
  const numeric =
    Number.isFinite(n) && (typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(String(value)));
  if (type === 'money' && numeric) return formatMoney(n);
  if (type === 'int' && numeric) return whole.format(n);
  if ((type === 'float' || type == null) && numeric) {
    return Number.isInteger(n) ? whole.format(n) : upToTwo.format(n);
  }
  return String(value);
}

/* A column is right-aligned when its type is numeric, or, untyped, when
   every non-null value in the first rows is a number. */
export function columnAlign(type, rows, key) {
  if (isNumericType(type)) return 'right';
  if (type) return 'left';
  const sample = rows
    .slice(0, 20)
    .map((r) => r[key])
    .filter((v) => v != null && v !== '');
  return sample.length && sample.every((v) => typeof v === 'number') ? 'right' : 'left';
}
