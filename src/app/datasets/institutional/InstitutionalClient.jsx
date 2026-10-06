'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, TrendingUp } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { DatasetTable, Ticker, EntityName } from '@/components/marketing/DatasetTable';
import { usd, int, pct, quarterShort, OPENFIGI_NOTE, ALLOW_SAMPLE } from '@/lib/titans/format';
import { INSTITUTIONAL_SAMPLE, TOP_INSTITUTIONAL_MOVES } from './institutional-sample';

const CHANGE_LABEL = {
  new: 'New',
  added: 'Added',
  doubled: 'Doubled',
  trimmed: 'Trimmed',
  unchanged: 'Unchanged',
  exited: 'Exited',
};

/* Ticker when mapped, else the issuer name: never an invented symbol. */
const HoldingCell = (v, row) =>
  v ? <Ticker symbol={v} /> : <span className="mkt-ds-mono">{row.issuer || 'Unmapped'}</span>;

function FundHoldings({ cik, onClose }) {
  const [state, setState] = useState({ status: 'loading', fund: null });
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading', fund: null });
    fetch(`/api/titans/fund?cik=${encodeURIComponent(cik)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState({ status: d?.ok ? 'ready' : 'error', fund: d?.fund || null }))
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ status: 'error', fund: null });
      });
    return () => ctrl.abort();
  }, [cik]);

  const f = state.fund;
  const rows = (f?.holdings || []).slice(0, 50).map((h, i) => ({
    id: `${h.cusip || h.issuer}-${i}`,
    ticker: h.ticker,
    issuer: h.issuer,
    value: usd(h.valueUsd),
    weight: pct(h.weightPct),
    shares: int(h.shares),
    change: h.change ? CHANGE_LABEL[h.change] || h.change : '–',
  }));

  return (
    <div className="mkt-card" aria-live="polite">
      <div className="mkt-ds-highlight-head">
        <span className="mkt-ds-highlight-title">
          {f ? f.filer : 'Fund holdings'}
          {f ? <span className="mkt-ds-mono"> · {quarterShort(f.quarter)}</span> : null}
        </span>
        <button type="button" className="mkt-ds-badge-new" onClick={onClose}>
          Close
        </button>
      </div>
      {state.status === 'loading' ? (
        <p className="mkt-ds-sample-note">Loading holdings…</p>
      ) : state.status === 'error' ? (
        <p className="mkt-ds-sample-note">Holdings could not be loaded.</p>
      ) : !f ? (
        <p className="mkt-ds-sample-note">No parsed 13F holdings for this filer yet.</p>
      ) : (
        <>
          <p className="mkt-ds-sample-note">
            {int(f.positions)} positions, {usd(f.totalValueUsd)} reported.{' '}
            {f.priorQuarter
              ? `Change versus ${quarterShort(f.priorQuarter)}.`
              : 'No prior quarter loaded for this filer, so no change column yet.'}{' '}
            Top 50 by value.
          </p>
          <DatasetTable
            columns={[
              { key: 'ticker', label: 'Holding', render: HoldingCell },
              { key: 'issuer', label: 'Issuer' },
              { key: 'value', label: 'Value', align: 'right', mono: true },
              { key: 'weight', label: 'Weight', align: 'right', mono: true },
              { key: 'shares', label: 'Shares', align: 'right', mono: true },
              { key: 'change', label: 'Change' },
            ]}
            rows={rows}
            emptyText="No holdings in this filing."
          />
        </>
      )}
    </div>
  );
}

export default function InstitutionalClient({ quarterLabel, stats, filers, widely, newPositions }) {
  const live = filers.length > 0;
  const sample = !live && ALLOW_SAMPLE;
  const [openCik, setOpenCik] = useState(null);
  const [holdingTerm, setHoldingTerm] = useState('');

  const tableRows = live
    ? filers
    : sample
      ? INSTITUTIONAL_SAMPLE.map((r) => ({ ...r, positions: null }))
      : [];

  const onRowClick = useCallback((row) => setOpenCik(row.cik), []);

  const widelyRows = useMemo(() => {
    const t = holdingTerm.trim().toLowerCase();
    return t
      ? widely.filter((r) => `${r.ticker || ''} ${r.issuer || ''}`.toLowerCase().includes(t))
      : widely;
  }, [widely, holdingTerm]);

  const tickerItems = useMemo(
    () =>
      widely.slice(0, 20).map((r) => ({
        id: r.id,
        lead: `${r.holders} ${r.holders === '1' ? 'holder' : 'holders'}`,
        main: r.ticker || r.issuer,
        value: r.value,
      })),
    [widely],
  );

  const caption = quarterLabel
    ? `Largest 13F filers for the quarter ended ${quarterLabel}`
    : sample
      ? 'Recent 13F holdings (sample)'
      : 'Largest 13F filers';

  const config = {
    title: 'Institutional holdings (13F)',
    lead: 'Quarterly institutional holdings from SEC Form 13F-HR: what the largest managers own, added and exited, normalized into one consistent schema across every filer.',
    searches: [
      {
        id: 'fund',
        label: 'Fund search',
        placeholder: 'Search by manager…',
        icon: Building2,
        keys: ['fund'],
      },
    ],
    highlight: {
      badge: 'New',
      icon: TrendingUp,
      title: 'Largest new positions this quarter',
      desc: quarterLabel
        ? `The biggest positions absent from the same filer's previous 13F, for the quarter ended ${quarterLabel}.`
        : 'The biggest positions absent from the same filer’s previous 13F.',
      items: live ? newPositions : sample ? TOP_INSTITUTIONAL_MOVES : [],
      emptyText: 'New positions appear once filers have two quarters of 13F holdings loaded.',
    },
    table: {
      caption,
      columns: live
        ? [
            { key: 'fund', label: 'Manager', render: (v) => <EntityName>{v}</EntityName> },
            { key: 'positions', label: 'Positions', align: 'right', mono: true },
            { key: 'value', label: 'Reported value', align: 'right', mono: true },
            { key: 'quarter', label: 'Quarter', mono: true },
          ]
        : [
            { key: 'fund', label: 'Manager', render: (v) => <EntityName>{v}</EntityName> },
            { key: 'ticker', label: 'Holding', render: (v) => <Ticker symbol={v} /> },
            { key: 'issuer', label: 'Issuer' },
            { key: 'value', label: 'Value', align: 'right', mono: true },
            { key: 'shares', label: 'Shares', align: 'right', mono: true },
            { key: 'quarter', label: 'Quarter', mono: true },
          ],
      rows: tableRows,
      emptyText:
        '13F holdings for the latest complete quarter are still loading. Filers appear here as their filings are parsed.',
    },
    sampleNote: sample
      ? 'Sample rows (local development only).'
      : stats
        ? `${stats.filers} filers, ${stats.holdings} holdings, ${stats.value} reported. Select a manager to see its holdings.`
        : null,
    onRowClick: live ? onRowClick : undefined,
    getRowLabel: (row) => `View ${row.fund} holdings`,
    source: {
      title: 'How we source it',
      body: [
        'Sourced from SEC EDGAR Form 13F-HR: the quarterly holdings reports institutional managers with over $100M in qualifying assets must file within 45 days of quarter end.',
        'Holdings are parsed from each filing’s information table and normalized to whole-dollar values. Each manager counts once, using its latest filing (amendments included) for the quarter. The 45-day deadline means holdings reflect quarter-end positions, not real-time ones, a lag inherent to the disclosure.',
      ],
      note: OPENFIGI_NOTE,
    },
    cta: { href: '/auth/login', label: 'Explore in the app' },
    activeCategory: 'titans',
    activeItem: 'Institutional',
    ticker: { ariaLabel: 'Most widely held securities', items: tickerItems },
  };

  return (
    <DatasetDashboard config={config}>
      {openCik ? (
        <div style={{ marginBottom: 28 }}>
          <FundHoldings cik={openCik} onClose={() => setOpenCik(null)} />
        </div>
      ) : null}
      {live || widely.length ? (
        <>
          <h2 className="mkt-section-title">
            Most widely held{quarterLabel ? `, quarter ended ${quarterLabel}` : ''}
          </h2>
          <div className="mkt-ds-search-row" role="search">
            <label className="mkt-ds-search">
              <span className="mkt-ds-search-label">Holding search</span>
              <span className="mkt-ds-search-field">
                <i className="bi bi-search" aria-hidden="true" />
                <input
                  type="text"
                  className="mkt-ds-input"
                  placeholder="Search by ticker or issuer…"
                  value={holdingTerm}
                  onChange={(e) => setHoldingTerm(e.target.value)}
                  aria-label="Holding search"
                />
              </span>
            </label>
          </div>
          <DatasetTable
            columns={[
              { key: 'ticker', label: 'Holding', render: HoldingCell },
              { key: 'issuer', label: 'Issuer' },
              { key: 'holders', label: 'Filers holding', align: 'right', mono: true },
              { key: 'value', label: 'Combined value', align: 'right', mono: true },
              { key: 'shares', label: 'Shares', align: 'right', mono: true },
              { key: 'quarter', label: 'Quarter', mono: true },
            ]}
            rows={widelyRows}
          />
        </>
      ) : null}
    </DatasetDashboard>
  );
}
