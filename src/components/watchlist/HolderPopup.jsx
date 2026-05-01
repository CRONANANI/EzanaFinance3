'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import './holder-popup.css';

function formatShares(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString('en-US');
}

function formatDays(days) {
  if (days >= 365) {
    const years = days / 365;
    return `${years.toFixed(1)}y`;
  }
  if (days >= 30) {
    const months = Math.round(days / 30);
    return `${months}mo`;
  }
  return `${days}d`;
}

function formatCurrency(v) {
  return `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

export function HolderPopup({ holder, ticker, currentPrice, onClose }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    closeBtnRef.current?.focus();
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!holder || typeof window === 'undefined') return null;

  const positionValue = holder.shares * (currentPrice ?? holder.avgCost);
  const costBasis = holder.shares * holder.avgCost;
  const pnl = positionValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  const isUp = pnl >= 0;

  return createPortal(
    <div className="hp-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="hp-title">
      <div className="hp-card" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeBtnRef}
          type="button"
          className="hp-close"
          onClick={onClose}
          aria-label="Close"
        >
          <i className="bi bi-x-lg" />
        </button>

        <header className="hp-head">
          <div className={`hp-avatar ${holder.partner ? 'hp-avatar--partner' : ''}`}>
            {holder.initials}
            {holder.partner && (
              <span className="hp-partner-badge" aria-label="Partner">
                <i className="bi bi-check-circle-fill" />
              </span>
            )}
          </div>
          <div className="hp-head-text">
            <h3 className="hp-name" id="hp-title">
              {holder.name}
              {holder.partner && <span className="hp-partner-tag">Partner</span>}
            </h3>
            <div className="hp-sub">
              Position in <strong>{ticker}</strong>
            </div>
          </div>
        </header>

        <div className="hp-grid">
          <div className="hp-stat">
            <div className="hp-stat-label">Shares held</div>
            <div className="hp-stat-value">{formatShares(holder.shares)}</div>
            <div className="hp-stat-sub">{holder.shares.toLocaleString('en-US')} units</div>
          </div>

          <div className="hp-stat">
            <div className="hp-stat-label">% of portfolio</div>
            <div className="hp-stat-value">{holder.portfolioPct.toFixed(1)}%</div>
            <div className="hp-stat-sub">
              {positionValue >= 100000 ? formatCurrency(positionValue) : `${formatCurrency(positionValue)} value`}
            </div>
          </div>

          <div className="hp-stat">
            <div className="hp-stat-label">Avg cost</div>
            <div className="hp-stat-value">{formatCurrency(holder.avgCost)}</div>
            <div className="hp-stat-sub">vs current {formatCurrency(currentPrice ?? 0)}</div>
          </div>

          <div className="hp-stat">
            <div className="hp-stat-label">Unrealized P&L</div>
            <div className={`hp-stat-value ${isUp ? 'is-up' : 'is-down'}`}>
              {isUp ? '+' : '-'}
              {formatCurrency(Math.abs(pnl))}
            </div>
            <div className={`hp-stat-sub ${isUp ? 'is-up' : 'is-down'}`}>
              {isUp ? '+' : ''}
              {pnlPct.toFixed(2)}%
            </div>
          </div>

          <div className="hp-stat hp-stat--full">
            <div className="hp-stat-label">Days held</div>
            <div className="hp-stat-value">{formatDays(holder.daysHeld)}</div>
            <div className="hp-stat-sub">
              {holder.daysHeld.toLocaleString('en-US')} days · since{' '}
              {new Date(Date.now() - holder.daysHeld * 86400000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {holder.note && (
          <div className="hp-note">
            <div className="hp-note-label">
              <i className="bi bi-chat-quote" /> Note from {holder.name.split(' ')[0]}
            </div>
            <p className="hp-note-text">{holder.note}</p>
          </div>
        )}

        <div className="hp-actions">
          <Link href={`/community/profile/${holder.userId}`} className="hp-profile-link" onClick={onClose}>
            View full profile <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
