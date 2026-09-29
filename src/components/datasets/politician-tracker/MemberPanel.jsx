'use client';

/**
 * One politician's panel: trade activity, the members they trade most like,
 * and the top federal contractors among the tickers they trade. A right side
 * panel on desktop, full width on a phone (politician-tracker.css).
 *
 * P3 additions: chamber ring and party tag in the identity block, a
 * "Show all N trades" expander under the 10 most recent, and three real
 * states for the contractor section (loading, empty, failed). `contractors`
 * is { state: 'loading' | 'ready' | 'failed', data }.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts';
import { CHART } from '@/lib/chart-theme';
import {
  contractorTrades,
  monthlyForMember,
  seatLabel,
  similarTraders,
  usdShort,
} from '@/lib/politicians/tracker-model';
import Headshot, { ChamberChip, PartyTag } from './Headshot';

const TRADES_DEFAULT = 10;

const NONE = '·';
const SIDE = {
  purchase: { label: 'BUY', cls: 'dsc-chip--buy' },
  sale: { label: 'SELL', cls: 'dsc-chip--sell' },
  exchange: { label: 'EXCH', cls: 'dsc-chip--exch' },
  other: { label: 'OTHER', cls: 'dsc-chip--exch' },
};

function Stat({ label, value }) {
  return (
    <div className="dsc-p-stat">
      <span className="dsc-label">{label}</span>
      <p className="dsc-p-fig dsc-mn">{value}</p>
    </div>
  );
}

export default function MemberPanel({ member, members, contractors, onClose, onSelect }) {
  const panelRef = useRef(null);
  const [allTrades, setAllTrades] = useState(false);
  const monthly = useMemo(() => monthlyForMember(member), [member]);
  const alike = useMemo(() => similarTraders(member, members), [member, members]);
  const contractData = contractors?.data || null;
  const contracted = useMemo(
    () => contractorTrades(member, contractData?.byTicker),
    [member, contractData],
  );
  const shownTrades = allTrades ? member.trades : member.trades.slice(0, TRADES_DEFAULT);

  /* A different member is a different panel: collapse the expander. */
  useEffect(() => setAllTrades(false), [member.key]);

  /* Focus trap: Tab cycles inside the dialog while it is open. */
  useEffect(() => {
    const onTab = (e) => {
      if (e.key !== 'Tab' || !panelRef.current) return;
      const els = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, member.key]);

  const seat = seatLabel(member) || NONE;

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      className="dsc-panel ptk-panel"
      role="dialog"
      aria-label={`${member.name}, trade profile`}
    >
      <div className="dsc-p-head">
        <span className="dsc-p-route dsc-mn">
          POLITICIAN TRACKER / {member.chamber?.toUpperCase() || NONE}
        </span>
        <button type="button" className="dsc-p-x" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      <div className="dsc-p-body">
        <div className="dsc-p-id ptk-id">
          <Headshot
            name={member.name}
            bioguideId={member.bioguideId}
            chamber={member.chamber}
            size={96}
            ring={3}
          />
          <div>
            <h2 className="dsc-p-name">{member.name}</h2>
            <p className="dsc-p-meta">
              <ChamberChip chamber={member.chamber} />
              <span className="ptk-seat">
                <PartyTag party={member.party} />
                <span className="dsc-mn ptk-id-place">{seat}</span>
              </span>
            </p>
          </div>
        </div>

        <div className="dsc-p-stats">
          <Stat label="Trades" value={member.count} />
          <Stat label="Buys" value={member.buys} />
          <Stat label="Sells" value={member.sells} />
          <Stat label="Volume, midpoints" value={usdShort(member.volume)} />
        </div>

        <section className="dsc-p-block">
          <div className="dsc-p-block-head">
            <span className="dsc-label">Trade activity</span>
            <span className="dsc-block-cap">counts by month</span>
          </div>
          <div className="ptk-mini-chart" role="img" aria-label="Buys and sells per month">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barGap={1} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tick={CHART.tick}
                  axisLine={CHART.xAxisLine}
                  tickLine={false}
                  tickFormatter={(m) => m.slice(5)}
                />
                <Bar dataKey="buys" fill="var(--emerald)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="sells" fill="var(--dsc-sell-mark)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="dsc-p-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Traded</th>
                <th aria-label="Source" />
              </tr>
            </thead>
            <tbody>
              {shownTrades.map((t) => {
                const side = SIDE[t.side] || SIDE.other;
                return (
                  <tr key={t.id}>
                    <td className="dsc-mn">{t.ticker || NONE}</td>
                    <td>
                      <span className={`dsc-chip ${side.cls}`}>{side.label}</span>
                    </td>
                    <td className="dsc-mn">{t.amountBand?.raw || NONE}</td>
                    <td className="dsc-mn">{t.tradedAt || NONE}</td>
                    <td>
                      {t.sourceUrl ? (
                        <a
                          className="dsc-src"
                          href={t.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open source filing"
                        >
                          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="dsc-none">{NONE}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {member.trades.length > TRADES_DEFAULT ? (
            <button
              type="button"
              className="ptk-link ptk-expander"
              aria-expanded={allTrades}
              onClick={() => setAllTrades((v) => !v)}
            >
              {allTrades ? 'Show fewer' : `Show all ${member.trades.length} trades`}
            </button>
          ) : null}
        </section>

        <section className="dsc-p-block">
          <div className="dsc-p-block-head">
            <span className="dsc-label">Trades most like</span>
            <span className="dsc-block-cap">shared tickers, overlap</span>
          </div>
          {alike.length ? (
            <ul className="ptk-alike">
              {alike.map(({ member: o, shared, score }) => (
                <li key={o.key}>
                  <button type="button" className="ptk-alike-row" onClick={() => onSelect(o)}>
                    <Headshot
                      name={o.name}
                      bioguideId={o.bioguideId}
                      chamber={o.chamber}
                      size={40}
                      ring={2}
                    />
                    <span className="ptk-alike-text">
                      <span className="ptk-name">{o.name}</span>
                      <span className="ptk-alike-meta">
                        <span
                          className={`ptk-chamber ptk-chamber--${String(o.chamber).toLowerCase()}`}
                        >
                          {o.chamber}
                        </span>
                        <span className="dsc-mn">{shared.slice(0, 4).join(' ')}</span>
                      </span>
                    </span>
                    <span className="ptk-alike-score dsc-mn">{Math.round(score * 100)}%</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dsc-note">
              No other member shares two or more of these tickers in the loaded window.
            </p>
          )}
        </section>

        <section className="dsc-p-block">
          <div className="dsc-p-block-head">
            <span className="dsc-label">Government contractors they trade</span>
            {contractData?.fiscalYear ? (
              <span className="dsc-block-cap">FY{contractData.fiscalYear} awards</span>
            ) : null}
          </div>
          {contractors?.state === 'loading' ? (
            <div aria-busy="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="ptk-skel ptk-skel--line ptk-skel--row"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : contractors?.state === 'failed' ? (
            <p className="dsc-note" role="status">
              Contract data is unavailable right now.
            </p>
          ) : contracted.length ? (
            <table className="dsc-p-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Recipient</th>
                  <th>Awarded</th>
                  <th>Trades</th>
                </tr>
              </thead>
              <tbody>
                {contracted.map((c) => (
                  <tr key={c.ticker}>
                    <td className="dsc-mn">{c.ticker}</td>
                    <td className="ptk-recipient">{c.recipient}</td>
                    <td className="dsc-mn">{usdShort(c.total)}</td>
                    <td className="dsc-mn">{c.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="dsc-note">
              No top federal contractors among the tickers traded
              {contractData?.fiscalYear ? `, FY${contractData.fiscalYear}` : ''}.
            </p>
          )}
        </section>

        <p className="dsc-p-note">
          Disclosures are public records. Amounts are the ranges members disclose. Nothing here is
          investment advice.
        </p>
      </div>
    </aside>
  );
}
