'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react';
import { IPSPolicyEditor } from '@/components/org/academic2/IPSPolicyEditor';
import {
  PreTradeGate,
  RulesInForcePanel,
  SectorCapacityPlanner,
  OpenBreaches,
  PersonalTradingPanel,
  AttestationsPanel,
  AuditLog,
} from '@/components/org/academic2/ComplianceMonitor';
import '@/components/org/academic2/academic.css';
import '@/components/org/academic2/compliance2.css';

const TABS = [
  { id: 'gate', label: 'Pre-trade gate' },
  { id: 'rules', label: 'Mandate Rules' },
  { id: 'personal', label: 'Personal Trading' },
  { id: 'attest', label: 'Attestations' },
  { id: 'audit', label: 'Audit' },
];

/* Interactive shell for the Compliance & IPS surface. `initialData` (optional)
   is the server-rendered payload for rules + violations (same shapes the mount
   fetches produce); when present we seed state and skip the rules/violations
   mount fetches. `positions` is optional/best-effort and is always fetched
   client-side (it degrades to honest-empty). When initialData is null the full
   client load runs unchanged as the authoritative fallback. */
export function ComplianceClient({ initialData = null }) {
  const [tab, setTab] = useState('gate');
  const [rules, setRules] = useState(initialData?.rules || []);
  const [ruleTypes, setRuleTypes] = useState(initialData?.ruleTypes || []);
  const [canEdit, setCanEdit] = useState(!!initialData?.canEdit);
  const [violations, setViolations] = useState(initialData?.violations || []);
  const [canResolve, setCanResolve] = useState(!!initialData?.canResolve);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');

  const loadRules = useCallback(async () => {
    const res = await fetch('/api/org/ips/rules', { cache: 'no-store' });
    if (res.status === 403) throw new Error('member');
    const data = await res.json().catch(() => ({}));
    setRules(data.rules || []);
    setRuleTypes(data.ruleTypes || []);
    setCanEdit(!!data.viewer?.canEdit);
  }, []);

  const loadViolations = useCallback(async () => {
    const res = await fetch('/api/org/ips/violations', { cache: 'no-store' });
    if (res.status === 403) throw new Error('member');
    const data = await res.json().catch(() => ({}));
    setViolations(data.violations || []);
    setCanResolve(!!data.viewer?.canResolve);
  }, []);

  const loadPositions = useCallback(async () => {
    // Optional — planner degrades to honest-empty if this is unavailable.
    try {
      const res = await fetch('/api/org/positions', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setPositions(data.positions || []);
      }
    } catch {
      /* leave positions empty */
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadRules(), loadViolations(), loadPositions()]);
      setError('');
    } catch (e) {
      setError(
        e?.message === 'member'
          ? 'This page is for organizational members only.'
          : 'Could not load compliance data.',
      );
    } finally {
      setLoading(false);
    }
  }, [loadRules, loadViolations, loadPositions]);

  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    // Seeded from the server → rules + violations are already in state; only the
    // best-effort positions read remains. Otherwise run the full client load.
    if (initialData) loadPositions();
    else loadAll();
  }, [initialData, loadAll, loadPositions]);

  const resolveBreach = async (v) => {
    await fetch('/api/org/ips/violations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, resolved: true }),
    });
    loadViolations();
  };

  const activeRuleCount = useMemo(() => rules.filter((r) => r.is_active).length, [rules]);
  const hardBreaches = useMemo(
    () => violations.filter((v) => v.severity === 'block').length,
    [violations],
  );
  const openBreaches = violations.length;

  return (
    <div className="dashboard-page-inset ac3-root">
      <div className="ac3-header">
        <div>
          <p className="ac3-eyebrow">Compliance</p>
          <h1 className="ac3-title">Compliance &amp; IPS</h1>
          <p className="ac3-sub">
            Investment Policy Statement guardrails, the pre-trade gate and the audit trail.
          </p>
        </div>
        {!loading &&
          !error &&
          (hardBreaches > 0 ? (
            <div className="cmp2-breach-chip cmp2-breach-chip--hard">
              <ShieldX size={16} aria-hidden />
              <span className="cmp2-num">{hardBreaches}</span> hard{' '}
              {hardBreaches === 1 ? 'breach' : 'breaches'} open
            </div>
          ) : openBreaches > 0 ? (
            <div className="cmp2-breach-chip">
              <ShieldAlert size={16} aria-hidden />
              <span className="cmp2-num">{openBreaches}</span> open{' '}
              {openBreaches === 1 ? 'flag' : 'flags'}
            </div>
          ) : (
            <div className="cmp2-breach-chip cmp2-breach-chip--clear">
              <ShieldCheck size={16} aria-hidden /> All clear
            </div>
          ))}
      </div>

      <div className="ac3-tabs" role="tablist" aria-label="Compliance views">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`ac3-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'gate' && hardBreaches > 0 && (
              <span className="cmp2-tab-badge cmp2-tab-badge--hard">{hardBreaches}</span>
            )}
            {t.id === 'rules' && activeRuleCount > 0 && (
              <span className="cmp2-tab-badge">{activeRuleCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ac3-state">Loading compliance…</div>
      ) : error ? (
        <div className="ac3-state ac3-error">{error}</div>
      ) : (
        <>
          {tab === 'gate' && (
            <div className="cmp2-layout">
              <div className="cmp2-col">
                <div className="cmp2-panel">
                  <div className="cmp2-panel-head">
                    <h3 className="cmp2-panel-title">
                      <ShieldCheck aria-hidden /> Pre-trade gate
                    </h3>
                  </div>
                  <PreTradeGate rules={rules} />
                </div>
                <OpenBreaches
                  violations={violations}
                  canResolve={canResolve}
                  onResolve={resolveBreach}
                />
              </div>
              <div className="cmp2-col">
                <RulesInForcePanel rules={rules} />
                <SectorCapacityPlanner positions={positions} rules={rules} />
              </div>
            </div>
          )}

          {tab === 'rules' && (
            <IPSPolicyEditor
              rules={rules}
              ruleTypes={ruleTypes}
              canEdit={canEdit}
              onChanged={loadRules}
            />
          )}

          {tab === 'personal' && <PersonalTradingPanel />}
          {tab === 'attest' && <AttestationsPanel />}
          {tab === 'audit' && <AuditLog />}
        </>
      )}
    </div>
  );
}
