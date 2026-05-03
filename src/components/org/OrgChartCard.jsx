'use client';

import { useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { useTheme } from '@/components/ThemeProvider';
import { MOCK_MEMBERS, MOCK_TEAMS } from '@/lib/orgMockData';

function roleColor(role) {
  if (role === 'executive') return '#f59e0b';
  if (role === 'portfolio_manager') return '#6366f1';
  return '#10b981';
}

export function OrgChartCard({ onSelectMember }) {
  const { isOrgUser } = useOrg();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hovered, setHovered] = useState(null);

  const t = {
    muted: isDark ? '#8b949e' : '#6b7280',
    line: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)',
    nodeBg: isDark ? '#161b22' : '#ffffff',
    nodeBorder: isDark ? 'rgba(99,102,241,0.2)' : '#e5e7eb',
    nodeText: isDark ? '#f0f6fc' : '#1e293b',
    nodeSub: isDark ? '#8b949e' : '#64748b',
  };

  if (!isOrgUser) return null;

  const executives = MOCK_MEMBERS.filter((m) => m.role === 'executive');
  const pms = MOCK_MEMBERS.filter((m) => m.role === 'portfolio_manager');

  const W = 900;
  const EXEC_Y = 40;
  const PM_Y = 140;
  const ANALYST_Y = 240;
  const NODE_W = 110;
  const NODE_H = 50;

  const execPositions = executives.map((m, i) => ({
    ...m,
    x: (W / (executives.length + 1)) * (i + 1) - NODE_W / 2,
    y: EXEC_Y,
  }));

  const pmPositions = pms.map((m, i) => ({
    ...m,
    x: (W / (pms.length + 1)) * (i + 1) - NODE_W / 2,
    y: PM_Y,
  }));

  const analystPositions = [];
  pms.forEach((pm, pmIdx) => {
    const teamAnalysts = MOCK_MEMBERS.filter((m) => m.role === 'analyst' && m.team_id === pm.team_id);
    const pmX = pmPositions[pmIdx].x + NODE_W / 2;
    const spreadWidth = Math.max(teamAnalysts.length * (NODE_W + 8), NODE_W);
    const startX = pmX - spreadWidth / 2;

    teamAnalysts.forEach((a, aIdx) => {
      analystPositions.push({
        ...a,
        x: startX + aIdx * (NODE_W + 8),
        y: ANALYST_Y + (aIdx % 2) * 14,
        parentPmX: pmX,
      });
    });
  });

  const allNodes = [...execPositions, ...pmPositions, ...analystPositions];
  const maxX = Math.max(...allNodes.map((n) => n.x + NODE_W), W);
  const maxY = Math.max(...allNodes.map((n) => n.y + NODE_H)) + 40;
  const viewW = Math.max(maxX + 20, W);

  const renderNode = (node) => {
    const team = MOCK_TEAMS.find((tt) => tt.id === node.team_id);
    const isHovered = hovered?.id === node.id;
    return (
      <g
        key={node.id}
        onMouseEnter={() => setHovered(node)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => onSelectMember?.(node)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={node.x}
          y={node.y}
          width={NODE_W}
          height={NODE_H}
          rx={8}
          fill={t.nodeBg}
          stroke={isHovered ? roleColor(node.role) : t.nodeBorder}
          strokeWidth={isHovered ? 2 : 1}
        />
        <rect
          x={node.x}
          y={node.y}
          width={4}
          height={NODE_H}
          rx={2}
          fill={roleColor(node.role)}
        />
        <circle
          cx={node.x + 22}
          cy={node.y + NODE_H / 2}
          r={12}
          fill={`${roleColor(node.role)}22`}
          stroke={roleColor(node.role)}
          strokeWidth={0.5}
        />
        <text
          x={node.x + 22}
          y={node.y + NODE_H / 2 + 4}
          textAnchor="middle"
          fill={roleColor(node.role)}
          fontSize="7"
          fontWeight="800"
          fontFamily="sans-serif"
        >
          {node.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
        </text>
        <text
          x={node.x + 40}
          y={node.y + 20}
          fill={t.nodeText}
          fontSize="7.5"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          {node.name.length > 14 ? `${node.name.slice(0, 13)}…` : node.name}
        </text>
        <text
          x={node.x + 40}
          y={node.y + 32}
          fill={t.nodeSub}
          fontSize="6"
          fontFamily="sans-serif"
        >
          {node.sub_role || node.role.replace('_', ' ')}
        </text>
        {team && (
          <text
            x={node.x + 40}
            y={node.y + 42}
            fill={roleColor(node.role)}
            fontSize="5.5"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            {team.name.length > 16 ? `${team.name.slice(0, 15)}…` : team.name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      className="th-card"
      style={{ gridColumn: '1 / -1' }}
    >
      <div className="th-card-header">
        <div className="th-card-header-left">
          <i className="bi bi-diagram-3" />
          <span>Organization Chart</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: t.muted }}>
            {MOCK_MEMBERS.length} members · {MOCK_TEAMS.length} teams
          </span>
        </div>
      </div>
      <div className="th-card-body" style={{ overflow: 'auto', padding: '0.5rem' }}>
        <svg
          viewBox={`0 0 ${viewW} ${maxY}`}
          style={{ width: '100%', height: 'auto', minHeight: 300 }}
        >
          {execPositions.map((exec) =>
            pmPositions.map((pm) => (
              <line
                key={`${exec.id}-${pm.id}`}
                x1={exec.x + NODE_W / 2}
                y1={exec.y + NODE_H}
                x2={pm.x + NODE_W / 2}
                y2={pm.y}
                stroke={t.line}
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            )),
          )}

          {analystPositions.map((a) => {
            const pm = pmPositions.find((p) => p.team_id === a.team_id);
            if (!pm) return null;
            return (
              <line
                key={`pm-${a.id}`}
                x1={pm.x + NODE_W / 2}
                y1={pm.y + NODE_H}
                x2={a.x + NODE_W / 2}
                y2={a.y}
                stroke={t.line}
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            );
          })}

          <text x={8} y={EXEC_Y + NODE_H / 2 + 3} fill={t.muted} fontSize="7" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.1em">
            EXEC
          </text>
          <text x={8} y={PM_Y + NODE_H / 2 + 3} fill={t.muted} fontSize="7" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.1em">
            PMs
          </text>
          <text x={8} y={ANALYST_Y + NODE_H / 2 + 3} fill={t.muted} fontSize="7" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.1em">
            ANALYSTS
          </text>

          {analystPositions.map(renderNode)}
          {pmPositions.map(renderNode)}
          {execPositions.map(renderNode)}
        </svg>
      </div>
    </div>
  );
}
