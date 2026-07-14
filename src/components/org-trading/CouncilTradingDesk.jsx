'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Flag, Inbox, Plus } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { AddPositionModal } from './add-position/AddPositionModal';

/* FlagComposerModal only mounts when a flag is being composed (openFlagModal
   truthy) — defer its code until then. Overlay modal: null fallback is safe. */
const FlagComposerModal = dynamic(
  () => import('./FlagComposerModal').then((m) => ({ default: m.FlagComposerModal })),
  { loading: () => null },
);
import {
  MOCK_TEAM_PERFORMANCE,
  MOCK_TMT_HOLDINGS,
  dbTeamIdFromMockTeamId,
  mockTeamIdFromDbTeams,
} from '@/lib/orgMockData';

/**
 * Council Trading — executive desk (redesign "1b").
 *
 * A single focal-hero card (sector-allocation donut + today/unrealized + sector
 * ROI ranking + KPI chips), sector filter chips, and one unified positions
 * table. Presentation only — all figures derive from the SAME mock wiring the
 * old CouncilOverview used (MOCK_TEAM_PERFORMANCE / MOCK_TMT_HOLDINGS, book
 * value = Σ team values). P/L is computed (price − cost) / cost, never
 * hardcoded. The flag flow (FlagComposerModal + /api/org-trading/flags) and the
 * Add-position modal are the existing ones, unchanged.
 */

/* Sector short labels for chips, dots, and the donut. Keyed by MOCK_TEAMS id. */
const SECTOR_SHORT = {
  t1: 'Healthcare',
  t2: 'Consumer',
  t3: 'Energy',
  t4: 'Financials',
  t5: 'Industrials',
  t6: 'Metals',
  t7: 'TMT',
};

/* Sector accent → theme token (resolved in org-trading.css as scoped vars, so
   no raw hex lives in JSX). One CSS variable per sector team id. */
const SECTOR_VAR = {
  t1: 'var(--ctd-sec-t1)',
  t2: 'var(--ctd-sec-t2)',
  t3: 'var(--ctd-sec-t3)',
  t4: 'var(--ctd-sec-t4)',
  t5: 'var(--ctd-sec-t5)',
  t6: 'var(--ctd-sec-t6)',
  t7: 'var(--ctd-sec-t7)',
};

/* Reused verbatim from CouncilOverview: derive per-team holdings from the mock
   universe (TMT uses its real breakdown; the other sleeves are derived so each
   sums to ~team.value). */
function buildTeamHoldings(teamId) {
  if (teamId === 't7') {
    return MOCK_TMT_HOLDINGS.map((h) => ({
      ticker: h.ticker,
      shares: h.shares,
      avg_cost: h.avg_cost,
      current_price: h.current_price,
      analyst_id: h.analyst,
      coverage_status: h.coverage_status,
      sector: h.sector,
    }));
  }
  const team = MOCK_TEAM_PERFORMANCE.find((t) => t.team_id === teamId);
  if (!team) return [];
  const totalValue = team.value;
  const tickerCount = team.top_holdings.length;
  const avgPositionValue = totalValue / tickerCount;
  return team.top_holdings.map((ticker, i) => {
    const variance = 0.85 + i * 0.1;
    const positionValue = avgPositionValue * variance;
    const current_price = 50 + (ticker.charCodeAt(0) % 100) + i * 12;
    const shares = Math.round(positionValue / current_price);
    const avg_cost = current_price * (1 - team.ytd_return / 100);
    return {
      ticker,
      shares,
      avg_cost: Number(avg_cost.toFixed(2)),
      current_price: Number(current_price.toFixed(2)),
      analyst_id: null,
      coverage_status: 'active',
      sector: team.team_name,
    };
  });
}

function flagsToTickerMap(flags, orgTeams) {
  const map = {};
  for (const f of flags || []) {
    const mockTeamId = mockTeamIdFromDbTeams(orgTeams, f.team_id);
    const k = `${f.ticker}_${mockTeamId || f.team_id || 'na'}`;
    if (!map[k]) map[k] = { color: f.flag_color, count: 0 };
    map[k].count += 1;
  }
  return map;
}

const fmtUSD = (n) =>
  (n < 0 ? '-$' : '$') +
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtUSD2 = (n) =>
  (n < 0 ? '-$' : '$') +
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n) => {
  const k = n / 1000;
  return `$${k >= 100 ? Math.round(k) : k.toFixed(1)}K`;
};
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

/* Sector-allocation donut (lightweight inline SVG — no chart lib). Each slice
   is a stroked arc sized by its share of book value; center shows the total. */
function AllocationDonut({ slices, total }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="ctd-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="Book value by sector">
        <circle className="ctd-donut-track" cx="70" cy="70" r={R} fill="none" strokeWidth="16" />
        {slices.map((s) => {
          const frac = total > 0 ? s.value / total : 0;
          const seg = frac * C;
          const el = (
            <circle
              key={s.id}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              strokeWidth="16"
              stroke={SECTOR_VAR[s.id]}
              strokeDasharray={`${seg} ${C - seg}`}
              strokeDashoffset={-acc}
              transform="rotate(-90 70 70)"
            >
              <title>{`${s.name} · ${fmtK(s.value)}`}</title>
            </circle>
          );
          acc += seg;
          return el;
        })}
      </svg>
      <div className="ctd-donut-center">
        <span className="ctd-donut-total ctd-num">{fmtK(total)}</span>
        <span className="ctd-donut-label">book value</span>
      </div>
    </div>
  );
}

export function CouncilTradingDesk() {
  const { orgData, orgRole, canFlagPositions, canManagePositions } = useOrg();
  const orgTeams = orgData?.teams || [];
  const orgName = orgData?.org?.name || 'Investment Council';

  const [chip, setChip] = useState('all');
  const [openFlagModal, setOpenFlagModal] = useState(null);
  const [flagsByTicker, setFlagsByTicker] = useState({});
  const [showAddPosition, setShowAddPosition] = useState(false);

  const refreshFlags = useCallback(() => {
    fetch('/api/org-trading/flags?asRaiser=true&asRecipient=true&status=open')
      .then((r) => (r.ok ? r.json() : { flags: [] }))
      .then((d) => setFlagsByTicker(flagsToTickerMap(d.flags, orgTeams)))
      .catch(() => {});
  }, [orgTeams]);

  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  /* Flatten every sleeve into one position book; tag each row with its sector
     team so the chips can filter and the flag flow can route. */
  const positions = useMemo(() => {
    const rows = [];
    for (const team of MOCK_TEAM_PERFORMANCE) {
      for (const h of buildTeamHoldings(team.team_id)) {
        const value = h.shares * h.current_price;
        const cost = h.shares * h.avg_cost;
        rows.push({
          ...h,
          sectorId: team.team_id,
          sectorName: team.team_name,
          value,
          cost,
          pl: value - cost,
          plPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        });
      }
    }
    return rows;
  }, []);

  /* Book value = Σ team sleeve values (≈ $846.5K); donut slices by sleeve. */
  const bookValue = useMemo(() => MOCK_TEAM_PERFORMANCE.reduce((s, t) => s + t.value, 0), []);
  const donutSlices = useMemo(
    () =>
      MOCK_TEAM_PERFORMANCE.map((t) => ({
        id: t.team_id,
        name: SECTOR_SHORT[t.team_id],
        value: t.value,
      })).sort((a, b) => b.value - a.value),
    [],
  );

  const todayDollar = useMemo(
    () => MOCK_TEAM_PERFORMANCE.reduce((s, t) => s + t.change_dollar, 0),
    [],
  );
  const todayPct = useMemo(
    () => (bookValue - todayDollar > 0 ? (todayDollar / (bookValue - todayDollar)) * 100 : 0),
    [bookValue, todayDollar],
  );
  const unrealized = useMemo(() => positions.reduce((s, p) => s + p.pl, 0), [positions]);

  /* Per-sector unrealized ROI, ranked — from the position book, not hardcoded. */
  const sectorRoi = useMemo(() => {
    const agg = {};
    for (const p of positions) {
      if (!agg[p.sectorId]) agg[p.sectorId] = { id: p.sectorId, mkt: 0, cost: 0 };
      agg[p.sectorId].mkt += p.value;
      agg[p.sectorId].cost += p.cost;
    }
    return Object.values(agg)
      .map((a) => ({
        id: a.id,
        name: SECTOR_SHORT[a.id],
        roi: a.cost > 0 ? ((a.mkt - a.cost) / a.cost) * 100 : 0,
      }))
      .sort((a, b) => b.roi - a.roi);
  }, [positions]);
  const roiMax = useMemo(() => Math.max(1, ...sectorRoi.map((s) => Math.abs(s.roi))), [sectorRoi]);

  const flaggedCount = useMemo(
    () => Object.values(flagsByTicker).reduce((s, f) => s + (f.count || 0), 0),
    [flagsByTicker],
  );
  const topBook = donutSlices[0];

  const visiblePositions = useMemo(
    () => (chip === 'all' ? positions : positions.filter((p) => p.sectorId === chip)),
    [positions, chip],
  );

  const kpis = [
    { key: 'positions', label: 'Positions', value: String(positions.length) },
    { key: 'sectors', label: 'Sectors', value: String(MOCK_TEAM_PERFORMANCE.length) },
    {
      key: 'flagged',
      label: 'Flagged',
      value: String(flaggedCount),
      amber: flaggedCount > 0,
    },
    { key: 'top', label: 'Top book', value: `${topBook.name} · ${fmtK(topBook.value)}` },
  ];

  return (
    <div className="ctd-root">
      {/* ── Header ── */}
      <header className="ctd-header">
        <div className="ctd-header-lead">
          <span className="ctd-eyebrow ctd-num">TRADING · {orgName}</span>
          <h1 className="ctd-title">
            Council Trading
            {canFlagPositions && (
              <span className="ctd-role-pill">
                <Flag size={12} aria-hidden />
                Executive · can flag positions
              </span>
            )}
          </h1>
          <p className="ctd-sub">
            Unified book across all seven sector sleeves — allocation, unrealized performance, and
            positions in one desk.
          </p>
        </div>
        <div className="ctd-header-actions">
          <Link href="/org-trading/inbox" className="ctd-btn ctd-btn-outline">
            <Inbox size={16} aria-hidden />
            <span>Flag inbox</span>
            {flaggedCount > 0 && <span className="ctd-badge ctd-num">{flaggedCount}</span>}
          </Link>
          {canManagePositions && (
            <button
              type="button"
              className="ctd-btn ctd-btn-primary"
              onClick={() => setShowAddPosition(true)}
            >
              <Plus size={16} aria-hidden />
              <span>Add position</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Focal hero card ── */}
      <section className="ctd-card ctd-hero">
        <div className="ctd-hero-zone ctd-hero-alloc">
          <span className="ctd-zone-label">Allocation</span>
          <AllocationDonut slices={donutSlices} total={bookValue} />
        </div>

        <div className="ctd-hero-zone ctd-hero-perf">
          <div className="ctd-perf-row">
            <span className="ctd-zone-label">Today</span>
            <span className={`ctd-delta ${todayDollar >= 0 ? 'pos' : 'neg'} ctd-num`}>
              {todayDollar >= 0 ? '+' : ''}
              {fmtUSD(todayDollar)} <b>{fmtPct(todayPct)}</b>
            </span>
          </div>
          <div className="ctd-perf-row">
            <span className="ctd-zone-label">Unrealized</span>
            <span className={`ctd-unreal ${unrealized >= 0 ? 'pos' : 'neg'} ctd-num`}>
              {unrealized >= 0 ? '+' : ''}
              {fmtUSD(unrealized)}
            </span>
          </div>
        </div>

        <div className="ctd-hero-zone ctd-hero-roi">
          <span className="ctd-zone-label">Sector performance · unrealized ROI</span>
          <ul className="ctd-roi-list">
            {sectorRoi.map((s) => (
              <li key={s.id} className="ctd-roi-item">
                <span className="ctd-roi-name">
                  <i className="ctd-dot" style={{ background: SECTOR_VAR[s.id] }} aria-hidden />
                  {s.name}
                </span>
                <span className="ctd-roi-bar-track">
                  <i
                    className="ctd-roi-bar"
                    style={{
                      width: `${(Math.abs(s.roi) / roiMax) * 100}%`,
                      background: SECTOR_VAR[s.id],
                    }}
                  />
                </span>
                <span className={`ctd-roi-val ${s.roi >= 0 ? 'pos' : 'neg'} ctd-num`}>
                  {fmtPct(s.roi)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ctd-hero-zone ctd-hero-kpis">
          {kpis.map((k) => (
            <div key={k.key} className={`ctd-kpi ${k.amber ? 'ctd-kpi-amber' : ''}`}>
              <span className="ctd-kpi-value ctd-num">{k.value}</span>
              <span className="ctd-kpi-label">{k.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sector filter chips ── */}
      <div className="ctd-chips" role="tablist" aria-label="Filter positions by sector">
        <button
          type="button"
          role="tab"
          aria-selected={chip === 'all'}
          className={`ctd-chip ${chip === 'all' ? 'is-active' : ''}`}
          onClick={() => setChip('all')}
        >
          All sectors
        </button>
        {MOCK_TEAM_PERFORMANCE.map((t) => (
          <button
            key={t.team_id}
            type="button"
            role="tab"
            aria-selected={chip === t.team_id}
            className={`ctd-chip ${chip === t.team_id ? 'is-active' : ''}`}
            onClick={() => setChip(t.team_id)}
          >
            <i className="ctd-dot" style={{ background: SECTOR_VAR[t.team_id] }} aria-hidden />
            {SECTOR_SHORT[t.team_id]}
          </button>
        ))}
      </div>

      {/* ── Positions table ── */}
      <section className="ctd-card ctd-table-card">
        <div className="ctd-table-scroll">
          <table className="ctd-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Sector</th>
                <th className="ctd-r">Shares</th>
                <th className="ctd-r">Cost</th>
                <th className="ctd-r">Price</th>
                <th className="ctd-r">Mkt value</th>
                <th className="ctd-r">P/L</th>
                <th className="ctd-r">Review</th>
              </tr>
            </thead>
            <tbody>
              {visiblePositions.map((p) => {
                const flagKey = `${p.ticker}_${p.sectorId}`;
                const flagged = flagsByTicker[flagKey];
                const teamDbId = dbTeamIdFromMockTeamId(orgTeams, p.sectorId);
                return (
                  <tr key={flagKey} className={flagged ? 'ctd-row-flagged' : ''}>
                    <td className="ctd-ticker">{p.ticker}</td>
                    <td>
                      <span className="ctd-sector-cell">
                        <i
                          className="ctd-dot"
                          style={{ background: SECTOR_VAR[p.sectorId] }}
                          aria-hidden
                        />
                        {SECTOR_SHORT[p.sectorId]}
                      </span>
                    </td>
                    <td className="ctd-r ctd-num">{p.shares.toLocaleString('en-US')}</td>
                    <td className="ctd-r ctd-num">{fmtUSD2(p.avg_cost)}</td>
                    <td className="ctd-r ctd-num">{fmtUSD2(p.current_price)}</td>
                    <td className="ctd-r ctd-num">{fmtUSD(p.value)}</td>
                    <td className={`ctd-r ctd-num ctd-pl ${p.pl >= 0 ? 'pos' : 'neg'}`}>
                      {fmtPct(p.plPct)}
                    </td>
                    <td className="ctd-r">
                      <button
                        type="button"
                        className={`ctd-flag-btn ${flagged ? 'is-flagged' : ''}`}
                        disabled={!canFlagPositions}
                        title={
                          canFlagPositions
                            ? 'Flag this position for review'
                            : "You don't have flag permissions. Contact your PM or executive to enable."
                        }
                        onClick={() =>
                          setOpenFlagModal({
                            ticker: p.ticker,
                            mockTeamId: p.sectorId,
                            teamDbId,
                            position: p,
                          })
                        }
                      >
                        <Flag size={13} aria-hidden />
                        {flagged
                          ? `Flagged${flagged.count > 1 ? ` ${flagged.count}` : ''}`
                          : 'Flag'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {openFlagModal && (
        <FlagComposerModal
          ticker={openFlagModal.ticker}
          mockTeamId={openFlagModal.mockTeamId}
          teamDbId={openFlagModal.teamDbId}
          position={openFlagModal.position}
          currentMember={orgData?.member}
          onClose={() => setOpenFlagModal(null)}
          onSuccess={() => {
            setOpenFlagModal(null);
            refreshFlags();
          }}
        />
      )}

      <AddPositionModal
        open={showAddPosition}
        onClose={() => setShowAddPosition(false)}
        teamId={null}
        onAdded={() => {
          /* Org-level position added; council holdings refetch lands with live wiring. */
        }}
      />
    </div>
  );
}
