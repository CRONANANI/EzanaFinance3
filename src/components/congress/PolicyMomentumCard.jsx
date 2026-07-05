'use client';

/**
 * Policy momentum by sector — reads the Legislative Momentum engine
 * (/api/congress/momentum) and lists sectors seeing rising legislative
 * activity, each decomposable to the bills driving it (receipts).
 *
 * Supabase-first API → honest empty state (a plain note) when nothing is
 * ingested yet. Additive, informational only: "sectors with rising
 * legislative activity", never investment advice. No mock data.
 */
import { useEffect, useState } from 'react';
import { MomentumChip, BillStageChip } from './chips';

export function PolicyMomentumCard({
  title = 'Policy momentum by sector',
  intro = 'Sectors seeing rising legislative activity in Congress, weighted by how far each bill has advanced. Informational only — not investment advice.',
  windowDays = 90,
  limit = 6,
}) {
  const [state, setState] = useState({ loading: true, sectors: [], methodology: '' });

  useEffect(() => {
    let alive = true;
    fetch(`/api/congress/momentum?window=${windowDays}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setState({
          loading: false,
          sectors: Array.isArray(d?.sectors) ? d.sectors : [],
          methodology: d?.methodology || '',
        });
      })
      .catch(() => alive && setState({ loading: false, sectors: [], methodology: '' }));
    return () => {
      alive = false;
    };
  }, [windowDays]);

  const { loading, sectors, methodology } = state;
  const top = sectors.slice(0, limit);
  const max = sectors.length ? sectors[0].score : 0;

  return (
    <section className="congress-surface mkt-card" aria-label={title}>
      <div className="congress-surface-head">
        <h2 className="congress-surface-title">{title}</h2>
        <span className="congress-surface-badge">Congress.gov</span>
      </div>
      <p className="congress-surface-intro">{intro}</p>

      {loading ? (
        <p className="congress-surface-empty">Loading legislative momentum…</p>
      ) : !top.length ? (
        <p className="congress-surface-empty">
          No legislative momentum to show yet — sectors will appear here as tracked bills advance
          through Congress.
        </p>
      ) : (
        <ul className="congress-momentum-list">
          {top.map((s) => (
            <li key={s.sector} className="congress-momentum-row">
              <div className="congress-momentum-main">
                <span className="congress-momentum-label">{s.label}</span>
                <span className="congress-momentum-sub">
                  {s.etf ? `${s.etf} · ` : ''}
                  {s.billCount} {s.billCount === 1 ? 'bill' : 'bills'}
                  {s.bills?.[0]?.stage ? ' · furthest: ' : ''}
                  {s.bills?.[0]?.stage ? (
                    <BillStageChip stage={s.bills[0].stage} size="sm" />
                  ) : null}
                </span>
              </div>
              <MomentumChip score={s.score} max={max} />
            </li>
          ))}
        </ul>
      )}

      {methodology ? <p className="congress-surface-method">{methodology}</p> : null}
    </section>
  );
}
