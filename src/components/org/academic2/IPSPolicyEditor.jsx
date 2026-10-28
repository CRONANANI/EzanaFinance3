'use client';

import { useState } from 'react';
import './academic.css';
import './compliance2.css';
import { isHardRule, ruleLabel } from './ComplianceMonitor';
import { orgRequest } from '@/lib/org-request';

/* Form metadata — which input a rule type needs. */
const FORM_META = {
  max_position_pct: { label: 'Max single position', field: 'pct', unit: '%', placeholder: '5' },
  max_sector_pct: { label: 'Max sector exposure', field: 'pct', unit: '%', placeholder: '25' },
  max_single_trade_pct: { label: 'Max single trade', field: 'pct', unit: '%', placeholder: '3' },
  cash_floor_pct: { label: 'Cash floor', field: 'pct', unit: '%', placeholder: '2' },
  min_positions: { label: 'Min positions', field: 'min', unit: '', placeholder: '15' },
  max_positions: { label: 'Max positions', field: 'max', unit: '', placeholder: '40' },
  min_market_cap: {
    label: 'Min market cap ($)',
    field: 'value',
    unit: '',
    placeholder: '1000000000',
  },
  prohibited_ticker: { label: 'Prohibited ticker', field: 'ticker', unit: '', placeholder: 'TSLA' },
  prohibited_sector: {
    label: 'Prohibited sector',
    field: 'sector',
    unit: '',
    placeholder: 'Energy',
  },
};

function SevPill({ hard }) {
  return hard ? (
    <span className="cmp2-sev cmp2-sev--hard">
      <i className="bi bi-shield-x" aria-hidden="true" /> Hard
    </span>
  ) : (
    <span className="cmp2-sev cmp2-sev--soft">
      <i className="bi bi-shield-exclamation" aria-hidden="true" /> Soft
    </span>
  );
}

/**
 * Mandate Rules editor. Controlled by the page: receives the shared rules
 * snapshot and calls `onChanged` after any mutation so header breach counts,
 * the pre-trade gate and the sector planner all stay in sync.
 * Server enforces the executive gate; `canEdit` only hides the controls.
 */
export function IPSPolicyEditor({ rules = [], ruleTypes = [], canEdit = false, onChanged }) {
  const [form, setForm] = useState({
    rule_type: 'max_position_pct',
    value: '',
    severity: 'warning',
  });
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState('');

  const meta = FORM_META[form.rule_type];

  const add = async () => {
    if (!form.value || busy) return;
    const isNumeric = ['pct', 'min', 'max', 'value'].includes(meta.field);
    const rule_value = {
      [meta.field]: isNumeric ? Number(form.value) : String(form.value).toUpperCase(),
      severity: form.severity,
    };
    setBusy(true);
    setError('');
    try {
      await orgRequest('/api/org/ips/rules', {
        method: 'POST',
        json: {
          rule_type: form.rule_type,
          rule_value,
          label: `${meta.label} ${form.value}${meta.unit}`,
        },
      });
      setForm({ rule_type: 'max_position_pct', value: '', severity: 'warning' });
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (rule) => {
    setPendingId(rule.id);
    setError('');
    try {
      await orgRequest('/api/org/ips/rules', {
        method: 'POST',
        json: { id: rule.id, is_active: !rule.is_active },
      });
      onChanged?.();
    } catch (e) {
      setError(e.message);
      onChanged?.();
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (rule) => {
    setPendingId(rule.id);
    setError('');
    try {
      await orgRequest(`/api/org/ips/rules?id=${rule.id}`, { method: 'DELETE' });
      onChanged?.();
    } catch (e) {
      setError(e.message);
      onChanged?.();
    } finally {
      setPendingId(null);
    }
  };

  const active = rules.filter((r) => r.is_active);
  const inactive = rules.filter((r) => !r.is_active);
  const hard = active.filter(isHardRule);
  const soft = active.filter((r) => !isHardRule(r));

  const row = (r) => (
    <div key={r.id} className="ac3-row" style={{ opacity: r.is_active ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <SevPill hard={isHardRule(r)} />
        <span className="ac3-strong" style={{ minWidth: 0 }}>
          {ruleLabel(r)}
        </span>
      </div>
      {canEdit && (
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <button
            type="button"
            className="ac3-btn ac3-btn--ghost"
            onClick={() => toggle(r)}
            disabled={pendingId === r.id}
          >
            <i className="bi bi-power" aria-hidden="true" /> {r.is_active ? 'Disable' : 'Enable'}
          </button>
          <button
            type="button"
            className="ac3-btn ac3-btn--danger"
            onClick={() => remove(r)}
            disabled={pendingId === r.id}
          >
            <i className="bi bi-trash3" aria-hidden="true" /> Delete
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="ac3-root">
      <p className="cmp2-panel-sub" style={{ margin: '0 0 1rem' }}>
        The mandate limits in force. HARD limits block a trade at the gate; SOFT limits allow it but
        log a flag. Managers set these; the server enforces the executive gate.
      </p>

      {error && (
        <p className="org-inline-error" role="alert">
          {error}
        </p>
      )}

      {canEdit ? (
        <div className="ac3-card" style={{ marginBottom: '1.25rem' }}>
          <div className="ac3-label">Add a mandate rule</div>
          <div className="ac3-2col" style={{ flexWrap: 'wrap' }}>
            <select
              className="ac3-select"
              value={form.rule_type}
              onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value, value: '' }))}
              aria-label="Rule type"
            >
              {(ruleTypes.length ? ruleTypes : Object.keys(FORM_META)).map((t) => (
                <option key={t} value={t}>
                  {FORM_META[t]?.label || t}
                </option>
              ))}
            </select>
            <input
              className="ac3-input"
              placeholder={meta?.placeholder}
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              aria-label="Rule value"
            />
          </div>
          <div className="ac3-2col" style={{ marginTop: '0.6rem' }}>
            <select
              className="ac3-select"
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              aria-label="Severity"
            >
              <option value="warning">Soft: allow + log a flag</option>
              <option value="block">Hard: block the trade</option>
            </select>
            <button
              type="button"
              className="ac3-btn ac3-btn--primary"
              onClick={add}
              disabled={busy || !form.value}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add rule
            </button>
          </div>
        </div>
      ) : (
        <div className="cmp2-inline-note" style={{ marginBottom: '1rem' }}>
          <i className="bi bi-lock" aria-hidden="true" />
          <span>Mandate rules are read-only for your role. Executives can add or change them.</span>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="ac3-state">No mandate rules defined yet.</div>
      ) : (
        <>
          {hard.length > 0 && (
            <>
              <div className="cmp2-group-head">
                <i className="bi bi-shield-x" aria-hidden="true" /> Hard limits
              </div>
              {hard.map(row)}
            </>
          )}
          {soft.length > 0 && (
            <>
              <div className="cmp2-group-head">
                <i className="bi bi-shield-exclamation" aria-hidden="true" /> Soft limits
              </div>
              {soft.map(row)}
            </>
          )}
          {inactive.length > 0 && (
            <>
              <div className="cmp2-group-head">
                <i className="bi bi-power" aria-hidden="true" /> Disabled
              </div>
              {inactive.map(row)}
            </>
          )}
        </>
      )}
    </div>
  );
}
