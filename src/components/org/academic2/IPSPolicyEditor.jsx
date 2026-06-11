'use client';

import { useCallback, useEffect, useState } from 'react';
import './academic.css';

const RULE_META = {
  max_position_pct: { label: 'Max single position', field: 'pct', unit: '%', placeholder: '5' },
  max_sector_pct: { label: 'Max sector exposure', field: 'pct', unit: '%', placeholder: '25' },
  max_single_trade_pct: { label: 'Max single trade', field: 'pct', unit: '%', placeholder: '3' },
  cash_floor_pct: { label: 'Cash floor', field: 'pct', unit: '%', placeholder: '2' },
  min_positions: { label: 'Min positions', field: 'min', unit: '', placeholder: '15' },
  max_positions: { label: 'Max positions', field: 'max', unit: '', placeholder: '40' },
  min_market_cap: { label: 'Min market cap ($)', field: 'value', unit: '', placeholder: '1000000000' },
  prohibited_ticker: { label: 'Prohibited ticker', field: 'ticker', unit: '', placeholder: 'TSLA' },
  prohibited_sector: { label: 'Prohibited sector', field: 'sector', unit: '', placeholder: 'Energy' },
};

export function IPSPolicyEditor() {
  const [rules, setRules] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [ruleTypes, setRuleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ rule_type: 'max_position_pct', value: '', severity: 'warning' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/ips/rules', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load rules.');
        return;
      }
      setRules(data.rules || []);
      setRuleTypes(data.ruleTypes || []);
      setCanEdit(!!data.viewer?.canEdit);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const meta = RULE_META[form.rule_type];
    if (!form.value || busy) return;
    const isNumeric = ['pct', 'min', 'max', 'value'].includes(meta.field);
    const rule_value = {
      [meta.field]: isNumeric ? Number(form.value) : String(form.value).toUpperCase(),
      severity: form.severity,
    };
    setBusy(true);
    try {
      const res = await fetch('/api/org/ips/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_type: form.rule_type,
          rule_value,
          label: `${meta.label} ${form.value}${meta.unit}`,
        }),
      });
      if (res.ok) {
        setForm({ rule_type: 'max_position_pct', value: '', severity: 'warning' });
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (rule) => {
    await fetch('/api/org/ips/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
    });
    load();
  };

  const remove = async (rule) => {
    await fetch(`/api/org/ips/rules?id=${rule.id}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className="ac3-state">Loading policy…</div>;
  if (error) return <div className="ac3-state ac3-error">{error}</div>;

  const meta = RULE_META[form.rule_type];

  return (
    <div className="ac3-root">
      {canEdit && (
        <div className="ac3-card" style={{ marginBottom: '1.25rem' }}>
          <div className="ac3-label">Add an IPS rule</div>
          <div className="ac3-2col" style={{ flexWrap: 'wrap' }}>
            <select
              className="ac3-select"
              value={form.rule_type}
              onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value, value: '' }))}
            >
              {(ruleTypes.length ? ruleTypes : Object.keys(RULE_META)).map((t) => (
                <option key={t} value={t}>
                  {RULE_META[t]?.label || t}
                </option>
              ))}
            </select>
            <input
              className="ac3-input"
              placeholder={meta?.placeholder}
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
          </div>
          <div className="ac3-2col" style={{ marginTop: '0.6rem' }}>
            <select
              className="ac3-select"
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
            >
              <option value="warning">Warning (allow + log)</option>
              <option value="block">Block (prevent)</option>
            </select>
            <button type="button" className="ac3-btn ac3-btn--primary" onClick={add} disabled={busy}>
              Add rule
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="ac3-state">No IPS rules defined yet.</div>
      ) : (
        rules.map((r) => (
          <div key={r.id} className="ac3-row" style={{ opacity: r.is_active ? 1 : 0.5 }}>
            <div>
              <span className="ac3-strong">{r.label || RULE_META[r.rule_type]?.label || r.rule_type}</span>
              <div className="ac3-meta">
                {(r.rule_value?.severity || 'warning') === 'block' ? '🚫 Block' : '⚠️ Warning'}
              </div>
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="button" className="ac3-btn ac3-btn--ghost" onClick={() => toggle(r)}>
                  {r.is_active ? 'Disable' : 'Enable'}
                </button>
                <button type="button" className="ac3-btn ac3-btn--danger" onClick={() => remove(r)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
