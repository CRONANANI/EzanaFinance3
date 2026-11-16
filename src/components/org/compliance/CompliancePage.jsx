'use client';

/**
 * Compliance (/org-team-hub/compliance). The council's investment policy
 * rules, the breaches logged against them, readings against current
 * holdings, an idea check and, for executives, the council activity log.
 *
 * It is a council policy record, not a legal, regulatory or brokerage
 * control: nothing here stops a trade, nothing runs on a schedule, and every
 * rule says how (or whether) the code actually checks it.
 *
 * Who sees what (the server checks every action again; hiding is a
 * convenience):
 *   executive          add, disable, enable, delete rules; resolve; activity log
 *   portfolio manager  resolve
 *   analyst            read rules and breaches, run the idea check
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import { Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';
import {
  NA,
  SOURCE_TEXT,
  STATUS_TEXT,
  checkedText,
  fmtDay,
  fmtPct,
  headroomRows,
  ideaRows,
  ideaSummary,
  isHardBreach,
  isHardRule,
  ruleLabel,
  ruleReading,
  sectorCap,
  sectorsOverCap,
} from '@/lib/org-compliance-model';
import { useComplianceData } from './useComplianceData';
import { DeleteRuleDialog, ResolveDialog, RuleDialog } from './ComplianceDialogs';
import { ActivityLog } from './ActivityLog';
import '@/components/org/command-center/command-center.css';
import './compliance.css';
import '@/styles/home-canvas.css';

const PITCHES_HREF = '/org-team-hub/pitches';
const ROLES = [
  { key: 'executive', label: 'Executive' },
  { key: 'portfolio_manager', label: 'Portfolio manager' },
  { key: 'analyst', label: 'Analyst' },
];

function Kpi({ icon, label, loading, na, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${na ? ' tcc-na' : tone ? ` ${tone}` : ''}`}>
        {loading ? <Skel w={40} h={16} /> : children}
      </span>
    </div>
  );
}

function Head({ id, title, count, aside }) {
  return (
    <div className="tcc-head">
      <h2 className="tcc-title" id={id}>
        {title}
        {count != null && <span className="tcc-mono cmp-count"> {count}</span>}
      </h2>
      {aside ? <div className="tcc-head__aside">{aside}</div> : null}
    </div>
  );
}

const Severity = ({ hard }) => (
  <span className={`cmp-sev${hard ? ' cmp-sev--hard' : ''}`}>
    <i className="bi bi-exclamation-triangle" aria-hidden="true" />
    {hard ? 'hard' : 'soft'}
  </span>
);

function SkelRows({ rows = 3 }) {
  return (
    <div className="cmp-skel" aria-hidden="true">
      <Skel w="100%" h={10} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} w={`${100 - (i % 3) * 7}%`} h={14} />
      ))}
    </div>
  );
}

/* A breach detail usually starts with the rule's own label; drop the repeat. */
function trimDetail(detail, name) {
  if (!detail) return NA;
  if (name && detail.startsWith(`${name}: `)) return detail.slice(name.length + 2);
  return detail;
}

/* ── Breaches ───────────────────────────────────────────────────────────── */
function BreachSection({
  view,
  tab,
  setTab,
  ruleName,
  canResolve,
  onResolve,
  loading,
  onRetryResolved,
}) {
  const open = view.violations || [];
  const resolved = view.resolved || { status: 'idle', list: [] };
  const storage = Boolean(view.resolutionStorage);
  return (
    <section className="tcc-section" aria-labelledby="cmp-breaches">
      <Head
        id="cmp-breaches"
        title="Breaches"
        aside={
          <div className="tcc-toggles" role="group" aria-label="Show breaches">
            <TextToggle pressed={tab === 'open'} onClick={() => setTab('open')}>
              Open
            </TextToggle>
            <TextToggle pressed={tab === 'resolved'} onClick={() => setTab('resolved')}>
              Resolved
            </TextToggle>
          </div>
        }
      />
      {loading ? (
        <SkelRows rows={2} />
      ) : tab === 'open' ? (
        open.length === 0 ? (
          <p className="tcc-state">
            <span>No open breaches logged.</span>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => setTab('resolved')}
            >
              View resolved
            </button>
          </p>
        ) : (
          <>
            <p className="cmp-lede">
              <span className="tcc-mono">{open.length}</span> open{' '}
              {open.length === 1 ? 'breach' : 'breaches'} logged, newest first. Breaches are logged
              when a pitch is submitted.
            </p>
            <div
              className={`cmp-table cmp-table--breach${canResolve ? '' : ' cmp-table--noact'}`}
              role="table"
              aria-label="Open breaches"
            >
              <div className="cmp-table__head" role="row">
                <span role="columnheader">Status</span>
                <span role="columnheader">Logged</span>
                <span role="columnheader">Ticker</span>
                <span role="columnheader">Rule</span>
                <span role="columnheader">Detail</span>
                {canResolve && (
                  <span role="columnheader" className="cmp-num">
                    <span className="tcc-sr">Action</span>
                  </span>
                )}
              </div>
              {open.map((v) => {
                const name = ruleName(v.rule_id);
                return (
                  <div className="cmp-table__row" role="row" key={v.id}>
                    <span role="cell">
                      <Severity hard={isHardBreach(v)} />
                    </span>
                    <span role="cell" className="cmp-stack">
                      <span className="tcc-mono">{fmtDay(v.created_at)}</span>
                      <span className="cmp-sub">{SOURCE_TEXT[v.source_type] || NA}</span>
                    </span>
                    <span role="cell" className={`tcc-mono cmp-strong${v.ticker ? '' : ' tcc-na'}`}>
                      {v.ticker || NA}
                    </span>
                    <span role="cell" className={`cmp-cell${name ? '' : ' tcc-na'}`}>
                      {name || 'Rule deleted'}
                    </span>
                    <span role="cell" className="cmp-cell cmp-detail">
                      {trimDetail(v.detail, name)}
                    </span>
                    {canResolve && (
                      <span role="cell" className="cmp-num">
                        <button
                          type="button"
                          className="tcc-textbtn tcc-textbtn--accent"
                          onClick={() => onResolve(v)}
                          aria-label={`Resolve the ${isHardBreach(v) ? 'hard' : 'soft'} breach${v.ticker ? ` for ${v.ticker}` : ''}`}
                        >
                          Resolve
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )
      ) : resolved.status === 'loading' || resolved.status === 'idle' ? (
        <SkelRows rows={2} />
      ) : resolved.status === 'error' ? (
        <SectionError message="Could not load resolved breaches." onRetry={onRetryResolved} />
      ) : resolved.list.length === 0 ? (
        <p className="tcc-state">
          <span>No resolved breaches.</span>
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            onClick={() => setTab('open')}
          >
            View open
          </button>
        </p>
      ) : (
        <>
          <p className="cmp-lede">
            {storage
              ? 'Resolved breaches, newest first, with who resolved them and why where it was recorded.'
              : 'Resolved breaches, newest first. Who resolved a breach and why is not recorded yet.'}
          </p>
          <div
            className="cmp-table cmp-table--resolved"
            role="table"
            aria-label="Resolved breaches"
          >
            <div className="cmp-table__head" role="row">
              <span role="columnheader">Status</span>
              <span role="columnheader">Logged</span>
              <span role="columnheader">Ticker</span>
              <span role="columnheader">Rule</span>
              <span role="columnheader">Resolution</span>
            </div>
            {resolved.list.map((v) => {
              const name = ruleName(v.rule_id);
              return (
                <div className="cmp-table__row" role="row" key={v.id}>
                  <span role="cell" className="cmp-stack">
                    <span className="cmp-resolved">
                      <i className="bi bi-check-lg" aria-hidden="true" />
                      resolved
                    </span>
                    <span className="cmp-sub">{isHardBreach(v) ? 'hard' : 'soft'}</span>
                  </span>
                  <span role="cell" className="cmp-stack">
                    <span className="tcc-mono">{fmtDay(v.created_at)}</span>
                    <span className="cmp-sub">{SOURCE_TEXT[v.source_type] || NA}</span>
                  </span>
                  <span role="cell" className={`tcc-mono cmp-strong${v.ticker ? '' : ' tcc-na'}`}>
                    {v.ticker || NA}
                  </span>
                  <span role="cell" className="cmp-stack">
                    <span className={name ? '' : 'tcc-na'}>{name || 'Rule deleted'}</span>
                    <span className="cmp-sub">{trimDetail(v.detail, name)}</span>
                  </span>
                  <span role="cell" className="cmp-stack">
                    {storage && v.resolved_at ? (
                      <>
                        <span>
                          <span className="tcc-mono">{fmtDay(v.resolved_at)}</span>
                          {v.resolved_by_name ? `, ${v.resolved_by_name}` : ''}
                        </span>
                        <span className={`cmp-sub${v.resolution_reason ? '' : ' tcc-na'}`}>
                          {v.resolution_reason || 'No reason recorded'}
                        </span>
                      </>
                    ) : (
                      <span className="tcc-na">Not recorded</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/* ── Policy summary ─────────────────────────────────────────────────────── */
function PolicySummary({ rules, loading }) {
  const active = rules.filter((r) => r.is_active);
  const hard = active.filter(isHardRule).length;
  return (
    <section className="tcc-section cmp-summary" aria-labelledby="cmp-summary">
      <Head id="cmp-summary" title="Policy summary" />
      {loading ? (
        <SkelRows rows={4} />
      ) : (
        <>
          <p className="cmp-summary__count">
            <span className="tcc-mono">{active.length}</span>{' '}
            {active.length === 1 ? 'rule' : 'rules'} in force:{' '}
            <span className="tcc-mono">{hard}</span> hard,{' '}
            <span className="tcc-mono">{active.length - hard}</span> soft.
          </p>
          <ul className="cmp-bullets">
            <li>
              When a pitch is submitted, it is checked against prohibited ticker, max positions and,
              if a size is given, max single position and max single trade. A hard breach stops the
              pitch form; a soft one is logged.
            </li>
            <li>
              Sector, market cap and prohibited sector rules are tested only in the idea check,
              which saves nothing.
            </li>
            <li>Cash floor is recorded only, not checked.</li>
            <li>Readings against holdings are worked out when this page loads.</li>
            <li>Nothing here stops a trade, and nothing runs on a schedule.</li>
          </ul>
          <p className="cmp-advice">
            A council policy record. Not legal, regulatory or compliance advice.
          </p>
        </>
      )}
    </section>
  );
}

/* ── Rules ──────────────────────────────────────────────────────────────── */
const STATUS_CLASS = {
  within: 'tcc-pos',
  near: 'tcc-warn',
  over: 'tcc-neg',
  below: 'tcc-neg',
  held: 'tcc-neg',
  na: 'tcc-na',
  recorded: 'tcc-default',
};

function RulesSection({
  rules,
  holdings,
  canEdit,
  loading,
  onToggle,
  onDelete,
  pendingId,
  onRetryHoldings,
  onAdd,
}) {
  const active = rules.filter((r) => r.is_active);
  const disabled = rules.filter((r) => !r.is_active);
  const hData = holdings?.status === 'ready' ? holdings.data : null;
  const cls = `cmp-table cmp-table--rules${canEdit ? '' : ' cmp-table--noact'}`;

  const row = (r, off = false) => {
    const rd = off ? { reading: 'Disabled', status: 'na' } : ruleReading(r, hData);
    const readingLoading = !off && holdings?.status === 'loading' && rd.mono !== undefined;
    return (
      <div className={`cmp-table__row${off ? ' is-off' : ''}`} role="row" key={r.id}>
        <span role="cell" className="cmp-stack">
          <span className="cmp-strong">{ruleLabel(r)}</span>
          <span className="cmp-sub">{checkedText(r)}</span>
        </span>
        <span role="cell">
          <Severity hard={isHardRule(r)} />
        </span>
        <span
          role="cell"
          className={`cmp-cell${rd.mono ? ' tcc-mono' : ''}${rd.status === 'na' && !off ? ' tcc-na' : ''}`}
        >
          {readingLoading ? <Skel w={96} h={12} /> : rd.reading}
        </span>
        <span role="cell" className={STATUS_CLASS[rd.status] || 'tcc-na'}>
          {readingLoading ? <Skel w={48} h={12} /> : STATUS_TEXT[rd.status] || NA}
        </span>
        {canEdit && (
          <span role="cell" className="cmp-controls">
            <button
              type="button"
              className="tcc-textbtn"
              disabled={pendingId === r.id}
              onClick={() => onToggle(r)}
              aria-label={`${r.is_active ? 'Disable' : 'Enable'} ${ruleLabel(r)}`}
            >
              {r.is_active ? 'Disable' : 'Enable'}
            </button>
            <button
              type="button"
              className="tcc-textbtn cmp-danger"
              disabled={pendingId === r.id}
              onClick={() => onDelete(r)}
              aria-label={`Delete ${ruleLabel(r)}`}
            >
              Delete
            </button>
          </span>
        )}
      </div>
    );
  };

  return (
    <section className="tcc-section" aria-labelledby="cmp-rules">
      <Head id="cmp-rules" title="Rules in force" count={loading ? null : active.length} />
      {loading ? (
        <SkelRows rows={5} />
      ) : rules.length === 0 ? (
        <p className="tcc-state">
          <span>No rules recorded yet.</span>
          {canEdit && (
            <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onAdd}>
              Add the first rule
            </button>
          )}
        </p>
      ) : (
        <>
          {holdings?.status === 'error' && (
            <SectionError
              message="Readings against holdings could not be loaded."
              onRetry={onRetryHoldings}
            />
          )}
          <div className={cls} role="table" aria-label="Rules in force">
            <div className="cmp-table__head" role="row">
              <span role="columnheader">Rule</span>
              <span role="columnheader">Severity</span>
              <span role="columnheader">Current reading</span>
              <span role="columnheader">Status</span>
              {canEdit && (
                <span role="columnheader">
                  <span className="tcc-sr">Controls</span>
                </span>
              )}
            </div>
            {active.length === 0 ? (
              <p className="tcc-state">No rule is in force. Every rule is disabled.</p>
            ) : (
              active.map((r) => row(r))
            )}
          </div>
          {disabled.length > 0 && (
            <>
              <h3 className="cmp-subhead">
                Disabled rules <span className="tcc-mono">{disabled.length}</span>
              </h3>
              <div className={cls} role="table" aria-label="Disabled rules">
                {disabled.map((r) => row(r, true))}
              </div>
            </>
          )}
          {!canEdit && (
            <p className="cmp-note">
              Executives add, disable and delete rules. A rule cannot be edited.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ── Sector headroom ────────────────────────────────────────────────────── */
function Headroom({ holdings, cap, loading, onRetry }) {
  const rows = holdings?.status === 'ready' ? headroomRows(holdings.data, cap) : [];
  const scaleMax = Math.max(cap ? cap * 1.3 : 0, ...rows.map((r) => r.pct), 1);
  return (
    <section className="tcc-section" aria-labelledby="cmp-headroom">
      <Head id="cmp-headroom" title="Sector headroom" />
      {loading || holdings?.status === 'loading' ? (
        <SkelRows rows={4} />
      ) : holdings?.status === 'error' ? (
        <SectionError message="Holdings could not be read." onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <p className="tcc-state">No holdings recorded, so there is nothing to read.</p>
      ) : (
        <>
          <ul className="cmp-headroom">
            {rows.map((r) => (
              <li key={r.sector}>
                <div className="cmp-headroom__line">
                  <span className={`cmp-headroom__name${r.unclassified ? ' tcc-na' : ''}`}>
                    {r.sector}
                  </span>
                  <span className="tcc-mono cmp-headroom__val">
                    {fmtPct(r.pct)}
                    {cap != null && ` / ${cap}%`}
                  </span>
                  {cap != null && !r.unclassified && (
                    <span
                      className={`tcc-mono cmp-headroom__gap ${r.over ? 'tcc-neg' : 'tcc-pos'}`}
                    >
                      {r.over ? `${fmtPct(r.gap)} over cap` : `${fmtPct(r.gap)} headroom`}
                    </span>
                  )}
                </div>
                <span className="cmp-bar" aria-hidden="true">
                  <span
                    className={`cmp-bar__fill${r.over ? ' is-over' : ''}${r.unclassified ? ' is-muted' : ''}`}
                    style={{ width: `${Math.min(100, (r.pct / scaleMax) * 100)}%` }}
                  />
                  {cap != null && (
                    <span
                      className="cmp-bar__cap"
                      style={{ left: `${Math.min(100, (cap / scaleMax) * 100)}%` }}
                    />
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="cmp-note">
            {cap != null
              ? `Share of the market value of current holdings, against the lowest active sector cap (${cap}%).`
              : 'No sector cap rule is active, so this is exposure only.'}{' '}
            Holdings with no sector are counted as unclassified.
          </p>
        </>
      )}
    </section>
  );
}

/* ── Idea check ─────────────────────────────────────────────────────────── */
const EMPTY_IDEA = { ticker: '', sector: '', sizePct: '', marketCap: '' };

function IdeaCheck({ rules, sectors, loading, runIdea, resetKey }) {
  const [form, setForm] = useState(EMPTY_IDEA);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setForm(EMPTY_IDEA);
    setOut(null);
    setError(null);
  }, [resetKey]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const run = async (e) => {
    e?.preventDefault();
    if (busy || !form.ticker.trim()) return;
    setBusy(true);
    setError(null);
    const res = await runIdea(form);
    setBusy(false);
    if (res.ok) setOut({ inputs: { ...form }, result: res.result });
    else {
      setOut(null);
      setError(
        res.error === 'forbidden'
          ? 'The idea check is for council members only.'
          : 'Could not run the check.',
      );
    }
  };
  const reset = () => {
    setForm(EMPTY_IDEA);
    setOut(null);
    setError(null);
  };
  const shown = out ? ideaRows(rules, out.inputs, out.result) : null;
  const groups = [
    ['hard', 'Hard'],
    ['soft', 'Soft'],
    ['portfolio', 'Not tested against one idea'],
  ];
  const STATE = {
    breach: { icon: 'bi-x-lg', word: 'breach', cls: 'tcc-neg' },
    clear: { icon: 'bi-check-lg', word: 'no breach', cls: 'tcc-pos' },
    untested: { icon: 'bi-dash-lg', word: 'not tested', cls: 'tcc-na' },
  };

  return (
    <section className="tcc-section" aria-labelledby="cmp-idea">
      <Head id="cmp-idea" title="Idea check" />
      <p className="cmp-lede">
        Test an idea against the rules in force before pitching it. Rules whose fields you leave
        blank are not tested. Nothing is saved and no breach is logged.
      </p>
      <form className="cmp-idea" onSubmit={run} noValidate>
        <div className="cmp-idea__fields">
          <label className="cmp-field">
            <span className="cmp-field__label">Ticker</span>
            <input
              className="tcc-mono"
              value={form.ticker}
              onChange={set('ticker')}
              placeholder="Required"
              autoCapitalize="characters"
              disabled={loading}
            />
          </label>
          <label className="cmp-field">
            <span className="cmp-field__label">Sector</span>
            <input
              value={form.sector}
              onChange={set('sector')}
              list="cmp-sectors"
              placeholder="As on holdings"
              disabled={loading}
            />
            <datalist id="cmp-sectors">
              {sectors.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="cmp-field">
            <span className="cmp-field__label">Proposed size (% of fund)</span>
            <input
              className="tcc-mono"
              inputMode="decimal"
              value={form.sizePct}
              onChange={set('sizePct')}
              disabled={loading}
            />
          </label>
          <label className="cmp-field">
            <span className="cmp-field__label">Market cap ($)</span>
            <input
              className="tcc-mono"
              inputMode="numeric"
              value={form.marketCap}
              onChange={set('marketCap')}
              disabled={loading}
            />
          </label>
        </div>
        <div className="cmp-idea__actions">
          <button
            type="submit"
            className="tcc-btn"
            disabled={loading || busy || !form.ticker.trim()}
          >
            {busy ? 'Checking' : 'Run check'}
          </button>
          <button type="button" className="tcc-textbtn" onClick={reset} disabled={loading}>
            Reset
          </button>
        </div>
      </form>
      {error && <SectionError message={error} onRetry={run} />}
      {shown && (
        <div className="cmp-idea__result" aria-live="polite">
          <p className="cmp-idea__summary">
            <strong>
              Result for <span className="tcc-mono">{out.inputs.ticker.toUpperCase()}</span>.
            </strong>{' '}
            {ideaSummary(shown.counts)}
          </p>
          {shown.rows.length === 0 ? (
            <p className="tcc-state">No rule is in force, so there is nothing to test.</p>
          ) : (
            groups.map(([g, label]) => {
              const list = shown.rows.filter((r) => r.group === g);
              if (!list.length) return null;
              return (
                <div key={g} className="cmp-idea__group">
                  <h3 className="cmp-subhead">{label}</h3>
                  <ul className="cmp-idea__rows">
                    {list.map((r) => {
                      const s = STATE[r.state];
                      return (
                        <li key={r.rule.id}>
                          <span className={`cmp-idea__state ${s.cls}`}>
                            <i className={`bi ${s.icon}`} aria-hidden="true" />
                            {s.word}
                          </span>
                          <span className="cmp-strong">{ruleLabel(r.rule)}</span>
                          <span className="cmp-cell">
                            {trimDetail(r.detail, ruleLabel(r.rule))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

/* ── The page ───────────────────────────────────────────────────────────── */
export function CompliancePage({ initialData = null, sampleViewer = false, viewerRole = null }) {
  const org = useOrg();
  const realRole = viewerRole || org.orgRole || null;
  const actorName = org.orgData?.member?.display_name || 'You';
  /* Role preview: a presentation control for sample content only. It changes
     what the sample shows, never what the server lets this member do. */
  const [preview, setPreview] = useState(realRole || 'executive');
  const [tab, setTab] = useState('open');
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [rowError, setRowError] = useState(null);

  const data = useComplianceData({
    initialData,
    sampleViewer,
    role: preview,
    actorName,
  });
  const { view, sampleActive } = data;
  const role = sampleActive ? preview : realRole;
  const loading = view.status === 'loading';
  const failed = view.status === 'error';
  const ready = view.status === 'ready';
  const canEdit = ready && Boolean(view.canEdit);
  const canResolve = ready && Boolean(view.canResolve);
  const showLog = role === 'executive';

  /* Switching between sample content and council data starts fresh. */
  const lastSample = useRef(sampleActive);
  useEffect(() => {
    if (lastSample.current === sampleActive) return;
    lastSample.current = sampleActive;
    setDialog(null);
    setNotice(null);
    setRowError(null);
    setTab('open');
  }, [sampleActive]);

  const { ensureResolved } = data;
  useEffect(() => {
    if (tab === 'resolved') ensureResolved();
  }, [tab, ensureResolved]);

  const rules = useMemo(() => (ready ? view.rules || [] : []), [ready, view.rules]);
  const ruleById = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);
  const ruleName = (id) => (id && ruleById.has(id) ? ruleLabel(ruleById.get(id)) : null);
  const cap = sectorCap(rules);
  const hData = view.holdings?.status === 'ready' ? view.holdings.data : null;
  const overCap = sectorsOverCap(hData, cap);
  const openCount = (view.violations || []).length;
  const hardCount = (view.violations || []).filter(isHardBreach).length;
  const activeCount = rules.filter((r) => r.is_active).length;
  const sectors = (hData?.sectors || []).filter((s) => !s.unclassified).map((s) => s.sector);

  if (view.status === 'forbidden') {
    return (
      <div className="dashboard-page-inset ez-canvas tcc-page cmp-page">
        <VisuallyHidden>
          <h1>Compliance</h1>
        </VisuallyHidden>
        <p className="tcc-state" role="status">
          This page is for council members only.
        </p>
      </div>
    );
  }

  const closeDialog = (message) => {
    setDialog(null);
    if (message) setNotice(message);
  };

  const toggle = async (r) => {
    setPendingId(r.id);
    setRowError(null);
    const res = await data.ruleAction({ type: 'toggle', id: r.id, active: r.is_active });
    setPendingId(null);
    if (!res.ok)
      setRowError(
        res.status === 403
          ? 'Only executives can change rules. Nothing was saved.'
          : 'The rule was not changed. Try again.',
      );
    else if (res.sample)
      setNotice(`Rule ${r.is_active ? 'disabled' : 'enabled'} in the sample. Nothing was saved.`);
  };

  const holdingsError = view.holdings?.status === 'error';

  /* ── Row 1: figures and page actions ── */
  const top = (
    <div className="tcc-top">
      <div className="tcc-kpis" aria-busy={loading || undefined}>
        <div className="tcc-kpistrip" role="list" aria-label="Compliance figures">
          <Kpi
            icon="bi-exclamation-triangle"
            label="Open breaches"
            loading={loading}
            na={failed}
            title="Unresolved breaches for the whole council"
          >
            {failed ? NA : openCount}
          </Kpi>
          <Kpi
            icon="bi-exclamation-octagon"
            label="Hard breaches"
            loading={loading}
            na={failed}
            tone={hardCount > 0 ? 'tcc-neg' : ''}
            title="Open breaches of hard rules"
          >
            {failed ? NA : hardCount}
          </Kpi>
          <Kpi
            icon="bi-list-ul"
            label="Rules in force"
            loading={loading}
            na={failed}
            title="Active rules"
          >
            {failed ? NA : activeCount}
          </Kpi>
          <Kpi
            icon="bi-layers"
            label="Sectors over cap"
            loading={loading || view.holdings?.status === 'loading'}
            na={failed || overCap == null}
            tone={overCap > 0 ? 'tcc-neg' : ''}
            title={
              cap == null
                ? 'No sector cap rule is active'
                : holdingsError
                  ? 'Holdings could not be read'
                  : `Sectors above the lowest active sector cap (${cap}%), by market value of current holdings`
            }
          >
            {failed || overCap == null ? NA : overCap}
          </Kpi>
        </div>
      </div>
      <div className="tcc-actions">
        {(sampleActive || data.sampleAvailable) && (
          <div className="tcc-actions__context">
            {sampleActive && <span className="tcc-sample">Sample content</span>}
            {data.sampleAvailable && (
              <button
                type="button"
                className="tcc-textbtn"
                onClick={() => data.setShowSample(!sampleActive)}
              >
                {sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            )}
          </div>
        )}
        {sampleActive && (
          <div className="cmp-preview" role="group" aria-label="Preview the sample as">
            <span className="cmp-preview__label">Preview as</span>
            <div className="tcc-toggles">
              {ROLES.map((r) => (
                <TextToggle
                  key={r.key}
                  pressed={preview === r.key}
                  onClick={() => setPreview(r.key)}
                >
                  {r.label}
                </TextToggle>
              ))}
            </div>
          </div>
        )}
        <button type="button" className="tcc-textbtn" onClick={data.refresh} disabled={loading}>
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          Refresh
        </button>
        {canEdit && (
          <button type="button" className="tcc-btn" onClick={() => setDialog({ kind: 'add' })}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Add rule
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page cmp-page">
      <VisuallyHidden>
        <h1>Compliance</h1>
      </VisuallyHidden>
      {top}
      {failed ? (
        <SectionError message="Could not load compliance data." onRetry={data.retry} />
      ) : (
        <>
          <p className="cmp-info">
            Personal trading disclosures and attestations are not available in Ezana.{' '}
            <Link href={PITCHES_HREF} className="tcc-link">
              Open Pitch Pipeline <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </p>
          {notice && (
            <p className="cmp-notice" role="status">
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <span>{notice}</span>
              <button type="button" className="tcc-textbtn" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </p>
          )}
          <div className="cmp-row">
            <BreachSection
              view={view}
              tab={tab}
              setTab={setTab}
              ruleName={ruleName}
              canResolve={canResolve}
              loading={loading}
              onResolve={(v) => setDialog({ kind: 'resolve', breach: v })}
              onRetryResolved={data.retryResolved}
            />
            <span className="tcc-vrule cmp-vrule" aria-hidden="true" />
            <PolicySummary rules={rules} loading={loading} />
          </div>
          <div className="cmp-row">
            <div className="cmp-col">
              {rowError && (
                <p className="cmp-fielderror" role="alert">
                  {rowError}
                </p>
              )}
              <RulesSection
                rules={rules}
                holdings={view.holdings}
                canEdit={canEdit}
                loading={loading}
                pendingId={pendingId}
                onToggle={toggle}
                onDelete={(r) => setDialog({ kind: 'delete', rule: r })}
                onRetryHoldings={data.retryHoldings}
                onAdd={() => setDialog({ kind: 'add' })}
              />
            </div>
            <span className="tcc-vrule cmp-vrule" aria-hidden="true" />
            <Headroom
              holdings={view.holdings}
              cap={cap}
              loading={loading}
              onRetry={data.retryHoldings}
            />
          </div>
          <div className="cmp-row cmp-row--single">
            <IdeaCheck
              rules={rules}
              sectors={sectors}
              loading={loading}
              runIdea={data.runIdea}
              resetKey={sampleActive ? 's' : 'l'}
            />
          </div>
          {showLog && (
            <div className="cmp-row cmp-row--single">
              <section className="tcc-section" aria-labelledby="cmp-log">
                <Head id="cmp-log" title="Council activity log" />
                <p className="cmp-lede">
                  Privileged actions across the council, newest first. Executives only. Rule changes
                  and breach resolutions appear here only from when this log began recording them.
                </p>
                {loading ? (
                  <SkelRows rows={4} />
                ) : (
                  <ActivityLog
                    key={sampleActive ? 'sample' : 'live'}
                    sampleEntries={sampleActive ? view.activity : null}
                    reloadKey={data.logKey}
                  />
                )}
              </section>
            </div>
          )}
          {sampleActive && (
            <p className="cmp-footnote">
              Sample content only. Names, figures and dates shown here are invented, and nothing
              done to them is saved.
            </p>
          )}
        </>
      )}

      {dialog?.kind === 'add' && canEdit && (
        <RuleDialog sample={sampleActive} onSubmit={data.ruleAction} onClose={closeDialog} />
      )}
      {dialog?.kind === 'delete' && canEdit && (
        <DeleteRuleDialog
          rule={dialog.rule}
          sample={sampleActive}
          onSubmit={data.ruleAction}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === 'resolve' && canResolve && (
        <ResolveDialog
          breach={dialog.breach}
          ruleName={ruleName(dialog.breach.rule_id) || 'Rule deleted'}
          storage={Boolean(view.resolutionStorage)}
          sample={sampleActive}
          onSubmit={data.resolve}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}

export default CompliancePage;
