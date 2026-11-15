'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { buildTeamCalendar } from '@/lib/org-team-calendar';
import {
  NA,
  benchmarkInfo,
  buildDigestRows,
  dueThisWeek,
  fmtDate,
  fmtMoney,
  fmtMoneyCompact,
  fmtSignedPct,
  overseeText,
  toneOf,
} from '@/lib/org-command-center';
import { stripDemoLabel } from '@/lib/org-display';
import { ArrowLink, Empty, Section, SectionError, Skel, TextToggle } from './parts';

/* ── KPI strips ─────────────────────────────────────────────────────────── */

function Kpi({ icon, label, loading, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem">
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`} title={title}>
        {loading ? <Skel w={64} h={16} /> : children}
      </span>
    </div>
  );
}

/**
 * Two compact strips on one grid, so the cells line up: the fund, then the
 * council. A cell whose request failed
 * reads N/A (the section that owns the data shows the error and Retry).
 */
export function KpiStrips({ summary, tasks, meetings, assignments, showBreaches }) {
  const sLoading = summary.status === 'loading';
  const perf = summary.data?.performance || null;
  const bench = benchmarkInfo(perf);
  const datesLoading =
    tasks.status === 'loading' || meetings.status === 'loading' || assignments.status === 'loading';
  const datesKnown =
    tasks.status === 'ready' && meetings.status === 'ready' && assignments.status === 'ready';
  const due = datesKnown
    ? dueThisWeek({
        meetings: meetings.data?.meetings,
        tasks: tasks.data?.tasks,
        assignments: assignments.data?.assignments,
      })
    : null;
  const openTasks =
    tasks.status === 'ready' ? tasks.data?.openCount : summary.data?.counts?.openTasks;
  const breaches = summary.data?.statStrip?.openViolations;
  const count = (v) => (v == null ? NA : String(v));

  return (
    <div className="tcc-kpis" aria-busy={sLoading || undefined}>
      <div className="tcc-kpistrip" role="list" aria-label="Fund and council figures">
        <Kpi
          icon="bi-wallet2"
          label="Fund value"
          loading={sLoading}
          title={sLoading ? undefined : fmtMoney(perf?.total_value)}
        >
          {fmtMoneyCompact(perf?.total_value)}
        </Kpi>
        <Kpi
          icon="bi-graph-up-arrow"
          label="Return"
          loading={sLoading}
          tone={toneOf(perf?.return_pct)}
        >
          {fmtSignedPct(perf?.return_pct)}
        </Kpi>
        <Kpi
          icon="bi-plus-slash-minus"
          label="Alpha"
          loading={sLoading}
          tone={toneOf(perf?.alpha_pct)}
        >
          {fmtSignedPct(perf?.alpha_pct)}
        </Kpi>
        <Kpi
          icon="bi-bar-chart-line"
          label={bench.estimated ? 'Benchmark (est.)' : 'Benchmark'}
          loading={sLoading}
          title={sLoading ? undefined : bench.sourceText}
        >
          {bench.estimated ? null : <span className="tcc-kpi__sym">{bench.label}</span>}
          {perf?.benchmark_return_pct != null && (
            <span className={`tcc-${toneOf(perf.benchmark_return_pct)}`}>
              {fmtSignedPct(perf.benchmark_return_pct)}
            </span>
          )}
          {bench.estimated && perf?.benchmark_return_pct == null ? NA : null}
        </Kpi>
        <Kpi icon="bi-list-check" label="Open tasks" loading={tasks.status === 'loading'}>
          {count(openTasks)}
        </Kpi>
        <Kpi
          icon="bi-calendar-week"
          label="Due this week"
          loading={datesLoading}
          title="Meetings, open tasks and open assignments dated in the next 7 days"
        >
          {count(due)}
        </Kpi>
        {showBreaches && (
          <Kpi
            icon="bi-shield-exclamation"
            label="Open breaches"
            loading={sLoading}
            tone={Number(breaches) > 0 ? 'neg' : undefined}
          >
            {count(breaches)}
          </Kpi>
        )}
        <Kpi icon="bi-people" label="Team members" loading={sLoading}>
          {count(summary.data?.counts?.members)}
        </Kpi>
      </div>
    </div>
  );
}

/* ── Upcoming dates ─────────────────────────────────────────────────────── */

const KIND_LABEL = { meeting: 'Meeting', assignment: 'Assignment', task: 'Task' };
const DATES_VISIBLE = 6;

export function UpcomingDates({ summary, tasks, meetings, assignments, onRetry }) {
  const [on, setOn] = useState({ meeting: true, assignment: true });
  const [showAll, setShowAll] = useState(false);
  const sources = [tasks, meetings, assignments];
  const loading = sources.some((s) => s.status === 'loading');
  const failedAll = sources.every((s) => s.status === 'error');
  const failedSome = !failedAll && sources.some((s) => s.status === 'error');

  const items = useMemo(
    () =>
      buildTeamCalendar({
        meetings: meetings.data?.meetings,
        tasks: tasks.data?.tasks,
        assignments: assignments.data?.assignments,
        teams: summary.data?.sectors,
      }),
    [meetings.data, tasks.data, assignments.data, summary.data],
  );
  const rows = items.filter((it) => it.kind === 'task' || on[it.kind]);
  const shown = showAll ? rows : rows.slice(0, DATES_VISIBLE);
  const flip = (k) => setOn((s) => ({ ...s, [k]: !s[k] }));

  return (
    <Section
      id="tcc-dates"
      title="Upcoming dates"
      aside={
        <div className="tcc-toggles" role="group" aria-label="Show in upcoming dates">
          <TextToggle pressed={on.meeting} onClick={() => flip('meeting')}>
            Meetings
          </TextToggle>
          <TextToggle pressed={on.assignment} onClick={() => flip('assignment')}>
            Assignments
          </TextToggle>
        </div>
      }
    >
      {failedAll ? (
        <SectionError message="Could not load upcoming dates." onRetry={onRetry} />
      ) : loading ? (
        <ul className="tcc-rows" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="tcc-dates__row">
              <Skel w={88} h={11} />
              <Skel w={64} h={11} />
              <Skel w={110} h={11} />
              <Skel w="80%" h={11} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          {failedSome && (
            <SectionError message="Some dates could not be loaded." onRetry={onRetry} />
          )}
          {rows.length === 0 ? (
            <Empty href="/org-team-hub/meetings" action="Open meetings">
              {items.length === 0
                ? 'No meetings, tasks or assignments are dated in the next 60 days.'
                : 'No tasks are dated in the next 60 days. Meetings and assignments are switched off.'}
            </Empty>
          ) : (
            <ul className="tcc-rows">
              {shown.map((it) => {
                const title = stripDemoLabel(it.title);
                return (
                  <li key={it.id} className="tcc-dates__row">
                    <span className="tcc-mono tcc-dates__date">{fmtDate(it.date)}</span>
                    <span className="tcc-dates__kind">{KIND_LABEL[it.kind]}</span>
                    <span className="tcc-dates__team" title={it.team}>
                      {stripDemoLabel(it.team)}
                    </span>
                    {it.kind === 'task' ? (
                      <span className="tcc-dates__title" title={title}>
                        {title}
                      </span>
                    ) : (
                      <Link href={it.href} className="tcc-dates__title tcc-rowlink" title={title}>
                        {title}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {rows.length > DATES_VISIBLE && (
            <button
              type="button"
              className="tcc-textbtn tcc-more"
              aria-expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'Show fewer' : `Show all ${rows.length}`}
            </button>
          )}
        </>
      )}
    </Section>
  );
}

/* ── Seven-day digest ───────────────────────────────────────────────────── */

export function SevenDayDigest({ digest, onRetry }) {
  const loading = digest.status === 'loading';
  const model = buildDigestRows(digest.data);
  return (
    <Section
      id="tcc-digest"
      title="Seven-day digest"
      aside={<span className="tcc-meta">Last 7 days</span>}
    >
      {digest.status === 'error' ? (
        <SectionError message="Could not load the digest." onRetry={onRetry} />
      ) : !loading && model.empty && !model.topPitch ? (
        <Empty href="/org-team-hub/pitches" action="Open pitch pipeline">
          No pitches, votes, positions, notes or awards in the last 7 days.
        </Empty>
      ) : (
        <dl className="tcc-pairs" aria-busy={loading || undefined}>
          {model.rows.map((r) => (
            <div key={r.key} className="tcc-pair">
              <dt>{r.label}</dt>
              <dd className="tcc-mono">{loading ? <Skel w={24} h={12} /> : r.value}</dd>
            </div>
          ))}
          <div className="tcc-pair">
            <dt>Largest pitch alpha</dt>
            <dd className="tcc-mono">
              {loading ? (
                <Skel w={96} h={12} />
              ) : model.topPitch ? (
                <>
                  <span className="tcc-ticker">{model.topPitch.ticker}</span>{' '}
                  <span className={`tcc-${toneOf(model.topPitch.alphaPct)}`}>
                    {fmtSignedPct(model.topPitch.alphaPct)}
                  </span>
                </>
              ) : (
                <span className="tcc-na">{NA}</span>
              )}
            </dd>
          </div>
        </dl>
      )}
    </Section>
  );
}

/* ── Sector teams ranked by return ──────────────────────────────────────── */

export function SectorTeams({ summary, onRetry }) {
  const loading = summary.status === 'loading';
  const rows = (summary.data?.sectors || []).filter((s) => Number(s.value) > 0);
  const best = Math.max(0.0001, ...rows.map((r) => Math.abs(r.roiPct ?? 0)));

  return (
    <Section
      id="tcc-sectors"
      title="Sector teams ranked by return"
      aside={<ArrowLink href="/org-team-hub/fund-analytics">Open fund analytics</ArrowLink>}
    >
      {summary.status === 'error' ? (
        <SectionError message="Could not load sector teams." onRetry={onRetry} />
      ) : !loading && rows.length === 0 ? (
        <Empty href="/org-trading" action="Open trading desk">
          No sector team holds positions yet.
        </Empty>
      ) : (
        <div className="tcc-table" role="table" aria-label="Sector teams ranked by return">
          <div className="tcc-table__head" role="row">
            <span role="columnheader" aria-label="Rank">
              #
            </span>
            <span role="columnheader">Sector team</span>
            <span role="columnheader">Return on cost</span>
            <span role="columnheader" className="tcc-table__num">
              Value
            </span>
            <span role="columnheader" className="tcc-table__tickers">
              Top tickers
            </span>
          </div>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="tcc-table__row" aria-hidden="true">
                  <Skel w={10} h={11} />
                  <Skel w={90} h={12} />
                  <Skel w="70%" h={11} />
                  <Skel w={60} h={11} />
                  <Skel w={110} h={11} className="tcc-table__tickers" />
                </div>
              ))
            : rows.map((s, i) => {
                const roi = s.roiPct;
                const width = roi == null ? 0 : Math.max(3, (Math.abs(roi) / best) * 100);
                return (
                  <div key={s.teamId || s.name} className="tcc-table__row" role="row">
                    <span role="cell" className="tcc-mono tcc-table__rank">
                      {i + 1}
                    </span>
                    <span role="cell" className="tcc-table__name" title={stripDemoLabel(s.name)}>
                      {stripDemoLabel(s.name)}
                    </span>
                    <span role="cell" className="tcc-table__roi">
                      <span className={`tcc-mono tcc-${toneOf(roi)}`}>{fmtSignedPct(roi)}</span>
                      <span className="tcc-bar" aria-hidden="true">
                        <span
                          className={`tcc-bar__fill${roi != null && roi < 0 ? ' is-neg' : ''}`}
                          style={{ width: `${width}%` }}
                        />
                      </span>
                    </span>
                    <span role="cell" className="tcc-mono tcc-table__num" title={fmtMoney(s.value)}>
                      {fmtMoneyCompact(s.value)}
                    </span>
                    <span role="cell" className="tcc-mono tcc-table__tickers">
                      {(s.tickers || []).slice(0, 3).join(' ') || NA}
                    </span>
                  </div>
                );
              })}
        </div>
      )}
    </Section>
  );
}

/* ── Setup checklist ────────────────────────────────────────────────────── */

export function SetupChecklist({ setup, canAct, onRetry }) {
  const loading = setup.status === 'loading';
  const data = setup.data;
  return (
    <Section
      id="tcc-setup"
      title="Setup checklist"
      aside={
        data ? (
          <span className="tcc-meta">
            <span className="tcc-mono">{data.done_count}</span> of{' '}
            <span className="tcc-mono">{data.steps.length}</span> complete
          </span>
        ) : null
      }
    >
      {setup.status === 'error' ? (
        <SectionError message="Could not load setup progress." onRetry={onRetry} />
      ) : loading ? (
        <ul className="tcc-rows" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="tcc-setup__row">
              <Skel w={16} h={16} />
              <Skel w="60%" h={12} />
              <Skel w={44} h={11} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="tcc-rows">
          {data.steps.map((s) => {
            const actionable = !s.done && (!s.manager_only || canAct);
            return (
              <li key={s.key} className={`tcc-setup__row${s.done ? ' is-done' : ''}`}>
                <i
                  className={`bi ${s.done ? 'bi-check-circle-fill' : 'bi-circle'} tcc-setup__icon`}
                  aria-hidden="true"
                />
                <span className="tcc-setup__label">
                  {s.label} <span className="tcc-mono tcc-setup__count">{s.count}</span>
                </span>
                {s.done ? (
                  <span className="tcc-meta">Done</span>
                ) : actionable ? (
                  <ArrowLink href={s.href}>Set up</ArrowLink>
                ) : (
                  <span
                    className="tcc-meta"
                    title="A portfolio manager or executive completes this step"
                  >
                    To do
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/* ── Fund data health ───────────────────────────────────────────────────── */

const HEALTH_ICON = {
  ok: 'bi-check-circle-fill tcc-pos',
  warn: 'bi-exclamation-triangle-fill tcc-warn',
  bad: 'bi-x-circle-fill tcc-neg',
  na: 'bi-dash-circle tcc-na',
};
const HEALTH_STATUS = {
  ok: { label: 'Healthy', level: 'ok' },
  attention: { label: 'Needs attention', level: 'warn' },
  stale: { label: 'Stale', level: 'bad' },
};

function relAge(hours) {
  if (hours == null) return null;
  if (hours < 1) return 'Updated in the last hour';
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
}

export function FundDataHealth({ health, onRetry }) {
  const loading = health.status === 'loading';
  const d = health.data;
  let rows = [];
  if (d) {
    const hours = d.pricing?.stale_hours;
    const days = d.snapshot?.days_since;
    const unpriced = d.positions?.unpriced ?? 0;
    const missS = d.positions?.missing_sector ?? 0;
    const missT = d.positions?.missing_team ?? 0;
    const est = d.benchmark?.source === 'pitch_proxy';
    rows = [
      {
        key: 'price',
        label: 'Price freshness',
        level: hours == null ? 'na' : hours >= 72 ? 'bad' : 'ok',
        value: relAge(hours) || NA,
        title: d.pricing?.last_priced_at ? fmtDate(d.pricing.last_priced_at) : undefined,
      },
      {
        key: 'snap',
        label: 'Last snapshot',
        level: days == null ? 'na' : days >= 3 ? 'bad' : 'ok',
        value: d.snapshot?.last_date ? fmtDate(d.snapshot.last_date) : NA,
      },
      {
        key: 'unpriced',
        label: 'Unpriced positions',
        level: unpriced > 0 ? 'warn' : 'ok',
        value: `${unpriced} of ${d.positions?.total ?? 0}`,
        href: unpriced > 0 ? '/org-trading' : null,
      },
      {
        key: 'missing',
        label: 'Missing sector / team',
        level: missS + missT > 0 ? 'warn' : 'ok',
        value: `${missS} / ${missT}`,
      },
      {
        key: 'bench',
        label: 'Benchmark source',
        level: !d.benchmark?.symbol ? 'na' : est ? 'warn' : 'ok',
        value: d.benchmark?.symbol ? `${d.benchmark.symbol}${est ? ' (est.)' : ''}` : NA,
        title: est ? 'An estimate from past pitch results, not index prices' : undefined,
      },
    ];
  }
  const overall = d ? HEALTH_STATUS[d.status] || { label: d.status, level: 'na' } : null;

  return (
    <Section id="tcc-health" title="Fund data health">
      {health.status === 'error' ? (
        <SectionError message="Could not load fund data health." onRetry={onRetry} />
      ) : loading ? (
        <ul className="tcc-rows" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="tcc-health__row">
              <Skel w={16} h={16} />
              <Skel w="45%" h={12} />
              <Skel w={90} h={11} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="tcc-rows">
          {rows.map((r) => (
            <li key={r.key} className="tcc-health__row">
              <i className={`bi ${HEALTH_ICON[r.level]}`} aria-hidden="true" />
              <span className="tcc-health__label">{r.label}</span>
              <span
                className={`tcc-mono tcc-health__value${r.value === NA ? ' tcc-na' : ''}`}
                title={r.title}
              >
                {r.href ? (
                  <Link href={r.href} className="tcc-link">
                    {r.value}
                  </Link>
                ) : (
                  r.value
                )}
              </span>
            </li>
          ))}
          <li className="tcc-health__row tcc-health__row--overall">
            <i className={`bi ${HEALTH_ICON[overall.level]}`} aria-hidden="true" />
            <span className="tcc-health__label">Overall status</span>
            <span
              className={`tcc-health__overall tcc-${overall.level === 'ok' ? 'pos' : overall.level === 'warn' ? 'warn' : overall.level === 'bad' ? 'neg' : 'na'}`}
            >
              {overall.label}
            </span>
          </li>
        </ul>
      )}
    </Section>
  );
}

/* ── Council snapshot ───────────────────────────────────────────────────── */

export function CouncilSnapshot({ summary, role, onRetry }) {
  const loading = summary.status === 'loading';
  const d = summary.data;
  const v = (x) => (loading ? <Skel w={20} h={12} /> : x == null ? NA : String(x));
  return (
    <Section id="tcc-council" title="Council snapshot">
      {summary.status === 'error' ? (
        <SectionError message="Could not load the council snapshot." onRetry={onRetry} />
      ) : (
        <div className="tcc-council" aria-busy={loading || undefined}>
          <dl className="tcc-pairs">
            <div className="tcc-pair">
              <dt>
                <i className="bi bi-people" aria-hidden="true" /> Members
              </dt>
              <dd className="tcc-mono">{v(d?.counts?.members)}</dd>
            </div>
            <div className="tcc-pair">
              <dt>
                <i className="bi bi-stack" aria-hidden="true" /> Teams
              </dt>
              <dd className="tcc-mono">{v(d?.counts?.teams)}</dd>
            </div>
            <div className="tcc-pair">
              <dt>
                <i className="bi bi-person" aria-hidden="true" /> Portfolio managers
              </dt>
              <dd className="tcc-mono">{v(d?.organization?.pmCount)}</dd>
            </div>
            <div className="tcc-pair">
              <dt>
                <i className="bi bi-people" aria-hidden="true" /> Analysts
              </dt>
              <dd className="tcc-mono">{v(d?.organization?.analystCount)}</dd>
            </div>
          </dl>
          <span className="tcc-vrule" aria-hidden="true" />
          <dl className="tcc-council__me">
            <div>
              <dt>
                <i className="bi bi-diagram-3" aria-hidden="true" />{' '}
                {role === 'analyst' ? 'My team' : 'I oversee'}
              </dt>
              <dd>
                {loading ? (
                  <Skel w={120} h={13} />
                ) : (
                  <Link href="/org-team-hub/org-chart" className="tcc-rowlink">
                    {overseeText(d?.organization, role)}
                  </Link>
                )}
              </dd>
            </div>
            <div>
              <dt>
                <i className="bi bi-clipboard-check" aria-hidden="true" /> My open assignments
              </dt>
              <dd className="tcc-mono">
                {loading ? (
                  <Skel w={24} h={13} />
                ) : (
                  <Link href="/org-team-hub/assignments" className="tcc-rowlink">
                    {d?.statStrip?.myAssignments ?? NA}
                  </Link>
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Section>
  );
}
