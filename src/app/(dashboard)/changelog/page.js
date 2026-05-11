'use client';

import { useState, useEffect, useCallback } from 'react';
import './changelog.css';

const CATEGORY_CONFIG = {
  feature: { label: 'NEW FEATURE', color: '#10b981', icon: 'bi-plus-circle' },
  improvement: { label: 'IMPROVEMENT', color: '#3b82f6', icon: 'bi-arrow-up-circle' },
  fix: { label: 'BUG FIX', color: '#f59e0b', icon: 'bi-wrench' },
  security: { label: 'SECURITY', color: '#ef4444', icon: 'bi-shield-lock' },
  design: { label: 'DESIGN', color: '#8b5cf6', icon: 'bi-palette' },
  performance: { label: 'PERFORMANCE', color: '#06b6d4', icon: 'bi-speedometer2' },
  data: { label: 'DATA & API', color: '#ec4899', icon: 'bi-database' },
  content: { label: 'CONTENT', color: '#84cc16', icon: 'bi-file-earmark-text' },
  announcement: { label: 'ANNOUNCEMENT', color: '#a78bfa', icon: 'bi-megaphone' },
  breaking: { label: 'BREAKING', color: '#dc2626', icon: 'bi-exclamation-octagon' },
};

function formatDate(dateKey) {
  if (!dateKey || dateKey === 'Unknown') return 'Unknown date';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? `${dateKey}T12:00:00Z` : dateKey;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(dateKey);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

/** Group entries by date (YYYY-MM-DD) */
function groupByDate(entries) {
  const groups = {};
  for (const entry of entries) {
    const dateKey = entry.released_at?.slice(0, 10) || entry.created_at?.slice(0, 10) || 'Unknown';
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(entry);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const fetchChangelog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/changelog?limit=200');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChangelog();
  }, [fetchChangelog]);

  const filtered = filterCat === 'all'
    ? entries
    : entries.filter((e) => e.category === filterCat);

  const grouped = groupByDate(filtered);

  return (
    <div className="cl-page">
      <div className="cl-header">
        <div className="cl-header-left">
          <h1 className="cl-title">Platform Changelog</h1>
          <p className="cl-subtitle">Every feature, fix, and improvement shipped to Ezana Finance.</p>
        </div>
        <div className="cl-header-right">
          <span className="cl-entry-count">{entries.length} updates</span>
        </div>
      </div>

      <div className="cl-filters">
        <button
          type="button"
          className={`cl-filter-pill ${filterCat === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilterCat('all')}
        >
          All
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            className={`cl-filter-pill ${filterCat === key ? 'is-active' : ''}`}
            style={filterCat === key ? { borderColor: cfg.color, color: cfg.color, background: `${cfg.color}12` } : {}}
            onClick={() => setFilterCat(key)}
          >
            <i className={`bi ${cfg.icon}`} /> {cfg.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cl-loading">
          <i className="bi bi-hourglass-split" /> Loading changelog…
        </div>
      ) : error ? (
        <div className="cl-error">
          <i className="bi bi-exclamation-triangle" /> {error}
          <button type="button" onClick={fetchChangelog} className="cl-retry">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="cl-empty">
          <i className="bi bi-inbox" />
          <p>No changelog entries{filterCat !== 'all' ? ` in ${CATEGORY_CONFIG[filterCat]?.label || filterCat}` : ''} yet.</p>
        </div>
      ) : (
        <div className="cl-timeline">
          {grouped.map(([dateKey, dayEntries]) => (
            <div key={dateKey} className="cl-date-group">
              <div className="cl-date-header">
                <div className="cl-date-dot" />
                <span className="cl-date-label">{formatDate(dateKey)}</span>
                <span className="cl-date-count">{dayEntries.length} update{dayEntries.length !== 1 ? 's' : ''}</span>
              </div>

              {dayEntries.map((entry) => {
                const cat = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.feature;
                const isExpanded = expandedId === entry.id;
                const isPinned = entry.is_pinned;

                return (
                  <div key={entry.id} className={`cl-entry ${isPinned ? 'is-pinned' : ''}`}>
                    <div className="cl-entry-dot" style={{ borderColor: cat.color }} />
                    <div className="cl-entry-content">
                      <div className="cl-entry-header">
                        <span className="cl-entry-category" style={{ color: cat.color, borderColor: `${cat.color}40`, background: `${cat.color}12` }}>
                          <i className={`bi ${cat.icon}`} /> {cat.label}
                        </span>
                        {isPinned && (
                          <span className="cl-entry-pinned">
                            <i className="bi bi-pin-angle-fill" /> Pinned
                          </span>
                        )}
                        <span className="cl-entry-ago">{timeAgo(entry.released_at || entry.created_at)}</span>
                      </div>

                      <h3 className="cl-entry-title">{entry.title}</h3>

                      {entry.body && (
                        <>
                          <p className={`cl-entry-body ${isExpanded ? 'is-expanded' : ''}`}>
                            {isExpanded ? entry.body : entry.body.slice(0, 200)}
                            {!isExpanded && entry.body.length > 200 ? '…' : ''}
                          </p>
                          {entry.body.length > 200 && (
                            <button
                              type="button"
                              className="cl-entry-expand"
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </>
                      )}

                      <div className="cl-entry-time">
                        <i className="bi bi-clock" /> {formatTime(entry.released_at || entry.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
