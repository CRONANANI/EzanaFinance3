'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

export function ManualEntryForm({ orgId, teamId, onSubmitting, onError, onSuccess }) {
  const [form, setForm] = useState({
    ticker: '',
    name: '',
    shares: '',
    avg_cost: '',
    sector: '',
    notes: '',
  });
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    onError(null);
    onSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/org/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          org_id: orgId,
          team_id: teamId,
          ticker: form.ticker,
          name: form.name || undefined,
          shares: Number(form.shares),
          avg_cost: Number(form.avg_cost),
          sector: form.sector || undefined,
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add position');
      onSuccess(json.position);
      setForm({ ticker: '', name: '', shares: '', avg_cost: '', sector: '', notes: '' });
    } catch (e) {
      onError(e.message);
    } finally {
      onSubmitting(false);
    }
  };

  const valid = form.ticker && Number(form.shares) > 0 && Number(form.avg_cost) >= 0;

  return (
    <div className="apm-org-form">
      <div className="apm-org-row">
        <label>
          <span>Ticker *</span>
          <input
            className="apm-org-input apm-org-mono"
            value={form.ticker}
            onChange={update('ticker')}
            placeholder="AAPL"
          />
        </label>
        <label>
          <span>Security name</span>
          <input
            className="apm-org-input"
            value={form.name}
            onChange={update('name')}
            placeholder="Apple Inc."
          />
        </label>
      </div>
      <div className="apm-org-row">
        <label>
          <span>Shares *</span>
          <input
            className="apm-org-input apm-org-mono"
            type="number"
            min="0"
            step="any"
            value={form.shares}
            onChange={update('shares')}
          />
        </label>
        <label>
          <span>Avg cost ($) *</span>
          <input
            className="apm-org-input apm-org-mono"
            type="number"
            min="0"
            step="any"
            value={form.avg_cost}
            onChange={update('avg_cost')}
          />
        </label>
      </div>
      <div className="apm-org-row">
        <label>
          <span>Sector</span>
          <input
            className="apm-org-input"
            value={form.sector}
            onChange={update('sector')}
            placeholder="Technology"
          />
        </label>
      </div>
      <label>
        <span>Notes</span>
        <textarea
          className="apm-org-input"
          rows={2}
          value={form.notes}
          onChange={update('notes')}
          placeholder="Thesis, source, anything relevant"
        />
      </label>
      <div className="apm-org-actions">
        <button className="apm-org-btn apm-org-btn-primary" onClick={submit} disabled={!valid}>
          Add position
        </button>
      </div>
    </div>
  );
}
