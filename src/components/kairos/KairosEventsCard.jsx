'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { KairosEventsAdmin } from './KairosEventsAdmin';
import './kairos-events-card.css';

const SCENARIO_META = {
  shipping_disruption: { icon: 'bi-truck', label: 'Shipping' },
  opec_cut: { icon: 'bi-droplet-fill', label: 'OPEC' },
  sanctions: { icon: 'bi-ban', label: 'Sanctions' },
  conflict: { icon: 'bi-shield-exclamation', label: 'Conflict' },
  climate_event: { icon: 'bi-cloud-rain', label: 'Climate' },
  trade_policy: { icon: 'bi-globe', label: 'Trade' },
  other: { icon: 'bi-three-dots', label: 'Other' },
};

const STATUS_META = {
  monitoring: { label: 'Monitoring', color: '#94a3b8' },
  developing: { label: 'Developing', color: '#f59e0b' },
  realized: { label: 'Realized', color: '#ef4444' },
  resolved: { label: 'Resolved', color: '#10b981' },
};

const FILTER_TABS = ['all', 'monitoring', 'developing', 'realized', 'resolved'];

function EventRow({ event }) {
  const [expanded, setExpanded] = useState(false);
  const scenarioMeta = SCENARIO_META[event.scenario_type] || SCENARIO_META.other;
  const statusMeta = STATUS_META[event.status] || STATUS_META.monitoring;
  const probPct =
    event.estimated_probability != null
      ? Math.round(Number(event.estimated_probability) * 100)
      : null;

  return (
    <li className={`kev-row ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="kev-row-head"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="kev-row-icon" style={{ borderColor: `${statusMeta.color}55` }}>
          <i className={`bi ${scenarioMeta.icon}`} aria-hidden />
        </div>
        <div className="kev-row-main">
          <div className="kev-row-title-line">
            <span className="kev-row-title">{event.title}</span>
            <span className="kev-row-scenario">{scenarioMeta.label}</span>
          </div>
          <div className="kev-row-meta">
            {probPct != null && (
              <span className="kev-row-prob">
                {probPct}% / {event.probability_horizon_months}mo
              </span>
            )}
            <span
              className="kev-row-status"
              style={{
                color: statusMeta.color,
                borderColor: `${statusMeta.color}55`,
                background: `${statusMeta.color}1a`,
              }}
            >
              {statusMeta.label}
            </span>
          </div>
          {event.affected_commodities?.length > 0 && (
            <div className="kev-row-commodities">
              {event.affected_commodities.map((c, i) => (
                <span key={i} className="kev-commodity-chip">
                  {c.symbol}:{' '}
                  <strong>
                    +{c.impact_min_pct}% to +{c.impact_max_pct}%
                  </strong>
                  {c.time_horizon_days ? ` / ${c.time_horizon_days}d` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
        <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} kev-row-chevron`} aria-hidden />
      </button>

      {expanded && (
        <div className="kev-row-detail">
          <p className="kev-detail-desc">{event.description}</p>

          {event.affected_commodities?.length > 0 && (
            <div className="kev-detail-section">
              <h4>Per-commodity rationale</h4>
              <ul className="kev-detail-rationales">
                {event.affected_commodities.map((c, i) => (
                  <li key={i}>
                    <strong>{c.symbol}</strong>: {c.rationale || 'No rationale provided'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {event.affected_regions?.length > 0 && (
            <div className="kev-detail-section">
              <h4>Affected regions</h4>
              <div className="kev-detail-regions">
                {event.affected_regions.map((r, i) => (
                  <span key={i} className="kev-region-chip">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.source_links?.length > 0 && (
            <div className="kev-detail-section">
              <h4>Sources</h4>
              <ul className="kev-detail-sources">
                {event.source_links.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label || s.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * A government weather alert (NOAA, EUMETNET, …) surfaced via the OpenWeather
 * One Call 3.0 `alerts[]` array, rendered as a red-coded sibling of the
 * existing geopolitical `EventRow`. Kept visually consistent with the
 * `.kev-row` hierarchy so the existing CSS does most of the heavy lifting —
 * we only override colour stops to signal "alert" semantics.
 *
 * @param {{ alert: { sender: string, event: string, start: number, end: number, description: string, tags: string[] } }} props
 */
function WeatherAlertRow({ alert }) {
  const [expanded, setExpanded] = useState(false);
  const ALERT_COLOR = '#ef4444';
  // OWM timestamps are unix seconds; the chain view labels each alert as a
  // date window (start–end) rather than a probability since it's a known
  // realized warning, not an estimated scenario.
  const start = new Date((alert.start || 0) * 1000);
  const end = new Date((alert.end || 0) * 1000);
  const dateRange = `${start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <li className={`kev-row kev-row--alert ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="kev-row-head"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div
          className="kev-row-icon"
          style={{ borderColor: `${ALERT_COLOR}66`, color: ALERT_COLOR }}
        >
          <i className="bi bi-exclamation-triangle-fill" aria-hidden />
        </div>
        <div className="kev-row-main">
          <div className="kev-row-title-line">
            <span className="kev-row-title">{alert.event}</span>
            <span
              className="kev-row-scenario"
              style={{
                color: ALERT_COLOR,
                borderColor: `${ALERT_COLOR}55`,
                background: `${ALERT_COLOR}1a`,
              }}
            >
              GOVT ALERT
            </span>
          </div>
          <div className="kev-row-meta">
            <span className="kev-row-prob">{dateRange}</span>
            {alert.sender && (
              <span
                className="kev-row-status"
                style={{
                  color: ALERT_COLOR,
                  borderColor: `${ALERT_COLOR}55`,
                  background: `${ALERT_COLOR}1a`,
                }}
              >
                {alert.sender}
              </span>
            )}
          </div>
        </div>
        <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} kev-row-chevron`} aria-hidden />
      </button>

      {expanded && (
        <div className="kev-row-detail">
          <p className="kev-detail-desc">
            {alert.description?.slice(0, 800)}
            {alert.description && alert.description.length > 800 ? '…' : ''}
          </p>
          {alert.tags?.length > 0 && (
            <div className="kev-detail-section">
              <h4>Tags</h4>
              <div className="kev-detail-regions">
                {alert.tags.map((t, i) => (
                  <span key={i} className="kev-region-chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** @param {{ regionId: string, owmAlerts?: Array<{ sender: string, event: string, start: number, end: number, description: string, tags: string[] }> }} ps */
export function KairosEventsCard({ regionId, owmAlerts = [] }) {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/kairos/events')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!cancelled) setEvents(d.events || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (filter !== 'all') list = list.filter((e) => e.status === filter);
    if (regionId) {
      list = list.filter(
        (e) => !e.affected_regions?.length || e.affected_regions.includes(regionId),
      );
    }
    return list;
  }, [events, filter, regionId]);

  const counts = useMemo(() => {
    const c = { all: events.length };
    for (const status of Object.keys(STATUS_META)) {
      c[status] = events.filter((e) => e.status === status).length;
    }
    return c;
  }, [events]);

  return (
    <section className="kairos-card kairos-card--wide kev-card">
      <div className="kairos-card-header">
        <div className="kairos-card-header-left">
          <i className="bi bi-globe kairos-card-icon" aria-hidden />
          <h2 className="kairos-card-title">Active geopolitical signals</h2>
        </div>
      </div>
      <div className="kairos-card-body">
        <p className="kairos-card-hint">
          Scenarios that aren&apos;t predictable by weather or markets alone. Probabilities are
          expert-estimated; impact ranges are <strong>conditional on the scenario realizing</strong>
          .
        </p>

        <KairosEventsAdmin events={events} onChange={loadEvents} />

        {/* Government weather alerts (OpenWeather One Call). Rendered above
            the geopolitical scenario list and outside the filter tabs since
            they're a separate data category — these are realized warnings,
            not expert-estimated scenarios, so they shouldn't compete with the
            "monitoring/developing/realized/resolved" filter taxonomy. */}
        {owmAlerts.length > 0 && (
          <ul className="kev-list kev-list--alerts">
            {owmAlerts.map((alert, i) => (
              <WeatherAlertRow key={`owm-${i}`} alert={alert} />
            ))}
          </ul>
        )}

        <div className="kev-filters">
          {FILTER_TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`kev-filter-pill ${filter === t ? 'is-active' : ''}`}
              onClick={() => setFilter(t)}
            >
              {t === 'all' ? 'All' : STATUS_META[t]?.label || t}
              <span className="kev-filter-count">{counts[t] ?? 0}</span>
            </button>
          ))}
        </div>

        {loading && <div className="kev-state">Loading events…</div>}
        {error && <div className="kev-state kev-state-error">Failed: {error}</div>}

        {!loading && !error && filteredEvents.length === 0 && (
          <div className="kev-state">No events match this filter.</div>
        )}

        {!loading && !error && filteredEvents.length > 0 && (
          <ul className="kev-list">
            {filteredEvents.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        )}

        <div className="kev-disclaimer">
          These are <strong>scenario impact estimates</strong>, not predictions. Probabilities
          reflect expert judgment about whether each scenario will occur.
        </div>
      </div>
    </section>
  );
}
