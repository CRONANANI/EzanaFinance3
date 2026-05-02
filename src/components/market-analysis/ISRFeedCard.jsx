'use client';

/**
 * Intelligence, Surveillance & Reconnaissance — feed card.
 *
 * SCOPE: Geolocated *public news aggregation* plus a Polymarket signal match.
 * This is not a real-time surveillance tool. The feature name "ISR" is
 * a visual/brand reference, not a description of the data source.
 */

import { useEffect, useState, useMemo } from 'react';
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

/**
 * Normalize a chain-view event (from /api/market-data/economic-calendar)
 * to the ISR event shape so the render block works unchanged.
 *
 * Chain shape:  { id, title, body, source, url, time, impact, country, region, topic }
 * ISR shape:    { id, headline, summary, source, url, publishedAt, severity, countryCode, city, country, lat, lng }
 */
function normalizeToIsrShape(e) {
  if (e.headline && e.publishedAt) return e;

  const IMPACT_TO_SEVERITY = {
    CRITICAL: 'Critical',
    ELEVATED: 'High',
    MODERATE: 'Medium',
    HIGH: 'High',
    LOW: 'Low',
  };

  const REGION_TO_CODE = {
    US: 'US',
    'North America': 'US',
    EU: 'EU',
    Europe: 'EU',
    GB: 'GB',
    UK: 'GB',
    ME: 'ME',
    'Middle East': 'ME',
    CN: 'CN',
    China: 'CN',
    RU: 'RU',
    Russia: 'RU',
    IN: 'IN',
    India: 'IN',
    JP: 'JP',
    Japan: 'JP',
    LATAM: 'LATAM',
    'Latin America': 'LATAM',
    OC: 'OC',
    Oceania: 'OC',
    AF: 'AF',
    Africa: 'AF',
  };

  return {
    id: e.id || `chain-${(e.title || '').slice(0, 20).replace(/\s/g, '-')}-${e.time || ''}`,
    headline: e.title || e.headline || 'Untitled Event',
    summary: e.body || e.summary || '',
    source: e.source || '',
    url: e.url || null,
    publishedAt: e.time
      ? (typeof e.time === 'number' ? new Date(e.time * 1000).toISOString() : e.time)
      : new Date().toISOString(),
    severity: IMPACT_TO_SEVERITY[(e.impact || '').toUpperCase()] || 'Medium',
    countryCode: REGION_TO_CODE[e.region] || REGION_TO_CODE[e.country] || '',
    city: '',
    country: e.country || e.region || '',
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    topic: e.topic || '',
    _chainEvent: true,
    _originalImpact: e.impact,
  };
}

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
 *   chainEvents?: any[] | null,
 *   chainEventsLoading?: boolean,
 * }} props
 */
export function ISRFeedCard({
  onSelectEvent,
  onClose,
  onEventsChange,
  chainEvents = null,
  chainEventsLoading = false,
}) {
  const [selectedCountries, setSelectedCountries] = useState(['US', 'EU', 'ME', 'CN']);
  const [topic, setTopic] = useState('All');
  const [minSeverity, setMinSeverity] = useState('Low');
  const [windowKey, setWindowKey] = useState('24h');

  const hasChainData = chainEvents != null;
  const { data: isrFallbackEvents, isLoading: isrFallbackLoading } = useIsrFeed({
    countries: selectedCountries,
    topic,
    minSeverity,
    window: windowKey,
    enabled: !hasChainData,
  });

  const rawEvents = hasChainData ? chainEvents : (isrFallbackEvents || []);
  const isLoading = hasChainData ? chainEventsLoading : isrFallbackLoading;

  const events = useMemo(() => {
    const normalized = rawEvents.map((e) => normalizeToIsrShape(e));

    let filtered = normalized;

    if (selectedCountries.length > 0) {
      const countrySet = new Set(selectedCountries.map((c) => c.toUpperCase()));
      filtered = filtered.filter((e) => {
        if (!e.countryCode) return true;
        return countrySet.has(e.countryCode.toUpperCase()) ||
          countrySet.has((e.region || '').toUpperCase());
      });
    }

    if (topic !== 'All') {
      const t = topic.toLowerCase();
      filtered = filtered.filter((e) =>
        (e.topic || '').toLowerCase().includes(t) ||
        (e.headline || '').toLowerCase().includes(t) ||
        (e.summary || '').toLowerCase().includes(t)
      );
    }

    const SEVERITY_ORDER = { Low: 0, Medium: 1, Moderate: 1, High: 2, Elevated: 2, Critical: 3 };
    const minLevel = SEVERITY_ORDER[minSeverity] ?? 0;
    filtered = filtered.filter((e) => (SEVERITY_ORDER[e.severity] ?? 0) >= minLevel);

    const windowMs = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };
    const cutoff = Date.now() - (windowMs[windowKey] || 86400000);
    filtered = filtered.filter((e) => {
      const t = e.publishedAt ? new Date(e.publishedAt).getTime() : Date.now();
      return t >= cutoff;
    });

    return filtered;
  }, [rawEvents, selectedCountries, topic, minSeverity, windowKey]);

  const { data: polymarketMatches } = usePolymarketMatches(events);

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
                      {e.isSeed && (
                        <span
                          className="isr-feed-demo-pill"
                          title="Demo entry while the news cache is empty"
                        >
                          DEMO
                        </span>
                      )}
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
