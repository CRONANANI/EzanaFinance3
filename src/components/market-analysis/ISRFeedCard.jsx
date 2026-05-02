'use client';

/**
 * Intelligence, Surveillance & Reconnaissance — feed card.
 *
 * SCOPE: Geolocated *public news aggregation* plus a Polymarket signal match.
 * This is not a real-time surveillance tool. The feature name "ISR" is
 * a visual/brand reference, not a description of the data source.
 */

import { useEffect, useState } from 'react';
import { useIsrFeed } from '@/hooks/useIsrFeed';
import { usePolymarketMatches } from '@/hooks/usePolymarketMatches';

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'EU', label: 'Europe' },
  { code: 'GB', label: 'UK' },
  { code: 'ME', label: 'Middle East' },
  { code: 'CN', label: 'China' },
  { code: 'RU', label: 'Russia/Ukraine' },
  { code: 'IN', label: 'India' },
  { code: 'JP', label: 'Japan/Korea' },
  { code: 'LATAM', label: 'Latin America' },
  { code: 'AF', label: 'Africa' },
  { code: 'OC', label: 'Oceania' },
];

const TOPICS = ['All', 'Geopolitics', 'Conflict', 'Economy', 'Energy', 'Health', 'Tech'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const WINDOWS = [
  { key: '1h', label: 'Last hour' },
  { key: '6h', label: '6 hours' },
  { key: '24h', label: '24 hours' },
  { key: '7d', label: '7 days' },
];

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function severityClass(sev) {
  switch (sev) {
    case 'Critical': return 'isr-sev isr-sev--critical';
    case 'High': return 'isr-sev isr-sev--high';
    case 'Medium': return 'isr-sev isr-sev--medium';
    default: return 'isr-sev isr-sev--low';
  }
}

/**
 * @param {{
 *   onSelectEvent: (event: any, match: any|null) => void,
 *   onClose: () => void,
 *   onEventsChange?: (events: any[], matches: Record<string, any>) => void,
 * }} props
 */
/**
 * Live ISR items are backed by Massive news cache; each refresh hits
 * `/api/news/massive/poll` (rate-limited) then `/api/isr/feed` — see `useIsrFeed`.
 */
export function ISRFeedCard({ onSelectEvent, onClose, onEventsChange }) {
  const [selectedCountries, setSelectedCountries] = useState(['US', 'EU', 'ME', 'CN']);
  const [topic, setTopic] = useState('All');
  const [minSeverity, setMinSeverity] = useState('Low');
  const [windowKey, setWindowKey] = useState('24h');

  const { data: events, isLoading } = useIsrFeed({
    countries: selectedCountries,
    topic,
    minSeverity,
    window: windowKey,
  });

  const { data: polymarketMatches } = usePolymarketMatches(events);

  // Lift events + matches up so the page can render pulsating dots for the
  // same set of events, and the article modal knows which badge to show.
  useEffect(() => {
    onEventsChange?.(events || [], polymarketMatches || {});
  }, [events, polymarketMatches, onEventsChange]);

  const toggleCountry = (code) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="isr-card" role="complementary" aria-label="ISR feed">
      <header className="isr-card-header">
        <div className="isr-card-header-title">
          <div className="isr-card-header-icon" aria-hidden>
            <i className="bi bi-airplane-fill" />
          </div>
          <div className="isr-card-header-text">
            <h3>Intelligence, Surveillance &amp; Reconnaissance</h3>
            <p>Live geolocated news from public sources · Polymarket signals</p>
          </div>
        </div>
        <button
          type="button"
          className="isr-card-close"
          onClick={onClose}
          aria-label="Close ISR"
        >
          <i className="bi bi-x-lg" />
        </button>
      </header>

      <div className="isr-filters">
        <div className="isr-filter-label">Regions</div>
        <div className="isr-chip-row">
          {COUNTRIES.map((c) => {
            const active = selectedCountries.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                className={`isr-chip ${active ? 'isr-chip--active' : ''}`}
                onClick={() => toggleCountry(c.code)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="isr-select-row">
          <label className="isr-select">
            <span>Topic</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="isr-select">
            <span>Severity</span>
            <select value={minSeverity} onChange={(e) => setMinSeverity(e.target.value)}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{`≥ ${s}`}</option>)}
            </select>
          </label>
          <label className="isr-select">
            <span>Window</span>
            <select value={windowKey} onChange={(e) => setWindowKey(e.target.value)}>
              {WINDOWS.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="isr-feed-scroll custom-scrollbar">
        {isLoading && (
          <div className="isr-skeleton-stack">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="isr-skeleton" />
            ))}
          </div>
        )}
        {!isLoading && (!events || events.length === 0) && (
          <div className="isr-empty">
            <i className="bi bi-broadcast" aria-hidden />
            <p>No events match these filters.</p>
            <span>Try widening the region set or raising the time window.</span>
          </div>
        )}
        {!isLoading && events && events.length > 0 && (
          <ul className="isr-feed-list">
            {events.map((e) => {
              const pm = polymarketMatches?.[e.id] || null;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className="isr-feed-item"
                    onClick={() => onSelectEvent?.(e, pm)}
                  >
                    <div className="isr-feed-meta">
                      <span className="isr-feed-loc">
                        {e.city ? `${e.city}, ` : ''}{e.country}
                      </span>
                      <span className="isr-feed-dot">·</span>
                      <span className="isr-feed-source">{e.source}</span>
                      <span className="isr-feed-dot">·</span>
                      <span className="isr-feed-time">{timeAgo(e.publishedAt)}</span>
                    </div>
                    <div className="isr-feed-row">
                      <p className="isr-feed-headline">{e.headline}</p>
                      <span className={severityClass(e.severity)}>{e.severity}</span>
                    </div>
                    {pm && (
                      <div className="isr-polymarket-pill">
                        <span className="isr-polymarket-dot" />
                        <span className="isr-polymarket-label">Polymarket:</span>
                        <span className="isr-polymarket-title">{pm.marketTitle}</span>
                        <span className="isr-polymarket-odds">
                          {(pm.yesProbability * 100).toFixed(0)}¢
                        </span>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="isr-card-footer">
        <i className="bi bi-shield-lock" aria-hidden /> Public news aggregation · not a surveillance tool
      </footer>
    </div>
  );
}
