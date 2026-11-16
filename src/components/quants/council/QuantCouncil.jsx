'use client';

/**
 * The Council tab of Quant Lab's Overview (/for-the-quants), shown only to
 * council members once their membership is known. Everyone else sees the
 * Overview unchanged.
 *
 *   strip                 fund value, gain on cost, benchmark, positions, teams
 *   Fund risk             the lab's risk engine on the council's holdings at
 *                         today's weights, replayed against SPY
 *   Sector concentration  weight by sector against the stored sector cap
 *   Pitch evidence        open pitches and their required-model checklists
 *   IPS pre-check         the Compliance rule engine on what a pitch records
 *   Model assignments     open Model assignments the Assignments page shows
 *   Research handoff      sharing strategies is not available yet
 *
 * Every figure comes from src/lib/org-quant-lab-model.js over the council's
 * own records (or the labelled sample, master admin and demo accounts only).
 * Nothing here writes: the pre-check runs the policy engine and saves nothing.
 * Quant Lab strategies stay private to their author.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Skeleton, SkeletonRegion } from '@/components/ds';
import { evaluateProposal } from '@/lib/org-compliance-model';
import { fundOverview, fmtMoney, fmtSignedPct } from '@/lib/org-company-research-model';
import {
  LINKS,
  NA,
  assignmentRows,
  fmtFrac,
  fmtPctNum,
  fmtRatio,
  fmtShortDate,
  fmtSignedFrac,
  ipsInputs,
  ipsRows,
  ipsSummary,
  openPitches,
  pitchRows,
  replayPaths,
  riskView,
  sectorRows,
} from '@/lib/org-quant-lab-model';
import './quant-council.css';

const CHART_W = 600;
const CHART_H = 220;
const PITCH_ROWS = 6;

/* ── States ─────────────────────────────────────────────────────────────── */

function Loading({ label, rows = 3 }) {
  return (
    <SkeletonRegion label={label} className="qlc-skel">
      {['100%', '84%', '58%', '72%', '64%'].slice(0, rows).map((w) => (
        <Skeleton key={w} height={10} width={w} />
      ))}
    </SkeletonRegion>
  );
}

function Empty({ children, href, action }) {
  return (
    <div className="qlc-state">
      <p>{children}</p>
      {href ? (
        <Link href={href} className="qlc-link">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

function Failed({ children, onRetry }) {
  return (
    <div className="qlc-state qlc-state--error" role="alert">
      <p>
        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
        <span>{children}</span>
      </p>
      {onRetry ? (
        <button type="button" className="qlc-link" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

function Card({ title, aside, note, busy, children, className = '' }) {
  const id = useId();
  return (
    <section
      className={`qlc-block ${className}`}
      aria-labelledby={id}
      aria-busy={busy || undefined}
    >
      <div className="qlc-block__head">
        <h3 id={id} className="qlc-block__title">
          {title}
        </h3>
        {aside ? <div className="qlc-block__aside">{aside}</div> : null}
      </div>
      {note ? <p className="qlc-note">{note}</p> : null}
      {children}
    </section>
  );
}

function Status({ status }) {
  return (
    <span className={`qlc-status qlc-tone--${status.tone}`}>
      <i className={`bi ${status.icon}`} aria-hidden="true" />
      <span>{status.text}</span>
    </span>
  );
}

/* ── The tab ────────────────────────────────────────────────────────────── */

export function QuantCouncil({ council }) {
  const { fund, extras, risk, policy, members, viewerMemberId, sampleActive } = council;
  return (
    <div className="qlc">
      <Strip fund={fund} />
      <div className="qlc-grid">
        <div className="qlc-main">
          <RiskCard risk={risk} sampleActive={sampleActive} />
          <PitchCard extras={extras} members={members} viewerMemberId={viewerMemberId} />
          <IpsCard
            extras={extras}
            policy={policy}
            members={members}
            viewerMemberId={viewerMemberId}
            sampleActive={sampleActive}
          />
        </div>
        <div className="qlc-side">
          <SectorCard policy={policy} />
          <AssignmentsCard extras={extras} />
          <HandoffCard />
        </div>
      </div>
    </div>
  );
}

/** The sample label and switch, for the tab row (master admin and demo only). */
export function CouncilSampleSwitch({ council }) {
  if (!council?.sampleAvailable) return null;
  const on = council.sampleActive;
  return (
    <span className="qlc-sample">
      {on ? <span className="qlc-faint">Sample content · Sample council</span> : null}
      <button
        type="button"
        className="qlc-textbtn"
        aria-pressed={!on}
        onClick={() => council.setShowSample(!on)}
      >
        {on ? 'Show council data' : 'Show sample content'}
      </button>
    </span>
  );
}

/* ── Strip ──────────────────────────────────────────────────────────────── */

function Strip({ fund }) {
  if (fund.status === 'error')
    return (
      <div className="qlc-strip qlc-strip--state">
        <Failed onRetry={fund.retry}>Could not load the council fund.</Failed>
      </div>
    );
  const loading = fund.status === 'loading';
  const o = loading ? null : fundOverview(fund.raw);
  /* A council with no holdings has no fund value to show: N/A, never $0.00. */
  const t = o?.status === 'ready' ? o.totals : null;
  const cell = (label, value, detail, tone) => (
    <div className="qlc-kpi" key={label}>
      <span className="qlc-kpi__label">{label}</span>
      {loading ? (
        <Skeleton height={14} width={72} />
      ) : (
        <span className={`qlc-kpi__value qlc-num${tone ? ` qlc-tone--${tone}` : ''}`}>{value}</span>
      )}
      {!loading && detail ? <span className="qlc-kpi__detail">{detail}</span> : null}
    </div>
  );
  const tone = (v) => (v > 0 ? 'positive' : v < 0 ? 'negative' : null);
  return (
    <div
      className="qlc-strip"
      role="group"
      aria-label="Council fund"
      aria-busy={loading || undefined}
    >
      {cell(
        'Fund value',
        t ? fmtMoney(t.value) : NA,
        t?.unpriced ? `${t.unpriced} unpriced, carried at cost` : null,
      )}
      {cell(
        'Gain on cost',
        t ? fmtSignedPct(t.gainPct) : NA,
        'Not time weighted',
        t ? tone(t.gainPct) : null,
      )}
      {cell(
        'Council benchmark',
        o?.benchmark?.pct != null ? `${o.benchmark.label} ${fmtSignedPct(o.benchmark.pct)}` : NA,
        o?.benchmark?.note || null,
      )}
      {cell('Positions', t ? String(t.positions) : NA, null)}
      {cell('Sector teams', o ? String(o.teams) : NA, null)}
    </div>
  );
}

/* ── Fund risk ──────────────────────────────────────────────────────────── */

function RiskChart({ view }) {
  const paths = replayPaths(view.replay, CHART_W, CHART_H);
  if (!paths) return null;
  return (
    <figure className="qlc-chart">
      <div className="qlc-chart__y qlc-num" aria-hidden="true">
        {paths.yTicks.map((t, i) => (
          <span key={i}>{fmtSignedFrac(t, 0)}</span>
        ))}
      </div>
      <div className="qlc-chart__plot">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Today's weights replayed from ${view.from} to ${view.to}: fund ${fmtSignedFrac(view.fundReturn)}, ${view.benchmark} ${fmtSignedFrac(view.benchReturn)}.`}
        >
          <line x1="0" x2={CHART_W} y1={paths.zero} y2={paths.zero} className="qlc-chart__zero" />
          {paths.bench ? <path d={paths.bench} className="qlc-chart__bench" /> : null}
          <path d={paths.fund} className="qlc-chart__fund" />
        </svg>
        <div className="qlc-chart__x qlc-num" aria-hidden="true">
          {paths.xTicks.map((t, i) => (
            <span key={`${t}-${i}`}>{t}</span>
          ))}
        </div>
      </div>
      <figcaption className="qlc-legend">
        <span>
          <span className="qlc-swatch" aria-hidden="true" />
          Fund at today&rsquo;s weights{' '}
          <span className="qlc-num qlc-ink">{fmtSignedFrac(view.fundReturn)}</span>
        </span>
        {paths.bench ? (
          <span>
            <span className="qlc-swatch qlc-swatch--bench" aria-hidden="true" />
            {view.benchmark}{' '}
            <span className="qlc-num qlc-ink">{fmtSignedFrac(view.benchReturn)}</span>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

function RiskCard({ risk, sampleActive }) {
  const view = useMemo(
    () => (risk.status === 'ready' ? riskView(risk.data) : null),
    [risk.status, risk.data],
  );
  let body;
  if (risk.status === 'loading') body = <Loading label="Loading fund risk" rows={5} />;
  else if (risk.status === 'error' || !view)
    body = <Failed onRetry={risk.retry}>Could not load fund risk.</Failed>;
  else if (view.status === 'empty')
    body = (
      <Empty href={LINKS.trading} action="Open Trading Desk">
        No holdings to measure yet.
      </Empty>
    );
  else if (view.status === 'no_history')
    body = (
      <Failed onRetry={risk.retry}>
        No price history for the holdings yet, so fund risk is N/A.
      </Failed>
    );
  else {
    const rows = [
      ['Volatility (annualised)', fmtFrac(view.volatility, 1)],
      [`Beta to ${view.benchmark}`, fmtRatio(view.beta)],
      [
        '1-day 95% VaR',
        view.valueAtRisk95 == null
          ? NA
          : `${fmtFrac(view.valueAtRisk95, 2)} · ${fmtMoney(view.valueAtRisk95Dollars)}`,
      ],
      ['Expected shortfall (95%)', fmtFrac(view.expectedShortfall95, 2)],
      [
        'Largest weight',
        view.largest ? `${view.largest.ticker} ${fmtFrac(view.largest.weight, 1)}` : NA,
      ],
      ['Effective holdings', fmtRatio(view.effectiveHoldings, 1)],
    ];
    body = (
      <>
        <RiskChart view={view} />
        <dl className="qlc-kv">
          {rows.map(([k, v]) => (
            <div key={k} className="qlc-kv__row">
              <dt>{k}</dt>
              <dd className={`qlc-num${v === NA ? ' qlc-muted' : ''}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="qlc-note">
          Historical simulation: today&rsquo;s weights replayed over{' '}
          <span className="qlc-num">{view.observations}</span> sessions,{' '}
          <span className="qlc-num">{fmtShortDate(view.from)}</span> to{' '}
          <span className="qlc-num">{fmtShortDate(view.to)}</span>, from daily closes. Holdings
          only, cash not included. It is not the fund&rsquo;s own history.
          {view.skipped.length
            ? ` Left out for lack of price history: ${view.skipped.join(', ')}.`
            : ''}
          {view.beyondCap.length ? ` Beyond the 30 largest: ${view.beyondCap.join(', ')}.` : ''}
        </p>
      </>
    );
  }
  return (
    <Card
      title="Fund risk at today's weights"
      aside={sampleActive ? <span className="qlc-faint">Sample holdings, real closes</span> : null}
      busy={risk.status === 'loading'}
      className="qlc-block--risk"
    >
      {body}
    </Card>
  );
}

/* ── Sector concentration ───────────────────────────────────────────────── */

function SectorCard({ policy }) {
  const data = useMemo(
    () =>
      policy.status === 'ready' && policy.data
        ? sectorRows(policy.data.positions, policy.data.rules)
        : null,
    [policy.status, policy.data],
  );
  let body;
  if (policy.status === 'loading') body = <Loading label="Loading sector concentration" rows={4} />;
  else if (policy.status === 'error' || !data)
    body = <Failed onRetry={policy.retry}>Could not load sector concentration.</Failed>;
  else if (!data.rows.length)
    body = (
      <Empty href={LINKS.trading} action="Open Trading Desk">
        No holdings to read yet.
      </Empty>
    );
  else {
    const capLeft = data.cap != null ? (data.cap / data.scale) * 100 : null;
    body = (
      <>
        <ul className="qlc-bars" aria-label="Weight by sector">
          {data.rows.map((r) => (
            <li key={r.sector} className="qlc-bar">
              <span className="qlc-bar__name" title={r.sector}>
                {r.sector}
              </span>
              <span className="qlc-bar__track" aria-hidden="true">
                <span
                  className={`qlc-bar__fill${r.over ? ' qlc-bar__fill--over' : r.near ? ' qlc-bar__fill--near' : ''}${r.unclassified ? ' qlc-bar__fill--none' : ''}`}
                  style={{ width: `${Math.min(100, (r.pct / data.scale) * 100)}%` }}
                />
                {capLeft != null ? (
                  <span className="qlc-bar__cap" style={{ left: `${capLeft}%` }} />
                ) : null}
              </span>
              <span className="qlc-bar__value qlc-num">{fmtPctNum(r.pct)}</span>
              {r.over || r.near ? (
                <span
                  className={`qlc-bar__flag qlc-tone--${r.over ? 'negative' : 'warning'}`}
                  title={r.over ? 'Over the cap' : 'Within 10% of the cap'}
                >
                  <i
                    className={`bi ${r.over ? 'bi-x-circle' : 'bi-exclamation-triangle'}`}
                    aria-hidden="true"
                  />
                  <span>{r.over ? 'Over cap' : 'Near cap'}</span>
                </span>
              ) : (
                <span className="qlc-bar__flag" />
              )}
            </li>
          ))}
        </ul>
        <p className="qlc-note">
          {data.cap != null ? (
            <>
              Dashed line: the stored sector cap of{' '}
              <span className="qlc-num">{fmtPctNum(data.cap, 0)}</span> (
              {data.hard ? 'hard rule' : 'soft rule'}). Market value by the book&rsquo;s sector, as
              the policy engine reads it.
            </>
          ) : (
            <>
              No sector cap is stored.{' '}
              <Link href={LINKS.compliance} className="qlc-link">
                Open Compliance
              </Link>
            </>
          )}
        </p>
      </>
    );
  }
  return (
    <Card title="Sector concentration" busy={policy.status === 'loading'}>
      {body}
    </Card>
  );
}

/* ── Pitch evidence ─────────────────────────────────────────────────────── */

function PitchCard({ extras, members, viewerMemberId }) {
  const rows = useMemo(
    () =>
      extras.status === 'ready' && extras.data?.pitches
        ? pitchRows(extras.data, members, viewerMemberId)
        : null,
    [extras.status, extras.data, members, viewerMemberId],
  );
  let body;
  if (extras.status === 'loading') body = <Loading label="Loading the pitch checklist" rows={4} />;
  else if (extras.status === 'error' || !rows)
    body = <Failed onRetry={extras.retry}>Could not load the pitch checklist.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.pitches} action="Open Pitch Pipeline">
        No open pitches.
      </Empty>
    );
  else {
    const modelsKnown = Boolean(extras.data?.models);
    body = (
      <>
        <div className="qlc-table" role="table" aria-label="Open pitches and their required models">
          <div className="qlc-tr qlc-tr--head qlc-cols-pitch" role="row">
            <span role="columnheader">Ticker</span>
            <span role="columnheader">Owner</span>
            <span role="columnheader">Stage</span>
            <span role="columnheader" className="qlc-r">
              Uploaded
            </span>
            <span role="columnheader" className="qlc-r">
              Reviewed
            </span>
            <span role="columnheader" className="qlc-r">
              <span className="qlc-sr">Action</span>
            </span>
          </div>
          {rows.slice(0, PITCH_ROWS).map((r) => (
            <div key={r.id} className="qlc-tr qlc-cols-pitch" role="row">
              <span role="cell" className="qlc-ticker qlc-num">
                {r.ticker}
              </span>
              <span role="cell" className="qlc-ellipsis" title={r.owner}>
                {r.owner}
              </span>
              <span role="cell" className="qlc-ellipsis" title={r.stage}>
                {r.stage}
              </span>
              <span role="cell" className="qlc-r qlc-num">
                {modelsKnown && r.required != null ? `${r.uploaded} of ${r.required}` : NA}
              </span>
              <span
                role="cell"
                className="qlc-r"
                title={r.missing.length ? `Not reviewed: ${r.missing.join(', ')}` : undefined}
              >
                {modelsKnown && r.required != null ? (
                  <span className={`qlc-status qlc-tone--${r.allReviewed ? 'positive' : 'muted'}`}>
                    <i
                      className={`bi ${r.allReviewed ? 'bi-check2' : 'bi-circle'}`}
                      aria-hidden="true"
                    />
                    <span className="qlc-num">
                      {r.reviewed} of {r.required}
                    </span>
                  </span>
                ) : (
                  <span className="qlc-muted">{NA}</span>
                )}
              </span>
              <span role="cell" className="qlc-r">
                <Link href={r.href} className="qlc-link" aria-label={`Open the ${r.ticker} pitch`}>
                  Open pitch
                </Link>
              </span>
            </div>
          ))}
        </div>
        <p className="qlc-note">
          Each desk&rsquo;s required models, as the Pitch Pipeline counts them: a model counts once
          it is uploaded and reviewed.{' '}
          {rows.length > PITCH_ROWS ? (
            <Link href={LINKS.pitches} className="qlc-link">
              All <span className="qlc-num">{rows.length}</span> open pitches
            </Link>
          ) : null}
        </p>
      </>
    );
  }
  return (
    <Card title="Pitch evidence and model checklist" busy={extras.status === 'loading'}>
      {body}
    </Card>
  );
}

/* ── IPS pre-check ──────────────────────────────────────────────────────── */

function useIpsCheck(pitch, policy, sampleActive) {
  const [state, setState] = useState({ status: 'idle', result: null, key: null });
  const [nonce, setNonce] = useState(0);
  const inputs = useMemo(() => (pitch ? ipsInputs(pitch) : null), [pitch]);
  const key = pitch ? `${pitch.id}:${sampleActive ? 's' : 'l'}:${nonce}` : null;
  /* The latest inputs and rows, read when the key changes (the policy object
     is rebuilt on every council update; it must not re-run the check). */
  const latest = useRef({ inputs, policy });
  latest.current = { inputs, policy };
  const ready = policy.status === 'ready' && Boolean(policy.data);

  useEffect(() => {
    const { inputs: inp, policy: pol } = latest.current;
    if (!key || !inp || !ready) return undefined;
    if (sampleActive) {
      /* The same engine the check route runs, on the sample rows. Saves nothing. */
      setState({
        status: 'ready',
        key,
        result: evaluateProposal({
          rules: pol.data.rules,
          positions: pol.data.positions,
          ...inp,
        }),
      });
      return undefined;
    }
    let live = true;
    setState({ status: 'loading', result: null, key });
    fetch('/api/org/ips/check', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      /* Never `log`: a pre-check records nothing. */
      body: JSON.stringify({
        ticker: inp.ticker,
        sector: inp.sector || null,
        sizePct: inp.sizePct === '' ? null : inp.sizePct,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!live) return;
        setState(
          res.ok && data
            ? { status: 'ready', result: data, key }
            : { status: 'error', result: null, key },
        );
      })
      .catch(() => live && setState({ status: 'error', result: null, key }));
    return () => {
      live = false;
    };
  }, [key, ready, sampleActive]);

  return {
    inputs,
    status: state.key === key ? state.status : 'loading',
    result: state.key === key ? state.result : null,
    retry: () => setNonce((n) => n + 1),
  };
}

function IpsCard({ extras, policy, members, viewerMemberId, sampleActive }) {
  const pitches = useMemo(
    () =>
      extras.status === 'ready' && extras.data?.pitches
        ? openPitches(extras.data.pitches, viewerMemberId)
        : [],
    [extras.status, extras.data, viewerMemberId],
  );
  const [pickedId, setPickedId] = useState(null);
  /* Default: the viewer's own pitch, else the first that records a size. */
  const pitch =
    pitches.find((p) => p.id === pickedId) ||
    pitches.find((p) => viewerMemberId && p.analyst_member_id === viewerMemberId) ||
    pitches.find((p) => p.position_size_pct != null) ||
    pitches[0] ||
    null;
  const check = useIpsCheck(pitch, policy, sampleActive);
  const names = useMemo(
    () => new Map((members || []).map((m) => [m.id, m.display_name || null])),
    [members],
  );
  const selectId = useId();

  let body;
  if (extras.status === 'loading' || policy.status === 'loading')
    body = <Loading label="Loading the IPS pre-check" rows={5} />;
  else if (extras.status === 'error' || !extras.data?.pitches)
    body = <Failed onRetry={extras.retry}>Could not load the IPS pre-check.</Failed>;
  else if (policy.status === 'error')
    body = <Failed onRetry={policy.retry}>Could not load the IPS pre-check.</Failed>;
  else if (!pitch)
    body = (
      <Empty href={LINKS.pitches} action="Open Pitch Pipeline">
        No open pitch to check.
      </Empty>
    );
  else {
    const active = (policy.data?.rules || []).filter((r) => r.is_active !== false);
    const view =
      check.status === 'ready' ? ipsRows(policy.data.rules, check.inputs, check.result) : null;
    body = (
      <>
        <div className="qlc-ips-head">
          <label htmlFor={selectId} className="qlc-sr">
            Open pitch to check
          </label>
          <span className="qlc-picker">
            <select
              id={selectId}
              className="qlc-select"
              value={pitch.id}
              onChange={(e) => setPickedId(e.target.value)}
            >
              {pitches.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ticker}
                  {p.analyst_member_id === viewerMemberId
                    ? ' · yours'
                    : names.get(p.analyst_member_id)
                      ? ` · ${names.get(p.analyst_member_id)}`
                      : ''}
                </option>
              ))}
            </select>
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </span>
          <span className="qlc-muted">
            Proposed size{' '}
            <span className="qlc-num qlc-ink">
              {check.inputs?.sizePct === '' ? NA : fmtPctNum(check.inputs?.sizePct, 2)}
            </span>{' '}
            of fund · Sector <span className="qlc-ink">{check.inputs?.sector || NA}</span>
          </span>
        </div>
        {!active.length ? (
          <Empty href={LINKS.compliance} action="Open Compliance">
            No active policy rules are stored.
          </Empty>
        ) : check.status === 'error' ? (
          <Failed onRetry={check.retry}>Could not run the IPS pre-check.</Failed>
        ) : !view ? (
          <Loading label="Running the IPS pre-check" rows={5} />
        ) : (
          <>
            <p className="qlc-summary">{ipsSummary(view.counts)}</p>
            <div className="qlc-table" role="table" aria-label={`Policy rules for ${pitch.ticker}`}>
              <div className="qlc-tr qlc-tr--head qlc-cols-ips" role="row">
                <span role="columnheader">Rule</span>
                <span role="columnheader" className="qlc-r">
                  Limit
                </span>
                <span role="columnheader">Result</span>
              </div>
              {view.rows.map((r) => (
                <div key={r.id} className="qlc-tr qlc-cols-ips" role="row">
                  <span role="cell" className="qlc-ips-rule">
                    <span className="qlc-ink">{r.name}</span>
                    <span className="qlc-faint">{r.hard ? 'Hard' : 'Soft'}</span>
                  </span>
                  <span role="cell" className="qlc-r qlc-num qlc-ink">
                    {r.limit}
                  </span>
                  <span role="cell" className="qlc-ips-result">
                    <Status status={r.status} />
                    <span className="qlc-faint">{r.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="qlc-note">
          <i className="bi bi-info-circle" aria-hidden="true" /> The council&rsquo;s policy engine
          on what the pitch records (ticker, sector, proposed size). A reading only: it saves
          nothing and blocks nothing.{' '}
          <Link href={LINKS.pitch(pitch.id)} className="qlc-link">
            Open pitch
          </Link>
        </p>
      </>
    );
  }
  return (
    <Card title="IPS pre-check for an open pitch" busy={extras.status === 'loading'}>
      {body}
    </Card>
  );
}

/* ── Model assignments ──────────────────────────────────────────────────── */

function AssignmentsCard({ extras }) {
  const rows = useMemo(
    () =>
      extras.status === 'ready' && Array.isArray(extras.data?.assignments)
        ? assignmentRows(extras.data.assignments, extras.data?.now || Date.now())
        : null,
    [extras.status, extras.data],
  );
  let body;
  if (extras.status === 'loading') body = <Loading label="Loading model assignments" rows={4} />;
  else if (extras.status === 'error' || !rows)
    body = <Failed onRetry={extras.retry}>Could not load model assignments.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.assignments} action="Open assignments">
        No open model assignments.
      </Empty>
    );
  else
    body = (
      <>
        <div className="qlc-table" role="table" aria-label="Model assignments">
          <div className="qlc-tr qlc-tr--head qlc-cols-asg" role="row">
            <span role="columnheader">Assignment</span>
            <span role="columnheader">Owner</span>
            <span role="columnheader" className="qlc-r">
              Due
            </span>
            <span role="columnheader">Status</span>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="qlc-tr qlc-cols-asg" role="row">
              <span role="cell" className="qlc-ellipsis qlc-ink" title={r.title}>
                {r.title}
              </span>
              <span role="cell" className="qlc-ellipsis" title={r.owner}>
                {r.owner}
              </span>
              <span
                role="cell"
                className={`qlc-r qlc-num${r.overdue ? ' qlc-tone--negative' : ''}`}
                title={r.overdue ? 'Overdue' : undefined}
              >
                {r.overdue ? (
                  <i className="bi bi-exclamation-circle qlc-due-icon" aria-hidden="true" />
                ) : null}
                {r.due}
                {r.overdue ? <span className="qlc-sr"> (overdue)</span> : null}
              </span>
              <span role="cell">
                <span className={`qlc-status qlc-tone--${r.tone}`}>
                  <i className={`bi ${r.icon}`} aria-hidden="true" />
                  <span>{r.status}</span>
                </span>
              </span>
            </div>
          ))}
        </div>
        <Link href={LINKS.assignments} className="qlc-link qlc-more">
          Open assignments <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </>
    );
  return (
    <Card title="Model assignments" busy={extras.status === 'loading'}>
      {body}
    </Card>
  );
}

/* ── Research handoff ───────────────────────────────────────────────────── */

function HandoffCard() {
  return (
    <Card title="Council research handoff">
      <div className="qlc-state">
        <p>
          Sharing a strategy or a backtest with the council is not available yet. Quant Lab
          strategies and runs stay private to their author.
        </p>
        <Link href={LINKS.strategyLab} className="qlc-link">
          Open Strategy Lab
        </Link>
      </div>
    </Card>
  );
}

export default QuantCouncil;
