'use client';

import { useState, useEffect } from 'react';
import './kairos-events-panel.css';

const SCENARIO_TYPES = [
  { value: 'shipping_disruption', label: 'Shipping Disruption' },
  { value: 'opec_cut', label: 'OPEC Cut' },
  { value: 'sanctions', label: 'Sanctions' },
  { value: 'conflict', label: 'Conflict' },
  { value: 'climate_event', label: 'Climate Event' },
  { value: 'trade_policy', label: 'Trade Policy' },
  { value: 'other', label: 'Other' },
];

const STATUSES = ['monitoring', 'developing', 'realized', 'resolved'];

const COMMODITY_SYMBOLS = ['CL=F', 'NG=F', 'GC=F', 'SI=F', 'HG=F', 'ZW=F', 'ZC=F', 'ZS=F', 'KC=F', 'CC=F'];

function CommodityImpactRow({ impact, onChange, onRemove }) {
  return (
    <div className="kep-impact-row">
      <select value={impact.symbol} onChange={(e) => onChange({ ...impact, symbol: e.target.value })}>
        {COMMODITY_SYMBOLS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Min %"
        value={impact.impact_min_pct ?? ''}
        onChange={(e) => onChange({ ...impact, impact_min_pct: Number(e.target.value) })}
      />
      <input
        type="number"
        placeholder="Max %"
        value={impact.impact_max_pct ?? ''}
        onChange={(e) => onChange({ ...impact, impact_max_pct: Number(e.target.value) })}
      />
      <input
        type="number"
        placeholder="Days"
        value={impact.time_horizon_days ?? ''}
        onChange={(e) => onChange({ ...impact, time_horizon_days: Number(e.target.value) })}
      />
      <input
        type="text"
        placeholder="Rationale"
        value={impact.rationale ?? ''}
        onChange={(e) => onChange({ ...impact, rationale: e.target.value })}
      />
      <button type="button" onClick={onRemove} className="kep-impact-remove">
        ×
      </button>
    </div>
  );
}

function EventForm({ event, onSubmit, onCancel }) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [scenarioType, setScenarioType] = useState(event?.scenario_type || 'climate_event');
  const [probability, setProbability] = useState(
    event?.estimated_probability != null ? String(event.estimated_probability) : ''
  );
  const [horizon, setHorizon] = useState(String(event?.probability_horizon_months ?? 12));
  const [status, setStatus] = useState(event?.status || 'monitoring');
  const [impacts, setImpacts] = useState(
    event?.affected_commodities?.length ? event.affected_commodities : []
  );
  const [regions, setRegions] = useState((event?.affected_regions || []).join(', '));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...(event?.id && { id: event.id }),
        title: title.trim(),
        description: description.trim(),
        scenario_type: scenarioType,
        estimated_probability: probability !== '' ? Number(probability) : null,
        probability_horizon_months: Number(horizon),
        status,
        affected_commodities: impacts,
        affected_regions: regions
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      };

      const res = await fetch('/api/admin/kairos/events', {
        method: event?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
      onSubmit(data.event);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="kep-form" onSubmit={handleSubmit}>
      <label className="kep-field">
        <span>Title</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </label>

      <label className="kep-field">
        <span>Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
      </label>

      <div className="kep-field-row">
        <label className="kep-field">
          <span>Scenario type</span>
          <select value={scenarioType} onChange={(e) => setScenarioType(e.target.value)}>
            {SCENARIO_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="kep-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="kep-field-row">
        <label className="kep-field">
          <span>Probability (0.0–1.0)</span>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
          />
        </label>

        <label className="kep-field">
          <span>Horizon (months)</span>
          <input type="number" min="1" max="60" value={horizon} onChange={(e) => setHorizon(e.target.value)} />
        </label>
      </div>

      <label className="kep-field">
        <span>Affected regions (comma-separated)</span>
        <input
          type="text"
          value={regions}
          onChange={(e) => setRegions(e.target.value)}
          placeholder="gulf, middle-east"
        />
      </label>

      <div className="kep-impacts">
        <div className="kep-impacts-head">
          <span>Affected commodities</span>
          <button
            type="button"
            className="kep-impact-add"
            onClick={() =>
              setImpacts([
                ...impacts,
                {
                  symbol: 'CL=F',
                  impact_min_pct: 0,
                  impact_max_pct: 0,
                  time_horizon_days: 30,
                  rationale: '',
                },
              ])
            }
          >
            + Add commodity
          </button>
        </div>
        {impacts.map((imp, i) => (
          <CommodityImpactRow
            key={`${imp.symbol}-${i}`}
            impact={imp}
            onChange={(updated) => setImpacts(impacts.map((x, idx) => (idx === i ? updated : x)))}
            onRemove={() => setImpacts(impacts.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>

      {error && <div className="kep-error">{error}</div>}

      <div className="kep-actions">
        <button type="button" className="kep-btn kep-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="kep-btn kep-btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : event?.id ? 'Update event' : 'Create event'}
        </button>
      </div>
    </form>
  );
}

export function KairosEventsPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/admin/kairos/events', { method: 'OPTIONS' })
      .then((r) => setIsAdmin(r.ok || r.status === 204))
      .catch(() => setIsAdmin(false));
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kairos/events');
      const data = await res.json();
      setEvents(data.events || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/admin/kairos/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    loadEvents();
  };

  if (!isAdmin) {
    return (
      <div className="kep-panel">
        <h2 className="kep-title">Kairos Events</h2>
        <div className="kep-empty">Admin access required.</div>
      </div>
    );
  }

  return (
    <div className="kep-panel">
      <header className="kep-header">
        <h2 className="kep-title">Kairos Events</h2>
        <p className="kep-subtitle">Geopolitical scenarios with affected-commodity impact ranges.</p>
      </header>

      {!showForm && !editingEvent && (
        <button type="button" className="kep-btn kep-btn-primary" onClick={() => setShowForm(true)}>
          + New event
        </button>
      )}

      {(showForm || editingEvent) && (
        <EventForm
          key={editingEvent?.id || (showForm ? 'new-event' : 'edit')}
          event={editingEvent}
          onSubmit={() => {
            setShowForm(false);
            setEditingEvent(null);
            loadEvents();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingEvent(null);
          }}
        />
      )}

      <div className="kep-events">
        {loading && <div className="kep-empty">Loading…</div>}
        {!loading && events.length === 0 && <div className="kep-empty">No events yet.</div>}
        {!loading &&
          events.map((e) => (
            <div key={e.id} className="kep-event-card">
              <div className="kep-event-head">
                <div>
                  <h3 className="kep-event-title">{e.title}</h3>
                  <span className={`kep-status kep-status-${e.status}`}>{e.status}</span>
                </div>
                <div className="kep-event-actions">
                  <button type="button" onClick={() => setEditingEvent(e)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(e.id)} className="kep-btn-danger">
                    Delete
                  </button>
                </div>
              </div>
              <p className="kep-event-desc">{e.description}</p>
              {e.affected_commodities?.length > 0 && (
                <div className="kep-event-impacts">
                  {e.affected_commodities.map((c, i) => (
                    <span key={i} className="kep-impact-chip">
                      {c.symbol}: +{c.impact_min_pct}% to +{c.impact_max_pct}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
