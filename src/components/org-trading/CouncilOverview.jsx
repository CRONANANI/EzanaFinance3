'use client';

import { useCallback, useEffect, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { PositionRow } from './PositionRow';
import { FlagComposerModal } from './FlagComposerModal';
import {
  MOCK_TEAM_PERFORMANCE,
  MOCK_TMT_HOLDINGS,
  MOCK_MEMBERS,
  dbTeamIdFromMockTeamId,
  mockTeamIdFromDbTeams,
} from '@/lib/orgMockData';

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

export function CouncilOverview() {
  const { orgData } = useOrg();
  const orgTeams = orgData?.teams || [];
  const [openFlagModal, setOpenFlagModal] = useState(null);
  const [flagsByTicker, setFlagsByTicker] = useState({});

  const refreshFlags = useCallback(() => {
    fetch('/api/org-trading/flags?asRaiser=true&asRecipient=true&status=open')
      .then((r) => (r.ok ? r.json() : { flags: [] }))
      .then((d) => setFlagsByTicker(flagsToTickerMap(d.flags, orgTeams)))
      .catch(() => {});
  }, [orgTeams]);

  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  return (
    <>
      <div className="ot-council-grid">
        {MOCK_TEAM_PERFORMANCE.map((team) => {
          const holdings = buildTeamHoldings(team.team_id);
          const pm = MOCK_MEMBERS.find(
            (m) => m.role === 'portfolio_manager' && m.team_id === team.team_id
          );
          const teamDbId = dbTeamIdFromMockTeamId(orgTeams, team.team_id);

          return (
            <div key={team.team_id} className="ot-team-card">
              <div className="ot-team-card-header">
                <div>
                  <div className="ot-team-card-name">{team.team_name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#8b949e' }}>PM: {pm?.name || 'Unassigned'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ot-team-card-aum">${(team.value / 1000).toFixed(1)}K</div>
                  <div
                    className={`ot-team-card-change ${team.change_pct >= 0 ? 'positive' : 'negative'}`}
                  >
                    {team.change_pct >= 0 ? '+' : ''}
                    {team.change_pct.toFixed(1)}% today
                  </div>
                </div>
              </div>

              <table className="ot-team-positions-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Shares</th>
                    <th>Cost</th>
                    <th>Price</th>
                    <th>P/L</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {holdings.slice(0, 6).map((h) => (
                    <PositionRow
                      key={h.ticker}
                      position={h}
                      onFlag={() =>
                        setOpenFlagModal({
                          ticker: h.ticker,
                          mockTeamId: team.team_id,
                          teamDbId,
                          position: h,
                        })
                      }
                      existingFlag={flagsByTicker[`${h.ticker}_${team.team_id}`]}
                    />
                  ))}
                </tbody>
              </table>
              {holdings.length > 6 && (
                <p
                  style={{
                    fontSize: '0.65rem',
                    color: '#8b949e',
                    textAlign: 'center',
                    marginTop: '0.5rem',
                  }}
                >
                  + {holdings.length - 6} more positions
                </p>
              )}
            </div>
          );
        })}
      </div>

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
