'use client';

import { useCallback, useEffect, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { PositionRow } from './PositionRow';
import { FlagComposerModal } from './FlagComposerModal';
import {
  MOCK_TEAM_PERFORMANCE,
  MOCK_TMT_HOLDINGS,
  MOCK_MEMBERS,
  getMemberByEmail,
  mockTeamIdFromDbTeams,
} from '@/lib/orgMockData';

function buildTeamHoldings(mockTeamKey) {
  if (mockTeamKey === 't7') {
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
  const team = MOCK_TEAM_PERFORMANCE.find((t) => t.team_id === mockTeamKey);
  if (!team) return [];
  return team.top_holdings.map((ticker, i) => {
    const totalValue = team.value;
    const avgPositionValue = totalValue / team.top_holdings.length;
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

function flagsToTickerMap(flags, orgTeams, mockTeamKey) {
  const map = {};
  for (const f of flags || []) {
    const mockFromFlag = mockTeamIdFromDbTeams(orgTeams, f.team_id);
    const k = `${f.ticker}_${mockFromFlag || f.team_id || 'na'}`;
    if (!map[k]) map[k] = { color: f.flag_color, count: 0 };
    map[k].count += 1;
  }
  if (mockTeamKey) {
    const filtered = {};
    for (const [key, v] of Object.entries(map)) {
      if (key.endsWith(`_${mockTeamKey}`)) filtered[key] = v;
    }
    return filtered;
  }
  return map;
}

export function TeamPortfolioView({ teamId: dbTeamId, memberRole, memberEmail }) {
  const { canFlagPositions, orgData } = useOrg();
  const [openFlagModal, setOpenFlagModal] = useState(null);
  const [flagsByTicker, setFlagsByTicker] = useState({});

  const orgTeams = orgData?.teams || [];
  const mockMember = getMemberByEmail(memberEmail);
  const mockTeamKey = mockTeamIdFromDbTeams(orgTeams, dbTeamId);

  const team = mockTeamKey ? MOCK_TEAM_PERFORMANCE.find((t) => t.team_id === mockTeamKey) : null;
  const allHoldings = mockTeamKey ? buildTeamHoldings(mockTeamKey) : [];
  const pm = mockTeamKey
    ? MOCK_MEMBERS.find((m) => m.role === 'portfolio_manager' && m.team_id === mockTeamKey)
    : null;
  const teamAnalysts = mockTeamKey
    ? MOCK_MEMBERS.filter((m) => m.role === 'analyst' && m.team_id === mockTeamKey)
    : [];

  const coverageMockId = mockMember?.id ?? null;
  const myCoverage =
    memberRole === 'analyst'
      ? allHoldings.filter((h) => h.analyst_id === coverageMockId)
      : allHoldings;
  const otherHoldings =
    memberRole === 'analyst' ? allHoldings.filter((h) => h.analyst_id !== coverageMockId) : [];

  const refreshFlags = useCallback(() => {
    fetch('/api/org-trading/flags?asRaiser=true&asRecipient=true&status=open')
      .then((r) => (r.ok ? r.json() : { flags: [] }))
      .then((d) => setFlagsByTicker(flagsToTickerMap(d.flags, orgTeams, mockTeamKey)))
      .catch(() => {});
  }, [orgTeams, mockTeamKey]);

  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  if (!team || !mockTeamKey) {
    return (
      <div style={{ padding: '2rem', color: '#8b949e' }}>
        No team assigned to your account. Contact your organization admin.
      </div>
    );
  }

  return (
    <>
      <div className="ot-team-card" style={{ marginBottom: '1.5rem' }}>
        <div className="ot-team-card-header">
          <div>
            <div className="ot-team-card-name">{team.team_name}</div>
            <div style={{ fontSize: '0.7rem', color: '#8b949e', marginTop: '0.25rem' }}>
              PM: {pm?.name || 'Unassigned'} · {teamAnalysts.length} analysts · YTD{' '}
              {team.ytd_return >= 0 ? '+' : ''}
              {team.ytd_return.toFixed(1)}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="ot-team-card-aum">${(team.value / 1000).toFixed(1)}K</div>
            <div className={`ot-team-card-change ${team.change_pct >= 0 ? 'positive' : 'negative'}`}>
              {team.change_pct >= 0 ? '+' : ''}
              {team.change_pct.toFixed(1)}% today
            </div>
          </div>
        </div>
      </div>

      <div className="ot-team-card">
        <div
          style={{
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#f0f6fc',
          }}
        >
          {memberRole === 'analyst' ? 'My Coverage' : 'Team Positions'}
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
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>
                  {memberRole === 'analyst'
                    ? 'No positions assigned to your coverage yet.'
                    : 'This team has no active positions.'}
                </td>
              </tr>
            )}
            {myCoverage.map((h) => {
              const analyst = teamAnalysts.find((a) => a.id === h.analyst_id);
              return (
                <PositionRow
                  key={h.ticker}
                  position={h}
                  showSector
                  analystName={analyst?.name}
                  onFlag={() =>
                    setOpenFlagModal({
                      ticker: h.ticker,
                      mockTeamId: mockTeamKey,
                      teamDbId: dbTeamId,
                      position: h,
                    })
                  }
                  canFlag={canFlagPositions}
                  existingFlag={flagsByTicker[`${h.ticker}_${mockTeamKey}`]}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {memberRole === 'analyst' && otherHoldings.length > 0 && (
        <div className="ot-team-card" style={{ marginTop: '1.5rem', opacity: 0.65 }}>
          <div
            style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 700, color: '#8b949e' }}
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
              {otherHoldings.map((h) => {
                const analyst = teamAnalysts.find((a) => a.id === h.analyst_id);
                return (
                  <tr key={h.ticker}>
                    <td>{h.ticker}</td>
                    <td>{h.sector}</td>
                    <td>{h.shares}</td>
                    <td>{analyst?.name || 'Unassigned'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openFlagModal && (
        <FlagComposerModal
          ticker={openFlagModal.ticker}
          mockTeamId={openFlagModal.mockTeamId}
          teamDbId={openFlagModal.teamDbId}
          position={openFlagModal.position}
          onClose={() => setOpenFlagModal(null)}
          onSuccess={() => {
            setOpenFlagModal(null);
            refreshFlags();
          }}
        />
      )}
    </>
  );
}
