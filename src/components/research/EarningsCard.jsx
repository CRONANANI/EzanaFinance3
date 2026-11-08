'use client';

import { useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import dynamic from 'next/dynamic';
import { useEarnings } from '@/hooks/useFinnhub';
import './research-tab-cards.css';

const OrgSendToTeamModal = dynamic(
  () =>
    import('@/components/org/OrgSendToTeamModal').then((m) => ({ default: m.OrgSendToTeamModal })),
  { ssr: false, loading: () => null },
);

function fmt(v) {
  if (v == null) return 'n/a';
  const n = Number(v);
  return Number.isNaN(n) ? 'n/a' : n.toFixed(2);
}

/** Surprise cell: explicit sign so direction never rides on colour alone. */
function surprise(v) {
  const shown = fmt(v);
  if (shown === 'n/a') return { text: 'n/a', tone: 'is-flat' };
  const n = Number(v);
  if (n > 0) return { text: `+${shown}%`, tone: 'is-pos' };
  if (n < 0) return { text: `${shown}%`, tone: 'is-neg' };
  return { text: `${shown}%`, tone: 'is-flat' };
}

export function EarningsCard({ symbol }) {
  const { data, loading, error } = useEarnings(symbol);
  const { isOrgUser, hasPermission } = useOrg();
  const [showSend, setShowSend] = useState(false);

  if (!symbol) return null;
  if (loading) {
    return (
      <section className="rec research-fade-in" aria-busy="true">
        <div className="rec-head-id">
          <span className="rec-skel rec-skel--icon" />
          <div className="rec-head-text">
            <span className="rec-skel rec-skel--title" />
            <span className="rec-skel rec-skel--line" />
          </div>
        </div>
        <span className="rec-skel rec-skel--block" />
        <span className="rec-sr" role="status">
          Loading earnings...
        </span>
      </section>
    );
  }
  if (error || !data?.length) {
    return (
      <section className="rec rec--state research-fade-in">
        <p className="rec-state-title">Earnings data unavailable</p>
        <p className="rec-state-text">Free tier coverage: last 4 quarters.</p>
      </section>
    );
  }

  return (
    <>
      <section className="rec research-fade-up">
        <header className="rec-head">
          <div className="rec-head-id">
            <span className="rec-icon" aria-hidden="true">
              <i className="bi bi-receipt" />
            </span>
            <div className="rec-head-text">
              <h3 className="rec-title">Earnings History</h3>
              <p className="rec-desc">Reported EPS against the consensus estimate for {symbol}</p>
            </div>
          </div>
          {isOrgUser && hasPermission('send_to_team') && (
            <button type="button" className="rec-btn" onClick={() => setShowSend(true)}>
              <i className="bi bi-send" aria-hidden="true" /> Send breakdown
            </button>
          )}
        </header>
        <div className="rec-table-wrap">
          <table className="rec-table">
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Actual</th>
                <th scope="col">Estimate</th>
                <th scope="col">Surprise %</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const s = surprise(row.surprisePercent);
                return (
                  <tr key={`${row.period}-${row.year}`}>
                    <td>
                      {row.period} {row.year}
                    </td>
                    <td>{fmt(row.actual)}</td>
                    <td className="rec-est">{fmt(row.estimate)}</td>
                    <td className={s.tone}>{s.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showSend && (
        <OrgSendToTeamModal
          onClose={() => setShowSend(false)}
          attachment={{
            kind: 'earnings_analysis',
            ref: JSON.stringify({
              symbol,
              quarters: (data || []).slice(0, 4).map((r) => ({
                period: r.period,
                year: r.year,
                actual: r.actual,
                estimate: r.estimate,
                surprisePercent: r.surprisePercent,
              })),
            }),
            label: `${symbol} earnings breakdown`,
            meta: { page: 'company-research', surface: 'earnings_card' },
          }}
        />
      )}
    </>
  );
}
