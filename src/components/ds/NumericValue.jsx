'use client';

import { cx } from './tokens';

function autoTone(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return null;
  return n > 0 ? 'pos' : 'neg';
}

function formatNumber(value, { format, decimals, prefix, suffix, sign }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  let body;
  if (format === 'percent') {
    body = `${abs.toFixed(decimals ?? 2)}%`;
  } else if (format === 'price') {
    body = abs.toLocaleString(undefined, {
      minimumFractionDigits: decimals ?? 2,
      maximumFractionDigits: decimals ?? 2,
    });
  } else if (format === 'compact') {
    body = new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(abs);
  } else {
    body = decimals != null ? abs.toFixed(decimals) : abs.toLocaleString();
  }
  const s = sign ? (n > 0 ? '+' : n < 0 ? '-' : '') : n < 0 ? '-' : '';
  return `${s}${prefix}${body}${suffix}`;
}

/**
 * The one numeric primitive. Always renders in JetBrains Mono with
 * tabular-nums (so columns of figures align). Optionally formats as a
 * percent/price/compact figure, prepends a sign, and colorizes by direction.
 *
 *   <NumericValue value={pct} format="percent" sign colorize="auto" />
 *   <NumericValue value={price} format="price" prefix="$" />
 *
 * colorize: 'auto' (green/red by sign) | 'pos' | 'neg' | 'muted' | 'none'
 */
export function NumericValue({
  value,
  format,
  prefix = '',
  suffix = '',
  sign = false,
  decimals,
  colorize = 'none',
  className,
  children,
  ...rest
}) {
  let display = children;
  if (display == null) {
    display = formatNumber(value, { format, decimals, prefix, suffix, sign }) ?? '—';
  }
  const tone =
    colorize === 'auto'
      ? autoTone(value)
      : ['pos', 'neg', 'muted'].includes(colorize)
        ? colorize
        : null;
  return (
    <span
      className={cx(
        'ds-num',
        tone === 'pos' && 'ds-num--pos',
        tone === 'neg' && 'ds-num--neg',
        tone === 'muted' && 'ds-num--muted',
        className,
      )}
      {...rest}
    >
      {display}
    </span>
  );
}

/** A ticker symbol, mono-styled and uppercased: $TSLA. */
export function Ticker({ symbol, withDollar = true, className, ...rest }) {
  const sym = String(symbol || '').toUpperCase();
  return (
    <span className={cx('ds-num', className)} {...rest}>
      {withDollar ? `$${sym}` : sym}
    </span>
  );
}
