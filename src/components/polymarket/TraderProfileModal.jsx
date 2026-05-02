'use client';

import { useEffect, useState, useCallback } from 'react';
import './trader-profile-modal.css';

/**
 * In-app trader profile. Data: /api/polymarket/profile?wallet=
 */
export default function TraderProfileModal({ wallet, displayName, profileImage, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!wallet) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/polymarket/profile?wallet=${encodeURIComponent(wallet)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [wallet]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdrop = useCallback((e) => {
    if (e.target === e.currentTarget) onClose?.();
  }, [onClose]);

  if (!wallet) return null;

  const profile = data?.profile;
  const stats = data?.stats;
  const positions = data?.positions || [];
  const trades = data?.trades || [];
  const categoryBreakdown = data?.analytics?.categoryBreakdown || {};

  const topPositions = [...positions]
    .sort((a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0))
    .slice(0, 10);

  const recentTrades = trades.slice(0, 25);

  const winRate = positions.length > 0
    ? (positions.filter((p) => Number(p.cashPnl ?? p.pnl) > 0).length / positions.length) * 100
    : null;

  const headerName = profile?.name || displayName || (wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Trader');
  const headerImage = profile?.profileImage || profileImage;
  const polymarketUrl = wallet ? `https://polymarket.com/profile/${wallet}` : null;

  const avgPct = stats?.avgPercentPnl ?? 0;
  const avgPctDisplay = Math.abs(avgPct) <= 1 && avgPct !== 0
    ? avgPct * 100
    : avgPct;

  return (
    <div className="tpm-backdrop" onClick={handleBackdrop} role="presentation">
      <div className="tpm-modal" role="dialog" aria-modal="true" aria-labelledby="tpm-name">
        <button type="button" className="tpm-close" onClick={onClose} aria-label="Close">
          <i className="bi bi-x-lg" />
        </button>

        <header className="tpm-header">
          {headerImage ? (
            <img src={headerImage} alt="" className="tpm-avatar" />
          ) : (
            <div className="tpm-avatar tpm-avatar--placeholder">
              <i className="bi bi-person-fill" />
            </div>
          )}
          <div className="tpm-header-text">
            <h2 className="tpm-name" id="tpm-name">{headerName}</h2>
            <code className="tpm-wallet">{wallet}</code>
            {profile?.bio ? <p className="tpm-bio">{profile.bio}</p> : null}
          </div>
          {polymarketUrl ? (
            <a
              href={polymarketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tpm-external"
            >
              <i className="bi bi-box-arrow-up-right" /> Open on Polymarket
            </a>
          ) : null}
        </header>

        {loading && (
          <div className="tpm-loading">
            <div className="tpm-spin"><i className="bi bi-arrow-repeat" /></div>
            <p>Loading trader data…</p>
          </div>
        )}

        {error && !loading && (
          <div className="tpm-error">
            <i className="bi bi-exclamation-circle" /> Could not load: {error}
          </div>
        )}

        {!loading && !error && stats && (
          <>
            <div className="tpm-stats-grid">
              <StatTile
                label="Portfolio Value"
                value={`$${formatNum(stats.totalPortfolioValue || stats.totalPositionsValue)}`}
              />
              <StatTile
                label="Total P&L"
                value={`${stats.totalPnl >= 0 ? '+' : ''}$${formatNum(Math.abs(stats.totalPnl))}`}
                valueClass={stats.totalPnl >= 0 ? 'tpm-positive' : 'tpm-negative'}
              />
              <StatTile
                label="Markets Traded"
                value={String(stats.totalMarketsTraded || 0)}
              />
              <StatTile
                label="Open Positions"
                value={String(stats.openPositions)}
              />
              {winRate != null && (
                <StatTile
                  label="Win Rate"
                  value={`${winRate.toFixed(1)}%`}
                  hint={`${positions.filter((p) => Number(p.cashPnl ?? p.pnl) > 0).length} / ${positions.length} positions`}
                />
              )}
              <StatTile
                label="Avg % P&L"
                value={`${avgPctDisplay >= 0 ? '+' : ''}${Number(avgPctDisplay).toFixed(1)}%`}
                valueClass={avgPctDisplay >= 0 ? 'tpm-positive' : 'tpm-negative'}
              />
            </div>

            {Object.keys(categoryBreakdown).length > 0 && (
              <section className="tpm-section">
                <h3 className="tpm-section-title">Category Exposure</h3>
                <div className="tpm-categories">
                  {Object.entries(categoryBreakdown)
                    .sort(([, a], [, b]) => b.value - a.value)
                    .map(([cat, info]) => (
                      <div key={cat} className="tpm-cat-row">
                        <div className="tpm-cat-label">
                          <span className={`tpm-cat-dot tpm-cat-dot--${cat}`} />
                          <span className="tpm-cat-name">{cat}</span>
                          <span className="tpm-cat-count">{info.count} pos</span>
                        </div>
                        <div className="tpm-cat-numbers">
                          <span className="tpm-cat-value">${formatNum(info.value)}</span>
                          <span className={info.pnl >= 0 ? 'tpm-positive' : 'tpm-negative'}>
                            {info.pnl >= 0 ? '+' : ''}${formatNum(Math.abs(info.pnl))}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {topPositions.length > 0 && (
              <section className="tpm-section">
                <h3 className="tpm-section-title">Top Positions</h3>
                <div className="tpm-positions-list">
                  {topPositions.map((p, i) => (
                    <div key={`${p.conditionId || p.market}-${i}`} className="tpm-position">
                      <div className="tpm-pos-title">{p.title || p.market || 'Market'}</div>
                      <div className="tpm-pos-meta">
                        <span className={`tpm-pos-side ${p.outcome === 'Yes' ? 'tpm-yes' : 'tpm-no'}`}>
                          {p.outcome || (p.outcomeIndex === 0 ? 'YES' : 'NO')}
                        </span>
                        <span className="tpm-pos-value">${formatNum(Number(p.currentValue) || 0)}</span>
                        <span className={Number(p.cashPnl ?? p.pnl) >= 0 ? 'tpm-positive' : 'tpm-negative'}>
                          {Number(p.cashPnl ?? p.pnl) >= 0 ? '+' : ''}${formatNum(Math.abs(Number(p.cashPnl ?? p.pnl) || 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {recentTrades.length > 0 && (
              <section className="tpm-section">
                <h3 className="tpm-section-title">Recent Trades ({recentTrades.length})</h3>
                <div className="tpm-trades-list">
                  {recentTrades.map((t, i) => {
                    const side = (t.side || '').toUpperCase();
                    const ts = t.timestamp != null ? Number(t.timestamp) : null;
                    const time = ts != null && Number.isFinite(ts)
                      ? new Date(ts < 1e12 ? ts * 1000 : ts)
                      : null;
                    return (
                      <div key={t.transactionHash || `${t.conditionId}-${i}`} className="tpm-trade">
                        <span className={`tpm-trade-side tpm-side--${side.toLowerCase()}`}>{side}</span>
                        <span className="tpm-trade-title">{t.title || t.market || 'Market'}</span>
                        <span className="tpm-trade-price">{(Number(t.price) * 100).toFixed(0)}¢</span>
                        <span className="tpm-trade-size">${formatNum(Number(t.size) || 0)}</span>
                        {time && (
                          <span className="tpm-trade-time">{relativeTime(time)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {topPositions.length === 0 && recentTrades.length === 0 && (
              <div className="tpm-empty">
                <i className="bi bi-inbox" />
                <p>No active positions or recent trades found for this wallet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, valueClass, hint }) {
  return (
    <div className="tpm-stat">
      <div className="tpm-stat-label">{label}</div>
      <div className={`tpm-stat-value ${valueClass || ''}`}>{value}</div>
      {hint && <div className="tpm-stat-hint">{hint}</div>}
    </div>
  );
}

function formatNum(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function relativeTime(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
