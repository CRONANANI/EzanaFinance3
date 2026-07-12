'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { money, pct } from './format';

function List({ rows, positive }) {
  if (!rows || rows.length === 0) return <div className="fa-empty">No positions yet.</div>;
  return rows.map((c, i) => (
    <div className="fa-cd" key={`${c.ticker}-${i}`}>
      <div>
        <div className="tk">{c.ticker}</div>
        <div className="meta">
          {c.sector || '—'}
          {c.analyst_name ? ` · ${c.analyst_name}` : ''}
        </div>
      </div>
      <div className={`amt ${positive ? 'an4-pos' : 'an4-neg'}`}>
        {money(c.contribution_usd)}
        <div className="meta" style={{ textAlign: 'right' }}>
          {pct(c.contribution_pct, 1)}
        </div>
      </div>
    </div>
  ));
}

/** Top 5 contributors / bottom 5 detractors, side by side. */
export function ContributorsDetractors({ data }) {
  return (
    <div className="fa-cd-grid">
      <div className="fa-card" style={{ overflow: 'hidden', paddingBottom: '0.4rem' }}>
        <div className="fa-card-head">
          <h3 className="fa-card-t">
            <TrendingUp size={15} aria-hidden /> Top contributors
          </h3>
        </div>
        <List rows={data?.top} positive />
      </div>
      <div className="fa-card" style={{ overflow: 'hidden', paddingBottom: '0.4rem' }}>
        <div className="fa-card-head">
          <h3 className="fa-card-t">
            <TrendingDown size={15} aria-hidden /> Top detractors
          </h3>
        </div>
        <List rows={data?.bottom} positive={false} />
      </div>
    </div>
  );
}
