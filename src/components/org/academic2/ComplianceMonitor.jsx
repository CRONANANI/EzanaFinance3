'use client';

import { useCallback, useEffect, useState } from 'react';
import './academic.css';

export function ComplianceMonitor() {
  const [ruleStatus, setRuleStatus] = useState([]);
  const [violations, setViolations] = useState([]);
  const [canResolve, setCanResolve] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [monRes, vioRes] = await Promise.all([
        fetch('/api/org/ips/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'portfolio' }),
        }),
        fetch('/api/org/ips/violations', { cache: 'no-store' }),
      ]);
      if (monRes.status === 403 || vioRes.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const mon = await monRes.json().catch(() => ({}));
      const vio = await vioRes.json().catch(() => ({}));
      setRuleStatus(mon.ruleStatus || []);
      setViolations(vio.violations || []);
      setCanResolve(!!vio.viewer?.canResolve);
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

  const resolve = async (v) => {
    await fetch('/api/org/ips/violations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, resolved: true }),
    });
    load();
  };

  if (loading) return <div className="ac3-state">Loading compliance…</div>;
  if (error) return <div className="ac3-state ac3-error">{error}</div>;

  const dotClass = (s) => (s === 'bad' ? 'ac3-bad' : s === 'warn' ? 'ac3-warn' : 'ac3-ok');

  return (
    <div className="ac3-root">
      <div className="ac3-label" style={{ marginBottom: '0.6rem' }}>
        Portfolio vs. policy
      </div>
      {ruleStatus.length === 0 ? (
        <div className="ac3-state" style={{ padding: '1.25rem' }}>
          No active IPS rules to monitor. Define rules in the policy editor.
        </div>
      ) : (
        ruleStatus.map((r) => (
          <div key={r.rule_id} className="ac3-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className={`ac3-status-dot ${dotClass(r.status)}`} aria-hidden />
              <div>
                <span className="ac3-strong">{r.label || r.rule_type}</span>
                <div className="ac3-meta">{r.detail}</div>
              </div>
            </div>
          </div>
        ))
      )}

      <div className="ac3-label" style={{ margin: '1.5rem 0 0.6rem' }}>
        Open violations
      </div>
      {violations.length === 0 ? (
        <div className="ac3-state" style={{ padding: '1.25rem' }}>No open violations. 🎉</div>
      ) : (
        violations.map((v) => (
          <div key={v.id} className="ac3-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className={`ac3-status-dot ${v.severity === 'block' ? 'ac3-bad' : 'ac3-warn'}`} aria-hidden />
              <div>
                <span className="ac3-strong">{v.ticker || v.source_type || 'Violation'}</span>
                <div className="ac3-meta">{v.detail}</div>
              </div>
            </div>
            {canResolve && (
              <button type="button" className="ac3-btn ac3-btn--ghost" onClick={() => resolve(v)}>
                Resolve
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
