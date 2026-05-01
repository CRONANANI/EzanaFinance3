'use client';

import { useState, useEffect } from 'react';
import './kairos-events-admin.css';

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
    <div className="kea-impact-row">
      <select value={impact.symbol} onChange={(e) => onChange({ ...impact, symbol: e.target.value })}>
        {COMMODITY_SYMBOLS.map((s) => (
          <option key={s} value={s}>{s}</option>
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
      <button type="button" onClick={onRemove} className="kea-impact-remove" aria-label="Remove">×</button>
    </div>
  );
}

function EventForm({ event, onSubmit, onCancel }) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [scenarioType, setScenarioType] = useState(event?.scenario_type || 'climate_event');
  const [probability, setProbability] = useState(event?.estimated_probability ?? '');
  const [horizon, setHorizon] = useState(event?.probability_horizon_months ?? 12);
  const [status, setStatus] = useState(event?.status || 'monitoring');
  const [impacts, setImpacts] = useState(event?.affected_commodities || []);
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
        affected_regions: regions.split(',').map((r) => r.trim()).filter(Boolean),
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
    <form className="kea-form" onSubmit={handleSubmit}>
      <div className="kea-form-head">
        <h4>{event?.id ? 'Edit event' : 'New event'}</h4>
        <button type="button" onClick={onCancel} className="kea-form-close" aria-label="Cancel">×</button>
      </div>

      <label className="kea-field">
        <span>Title</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </label>

      <label className="kea-field">
        <span>Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
      </label>

      <div className="kea-field-row">
        <label className="kea-field">
          <span>Scenario type</span>
          <select value={scenarioType} onChange={(e) => setScenarioType(e.target.value)}>
            {SCENARIO_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="kea-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="kea-field-row">
        <label className="kea-field">
          <span>Probability (0.0–1.0)</span>
          <input type="number" step="0.05" min="0" max="1" value={probability} onChange={(e) => setProbability(e.target.value)} />
        </label>
        <label className="kea-field">
          <span>Horizon (months)</span>
          <input type="number" min="1" max="60" value={horizon} onChange={(e) => setHorizon(e.target.value)} />
        </label>
      </div>

      <label className="kea-field">
        <span>Affected regions (comma-separated)</span>
        <input type="text" value={regions} onChange={(e) => setRegions(e.target.value)} placeholder="gulf, middle-east" />
      </label>

      <div className="kea-impacts">
        <div className="kea-impacts-head">
          <span>Affected commodities</span>
          <button
            type="button"
            className="kea-impact-add"
            onClick={() =>
              setImpacts([...impacts, { symbol: 'CL=F', impact_min_pct: 0, impact_max_pct: 0, time_horizon_days: 30, rationale: '' }])
            }
          >
            + Add
          </button>
        </div>
        {impacts.map((imp, i) => (
          <CommodityImpactRow
            key={i}
            impact={imp}
            onChange={(updated) => setImpacts(impacts.map((x, idx) => (idx === i ? updated : x)))}
            onRemove={() => setImpacts(impacts.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>

      {error && <div className="kea-error">{error}</div>}

      <div className="kea-actions">
        <button type="button" className="kea-btn kea-btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kea-btn kea-btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : event?.id ? 'Save changes' : 'Publish event'}
        </button>
      </div>
    </form>
  );
}

/**
 * Inline admin controls for the Kairos events card. Renders a "+ New event"
 * button + edit/delete actions if the current user is an admin.
 *
 * @param {{ events: Array, onChange: () => void }} props
 *   - events: full event list (for finding the one being edited)
 *   - onChange: callback to refetch the parent's event list after CRUD
 */
export function KairosEventsAdmin({ events, onChange }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/kairos/events', { method: 'OPTIONS' })
      .then((r) => { if (!cancelled) setIsAdmin(r.ok || r.status === 204); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!isAdmin) return null;

  const editingEvent = editingId ? events.find((e) => e.id === editingId) : null;
  const formOpen = showForm || editingEvent;

  const handleDelete = async (id) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/kairos/events?id=${id}`, { method: 'DELETE' });
    if (res.ok) onChange?.();
  };

  return (
    <div className="kea-wrap">
      {!formOpen && (
        <div className="kea-toolbar">
          <span className="kea-toolbar-label">
            <i className="bi bi-shield-lock" /> Admin controls
          </span>
          <button
            type="button"
            className="kea-btn kea-btn-primary kea-btn-small"
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-plus-circle" /> New event
          </button>
        </div>
      )}

      {formOpen && (
        <EventForm
          event={editingEvent}
          onSubmit={() => {
            setShowForm(false);
            setEditingId(null);
            onChange?.();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}

      {!formOpen && events?.length > 0 && (
        <div className="kea-quickactions">
          <span className="kea-quickactions-label">Quick edit:</span>
          {events.slice(0, 5).map((e) => (
            <span key={e.id} className="kea-quickaction-chip">
              <span className="kea-chip-title">{e.title.slice(0, 30)}{e.title.length > 30 ? '…' : ''}</span>
              <button type="button" onClick={() => setEditingId(e.id)} className="kea-chip-btn" title="Edit">
                <i className="bi bi-pencil" />
              </button>
              <button type="button" onClick={() => handleDelete(e.id)} className="kea-chip-btn kea-chip-btn-danger" title="Delete">
                <i className="bi bi-trash" />
              </button>
            </span>
          ))}
          {events.length > 5 && (
            <span className="kea-quickactions-more">+ {events.length - 5} more</span>
          )}
        </div>
      )}
    </div>
  );
}
