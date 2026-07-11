'use client';

import { Wallet } from 'lucide-react';
import { money } from './format';

/**
 * Cash on hand · % of book · vs IPS minimum.
 * TODO(cash): no cash field exists in the schema yet, so `cash` is null and this
 * tile renders nothing. The component is complete and will light up the moment a
 * cash field is added — we do NOT fabricate a figure or show $0.
 */
export function CashTile({ cash }) {
  if (cash == null) return null;

  return (
    <div className="fa-card fa-card-pad fa-cash">
      <div>
        <div className="fa-stat">
          <div className="l">Cash on hand</div>
          <div className="v">{money(cash.amount)}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="an4-num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {cash.pct_of_book == null ? '—' : `${Number(cash.pct_of_book).toFixed(1)}%`}
        </div>
        {cash.ips_min_pct != null && (
          <div style={{ fontSize: '0.62rem', color: 'var(--text-faint, var(--text-muted))' }}>
            min {Number(cash.ips_min_pct).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  );
}
