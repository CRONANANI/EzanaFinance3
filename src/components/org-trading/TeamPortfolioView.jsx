'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useOrg } from '@/contexts/OrgContext';
import { PositionRow } from './PositionRow';
import { AddPositionModal } from './add-position/AddPositionModal';

/* FlagComposerModal only mounts when a flag is being composed (openFlagModal
   truthy) — defer its code until then. Overlay modal: null fallback is safe. */
const FlagComposerModal = dynamic(
  () => import('./FlagComposerModal').then((m) => ({ default: m.FlagComposerModal })),
  { loading: () => null },
);
import { PositionThread } from '@/components/org/social2/PositionThread';

/* Flags for this team, keyed by real ticker + team id. */
function flagsToTickerMap(flags, dbTeamId) {
  const map = {};
  for (const f of flags || []) {
    if (dbTeamId && f.team_id !== dbTeamId) continue;
    const k = `${f.ticker}_${f.team_id || 'na'}`;
    if (!map[k]) map[k] = { color: f.flag_color, count: 0 };
    map[k].count += 1;
  }
  return map;
}

export function TeamPortfolioView({ teamId: dbTeamId, memberRole }) {
  const { canFlagPositions, canManagePositions, orgData } = useOrg();
  const [openFlagModal, setOpenFlagModal] = useState(null);
  const [flagsByTicker, setFlagsByTicker] = useState({});
  const [discussTicker, setDiscussTicker] = useState(null);
  const [showAddPosition, setShowAddPosition] = useState(false);

  const [book, setBook] = useState(null); // null = loading
  const [coverage, setCoverage] = useState([]);
  const [roster, setRoster] = useState([]);

  const myMemberId = orgData?.member?.id ?? null;
  const teamName = useMemo(
    () => (orgData?.teams || []).find((t) => t.id === dbTeamId)?.name || 'Your team',
    [orgData?.teams, dbTeamId],
  );

  const refreshData = useCallback(() => {
    if (!dbTeamId) {
      setBook([]);
      return;
    }
    Promise.all([
      fetch(`/api/org/positions?team_id=${dbTeamId}&include=coverage`)
        .then((r) => (r.ok ? r.json() : { positions: [], coverage: [] }))
        .catch(() => ({ positions: [], coverage: [] })),
      fetch('/api/org/members')
        .then((r) => (r.ok ? r.json() : { members: [] }))
        .catch(() => ({ members: [] })),
    ]).then(([pos, mem]) => {
      setBook(Array.isArray(pos?.positions) ? pos.positions : []);
      setCoverage(Array.isArray(pos?.coverage) ? pos.coverage : []);
      setRoster(Array.isArray(mem?.members) ? mem.members : []);
    });
  }, [dbTeamId]);

  const refreshFlags = useCallback(() => {
    fetch('/api/org-trading/flags?asRaiser=true&asRecipient=true&status=open')
      .then((r) => (r.ok ? r.json() : { flags: [] }))
      .then((d) => setFlagsByTicker(flagsToTickerMap(d.flags, dbTeamId)))
      .catch(() => {});
  }, [dbTeamId]);

  useEffect(() => {
    refreshData();
    refreshFlags();
  }, [refreshData, refreshFlags]);

  const loading = book === null;
  const holdings = useMemo(() => book || [], [book]);

  // Roster: PM + analysts on this team (real org_members).
  const pm = useMemo(
    () =>
      roster.find((m) => m.is_active && m.role === 'portfolio_manager' && m.team_id === dbTeamId) ||
      null,
    [roster, dbTeamId],
  );
  const teamAnalysts = useMemo(
    () => roster.filter((m) => m.is_active && m.role === 'analyst' && m.team_id === dbTeamId),
    [roster, dbTeamId],
  );
  const nameById = useMemo(() => new Map(roster.map((m) => [m.id, m.display_name])), [roster]);

  // sector → covering analyst name (primary first) from real coverage rows.
  const analystNameBySector = useMemo(() => {
    const m = new Map();
    for (const c of coverage) {
      if (!c.sector) continue;
      if (!m.has(c.sector) || c.is_primary) m.set(c.sector, nameById.get(c.member_id) || null);
    }
    return m;
  }, [coverage, nameById]);

  // "My coverage" split (analysts): my covered sectors from coverage rows.
  const mySectors = useMemo(() => {
    const s = new Set();
    for (const c of coverage) if (c.member_id === myMemberId && c.sector) s.add(c.sector);
    return s;
  }, [coverage, myMemberId]);

  const isAnalyst = memberRole === 'analyst';
  const myCoverage = useMemo(
    () => (isAnalyst ? holdings.filter((h) => h.sector && mySectors.has(h.sector)) : holdings),
    [isAnalyst, holdings, mySectors],
  );
  const otherHoldings = useMemo(
    () => (isAnalyst ? holdings.filter((h) => !(h.sector && mySectors.has(h.sector))) : []),
    [isAnalyst, holdings, mySectors],
  );

  // Team headline — computed from the fetched book, never a separate figure.
  const teamValue = useMemo(() => holdings.reduce((s, h) => s + h.value, 0), [holdings]);
  const teamCost = useMemo(() => holdings.reduce((s, h) => s + h.cost, 0), [holdings]);
  const teamPl = teamValue - teamCost;
  const teamPlPct = teamCost > 0 ? (teamPl / teamCost) * 100 : null;

  if (!dbTeamId) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
        No team assigned to your account. Contact your organization admin.
      </div>
    );
  }
  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading team book…</div>;
  }

  return (
    <>
      <div className="ot-team-card" style={{ marginBottom: '1.5rem' }}>
        <div className="ot-team-card-header">
          <div>
            <div className="ot-team-card-name">{teamName}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              PM: {pm?.display_name || 'Unassigned'} · {teamAnalysts.length} analysts
              {teamPlPct != null && (
                <>
                  {' · P/L '}
                  {teamPlPct >= 0 ? '+' : ''}
                  {teamPlPct.toFixed(1)}%
                </>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="ot-team-card-aum">${(teamValue / 1000).toFixed(1)}K</div>
            <div className={`ot-team-card-change ${teamPl >= 0 ? 'positive' : 'negative'}`}>
              {teamPl >= 0 ? '+' : ''}
              {`$${Math.abs(Math.round(teamPl)).toLocaleString('en-US')}`} unrealized
            </div>
            {canManagePositions && (
              <button
                type="button"
                className="ot-add-position-btn"
                style={{ marginTop: '0.6rem' }}
                onClick={() => setShowAddPosition(true)}
              >
                <i className="bi bi-plus-lg" />
                <span>Add Position</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="ot-team-card">
        <div
          style={{
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          {isAnalyst ? 'My Coverage' : 'Team Positions'}
        </div>
        <table className="ot-team-positions-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Sector</th>
              <th>Shares</th>
              <th>Avg Cost</th>
              <th>Current</th>
              <th>P/L</th>
              <th>Coverage</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {myCoverage.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}
                >
                  {isAnalyst
                    ? mySectors.size === 0
                      ? 'No sector coverage assigned — ask your PM.'
                      : 'No positions in your covered sectors yet.'
                    : 'This team has no active positions.'}
                </td>
              </tr>
            )}
            {myCoverage.map((h) => (
              <PositionRow
                key={`${h.ticker}_${h.team_id || 'na'}`}
                position={h}
                showSector
                analystName={h.sector ? analystNameBySector.get(h.sector) : undefined}
                onFlag={() =>
                  setOpenFlagModal({
                    ticker: h.ticker,
                    teamDbId: h.team_id || dbTeamId,
                    position: h,
                  })
                }
                canFlag={canFlagPositions}
                existingFlag={flagsByTicker[`${h.ticker}_${h.team_id || 'na'}`]}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-holding discussion — pick a position to open its Slack-style thread. */}
      {myCoverage.length > 0 && (
        <div className="ot-team-card" style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.6rem',
              marginBottom: '0.85rem',
            }}
          >
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <i
                className="bi bi-chat-left-text"
                style={{ marginRight: '0.5rem', color: 'var(--emerald)' }}
              />
              Discussion
            </div>
            <select
              className="sc2-select"
              style={{ maxWidth: 220 }}
              value={discussTicker || ''}
              onChange={(e) => setDiscussTicker(e.target.value || null)}
              aria-label="Select a holding to discuss"
            >
              <option value="">Choose a holding…</option>
              {myCoverage.map((h) => (
                <option key={h.ticker} value={h.ticker}>
                  {h.ticker}
                </option>
              ))}
            </select>
          </div>
          {discussTicker ? (
            <PositionThread ticker={discussTicker} />
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
              Select a holding above to view and join its discussion thread.
            </p>
          )}
        </div>
      )}

      {isAnalyst && otherHoldings.length > 0 && (
        <div className="ot-team-card" style={{ marginTop: '1.5rem', opacity: 0.65 }}>
          <div
            style={{
              marginBottom: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
          >
            Other Team Positions ({otherHoldings.length})
          </div>
          <table className="ot-team-positions-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Sector</th>
                <th>Shares</th>
                <th>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {otherHoldings.map((h) => (
                <tr key={`${h.ticker}_${h.team_id || 'na'}`}>
                  <td>{h.ticker}</td>
                  <td>{h.sector || '—'}</td>
                  <td>{h.shares}</td>
                  <td>{(h.sector && analystNameBySector.get(h.sector)) || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        teamId={dbTeamId}
        onAdded={() => {
          setShowAddPosition(false);
          refreshData();
        }}
      />
    </>
  );
}
