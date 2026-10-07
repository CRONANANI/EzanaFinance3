import { usd, int, pct, shortDate } from '@/lib/titans/format';

/** One hub value by kind; null means "not reported" and renders as a dash. */
export function fmt(kind, v) {
  if (v == null || v === '') return null;
  switch (kind) {
    case 'int':
      return int(v);
    case 'usd':
      return usd(v);
    case 'pct':
      return pct(v);
    case 'date':
      return shortDate(v);
    case 'num':
      return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
    case 'signed-pct': {
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
    }
    case 'signed': {
      const s = Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
      return Number(v) > 0 ? `+${s}` : s;
    }
    default:
      return String(v);
  }
}

/* Numbers, tickers and dates read in the mono face. */
export const isMono = (kind) => kind !== 'text';
