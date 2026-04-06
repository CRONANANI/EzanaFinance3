'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import EconomicLeadershipTimeline from '@/components/empire-ranking/EconomicLeadershipTimeline';
import AssetCrisisRegimes from '@/components/empire-ranking/AssetCrisisRegimes';
import InnovationLeadershipIndex from '@/components/empire-ranking/InnovationLeadershipIndex';
import { fetchEmpireRankings } from '@/lib/empire-db';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import './empire-ranking.css';

const LAYER_SECTION_MAP = {
  trade: 'section-trade-power',
  conflict: 'section-conflict-risk',
  interest_rates: 'section-interest-rates',
  economic: 'section-economic-power',
  military: 'section-military-power',
  energy: 'section-energy-power',
  demographic: 'section-demographic-power',
  governance: 'section-governance',
  infrastructure: 'section-infrastructure',
};

/* Dalio-style empire scores — illustrative mock data for UI */
const EMPIRE_DATA = [
  {
    code: 'USA',
    name: 'United States',
    flag: '🇺🇸',
    score: 0.87,
    rank: 1,
    trajectory: 'flat',
    scores: {
      'Debt Burden': -1.8,
      'Expected Growth': -0.7,
      'Internal Conflict': -2.0,
      Education: 2.0,
      'Innovation & Technology': 2.0,
      'Cost Competitiveness': -0.4,
      'Military Strength': 1.9,
      Trade: 1.1,
      'Economic Output': 1.7,
      'Markets & Financial Center': 2.6,
      'Reserve Currency Status': 1.7,
      Geology: 1.4,
      'Resource Efficiency': 1.3,
      Infrastructure: 0.7,
      'Character & Civility': 1.1,
      'Rule of Law': 0.7,
      'Wealth Gaps': -1.6,
      'Acts of Nature': -0.2,
    },
  },
  {
    code: 'CHN',
    name: 'China',
    flag: '🇨🇳',
    score: 0.75,
    rank: 2,
    trajectory: 'up',
    scores: {
      'Debt Burden': 0.3,
      'Expected Growth': 0.4,
      'Internal Conflict': 0.2,
      Education: 1.6,
      'Innovation & Technology': 1.5,
      'Cost Competitiveness': 1.2,
      'Military Strength': 1.0,
      Trade: 1.8,
      'Economic Output': 1.8,
      'Markets & Financial Center': 0.5,
      'Reserve Currency Status': -0.7,
      Geology: 0.9,
      'Resource Efficiency': 0.0,
      Infrastructure: 2.7,
      'Character & Civility': 1.5,
      'Rule of Law': -0.7,
      'Wealth Gaps': -0.4,
      'Acts of Nature': -0.1,
    },
  },
  {
    code: 'EUR',
    name: 'Eurozone',
    flag: '🇪🇺',
    score: 0.55,
    rank: 3,
    trajectory: 'down',
    scores: {
      'Debt Burden': -0.3,
      'Expected Growth': -1.0,
      'Internal Conflict': 0.4,
      Education: 0.3,
      'Innovation & Technology': 0.4,
      'Cost Competitiveness': -0.6,
      'Military Strength': 0.3,
      Trade: 1.3,
      'Economic Output': 0.6,
      'Markets & Financial Center': 0.4,
      'Reserve Currency Status': 0.23,
      Geology: -0.4,
      'Resource Efficiency': -0.8,
      Infrastructure: 0.2,
      'Character & Civility': -1.0,
      'Rule of Law': -0.4,
      'Wealth Gaps': 0.3,
      'Acts of Nature': 0.0,
    },
  },
  {
    code: 'DEU',
    name: 'Germany',
    flag: '🇩🇪',
    score: 0.37,
    rank: 4,
    trajectory: 'down',
    scores: {
      'Debt Burden': 1.6,
      'Expected Growth': -1.0,
      'Internal Conflict': 0.7,
      Education: -0.2,
      'Innovation & Technology': -0.1,
      'Cost Competitiveness': -0.6,
      'Military Strength': -0.6,
      Trade: 0.6,
      'Economic Output': -0.1,
      'Markets & Financial Center': -0.2,
      'Reserve Currency Status': 0.0,
      Geology: -0.7,
      'Resource Efficiency': 0.6,
      Infrastructure: -0.3,
      'Character & Civility': -0.5,
      'Rule of Law': 0.7,
      'Wealth Gaps': 0.7,
      'Acts of Nature': 1.1,
    },
  },
  {
    code: 'JPN',
    name: 'Japan',
    flag: '🇯🇵',
    score: 0.3,
    rank: 5,
    trajectory: 'down',
    scores: {
      'Debt Burden': -0.4,
      'Expected Growth': -1.1,
      'Internal Conflict': 1.1,
      Education: 0.2,
      'Innovation & Technology': 0.2,
      'Cost Competitiveness': -0.3,
      'Military Strength': -0.1,
      Trade: -0.5,
      'Economic Output': -0.3,
      'Markets & Financial Center': 0.1,
      'Reserve Currency Status': 0.07,
      Geology: -1.1,
      'Resource Efficiency': 0.1,
      Infrastructure: -0.2,
      'Character & Civility': 0.5,
      'Rule of Law': 0.8,
      'Wealth Gaps': 0.9,
      'Acts of Nature': 1.5,
    },
  },
  {
    code: 'IND',
    name: 'India',
    flag: '🇮🇳',
    score: 0.27,
    rank: 6,
    trajectory: 'up',
    scores: {
      'Debt Burden': 0.1,
      'Expected Growth': 1.1,
      'Internal Conflict': 0.0,
      Education: -1.2,
      'Innovation & Technology': -1.2,
      'Cost Competitiveness': 2.4,
      'Military Strength': 0.2,
      Trade: -0.8,
      'Economic Output': -0.2,
      'Markets & Financial Center': -0.8,
      'Reserve Currency Status': 0.0,
      Geology: 0.3,
      'Resource Efficiency': 0.2,
      Infrastructure: -0.3,
      'Character & Civility': 1.3,
      'Rule of Law': -1.1,
      'Wealth Gaps': -1.8,
      'Acts of Nature': -2.4,
    },
  },
  {
    code: 'GBR',
    name: 'United Kingdom',
    flag: '🇬🇧',
    score: 0.27,
    rank: 7,
    trajectory: 'down',
    scores: {
      'Debt Burden': -1.6,
      'Expected Growth': -0.8,
      'Internal Conflict': -0.3,
      Education: -0.2,
      'Innovation & Technology': -0.3,
      'Cost Competitiveness': -0.3,
      'Military Strength': -0.3,
      Trade: -0.6,
      'Economic Output': -0.3,
      'Markets & Financial Center': 0.0,
      'Reserve Currency Status': 0.07,
      Geology: -0.9,
      'Resource Efficiency': 0.3,
      Infrastructure: -0.6,
      'Character & Civility': -0.4,
      'Rule of Law': 1.2,
      'Wealth Gaps': -0.2,
      'Acts of Nature': 0.4,
    },
  },
  {
    code: 'FRA',
    name: 'France',
    flag: '🇫🇷',
    score: 0.25,
    rank: 8,
    trajectory: 'down',
    scores: {
      'Debt Burden': -0.8,
      'Expected Growth': -0.9,
      'Internal Conflict': -0.1,
      Education: -0.5,
      'Innovation & Technology': -0.5,
      'Cost Competitiveness': -0.6,
      'Military Strength': -0.3,
      Trade: -0.5,
      'Economic Output': -0.5,
      'Markets & Financial Center': -0.3,
      'Reserve Currency Status': 0.0,
      Geology: -0.5,
      'Resource Efficiency': -1.3,
      Infrastructure: -0.2,
      'Character & Civility': -1.5,
      'Rule of Law': 0.3,
      'Wealth Gaps': 1.1,
      'Acts of Nature': 0.0,
    },
  },
  {
    code: 'NLD',
    name: 'Netherlands',
    flag: '🇳🇱',
    score: 0.25,
    rank: 9,
    trajectory: 'flat',
    scores: {
      'Debt Burden': 0.8,
      'Expected Growth': -0.8,
      'Internal Conflict': 1.2,
      Education: -0.7,
      'Innovation & Technology': -0.3,
      'Cost Competitiveness': -0.8,
      'Military Strength': -1.9,
      Trade: -0.6,
      'Economic Output': -0.3,
      'Markets & Financial Center': -0.5,
      'Reserve Currency Status': 0.0,
      Geology: -0.8,
      'Resource Efficiency': 0.1,
      Infrastructure: 0.0,
      'Character & Civility': 0.2,
      'Rule of Law': 0.8,
      'Wealth Gaps': 0.6,
      'Acts of Nature': 0.1,
    },
  },
  {
    code: 'RUS',
    name: 'Russia',
    flag: '🇷🇺',
    score: 0.23,
    rank: 10,
    trajectory: 'down',
    scores: {
      'Debt Burden': 1.0,
      'Expected Growth': -0.2,
      'Internal Conflict': -0.5,
      Education: -0.5,
      'Innovation & Technology': -0.7,
      'Cost Competitiveness': 0.7,
      'Military Strength': 0.4,
      Trade: -0.9,
      'Economic Output': -1.4,
      'Markets & Financial Center': -1.1,
      'Reserve Currency Status': 0.0,
      Geology: 0.8,
      'Resource Efficiency': -0.6,
      Infrastructure: -0.5,
      'Character & Civility': 0.2,
      'Rule of Law': -1.5,
      'Wealth Gaps': -0.6,
      'Acts of Nature': -0.1,
    },
  },
  {
    code: 'ESP',
    name: 'Spain',
    flag: '🇪🇸',
    score: 0.2,
    rank: 11,
    trajectory: 'flat',
    scores: {
      'Debt Burden': -1.7,
      'Expected Growth': -1.1,
      'Internal Conflict': -0.4,
      Education: -0.9,
      'Innovation & Technology': -1.0,
      'Cost Competitiveness': -0.6,
      'Military Strength': -0.8,
      Trade: -0.9,
      'Economic Output': -0.9,
      'Markets & Financial Center': -0.6,
      'Reserve Currency Status': 0.0,
      Geology: -0.4,
      'Resource Efficiency': -0.3,
      Infrastructure: 0.1,
      'Character & Civility': -0.8,
      'Rule of Law': -0.2,
      'Wealth Gaps': 0.1,
      'Acts of Nature': 0.2,
    },
  },
];

const USE_LIVE_DATA = process.env.NEXT_PUBLIC_EMPIRE_LIVE_DATA === 'true';

const POWER_DIMENSIONS = [
  'Debt Burden',
  'Expected Growth',
  'Internal Conflict',
  'Education',
  'Innovation & Technology',
  'Cost Competitiveness',
  'Military Strength',
  'Trade',
  'Economic Output',
  'Markets & Financial Center',
  'Reserve Currency Status',
  'Geology',
  'Resource Efficiency',
  'Infrastructure',
  'Character & Civility',
  'Rule of Law',
  'Wealth Gaps',
  'Acts of Nature',
];

function generateBigCycle(country) {
  const shapes = {
    USA: { rise: 1850, peak: 1960, current: 2025, peakVal: 100, nowVal: 87 },
    CHN: { rise: 1980, peak: 2050, current: 2025, peakVal: 95, nowVal: 75 },
    EUR: { rise: 1700, peak: 1900, current: 2025, peakVal: 85, nowVal: 55 },
    GBR: { rise: 1700, peak: 1870, current: 2025, peakVal: 100, nowVal: 27 },
    NLD: { rise: 1550, peak: 1680, current: 2025, peakVal: 90, nowVal: 25 },
    ESP: { rise: 1480, peak: 1600, current: 2025, peakVal: 80, nowVal: 20 },
    DEU: { rise: 1850, peak: 1940, current: 2025, peakVal: 75, nowVal: 37 },
    JPN: { rise: 1870, peak: 1990, current: 2025, peakVal: 70, nowVal: 30 },
    IND: { rise: 1995, peak: 2060, current: 2025, peakVal: 80, nowVal: 27 },
    RUS: { rise: 1850, peak: 1950, current: 2025, peakVal: 65, nowVal: 23 },
    FRA: { rise: 1650, peak: 1810, current: 2025, peakVal: 85, nowVal: 25 },
  };
  const s = shapes[country] || shapes.USA;
  const points = [];
  for (let year = 1500; year <= 2030; year += 10) {
    let v = 5;
    if (year >= s.rise && year <= s.peak) {
      const progress = (year - s.rise) / (s.peak - s.rise);
      v = 5 + (s.peakVal - 5) * Math.sin((progress * Math.PI) / 2);
    } else if (year > s.peak) {
      const decayYears = s.current - s.peak;
      const progress = Math.min(1, (year - s.peak) / decayYears);
      v = s.peakVal - (s.peakVal - s.nowVal) * progress;
    }
    points.push({ year, value: Math.max(0, Math.round(v * 10) / 10) });
  }
  return points;
}

function Card({ icon, title, subtitle, children, wide, actions, className = '', id }) {
  return (
    <section id={id || undefined} className={`er-card${wide ? ' er-card--wide' : ''} ${className}`}>
      <div className="er-card-header">
        <div className="er-card-header-left">
          <i className={`bi ${icon}`} aria-hidden />
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="er-card-subtitle">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="er-card-actions">{actions}</div>}
      </div>
      <div className="er-card-body">{children}</div>
    </section>
  );
}

const chartTooltipStyle = {
  background: '#161b22',
  border: '1px solid rgba(212, 175, 55, 0.25)',
  borderRadius: 8,
  fontSize: '0.72rem',
  color: '#e2e8f0',
};

function trajectoryIcon(t) {
  if (t === 'up') return { icon: 'bi-arrow-up-right', color: '#10b981' };
  if (t === 'down') return { icon: 'bi-arrow-down-right', color: '#ef4444' };
  return { icon: 'bi-dash-lg', color: '#9ca3af' };
}

function PowerRankingsCard({ empireData }) {
  const data = [...empireData]
    .sort((a, b) => b.score - a.score)
    .map((d) => ({
      name: `${d.flag} ${d.code}`,
      fullName: d.name,
      score: d.score,
      rank: d.rank,
    }));

  return (
    <Card id="section-economic-power" icon="bi-trophy" title="Global Power Rankings" subtitle="Overall Empire Score (0–1)" wide>
      <div style={{ height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, left: 40, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 1]}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v, _n, p) => [v.toFixed(2), p.payload.fullName]} />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={entry.rank}
                  fill={i === 0 ? '#d4af37' : i < 3 ? '#10b981' : i < 6 ? '#6366f1' : '#6b7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function PowerDimensionRadar({ empireData }) {
  const [countryA, setCountryA] = useState('USA');
  const [countryB, setCountryB] = useState('CHN');

  const data = POWER_DIMENSIONS.map((dim) => {
    const a = empireData.find((e) => e.code === countryA)?.scores[dim] ?? 0;
    const b = empireData.find((e) => e.code === countryB)?.scores[dim] ?? 0;
    return {
      dimension: dim.length > 16 ? `${dim.substring(0, 14)}…` : dim,
      [countryA]: a + 3,
      [countryB]: b + 3,
    };
  });

  return (
    <Card
      id="section-energy-power"
      icon="bi-diagram-3"
      title="Power Dimension Comparison"
      subtitle="Head-to-head across 18 measures of power"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <select className="er-select" value={countryA} onChange={(e) => setCountryA(e.target.value)}>
            {empireData.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <select className="er-select" value={countryB} onChange={(e) => setCountryB(e.target.value)}>
            {empireData.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
      }
      wide
    >
      <div style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="rgba(212,175,55,0.15)" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 6]} />
            <Radar
              name={countryA}
              dataKey={countryA}
              stroke="#d4af37"
              fill="rgba(212,175,55,0.18)"
              strokeWidth={2}
            />
            <Radar
              name={countryB}
              dataKey={countryB}
              stroke="#10b981"
              fill="rgba(16,185,129,0.18)"
              strokeWidth={2}
            />
            <Legend wrapperStyle={{ fontSize: '0.7rem', color: '#9ca3af' }} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => (v - 3).toFixed(1)} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function BigCycleCard({ empireData }) {
  const [country, setCountry] = useState('USA');
  const data = useMemo(() => generateBigCycle(country), [country]);
  const current = empireData.find((e) => e.code === country);
  const traj = current ? trajectoryIcon(current.trajectory) : null;

  return (
    <Card
      id="section-conflict-risk"
      icon="bi-graph-up-arrow"
      title="The Big Cycle — Rise & Fall"
      subtitle="Historical power trajectory (1500–2030, mock data)"
      actions={
        <select className="er-select" value={country} onChange={(e) => setCountry(e.target.value)}>
          {empireData.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      }
      wide
    >
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="cycleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="year"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}`, 'Power Index']} />
            <ReferenceLine
              x={2025}
              stroke="#d4af37"
              strokeDasharray="4 2"
              label={{ value: 'Now', fill: '#d4af37', fontSize: 10, position: 'top' }}
            />
            <Area type="monotone" dataKey="value" stroke="#ef4444" fill="url(#cycleGradient)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {current && traj && (
        <div className="er-cycle-stat-row">
          <div className="er-cycle-stat">
            <span className="er-cycle-stat-label">Current Score</span>
            <span className="er-cycle-stat-value">{current.score.toFixed(2)}</span>
          </div>
          <div className="er-cycle-stat">
            <span className="er-cycle-stat-label">Global Rank</span>
            <span className="er-cycle-stat-value">#{current.rank}</span>
          </div>
          <div className="er-cycle-stat">
            <span className="er-cycle-stat-label">Trajectory</span>
            <span className="er-cycle-stat-value" style={{ color: traj.color }}>
              <i className={`bi ${traj.icon}`} />
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

function DebtCycleCard() {
  const years = Array.from({ length: 25 }, (_, i) => 2000 + i);
  const data = years.map((year) => {
    const t = (year - 2000) / 25;
    return {
      year,
      USA: 55 + t * 75 + Math.sin(t * 6) * 8,
      CHN: 20 + t * 55 + Math.sin(t * 4) * 5,
      JPN: 135 + t * 130 + Math.sin(t * 5) * 10,
      DEU: 60 + t * 10 + Math.sin(t * 4) * 6,
      GBR: 40 + t * 60 + Math.sin(t * 5) * 7,
      EUR: 70 + t * 25 + Math.sin(t * 4) * 6,
    };
  });

  return (
    <Card id="section-interest-rates" icon="bi-cash-stack" title="Debt Burden Cycles" subtitle="Debt-to-GDP ratio across major empires (%)">
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => `${v.toFixed(0)}%`} />
            <Legend wrapperStyle={{ fontSize: '0.65rem' }} iconType="plainline" />
            <Line type="monotone" dataKey="USA" stroke="#d4af37" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="CHN" stroke="#ef4444" strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="JPN" stroke="#8b5cf6" strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="DEU" stroke="#10b981" strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="GBR" stroke="#3b82f6" strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="EUR" stroke="#f59e0b" strokeWidth={1.8} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function MilitaryCard() {
  const data = [
    { country: 'USA', spending: 877, gdpPct: 3.5 },
    { country: 'CHN', spending: 292, gdpPct: 1.6 },
    { country: 'RUS', spending: 86, gdpPct: 4.1 },
    { country: 'IND', spending: 81, gdpPct: 2.4 },
    { country: 'GBR', spending: 68, gdpPct: 2.2 },
    { country: 'DEU', spending: 55, gdpPct: 1.4 },
    { country: 'FRA', spending: 53, gdpPct: 1.9 },
    { country: 'JPN', spending: 46, gdpPct: 1.1 },
  ];

  return (
    <Card id="section-military-power" icon="bi-shield-fill" title="Military Strength" subtitle="Defense spending (2023 est., USD bn)">
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="country" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}B`}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v, name) => [name === 'spending' ? `$${v}B` : `${v}% GDP`, name]}
            />
            <Bar dataKey="spending" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={data[i].country} fill={i === 0 ? '#d4af37' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ReserveCurrencyCard() {
  const years = Array.from({ length: 25 }, (_, i) => 2000 + i);
  const data = years.map((year) => {
    const t = (year - 2000) / 24;
    return {
      year,
      USD: 72 - t * 14,
      EUR: 18 + t * 4,
      JPY: 6 - t * 1,
      CNY: 0.5 + t * 3,
      GBP: 3.5 + t * 0.5,
    };
  });

  return (
    <Card id="section-governance" icon="bi-currency-exchange" title="Reserve Currency Share" subtitle="% of global forex reserves">
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => `${v.toFixed(1)}%`} />
            <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
            <Area type="monotone" dataKey="USD" stackId="1" stroke="#d4af37" fill="rgba(212,175,55,0.7)" />
            <Area type="monotone" dataKey="EUR" stackId="1" stroke="#3b82f6" fill="rgba(59,130,246,0.7)" />
            <Area type="monotone" dataKey="JPY" stackId="1" stroke="#8b5cf6" fill="rgba(139,92,246,0.7)" />
            <Area type="monotone" dataKey="CNY" stackId="1" stroke="#ef4444" fill="rgba(239,68,68,0.7)" />
            <Area type="monotone" dataKey="GBP" stackId="1" stroke="#10b981" fill="rgba(16,185,129,0.7)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ScorecardGrid({ empireData }) {
  return (
    <Card icon="bi-grid-3x3-gap" title="Country Scorecards" subtitle="All 11 major powers at a glance" wide>
      <div className="er-scorecard-grid">
        {empireData.map((c) => {
          const traj = trajectoryIcon(c.trajectory);
          return (
            <div key={c.code} className="er-scorecard">
              <div className="er-scorecard-header">
                <span className="er-scorecard-flag">{c.flag}</span>
                <div>
                  <div className="er-scorecard-name">{c.name}</div>
                  <div className="er-scorecard-code">{c.code}</div>
                </div>
                <span className="er-scorecard-rank">#{c.rank}</span>
              </div>
              <div className="er-scorecard-score-row">
                <div className="er-scorecard-score">{c.score.toFixed(2)}</div>
                <i className={`bi ${traj.icon} er-scorecard-trajectory`} style={{ color: traj.color }} />
              </div>
              <div className="er-scorecard-bar-track">
                <div className="er-scorecard-bar-fill" style={{ width: `${c.score * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EmpireRankingPageContent() {
  const searchParams = useSearchParams();
  const layersParam = searchParams.get('layers');
  const activeLayers = useMemo(
    () => (layersParam ? layersParam.split(',').map((s) => s.trim()).filter(Boolean) : []),
    [layersParam]
  );
  const hasIncoming = activeLayers.length > 0;

  useEffect(() => {
    if (!layersParam) return;
    const layers = layersParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (layers.length === 0) return;
    const t = setTimeout(() => {
      const sectionId = LAYER_SECTION_MAP[layers[0]];
      if (sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [layersParam]);

  const [empireData, setEmpireData] = useState(EMPIRE_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!USE_LIVE_DATA) return;

    let cancelled = false;
    setLoading(true);

    fetchEmpireRankings()
      .then((rows) => {
        if (cancelled) return;
        if (rows.length > 0) {
          const merged = rows.map((liveRow) => {
            const staticRow = EMPIRE_DATA.find((e) => e.code === liveRow.code);
            return {
              ...(staticRow || {
                code: liveRow.code,
                name: liveRow.name,
                flag: liveRow.flag,
                score: liveRow.score,
                rank: liveRow.rank,
                trajectory: liveRow.trajectory,
                scores: {},
              }),
              code: liveRow.code,
              name: liveRow.name,
              flag: liveRow.flag,
              score: liveRow.score,
              rank: liveRow.rank,
              trajectory: liveRow.trajectory,
              scores: staticRow?.scores || {},
            };
          });
          setEmpireData(merged);
        }
      })
      .catch((err) => {
        console.error('[empire-ranking] failed to load live data, falling back to mock:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const heroBadge = !USE_LIVE_DATA
    ? 'MOCK DATA · APIs PENDING'
    : loading
      ? 'LOADING RANKINGS…'
      : 'LIVE RANKINGS · MOCK CHART DATA';

  return (
    <div className="dashboard-page-inset er-page">
      <div className="er-hero">
        <div className="er-hero-left">
          <Link href="/market-analysis" className="er-back-link">
            <i className="bi bi-arrow-left" /> Back to Global Market Analysis
          </Link>
          <div className="er-hero-title-row">
            <div className="er-hero-icon">
              <i className="bi bi-globe-americas" />
            </div>
            <div>
              <h1>Empire Ranking &amp; Analysis</h1>
              <p className="er-hero-sub">
                Quantitative empire scoring inspired by Ray Dalio&apos;s <em>Changing World Order</em> framework. Power
                measured across 18 dimensions for the world&apos;s top 11 nations.
              </p>
            </div>
          </div>
        </div>
        <div className="er-hero-badge">{heroBadge}</div>
      </div>

      {hasIncoming && (
        <div className="er-layers-from-map-banner" role="status">
          <div>
            <p className="er-layers-from-map-title">Showing data for your selected power layers</p>
            <div className="er-layers-from-map-tags">
              {activeLayers.map((layer) => (
                <span key={layer} className="er-layers-from-map-tag">
                  {layer.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="er-grid">
        <PowerRankingsCard empireData={empireData} />
        <ScorecardGrid empireData={empireData} />
        <PowerDimensionRadar empireData={empireData} />
        <BigCycleCard empireData={empireData} />
        <DebtCycleCard />
        <MilitaryCard />
        <ReserveCurrencyCard />
        <section id="section-trade-power" className="er-analytics-wide">
          <EconomicLeadershipTimeline />
        </section>
        <section id="section-infrastructure" className="er-analytics-wide">
          <AssetCrisisRegimes />
        </section>
        <section id="section-demographic-power" className="er-analytics-wide">
          <InnovationLeadershipIndex />
        </section>
      </div>
    </div>
  );
}

export default function EmpireRankingPage() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-page-inset er-page">
          <div className="er-hero">
            <div className="er-hero-left">
              <Link href="/market-analysis" className="er-back-link">
                <i className="bi bi-arrow-left" /> Back to Global Market Analysis
              </Link>
              <div className="er-hero-title-row">
                <div className="er-hero-icon">
                  <i className="bi bi-globe-americas" />
                </div>
                <div>
                  <h1>Empire Ranking &amp; Analysis</h1>
                  <p className="er-hero-sub">Loading…</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <EmpireRankingPageContent />
    </Suspense>
  );
}
