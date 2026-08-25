'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Flag, Inbox, Plus } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { stripDemoLabel } from '@/lib/org-display';
import { AddPositionModal } from './add-position/AddPositionModal';

/* FlagComposerModal only mounts when a flag is being composed (openFlagModal
   truthy) — defer its code until then. Overlay modal: null fallback is safe. */
const FlagComposerModal = dynamic(
  () => import('./FlagComposerModal').then((m) => ({ default: m.FlagComposerModal })),
  { loading: () => null },
);

/**
 * Council Trading — executive desk (redesign "1b").
 *
 * A single focal-hero card (sector-allocation donut + today/unrealized + sector
 * ROI ranking + KPI chips), sector filter chips, and one unified positions
 * table. All figures derive from REAL data: the canonical org position book
 * (/api/org/positions) and the Team Hub summary loader (/api/org/team-hub/summary)
 * — so the desk's book value, sector ROI, and today's change match the Team Hub
 * and Fund Analytics row-for-row by construction. P/L is computed (price − cost)
 * / cost. The flag flow (FlagComposerModal + /api/org-trading/flags) and the
 * Add-position modal are the existing ones, unchanged.
 */

/* Positional accent palette — one theme token per slot, assigned to sectors in
   descending-value order (same slot pattern as the gov-contracts page). These
   are the exact scoped vars resolved in org-trading.css; no raw hex in JSX. */
const SECTOR_PALETTE = [
  'var(--ctd-sec-t1)',
  'var(--ctd-sec-t2)',
  'var(--ctd-sec-t3)',
  'var(--ctd-sec-t4)',
  'var(--ctd-sec-t5)',
  'var(--ctd-sec-t6)',
  'var(--ctd-sec-t7)',
];
const UNASSIGNED_COLOR = 'var(--text-muted)';

const shortLabel = (name) =>
  ({
    'Technology, Media & Telecom': 'TMT',
    'Consumer Goods & Services': 'Consumer',
    'Energy & Utilities': 'Energy',
    'Financial Institutions': 'Financials',
    'Metals & Mining': 'Metals',
  })[name] ||
  (name || '').split(/[,&]/)[0].trim() ||
  '—';

function flagsToTickerMap(flags) {
  const map = {};
  for (const f of flags || []) {
    const k = `${f.ticker}_${f.team_id || 'na'}`;
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
              stroke={s.color}
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
  const { orgData, canFlagPositions, canManagePositions } = useOrg();
  const orgName = orgData?.org?.name || 'Investment Council';

  const [chip, setChip] = useState('all');
  const [openFlagModal, setOpenFlagModal] = useState(null);
  const [flagsByTicker, setFlagsByTicker] = useState({});
  const [showAddPosition, setShowAddPosition] = useState(false);

  const [positions, setPositions] = useState(null); // null = loading
  const [summary, setSummary] = useState(null);

  const refreshFlags = useCallback(() => {
    fetch('/api/org-trading/flags?asRaiser=true&asRecipient=true&status=open')
      .then((r) => (r.ok ? r.json() : { flags: [] }))
      .then((d) => setFlagsByTicker(flagsToTickerMap(d.flags)))
      .catch(() => {});
  }, []);

  const refreshData = useCallback(() => {
    Promise.all([
      fetch('/api/org/positions')
        .then((r) => (r.ok ? r.json() : { positions: [] }))
        .catch(() => ({ positions: [] })),
      fetch('/api/org/team-hub/summary')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([pos, sum]) => {
      setPositions(Array.isArray(pos?.positions) ? pos.positions : []);
      setSummary(sum);
    });
  }, []);

  useEffect(() => {
    refreshFlags();
    refreshData();
  }, [refreshFlags, refreshData]);

  const loading = positions === null;
  const posList = useMemo(() => positions || [], [positions]);

  /* Sector metadata keyed by real teamDbId, in descending-value order for a
     stable positional palette. Sourced from the SAME summary loader the Team
     Hub sector desk uses, so ROI and value match across pages by construction. */
  const sectorMeta = useMemo(() => {
    const rows = (summary?.sectors || []).filter((s) => s.value > 0);
    const m = new Map();
    rows.forEach((s, i) =>
      m.set(s.teamId, {
        teamId: s.teamId,
        name: stripDemoLabel(s.name),
        short: shortLabel(stripDemoLabel(s.name)),
        color: SECTOR_PALETTE[i % SECTOR_PALETTE.length],
        value: s.value,
        roiPct: s.roiPct,
      }),
    );
    return m;
  }, [summary]);

  const bookValue = useMemo(() => posList.reduce((s, p) => s + p.value, 0), [posList]);
  const unrealized = useMemo(() => posList.reduce((s, p) => s + p.pl, 0), [posList]);

  const donutSlices = useMemo(() => {
    const slices = [...sectorMeta.values()]
      .map((m) => ({ id: m.teamId, name: m.short, value: m.value, color: m.color }))
      .sort((a, b) => b.value - a.value);
    const unassigned = posList
      .filter((p) => !sectorMeta.has(p.team_id))
      .reduce((s, p) => s + p.value, 0);
    if (unassigned > 0) {
      slices.push({
        id: 'unassigned',
        name: 'Unassigned',
        value: unassigned,
        color: UNASSIGNED_COLOR,
      });
    }
    return slices;
  }, [sectorMeta, posList]);

  // Today's change from the last two fund snapshots; honest "—" with < 2 points.
  const snaps = summary?.snapshots || [];
  const prevVal = snaps.length >= 2 ? snaps[snaps.length - 2].value : null;
  const todayDollar = snaps.length >= 2 ? snaps[snaps.length - 1].value - prevVal : null;
  const todayPct = todayDollar != null && prevVal ? (todayDollar / prevVal) * 100 : null;

  // Per-sector ROI, ranked — identical to the Team Hub sector desk (same loader).
  const sectorRoi = useMemo(
    () =>
      [...sectorMeta.values()]
        .map((m) => ({ id: m.teamId, name: m.short, color: m.color, roi: m.roiPct }))
        .sort((a, b) => (b.roi ?? -Infinity) - (a.roi ?? -Infinity)),
    [sectorMeta],
  );
  const roiMax = useMemo(
    () => Math.max(1, ...sectorRoi.filter((s) => s.roi != null).map((s) => Math.abs(s.roi))),
    [sectorRoi],
  );

  const flaggedCount = useMemo(
    () => Object.values(flagsByTicker).reduce((s, f) => s + (f.count || 0), 0),
    [flagsByTicker],
  );
  const topBook = useMemo(() => {
    const sectors = [...sectorMeta.values()].sort((a, b) => b.value - a.value);
    return sectors[0] || null;
  }, [sectorMeta]);

  const hasUnassigned = useMemo(
    () => posList.some((p) => !sectorMeta.has(p.team_id)),
    [posList, sectorMeta],
  );

  const visiblePositions = useMemo(() => {
    if (chip === 'all') return posList;
    if (chip === 'unassigned') return posList.filter((p) => !sectorMeta.has(p.team_id));
    return posList.filter((p) => p.team_id === chip);
  }, [posList, chip, sectorMeta]);

  const kpis = [
    { key: 'positions', label: 'Positions', value: String(posList.length) },
    { key: 'sectors', label: 'Sectors', value: String(sectorMeta.size) },
    { key: 'flagged', label: 'Flagged', value: String(flaggedCount), amber: flaggedCount > 0 },
    {
      key: 'top',
      label: 'Top book',
      value: topBook ? fmtK(topBook.value) : '—',
      sub: topBook?.short,
    },
  ];

  const isEmpty = !loading && posList.length === 0;

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
            Unified book across every sector sleeve — allocation, unrealized performance, and
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

      {isEmpty ? (
        <section className="ctd-card ctd-hero">
          <div className="ctd-hero-zone" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            <p className="ctd-sub" style={{ marginBottom: '1rem' }}>
              No positions yet — add one or import your book.
            </p>
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
        </section>
      ) : (
        <>
          {/* ── Focal hero card ── */}
          <section className="ctd-card ctd-hero">
            <div className="ctd-hero-zone ctd-hero-alloc">
              <span className="ctd-zone-label">Allocation</span>
              <AllocationDonut slices={donutSlices} total={bookValue} />
            </div>

            <div className="ctd-hero-zone ctd-hero-perf">
              <div className="ctd-perf-row">
                <span className="ctd-zone-label">Today</span>
                {todayDollar == null ? (
                  <span className="ctd-delta ctd-num">—</span>
                ) : (
                  <span className={`ctd-delta ${todayDollar >= 0 ? 'pos' : 'neg'} ctd-num`}>
                    {todayDollar >= 0 ? '+' : ''}
                    {fmtUSD(todayDollar)} <b>{todayPct == null ? '' : fmtPct(todayPct)}</b>
                  </span>
                )}
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
              <span className="ctd-zone-label">Sector performance · ROI</span>
              <ul className="ctd-roi-list">
                {sectorRoi.map((s) => (
                  <li key={s.id} className="ctd-roi-item">
                    <span className="ctd-roi-name">
                      <i className="ctd-dot" style={{ background: s.color }} aria-hidden />
                      {s.name}
                    </span>
                    <span className="ctd-roi-bar-track">
                      <i
                        className="ctd-roi-bar"
                        style={{
                          width: `${s.roi == null ? 0 : (Math.abs(s.roi) / roiMax) * 100}%`,
                          background: s.color,
                        }}
                      />
                    </span>
                    <span className={`ctd-roi-val ${(s.roi ?? 0) >= 0 ? 'pos' : 'neg'} ctd-num`}>
                      {s.roi == null ? '—' : fmtPct(s.roi)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ctd-hero-zone ctd-hero-kpis">
              {kpis.map((k) => (
                <div key={k.key} className={`ctd-kpi ${k.amber ? 'ctd-kpi-amber' : ''}`}>
                  <span className="ctd-kpi-value ctd-num">{k.value}</span>
                  {k.sub && <span className="ctd-kpi-sub">{k.sub}</span>}
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
            {[...sectorMeta.values()].map((m) => (
              <button
                key={m.teamId}
                type="button"
                role="tab"
                aria-selected={chip === m.teamId}
                className={`ctd-chip ${chip === m.teamId ? 'is-active' : ''}`}
                onClick={() => setChip(m.teamId)}
              >
                <i className="ctd-dot" style={{ background: m.color }} aria-hidden />
                {m.short}
              </button>
            ))}
            {hasUnassigned && (
              <button
                type="button"
                role="tab"
                aria-selected={chip === 'unassigned'}
                className={`ctd-chip ${chip === 'unassigned' ? 'is-active' : ''}`}
                onClick={() => setChip('unassigned')}
              >
                <i className="ctd-dot" style={{ background: UNASSIGNED_COLOR }} aria-hidden />
                Unassigned
              </button>
            )}
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
                    const flagKey = `${p.ticker}_${p.team_id || 'na'}`;
                    const flagged = flagsByTicker[flagKey];
                    const meta = sectorMeta.get(p.team_id) || null;
                    const label = meta?.short || p.sector || 'Unassigned';
                    const color = meta?.color || UNASSIGNED_COLOR;
                    const plPct = p.cost > 0 ? (p.pl / p.cost) * 100 : null;
                    return (
                      <tr key={flagKey} className={flagged ? 'ctd-row-flagged' : ''}>
                        <td className="ctd-ticker">{p.ticker}</td>
                        <td>
                          <span className="ctd-sector-cell">
                            <i className="ctd-dot" style={{ background: color }} aria-hidden />
                            {label}
                          </span>
                        </td>
                        <td className="ctd-r ctd-num">{p.shares.toLocaleString('en-US')}</td>
                        <td className="ctd-r ctd-num">{fmtUSD2(p.avg_cost)}</td>
                        <td className="ctd-r ctd-num">
                          {p.current_price == null ? '—' : fmtUSD2(p.current_price)}
                        </td>
                        <td className="ctd-r ctd-num">{fmtUSD(p.value)}</td>
                        <td className={`ctd-r ctd-num ctd-pl ${p.pl >= 0 ? 'pos' : 'neg'}`}>
                          {plPct == null ? '—' : fmtPct(plPct)}
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
                                teamDbId: p.team_id,
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
        </>
      )}

      {openFlagModal && (
        <FlagComposerModal
          ticker={openFlagModal.ticker}
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
          setShowAddPosition(false);
          refreshData();
        }}
      />
    </div>
  );
}
