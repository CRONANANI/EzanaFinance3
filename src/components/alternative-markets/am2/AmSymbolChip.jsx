'use client';

export function AmSymbolChip({ children, accent = 'emerald' }) {
  return <span className={`am2-chip am2-chip--${accent}`}>{children}</span>;
}
