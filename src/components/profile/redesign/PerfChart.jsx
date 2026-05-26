'use client';

import { useMemo } from 'react';
import { NumberText } from './NumberText';
import { page, brand, shape, density, type as typeTokens } from './profile-design-tokens';

const RANGES = ['1W', '1M', '3M', 'YTD'];

export function PerfChart({ performance, range, onRangeChange, isLive = false, sourceLabel }) {
  const W = 880;
  const H = 240;
  const padL = 36;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const { you = [], median = [], top25 = [], dates = [] } = performance || {};

  const allValues = [...you, ...median, ...top25];
  const yMax = allValues.length > 0 ? Math.max(...allValues, 0.5) : 1;
  const yMin = allValues.length > 0 ? Math.min(...allValues, 0) : 0;
  const rangeVal = yMax - yMin || 1;

  function xPos(i, len) {
    return padL + (i / Math.max(1, len - 1)) * innerW;
  }
  function yPos(v) {
    return padT + innerH - ((v - yMin) / rangeVal) * innerH;
  }

  function toPath(arr) {
    if (arr.length === 0) return '';
    return arr
      .map(
        (v, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i, arr.length).toFixed(1)} ${yPos(v).toFixed(1)}`,
      )
      .join(' ');
  }

  function toAreaPath(arr) {
    if (arr.length === 0) return '';
    const line = toPath(arr);
    return `${line} L ${xPos(arr.length - 1, arr.length).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${padL.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
  }

  const yLabels = useMemo(() => {
    const steps = 4;
    const arr = [];
    for (let i = 0; i < steps; i++) {
      const v = yMin + (rangeVal * i) / (steps - 1);
      arr.push({ v, y: yPos(v) });
    }
    return arr;
  }, [yMin, rangeVal, padT, innerH]);

  const xLabels = useMemo(() => {
    if (!dates || dates.length === 0) return [];
    const steps = 6;
    const arr = [];
    for (let i = 0; i < steps; i++) {
      const idx = Math.round((i / (steps - 1)) * (dates.length - 1));
      if (dates[idx]) {
        const d = new Date(dates[idx]);
        arr.push({
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          x: xPos(idx, dates.length),
        });
      }
    }
    return arr;
  }, [dates, padL, innerW]);

  const lastYou = you.length > 0 ? you[you.length - 1] : 0;
  const lastMedian = median.length > 0 ? median[median.length - 1] : 0;
  const lastTop25 = top25.length > 0 ? top25[top25.length - 1] : 0;

  const endX = you.length > 0 ? xPos(you.length - 1, you.length) : 0;
  const endY = you.length > 0 ? yPos(lastYou) : 0;

  const badgeLabel = isLive ? 'LIVE' : sourceLabel || 'PAPER';

  return (
    <div
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: density.cardPaddingY,
        fontFamily: typeTokens.sans,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.1px',
              color: page.ink,
            }}
          >
            Performance vs. Platform
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: page.inkMuted }}>
            Your cumulative return vs. typical user and top 25%
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              background: brand.soft,
              color: brand.dark,
              border: `1px solid ${brand.ring}`,
              borderRadius: shape.radius.pill,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: brand.base }} />
            {badgeLabel}
          </span>
          <div
            style={{
              display: 'inline-flex',
              background: page.surface,
              border: `1px solid ${page.border}`,
              borderRadius: shape.radius.button,
              overflow: 'hidden',
            }}
          >
            {RANGES.map((r, i) => {
              const active = r === range;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onRangeChange(r)}
                  style={{
                    background: active ? page.surfaceAlt : 'transparent',
                    color: active ? page.ink : page.inkSoft,
                    border: 'none',
                    borderLeft: i > 0 ? `1px solid ${page.border}` : 'none',
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: typeTokens.sans,
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="perfChartYouFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={brand.base} stopOpacity="0.16" />
            <stop offset="100%" stopColor={brand.base} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yLabels.map((yl, i) => (
          <g key={i}>
            <text x={padL - 6} y={yl.y + 3} textAnchor="end" fontSize="10" fill={page.inkMuted}>
              {yl.v.toFixed(1)}%
            </text>
            <line
              x1={padL}
              y1={yl.y}
              x2={W - padR}
              y2={yl.y}
              stroke={page.border}
              strokeDasharray="2 3"
            />
          </g>
        ))}
        {xLabels.map((xl, i) => (
          <text key={i} x={xl.x} y={H - 8} textAnchor="middle" fontSize="9.5" fill={page.inkMuted}>
            {xl.label}
          </text>
        ))}

        {top25.length > 0 && (
          <path
            d={toPath(top25)}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            fill="none"
          />
        )}
        {median.length > 0 && (
          <path d={toPath(median)} stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
        )}
        {you.length > 0 && (
          <>
            <path d={toAreaPath(you)} fill="url(#perfChartYouFill)" />
            <path
              d={toPath(you)}
              stroke={brand.base}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={endX} cy={endY} r="4" fill={brand.base} stroke="#fff" strokeWidth="1.5" />
          </>
        )}
      </svg>

      <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: page.inkSoft }}>
          <span style={{ width: 12, height: 2, background: brand.base, borderRadius: 1 }} />
          You{' '}
          <NumberText size={11} weight={600}>
            {lastYou >= 0 ? '+' : ''}
            {lastYou.toFixed(2)}%
          </NumberText>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: page.inkSoft }}>
          <span style={{ width: 12, height: 2, background: '#cbd5e1', borderRadius: 1 }} />
          Median{' '}
          <NumberText size={11} weight={500} color={page.inkSoft}>
            {lastMedian >= 0 ? '+' : ''}
            {lastMedian.toFixed(2)}%
          </NumberText>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: page.inkSoft }}>
          <span
            style={{
              width: 12,
              height: 2,
              borderRadius: 1,
              backgroundImage: 'linear-gradient(90deg, #94a3b8 50%, transparent 50%)',
              backgroundSize: '4px 2px',
            }}
          />
          Top 25%{' '}
          <NumberText size={11} weight={500} color={page.inkSoft}>
            {lastTop25 >= 0 ? '+' : ''}
            {lastTop25.toFixed(2)}%
          </NumberText>
        </span>
      </div>
    </div>
  );
}
