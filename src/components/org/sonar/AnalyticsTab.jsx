'use client';

/**
 * Analytics: the fund's research activity and quality over a window (30
 * days, 90 days, 12 months, all time), one line per member (executives and
 * portfolio managers see everyone; anyone else sees their own line, decided
 * by the server), the fund's coverage by sector and ticker with stale
 * research marked, and for executives this month's budget use with the
 * budget settings. Coaching signals for the desk, not grades.
 */
import { Fragment, useMemo, useState } from 'react';
import { Empty, Section, SectionError, TextToggle } from '@/components/org/command-center/parts';
import {
  NA,
  STALE_DAYS,
  WINDOWS,
  fmtDate,
  fmtNum,
  fmtPct,
  windowLabel,
} from '@/lib/org-sonar-research-model';
import { Kpi, TableSkeleton } from './parts';

const ROLE = { executive: 'Executive', portfolio_manager: 'Portfolio manager', analyst: 'Analyst' };

const COLUMNS = [
  { id: 'name', label: 'Member', sort: (m) => m.name, text: true },
  { id: 'deepRuns', label: 'Deep runs', sort: (m) => m.deepRuns },
  { id: 'reports', label: 'Reports', sort: (m) => m.reports },
  { id: 'approved', label: 'Approved', sort: (m) => m.approved },
  { id: 'approvalRate', label: 'Approval rate', sort: (m) => m.approvalRate ?? -1 },
  { id: 'claimSupport', label: 'Claims verified', sort: (m) => m.claimSupport ?? -1 },
  { id: 'heldRate', label: 'Held under challenge', sort: (m) => m.heldRate ?? -1 },
  { id: 'onPitches', label: 'On pitches', sort: (m) => m.onPitches },
  { id: 'tickers', label: 'Tickers', sort: (m) => m.tickers.length },
];

function MemberDetail({ m }) {
  const items = [
    ['Standard runs', m.standardRuns],
    ['Submitted', m.submitted],
    ['Days to approval', fmtNum(m.reviewDays, 1)],
    ['Citation coverage', fmtPct(m.citationCoverage)],
    ['Sources per report', fmtNum(m.sourcesPerReport, 1)],
    ['Challenges run', m.challengesRun],
    ['Comments given', m.commentsGiven],
    ['Comments received', m.commentsReceived],
    ['Received and resolved', fmtPct(m.commentsResolved)],
    ['Pitches advanced', m.pitchesAdvanced],
    [
      'Mandate screens',
      `${m.fundFit?.invest ?? 0} within, ${m.fundFit?.watch ?? 0} review, ${m.fundFit?.pass ?? 0} outside`,
    ],
  ];
  return (
    <dl className="osp-detail">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd className={`tcc-mono${v === NA ? ' tcc-na' : ''}`}>{v}</dd>
        </div>
      ))}
      <div className="osp-detail__wide">
        <dt>Tickers</dt>
        <dd className="tcc-mono">{m.tickers.join(', ') || 'None yet'}</dd>
      </div>
      <div className="osp-detail__wide">
        <dt>Sectors</dt>
        <dd>{m.sectors.join(', ') || 'None yet'}</dd>
      </div>
    </dl>
  );
}

export function AnalyticsTab({ data, windowDays, setWindowDays, onTicker, onStatus, onSettings }) {
  const a = data.analytics;
  const b = data.budget;
  const [sortBy, setSortBy] = useState('approved');
  const [open, setOpen] = useState(null);
  const loading = a.status === 'loading';
  const failed = !loading && a.status !== 'ready';
  const t = a.data?.totals || {};
  const seesEveryone = Boolean(a.data?.viewer?.seesEveryone);
  const members = useMemo(() => {
    const col = COLUMNS.find((c) => c.id === sortBy) || COLUMNS[3];
    return [...(a.data?.members || [])].sort((x, y) => {
      const p = col.sort(x);
      const q = col.sort(y);
      return col.text ? String(p).localeCompare(String(q)) : q - p;
    });
  }, [a.data, sortBy]);
  const coverage = a.data?.coverage || [];
  const canManage = Boolean(b.data?.viewer?.canManage);
  const val = (v) => (failed ? NA : v);
  const win = windowLabel(windowDays);

  return (
    <div className="osp-analytics">
      <div className="osp-windowrow">
        <div className="tcc-toggles" role="group" aria-label="Window">
          {WINDOWS.map((w) => (
            <TextToggle key={w.v} pressed={windowDays === w.v} onClick={() => setWindowDays(w.v)}>
              {w.l}
            </TextToggle>
          ))}
        </div>
        <span className="osp-hint">
          Coaching signals for the desk, from what Sonar and the review process record.
        </span>
      </div>

      <div className="tcc-kpis osp-totals" aria-busy={loading || undefined}>
        <div className="tcc-kpistrip" role="list" aria-label={`Totals, ${win}`}>
          <Kpi
            icon="bi-broadcast"
            label="Deep runs"
            loading={loading}
            tone={failed ? 'na' : undefined}
          >
            {val(t.deepRuns ?? NA)}
          </Kpi>
          <Kpi
            icon="bi-journal-text"
            label="Reports saved"
            loading={loading}
            tone={failed ? 'na' : undefined}
          >
            {val(t.reports ?? NA)}
          </Kpi>
          <Kpi
            icon="bi-check2-circle"
            label="Approved"
            loading={loading}
            tone={failed ? 'na' : undefined}
          >
            {val(t.approved ?? NA)}
          </Kpi>
          <Kpi
            icon="bi-clock"
            label="Under review"
            loading={loading}
            tone={failed ? 'na' : undefined}
          >
            {val(t.underReview ?? NA)}
          </Kpi>
          <Kpi
            icon="bi-shield-exclamation"
            label="Challenges"
            loading={loading}
            tone={failed ? 'na' : undefined}
          >
            {val(t.challenges ?? NA)}
          </Kpi>
          <Kpi
            icon="bi-patch-check"
            label="Claims verified"
            loading={loading}
            tone={failed || !Number.isFinite(t.claimSupport) ? 'na' : undefined}
            title="Average share of a report's claims that passed Sonar's checks"
          >
            {val(fmtPct(t.claimSupport))}
          </Kpi>
          <Kpi
            icon="bi-tags"
            label="Tickers researched"
            loading={loading}
            tone={failed ? 'na' : undefined}
          >
            {val(t.tickers ?? NA)}
          </Kpi>
        </div>
      </div>
      {!loading && !failed && t.underReview ? (
        <p className="osp-hint">
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            onClick={() => onStatus('under_review')}
          >
            Show the reports under review
          </button>
        </p>
      ) : null}

      <Section
        id="osp-members"
        title={seesEveryone || loading ? 'Members' : 'Your research'}
        className="osp-gap"
        aside={!loading && !failed ? <span className="osp-aside">{win}</span> : null}
      >
        {loading ? (
          <TableSkeleton rows={6} />
        ) : failed ? (
          <SectionError message="Could not load analytics." onRetry={data.retry.analytics} />
        ) : !members.length ? (
          <Empty>No Sonar research in this window yet.</Empty>
        ) : (
          <div className="osp-scroll">
            <table className="osp-table osp-table--wide">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.id}
                      scope="col"
                      className={c.text ? undefined : 'osp-num'}
                      aria-sort={sortBy === c.id ? (c.text ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className="osp-th" onClick={() => setSortBy(c.id)}>
                        {c.label}
                        {sortBy === c.id ? (
                          <i className="bi bi-caret-down-fill" aria-hidden="true" />
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <Fragment key={m.userId}>
                    <tr className="osp-static">
                      <td>
                        <button
                          type="button"
                          className="osp-open osp-open--row"
                          aria-expanded={open === m.userId}
                          onClick={() => setOpen(open === m.userId ? null : m.userId)}
                        >
                          <i
                            className={`bi ${open === m.userId ? 'bi-chevron-down' : 'bi-chevron-right'}`}
                            aria-hidden="true"
                          />
                          <span className="osp-two">
                            <span>{m.name}</span>
                            <span className="osp-sub">{ROLE[m.role] || NA}</span>
                          </span>
                        </button>
                      </td>
                      <td className="osp-num tcc-mono">{m.deepRuns}</td>
                      <td className="osp-num tcc-mono">{m.reports}</td>
                      <td className="osp-num tcc-mono">{m.approved}</td>
                      <td
                        className={`osp-num tcc-mono${Number.isFinite(m.approvalRate) ? '' : ' tcc-na'}`}
                      >
                        {fmtPct(m.approvalRate)}
                      </td>
                      <td
                        className={`osp-num tcc-mono${Number.isFinite(m.claimSupport) ? '' : ' tcc-na'}`}
                      >
                        {fmtPct(m.claimSupport)}
                      </td>
                      <td className={`osp-num tcc-mono${m.challengesFaced ? '' : ' tcc-na'}`}>
                        {m.challengesFaced ? `${fmtPct(m.heldRate)} of ${m.challengesFaced}` : NA}
                      </td>
                      <td className="osp-num tcc-mono">{m.onPitches}</td>
                      <td className="osp-num tcc-mono">{m.tickers.length}</td>
                    </tr>
                    {open === m.userId ? (
                      <tr className="osp-static osp-detailrow">
                        <td colSpan={COLUMNS.length}>
                          <MemberDetail m={m} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        id="osp-coverage"
        title="The fund's coverage"
        className="osp-gap"
        aside={<span className="osp-aside">Approved research, all time</span>}
      >
        {loading ? (
          <TableSkeleton rows={5} />
        ) : failed ? (
          <SectionError message="Could not load coverage." onRetry={data.retry.analytics} />
        ) : !coverage.length ? (
          <Empty>No approved research yet.</Empty>
        ) : (
          <div className="osp-scroll">
            <table className="osp-table">
              <thead>
                <tr>
                  <th scope="col">Sector</th>
                  <th scope="col">Ticker</th>
                  <th scope="col" className="osp-num">
                    Approved reports
                  </th>
                  <th scope="col" className="osp-num">
                    Authors
                  </th>
                  <th scope="col" className="osp-num">
                    Last approved
                  </th>
                  <th scope="col">Freshness</th>
                </tr>
              </thead>
              <tbody>
                {coverage.map((c) => {
                  const stale = Number.isFinite(c.staleDays) && c.staleDays > STALE_DAYS;
                  return (
                    <tr
                      key={`${c.sector}|${c.ticker}`}
                      className={c.ticker ? '' : 'osp-static'}
                      onClick={c.ticker ? () => onTicker(c.ticker) : undefined}
                    >
                      <td>{c.sector}</td>
                      <td>
                        {c.ticker ? (
                          <button
                            type="button"
                            className="osp-open"
                            title={`Show reports on ${c.ticker}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTicker(c.ticker);
                            }}
                          >
                            <span className="tcc-ticker tcc-mono">{c.ticker}</span>
                          </button>
                        ) : (
                          <span className="tcc-na">{NA}</span>
                        )}
                      </td>
                      <td className="osp-num tcc-mono">{c.approved}</td>
                      <td className="osp-num tcc-mono">{c.authors}</td>
                      <td className="osp-num tcc-mono">{fmtDate(c.lastApproved)}</td>
                      <td>
                        {stale ? (
                          <span className="osp-word tcc-warn">
                            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                            Stale, {c.staleDays} days
                          </span>
                        ) : (
                          <span className="osp-word tcc-na">Current</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {canManage ? (
        <Section
          id="osp-budgetuse"
          title="Budget use this month"
          className="osp-gap"
          aside={
            <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onSettings}>
              Budget settings
            </button>
          }
        >
          {b.status === 'loading' ? (
            <TableSkeleton rows={5} />
          ) : b.status !== 'ready' ? (
            <SectionError message="Could not load the fund budget." onRetry={data.retry.budget} />
          ) : (
            <div className="osp-scroll">
              <table className="osp-table">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col" className="osp-num">
                      Deep runs
                    </th>
                    <th scope="col" className="osp-num">
                      Share
                    </th>
                    <th scope="col" className="osp-num">
                      Allocation
                    </th>
                    <th scope="col" className="osp-num">
                      Left
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(b.data.members || []).map((m) => (
                    <tr key={m.userId} className="osp-static">
                      <td>
                        <span className="osp-two">
                          <span>{m.name}</span>
                          <span className="osp-sub">{ROLE[m.role] || NA}</span>
                        </span>
                      </td>
                      <td className="osp-num tcc-mono">{m.deepRuns}</td>
                      <td className="osp-num tcc-mono">{fmtPct(m.share)}</td>
                      <td className={`osp-num${m.allocation == null ? ' tcc-na' : ' tcc-mono'}`}>
                        {m.allocation == null ? 'Pool' : m.allocation}
                      </td>
                      <td className={`osp-num tcc-mono${m.left == null ? ' tcc-na' : ''}`}>
                        {m.left == null ? NA : m.left}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="osp-hint">
            The fund has {b.data?.remaining ?? NA} of {b.data?.pool ?? NA} deep runs left this
            month.
          </p>
        </Section>
      ) : null}
    </div>
  );
}
