'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CircleCheck,
  CircleX,
  MinusCircle,
  Gauge,
  ScrollText,
  BadgeCheck,
  Users,
  Info,
  ListChecks,
  RefreshCw,
} from 'lucide-react';
import './academic.css';
import './compliance2.css';
import { IPSCheckBanner } from './IPSCheckBanner';

/* ── Shared rule metadata ────────────────────────────────────────────────
   `preTrade` = the rule is evaluated by /api/org/ips/check at trade time.
   Portfolio-only rules are surfaced but marked "not evaluated pre-trade". */
export const RULE_META = {
  max_position_pct: { label: 'Max single position', unit: '%', preTrade: true },
  max_sector_pct: { label: 'Max sector exposure', unit: '%', preTrade: true },
  max_single_trade_pct: { label: 'Max single trade', unit: '%', preTrade: true },
  cash_floor_pct: { label: 'Cash floor', unit: '%', preTrade: false },
  min_positions: { label: 'Min positions', unit: '', preTrade: false },
  max_positions: { label: 'Max positions', unit: '', preTrade: true },
  min_market_cap: { label: 'Min market cap', unit: '', preTrade: true },
  prohibited_ticker: { label: 'Prohibited ticker', unit: '', preTrade: true },
  prohibited_sector: { label: 'Prohibited sector', unit: '', preTrade: true },
};

export const isHardRule = (rule) => (rule?.rule_value?.severity || 'warning') === 'block';
export const ruleLabel = (rule) =>
  rule?.label || RULE_META[rule?.rule_type]?.label || rule?.rule_type || 'Rule';

function SevPill({ hard }) {
  return hard ? (
    <span className="cmp2-sev cmp2-sev--hard">
      <ShieldX aria-hidden /> Hard
    </span>
  ) : (
    <span className="cmp2-sev cmp2-sev--soft">
      <ShieldAlert aria-hidden /> Soft
    </span>
  );
}

/* ========================================================================= */
/* Pre-trade gate                                                            */
/* ========================================================================= */
export function PreTradeGate({ rules }) {
  const [form, setForm] = useState({ ticker: '', sector: '', sizePct: '', marketCap: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const activeRules = useMemo(() => (rules || []).filter((r) => r.is_active), [rules]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/org/ips/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: form.ticker,
          sector: form.sector || null,
          sizePct: form.sizePct === '' ? null : Number(form.sizePct),
          marketCap: form.marketCap === '' ? null : Number(form.marketCap),
        }),
      });
      if (res.status === 403) {
        setError('This check is for organizational members only.');
        setResult(null);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setResult({ ...data, _at: Date.now() });
    } catch {
      setError('Could not run the check.');
    } finally {
      setBusy(false);
    }
  };

  const failedIds = useMemo(
    () => new Set((result?.violations || []).map((v) => v.rule_id)),
    [result],
  );

  // Split active rules into pre-trade-evaluable vs portfolio-only.
  const evaluable = activeRules.filter((r) => RULE_META[r.rule_type]?.preTrade);
  const portfolioOnly = activeRules.filter((r) => !RULE_META[r.rule_type]?.preTrade);
  const hard = evaluable.filter(isHardRule);
  const soft = evaluable.filter((r) => !isHardRule(r));

  const verdict = result
    ? result.blocked
      ? 'hard'
      : (result.violations || []).length > 0
        ? 'soft'
        : 'clear'
    : null;

  const renderRow = (rule) => {
    const failed = result && failedIds.has(rule.id);
    const iconCls = !result
      ? 'cmp2-result-icon--na'
      : failed
        ? 'cmp2-result-icon--fail'
        : 'cmp2-result-icon--pass';
    const detailText = failed
      ? result.violations.find((v) => v.rule_id === rule.id)?.detail || 'Breaches this limit.'
      : result
        ? 'No breach for the inputs given.'
        : 'Run the check to evaluate.';
    return (
      <div key={rule.id} className={`cmp2-check-row${failed ? ' cmp2-check-row--fail' : ''}`}>
        <span className={`cmp2-result-icon ${iconCls}`}>
          {!result ? (
            <MinusCircle aria-hidden />
          ) : failed ? (
            <CircleX aria-hidden />
          ) : (
            <CircleCheck aria-hidden />
          )}
        </span>
        <div className="cmp2-check-main">
          <span className="cmp2-check-label">{ruleLabel(rule)}</span>
          <span className="cmp2-check-detail">{detailText}</span>
        </div>
        <SevPill hard={isHardRule(rule)} />
      </div>
    );
  };

  return (
    <div className="ac3-root">
      <p className="cmp2-panel-sub" style={{ margin: '0 0 1rem' }}>
        Model a proposed buy against the mandate before it reaches the desk. HARD limits block the
        trade; SOFT limits allow it but log a flag.
      </p>

      <div className="cmp2-form-grid">
        <div className="cmp2-form-field">
          <label className="ac3-label" htmlFor="ptg-ticker">
            Ticker
          </label>
          <input
            id="ptg-ticker"
            className="ac3-input"
            placeholder="AAPL"
            value={form.ticker}
            onChange={set('ticker')}
          />
        </div>
        <div className="cmp2-form-field">
          <label className="ac3-label" htmlFor="ptg-sector">
            Sector
          </label>
          <input
            id="ptg-sector"
            className="ac3-input"
            placeholder="Technology"
            value={form.sector}
            onChange={set('sector')}
          />
        </div>
        <div className="cmp2-form-field">
          <label className="ac3-label" htmlFor="ptg-size">
            Proposed size (% of fund)
          </label>
          <input
            id="ptg-size"
            className="ac3-input cmp2-num"
            inputMode="decimal"
            placeholder="3"
            value={form.sizePct}
            onChange={set('sizePct')}
          />
        </div>
        <div className="cmp2-form-field">
          <label className="ac3-label" htmlFor="ptg-cap">
            Market cap ($)
          </label>
          <input
            id="ptg-cap"
            className="ac3-input cmp2-num"
            inputMode="numeric"
            placeholder="5000000000"
            value={form.marketCap}
            onChange={set('marketCap')}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          type="button"
          className="ac3-btn ac3-btn--primary"
          onClick={run}
          disabled={busy || !form.ticker.trim()}
        >
          <ShieldCheck size={15} aria-hidden /> {busy ? 'Checking…' : 'Run pre-trade check'}
        </button>
        {result && (
          <button
            type="button"
            className="ac3-btn ac3-btn--ghost"
            onClick={() => {
              setResult(null);
              setForm({ ticker: '', sector: '', sizePct: '', marketCap: '' });
            }}
          >
            Reset
          </button>
        )}
      </div>

      {error && (
        <div className="ac3-state ac3-error" style={{ padding: '1rem' }}>
          {error}
        </div>
      )}

      {result && !error && (
        <>
          <div className={`cmp2-verdict cmp2-verdict--${verdict}`}>
            {verdict === 'clear' && (
              <>
                <ShieldCheck aria-hidden /> Clear — no policy limits breached.
              </>
            )}
            {verdict === 'soft' && (
              <>
                <ShieldAlert aria-hidden /> Allowed with flags — SOFT limits triggered.
              </>
            )}
            {verdict === 'hard' && (
              <>
                <ShieldX aria-hidden /> Blocked — a HARD limit would be breached.
              </>
            )}
          </div>

          <IPSCheckBanner result={result} />

          {activeRules.length === 0 ? (
            <div className="ac3-state" style={{ padding: '1.25rem' }}>
              No active mandate rules to check against. Define rules under Mandate Rules.
            </div>
          ) : (
            <>
              {hard.length > 0 && (
                <>
                  <div className="cmp2-group-head">
                    <ShieldX size={13} aria-hidden /> Hard limits
                  </div>
                  {hard.map(renderRow)}
                </>
              )}
              {soft.length > 0 && (
                <>
                  <div className="cmp2-group-head">
                    <ShieldAlert size={13} aria-hidden /> Soft limits
                  </div>
                  {soft.map(renderRow)}
                </>
              )}
              {portfolioOnly.length > 0 && (
                <>
                  <div className="cmp2-group-head">
                    <MinusCircle size={13} aria-hidden /> Portfolio-level (not evaluated pre-trade)
                  </div>
                  {portfolioOnly.map((rule) => (
                    <div key={rule.id} className="cmp2-check-row">
                      <span className="cmp2-result-icon cmp2-result-icon--na">
                        <MinusCircle aria-hidden />
                      </span>
                      <div className="cmp2-check-main">
                        <span className="cmp2-check-label">{ruleLabel(rule)}</span>
                        <span className="cmp2-check-detail">
                          Enforced against the live portfolio, not a single proposed trade.
                        </span>
                      </div>
                      <SevPill hard={isHardRule(rule)} />
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          <div className="cmp2-inline-note">
            <Info aria-hidden />
            <span>
              A pass means no breach was detected for the inputs provided; sector and size checks
              only fire when those fields are filled in.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ========================================================================= */
/* Rules in force (compact, read-only)                                       */
/* ========================================================================= */
export function RulesInForcePanel({ rules }) {
  const active = (rules || []).filter((r) => r.is_active);
  const hard = active.filter(isHardRule);
  const soft = active.filter((r) => !isHardRule(r));

  return (
    <div className="cmp2-panel">
      <div className="cmp2-panel-head">
        <h3 className="cmp2-panel-title">
          <ListChecks aria-hidden /> Rules in force
        </h3>
        <span className="cmp2-num" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {active.length}
        </span>
      </div>
      {active.length === 0 ? (
        <div className="ac3-state" style={{ padding: '1rem 0' }}>
          No active mandate rules.
        </div>
      ) : (
        <>
          {hard.length > 0 && (
            <>
              <div className="cmp2-group-head">
                <ShieldX size={13} aria-hidden /> Hard
              </div>
              {hard.map((r) => (
                <div key={r.id} className="cmp2-rule-line">
                  <span className="cmp2-rule-line__label">{ruleLabel(r)}</span>
                  <SevPill hard />
                </div>
              ))}
            </>
          )}
          {soft.length > 0 && (
            <>
              <div className="cmp2-group-head">
                <ShieldAlert size={13} aria-hidden /> Soft
              </div>
              {soft.map((r) => (
                <div key={r.id} className="cmp2-rule-line">
                  <span className="cmp2-rule-line__label">{ruleLabel(r)}</span>
                  <SevPill hard={false} />
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ========================================================================= */
/* Sector capacity planner                                                   */
/* ========================================================================= */
export function SectorCapacityPlanner({ positions, rules }) {
  const capRule = (rules || [])
    .filter((r) => r.is_active && r.rule_type === 'max_sector_pct')
    .map((r) => Number(r.rule_value?.pct))
    .filter((n) => Number.isFinite(n));
  const cap = capRule.length ? Math.min(...capRule) : null;

  const rows = useMemo(() => {
    const bySector = {};
    let total = 0;
    for (const p of positions || []) {
      const val = (Number(p.shares) || 0) * (Number(p.avg_cost) || 0);
      if (val <= 0) continue;
      const key = p.sector && String(p.sector).trim() ? p.sector : 'Unclassified';
      bySector[key] = (bySector[key] || 0) + val;
      total += val;
    }
    return {
      total,
      list: Object.entries(bySector)
        .map(([sector, val]) => ({ sector, pct: total ? (val / total) * 100 : 0 }))
        .sort((a, b) => b.pct - a.pct),
    };
  }, [positions]);

  return (
    <div className="cmp2-panel">
      <div className="cmp2-panel-head">
        <h3 className="cmp2-panel-title">
          <Gauge aria-hidden /> Sector capacity planner
        </h3>
        {cap != null && <span className="cmp2-num cmp2-sev cmp2-sev--soft">cap {cap}%</span>}
      </div>

      {rows.list.length === 0 ? (
        <div className="ac3-state" style={{ padding: '1rem 0' }}>
          No positions on record — nothing to plot. Add holdings under Positions to see sector
          headroom.
        </div>
      ) : (
        <>
          {cap == null && (
            <p className="cmp2-panel-sub">
              No sector cap rule (max_sector_pct) is defined — showing raw exposure for reference.
            </p>
          )}
          {rows.list.map(({ sector, pct }) => {
            const scaleMax = Math.max(cap ? cap * 1.3 : 0, ...rows.list.map((r) => r.pct), 1);
            const status =
              cap == null ? 'ok' : pct > cap ? 'over' : pct > cap * 0.9 ? 'warn' : 'ok';
            const width = Math.min(100, (pct / scaleMax) * 100);
            const capLeft = cap != null ? Math.min(100, (cap / scaleMax) * 100) : null;
            return (
              <div key={sector} className="cmp2-meter">
                <div className="cmp2-meter-head">
                  <span className="cmp2-meter-name">{sector}</span>
                  <span className="cmp2-meter-val cmp2-num">
                    {pct.toFixed(1)}%{cap != null && <> / {cap}%</>}
                  </span>
                </div>
                <div className="cmp2-meter-track">
                  <div
                    className={`cmp2-meter-fill cmp2-meter-fill--${status}`}
                    style={{ width: `${width}%` }}
                  />
                  {capLeft != null && (
                    <div className="cmp2-meter-cap" style={{ left: `${capLeft}%` }} />
                  )}
                </div>
              </div>
            );
          })}
          <div className="cmp2-inline-note">
            <Info aria-hidden />
            <span>
              Exposure computed client-side by cost basis (shares × avg cost) from org positions.
              The IPS engine enforces sector caps on live market value, so figures may differ.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ========================================================================= */
/* Open breaches                                                             */
/* ========================================================================= */
export function OpenBreaches({ violations, canResolve, onResolve }) {
  const list = violations || [];
  const hard = list.filter((v) => v.severity === 'block');

  return (
    <div className="cmp2-panel">
      <div className="cmp2-panel-head">
        <h3 className="cmp2-panel-title">
          <ShieldAlert aria-hidden /> Open breaches
        </h3>
        {list.length > 0 && (
          <span
            className={`cmp2-num cmp2-sev ${hard.length ? 'cmp2-sev--hard' : 'cmp2-sev--soft'}`}
          >
            {hard.length ? `${hard.length} hard` : `${list.length} open`}
          </span>
        )}
      </div>
      {list.length === 0 ? (
        <div
          className="ac3-state"
          style={{
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <ShieldCheck size={22} aria-hidden style={{ color: 'var(--emerald-text)' }} />
          No open breaches.
        </div>
      ) : (
        list.map((v) => (
          <div
            key={v.id}
            className={`cmp2-check-row${v.severity === 'block' ? ' cmp2-check-row--fail' : ''}`}
          >
            <span
              className={`cmp2-result-icon ${v.severity === 'block' ? 'cmp2-result-icon--fail' : ''}`}
            >
              {v.severity === 'block' ? (
                <ShieldX aria-hidden />
              ) : (
                <ShieldAlert aria-hidden style={{ color: 'var(--warning)' }} />
              )}
            </span>
            <div className="cmp2-check-main">
              <span className="cmp2-check-label">{v.ticker || v.source_type || 'Breach'}</span>
              <span className="cmp2-check-detail">{v.detail}</span>
            </div>
            {canResolve && (
              <button
                type="button"
                className="ac3-btn ac3-btn--ghost"
                onClick={() => onResolve?.(v)}
              >
                Resolve
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ========================================================================= */
/* Personal Trading — no backing table (honest-empty + flag)                 */
/* ========================================================================= */
export function PersonalTradingPanel() {
  return (
    <div className="ac3-root">
      <div className="cmp2-flag">
        <Users aria-hidden />
        <div>
          <h3>Personal trading disclosures — not configured</h3>
          <p>
            There is no personal-trade disclosure table in this workspace yet, so there is nothing
            to display. This tab is intentionally empty rather than showing placeholder data.
          </p>
          <p>To ship this feature, a backing store and endpoint would be needed, e.g.:</p>
          <ul>
            <li>
              <code>org_personal_trades</code> — member, ticker, side, size, trade date, status
            </li>
            <li>
              A pre-clearance workflow tied to the <code>prohibited_ticker</code> / blackout rules
            </li>
            <li>
              An API route under <code>/api/org/compliance/personal-trades</code>
            </li>
          </ul>
          <p>Flagged as not buildable with current schema — no data has been fabricated.</p>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* Attestations — no backing table (honest-empty + flag)                     */
/* ========================================================================= */
export function AttestationsPanel() {
  return (
    <div className="ac3-root">
      <div className="cmp2-flag">
        <BadgeCheck aria-hidden />
        <div>
          <h3>Compliance attestations — not configured</h3>
          <p>
            There is no attestations / sign-off table in this workspace yet. Rather than fabricate
            sign-off records, this tab honestly reports that the feature is not wired up.
          </p>
          <p>To ship this feature, the following would be needed:</p>
          <ul>
            <li>
              <code>org_attestations</code> — member, attestation type, period, signed_at, status
            </li>
            <li>A periodic (e.g. quarterly) sign-off cycle with reminders</li>
            <li>
              An API route under <code>/api/org/compliance/attestations</code>
            </li>
          </ul>
          <p>Flagged as not buildable with current schema — no data has been fabricated.</p>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* Audit log (org_audit_log via /api/org/audit-log — executive only)         */
/* ========================================================================= */
export function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [action, setAction] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (nextOffset, act, append) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', offset: String(nextOffset) });
      if (act) params.set('action', act);
      const res = await fetch(`/api/org/audit-log?${params.toString()}`, { cache: 'no-store' });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load the audit log.');
        return;
      }
      setForbidden(false);
      setError('');
      setEntries((prev) => (append ? [...prev, ...(data.entries || [])] : data.entries || []));
      if (data.actionTypes) setActionTypes(data.actionTypes);
      setHasMore(!!data.hasMore);
      setOffset(nextOffset);
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0, '', false);
  }, [load]);

  const onFilter = (e) => {
    const act = e.target.value;
    setAction(act);
    load(0, act, false);
  };

  const fmtTime = (ts) => {
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  if (loading && entries.length === 0 && !forbidden && !error) {
    return <div className="ac3-state">Loading audit log…</div>;
  }
  if (forbidden) {
    return (
      <div className="cmp2-flag">
        <Info aria-hidden />
        <div>
          <h3>Executive access required</h3>
          <p>
            The compliance audit log records privileged actions and is visible to executives only.
          </p>
        </div>
      </div>
    );
  }
  if (error) return <div className="ac3-state ac3-error">{error}</div>;

  return (
    <div className="ac3-root">
      <div className="cmp2-panel">
        <div className="cmp2-panel-head">
          <h3 className="cmp2-panel-title">
            <ScrollText aria-hidden /> Audit trail
          </h3>
          <button
            type="button"
            className="ac3-btn ac3-btn--ghost"
            onClick={() => load(0, action, false)}
            disabled={loading}
          >
            <RefreshCw size={14} aria-hidden /> Refresh
          </button>
        </div>

        <div className="cmp2-audit-toolbar">
          <select
            className="ac3-select"
            value={action}
            onChange={onFilter}
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {entries.length === 0 ? (
          <div className="ac3-state" style={{ padding: '1.5rem 0' }}>
            No audit entries recorded yet.
          </div>
        ) : (
          <div className="ac3-table-wrap">
            <table className="ac3-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="cmp2-mono-cell">{fmtTime(e.created_at)}</td>
                    <td>{e.actor_name}</td>
                    <td>
                      <span className="cmp2-action-tag">{e.action}</span>
                    </td>
                    <td className="cmp2-mono-cell">
                      {e.target_type
                        ? `${e.target_type}${e.target_id ? `:${String(e.target_id).slice(0, 8)}` : ''}`
                        : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{e.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div style={{ marginTop: '0.9rem', textAlign: 'center' }}>
            <button
              type="button"
              className="ac3-btn ac3-btn--ghost"
              onClick={() => load(offset + 50, action, true)}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
