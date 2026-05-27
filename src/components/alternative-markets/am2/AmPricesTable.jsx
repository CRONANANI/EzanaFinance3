'use client';

import { useState, useMemo } from 'react';
import { AmTickerTile } from './AmTickerTile';
import { AmPct } from './AmPct';
import { AmSpark } from './AmSpark';

function normalizeTabs(tabs) {
  return tabs.map((t) => ({ key: t.key || t.id, label: t.label }));
}

export function AmPricesTable({ rows, title, subtitle, tabs, onRowClick }) {
  const normalizedTabs = useMemo(() => normalizeTabs(tabs || []), [tabs]);
  const [tab, setTab] = useState(normalizedTabs[1]?.key || normalizedTabs[0]?.key || 'top');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    let r = rows;
    if (tab !== 'all') {
      r = r.filter((row) => row.tier === tab || (tab === 'top' && row.tier === 'top'));
    }
    if (sortKey) {
      const k = sortKey;
      r = [...r].sort((a, b) => {
        const av = a[k] ?? 0;
        const bv = b[k] ?? 0;
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    return r;
  }, [rows, tab, sortKey, sortDir]);

  const onSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortIndicator = (key) => {
    if (sortKey !== key) return null;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'desc' ? '▼' : '▲'}</span>;
  };

  return (
    <div className="am2-card">
      <div className="am2-card-head">
        <div className="am2-card-head-titles">
          <h3 className="am2-card-title">{title}</h3>
          {subtitle && <span className="am2-card-subtitle">{subtitle}</span>}
        </div>
        <div className="am2-seg" role="tablist" aria-label="Asset filter">
          {normalizedTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`am2-seg-btn ${tab === t.key ? 'am2-seg-btn--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="am2-card-body--flush">
        <div className="am2-table">
          <div className="am2-table-head am2-table-prices">
            <span>#</span>
            <span>Asset</span>
            <button
              type="button"
              className="am2-table-cell-right"
              style={{
                background: 'transparent',
                border: 'none',
                font: 'inherit',
                color: 'inherit',
                textTransform: 'inherit',
                letterSpacing: 'inherit',
                cursor: 'pointer',
              }}
              onClick={() => onSort('chg24h')}
            >
              Last{sortIndicator('chg24h')}
            </button>
            <span className="am2-table-cell-right">24h</span>
            <span className="am2-table-cell-right am2-col-7d">7d</span>
            <span className="am2-table-cell-right">Mkt cap</span>
            <span className="am2-table-cell-right am2-col-chart">Chart 24h</span>
          </div>

          {filtered.map((row) => (
            <div
              key={`${row.name}-${row.rank}`}
              className="am2-table-row am2-table-prices"
              onClick={() => onRowClick?.(row)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRowClick?.(row)}
            >
              <span className="am2-table-rank">{String(row.rank).padStart(2, '0')}</span>
              <div className="am2-table-asset">
                <AmTickerTile symbol={row.ticker} />
                <div className="am2-table-asset-text">
                  <span className="am2-table-asset-name">{row.name.replace(/\s*\(.+\)$/, '')}</span>
                  <span className="am2-table-asset-sym">{row.ticker}</span>
                </div>
              </div>
              <span className="am2-table-cell-right am2-table-num">{row.price}</span>
              <span className="am2-table-cell-right">
                <AmPct ch={row.chg24h} signed />
              </span>
              <span className="am2-table-cell-right am2-col-7d">
                <AmPct ch={row.chg7d} signed />
              </span>
              <span className="am2-table-cell-right am2-table-mkt">{row.mcap}</span>
              <span className="am2-table-cell-right am2-col-chart">
                <AmSpark values={row.sparkline} positive={row.positive} w={88} h={24} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
