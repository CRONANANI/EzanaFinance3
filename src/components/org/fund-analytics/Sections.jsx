'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { NA, fmtDate, fmtSignedPct, toneOf } from '@/lib/org-command-center';
import { fmtSignedMoney } from '@/lib/org-trading-desk';
import {
  attentionGroups,
  fmtPct,
  funnelRows,
  nextSort,
  pitchState,
  sortRows,
} from '@/lib/org-fund-analytics-model';
import {
  ArrowLink,
  Empty,
  Section,
  SectionError,
  Skel,
} from '@/components/org/command-center/parts';

const ORG_CHART = '/org-team-hub/org-chart';

/** A small grey label saying what a section covers. */
function Scope({ children }) {
  return <span className="ofa-scope">{children}</span>;
}

function SkelRows({ rows = 4 }) {
  return (
    <div className="ofa-skelrows" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} h={14} />
      ))}
    </div>
  );
}

const na = (text) => (text === NA ? <span className="tcc-na">{NA}</span> : text);
const toneClass = (v) => {
  const t = toneOf(v);
  return t === 'na' ? 'tcc-na' : `tcc-${t}`;
};

/** A sortable column header: a text button with an arrow for the direction. */
function SortTh({ label, col, sort, onSort, num = false, title, firstDir = 'desc' }) {
  const on = sort.key === col;
  const icon = !on ? 'bi-arrow-down-up' : sort.dir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  return (
    <th
      scope="col"
      className={num ? 'ofa-num' : undefined}
      aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`ofa-sort${on ? ' is-on' : ''}`}
        title={title}
        onClick={() => onSort(nextSort(sort, col, firstDir))}
      >
        <span>{label}</span>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </button>
    </th>
  );
}

/* ── Current holdings by sector ─────────────────────────────────────────── */

export function SectorTable({ fund, onRetry }) {
  const loading = fund.status === 'loading';
  const rows = fund.data?.sectorVsTarget || [];
  const conc = fund.data?.concentration || null;
  const hasCap = conc?.source === 'ips';
  const over = rows.filter((r) => r.over_cap);
  const scale = Math.max(1, ...rows.map((r) => r.weight_pct), hasCap ? conc.limit_pct : 0);

  return (
    <Section
      id="ofa-sectors"
      title="Current holdings by sector"
      className="ofa-sectors"
      aside={<Scope>Current holdings</Scope>}
    >
      {fund.status === 'error' ? (
        <SectionError message="Could not load sector weights." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={5} />
      ) : rows.length === 0 ? (
        <Empty href="/org-trading" action="Open trading desk">
          No positions to weight yet.
        </Empty>
      ) : (
        <>
          {hasCap ? (
            over.length > 0 ? (
              <p className="ofa-capline ofa-capline--warn" role="status">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span>
                  {over.length === 1
                    ? `One sector is above the ${fmtPct(conc.limit_pct)} sector cap: ${over[0].sector}.`
                    : `${over.length} sectors are above the ${fmtPct(conc.limit_pct)} sector cap: ${over.map((r) => r.sector).join(', ')}.`}
                </span>
              </p>
            ) : (
              <p className="ofa-capline">
                <i className="bi bi-check2-circle" aria-hidden="true" />
                <span>All sectors are within the {fmtPct(conc.limit_pct)} sector cap.</span>
              </p>
            )
          ) : (
            <p className="ofa-capline">
              <i className="bi bi-info-circle" aria-hidden="true" />
              <span>The council has no sector cap rule, so no sector is checked against one.</span>
            </p>
          )}
          <div className="ofa-scroll">
            <table className="ofa-table ofa-table--sectors">
              <thead>
                <tr>
                  <th scope="col">Sector</th>
                  <th scope="col" className="ofa-num">
                    Weight
                  </th>
                  <th scope="col" className="ofa-barcol">
                    <span className="tcc-sr">Weight against the cap</span>
                  </th>
                  <th
                    scope="col"
                    className="ofa-num"
                    title="The sector's gain or loss as a percent of fund value"
                  >
                    Contribution
                  </th>
                  <th
                    scope="col"
                    title="Portfolio manager of the team that mostly holds the sector"
                  >
                    Manager
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.sector}>
                    <td role="rowheader">{r.sector}</td>
                    <td className={`ofa-num tcc-mono${r.over_cap ? ' ofa-over' : ''}`}>
                      {r.over_cap && (
                        <>
                          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                          <span className="tcc-sr">Above the cap: </span>
                        </>
                      )}
                      {fmtPct(r.weight_pct)}
                    </td>
                    <td className="ofa-barcol">
                      <span className="ofa-wbar" aria-hidden="true">
                        <span
                          className={`ofa-wbar__fill${r.over_cap ? ' is-over' : ''}`}
                          style={{ width: `${(r.weight_pct / scale) * 100}%` }}
                        />
                        {hasCap && (
                          <span
                            className="ofa-wbar__cap"
                            style={{ left: `${(conc.limit_pct / scale) * 100}%` }}
                          />
                        )}
                      </span>
                    </td>
                    <td className={`ofa-num tcc-mono ${toneClass(r.contribution_pct)}`}>
                      {fmtSignedPct(r.contribution_pct)}
                    </td>
                    <td className={r.pm_name ? undefined : 'tcc-na'}>{r.pm_name || NA}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ofa-foot">
            {hasCap && conc.sector
              ? `Largest sector: ${conc.sector} at ${fmtPct(conc.weight_pct)}, against a ${fmtPct(conc.limit_pct)} cap. The cap is the council's one limit for every sector, marked on each bar. `
              : ''}
            Contribution is the sector&apos;s gain or loss as a percent of fund value.
          </p>
        </>
      )}
    </Section>
  );
}

/* ── Analyst leaderboard ────────────────────────────────────────────────── */

export function Leaderboard({ fund, onOpen, onRetry }) {
  const [sort, setSort] = useState({ key: 'rank', dir: 'asc' });
  const loading = fund.status === 'loading';
  const data = fund.data?.analystLeaderboard;
  const rows = useMemo(() => sortRows(data || [], sort.key, sort.dir), [data, sort]);
  const th = { sort, onSort: setSort };

  return (
    <Section
      id="ofa-board"
      title="Analyst leaderboard"
      className="ofa-board"
      aside={<Scope>All pitches. A row opens the scorecard.</Scope>}
    >
      {fund.status === 'error' ? (
        <SectionError message="Could not load the analyst leaderboard." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={6} />
      ) : rows.length === 0 ? (
        <Empty href={ORG_CHART} action="Open org chart">
          No analysts on the roster yet.
        </Empty>
      ) : (
        <div className="ofa-scroll">
          <table className="ofa-table ofa-table--board">
            <thead>
              <tr>
                <SortTh
                  {...th}
                  col="rank"
                  label="Rank"
                  firstDir="asc"
                  title="Rank by contribution"
                />
                <SortTh {...th} col="name" label="Analyst" firstDir="asc" />
                <SortTh {...th} col="sleeve" label="Sleeve" firstDir="asc" />
                <SortTh {...th} col="pitches" label="Pitches" num />
                <SortTh
                  {...th}
                  col="hit_rate_pct"
                  label="Hit rate"
                  num
                  title="Share of pitches with a reading that beat the benchmark"
                />
                <SortTh
                  {...th}
                  col="avg_return_pct"
                  label="Avg return"
                  num
                  title="Average price change since the decision, across pitches with a reading"
                />
                <SortTh
                  {...th}
                  col="avg_alpha_pct"
                  label="Avg alpha"
                  num
                  title="Average return less the benchmark over the same days"
                />
                <SortTh
                  {...th}
                  col="contribution_usd"
                  label="Contribution"
                  num
                  title="Gain or loss on current holdings whose approved pitch the analyst wrote"
                />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.member_id}
                  className={`ofa-rowbtn${r.pitches === 0 ? ' is-quiet' : ''}`}
                  onClick={(e) => {
                    /* The name button is the keyboard target; a click anywhere
                       on the row goes through it, so focus returns to it when
                       the dialog closes. */
                    const btn = e.currentTarget.querySelector('button');
                    btn?.focus();
                    onOpen(r);
                  }}
                >
                  <td className="tcc-mono ofa-rank">{r.rank}</td>
                  <td className="ofa-strong">
                    <button
                      type="button"
                      className="ofa-namebtn"
                      aria-haspopup="dialog"
                      aria-label={`${r.name}, open scorecard`}
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className={r.sleeve ? undefined : 'tcc-na'}>{r.sleeve || 'No sleeve'}</td>
                  <td className="ofa-num tcc-mono">{r.pitches}</td>
                  <td className="ofa-num tcc-mono">{na(fmtPct(r.hit_rate_pct))}</td>
                  <td className={`ofa-num tcc-mono ${toneClass(r.avg_return_pct)}`}>
                    {fmtSignedPct(r.avg_return_pct)}
                  </td>
                  <td className={`ofa-num tcc-mono ${toneClass(r.avg_alpha_pct)}`}>
                    {fmtSignedPct(r.avg_alpha_pct)}
                  </td>
                  <td className={`ofa-num tcc-mono ${toneClass(r.contribution_usd)}`}>
                    {fmtSignedMoney(r.contribution_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/* ── Coverage gaps and pitch funnel ─────────────────────────────────────── */

export function CoverageGaps({ fund, onRetry }) {
  const loading = fund.status === 'loading';
  const gaps = fund.data?.pipeline?.coverage_gaps || [];
  const holdings = fund.data?.holdingsCount ?? null;
  return (
    <Section
      id="ofa-gaps"
      title="Coverage gaps"
      className="ofa-gaps"
      aside={<Scope>Current holdings</Scope>}
    >
      {fund.status === 'error' ? (
        <SectionError message="Could not load coverage gaps." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={3} />
      ) : gaps.length === 0 ? (
        <Empty href={ORG_CHART} action="Open org chart">
          {holdings === 0
            ? 'No holdings yet, so there is no coverage to check.'
            : 'Every holding has an analyst pitch on file.'}
        </Empty>
      ) : (
        <>
          <p className="ofa-sub">
            <span className="tcc-mono">{gaps.length}</span>{' '}
            {gaps.length === 1 ? 'holding has' : 'holdings have'} no analyst pitch on file.
          </p>
          <div className="ofa-scroll">
            <table className="ofa-table ofa-table--gaps">
              <thead>
                <tr>
                  <th scope="col">Ticker</th>
                  <th scope="col">Sector</th>
                  <th scope="col" className="ofa-num">
                    Coverage
                  </th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((g) => (
                  <tr key={`${g.ticker}-${g.team_id || 'na'}`}>
                    <td role="rowheader" className="tcc-mono">
                      {g.ticker}
                    </td>
                    <td className={g.sector ? undefined : 'tcc-na'}>{g.sector || NA}</td>
                    <td className="ofa-num">
                      <Link
                        href={ORG_CHART}
                        className="tcc-link"
                        aria-label={`Assign coverage for ${g.ticker} in the org chart`}
                      >
                        Assign in org chart <i className="bi bi-arrow-right" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

export function PitchFunnel({ fund, onRetry }) {
  const loading = fund.status === 'loading';
  const rows = funnelRows(fund.data?.pipeline);
  const empty = !fund.data?.pipeline || rows[0].count === 0;
  return (
    <Section
      id="ofa-funnel"
      title="Pitch funnel"
      className="ofa-funnel"
      aside={<Scope>All pitches</Scope>}
    >
      {fund.status === 'error' ? (
        <SectionError message="Could not load the pitch funnel." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={3} />
      ) : empty ? (
        <Empty href="/org-team-hub/pitches" action="Open pitch pipeline">
          No pitches submitted yet.
        </Empty>
      ) : (
        <>
          <ul className="ofa-funnel__rows">
            {rows.map((r) => (
              <li key={r.key} className="ofa-funnel__row">
                <span className="ofa-funnel__label">{r.label}</span>
                <span className="tcc-mono ofa-funnel__count">{r.count}</span>
                <span className="ofa-funnel__bar" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, r.pct ?? 0)}%` }} />
                </span>
                <span className="tcc-mono ofa-funnel__pct">{fmtPct(r.pct)}</span>
              </li>
            ))}
          </ul>
          <p className="ofa-foot">
            Percentages are shares of submitted pitches. Executed counts approved pitches whose
            ticker the fund holds today.
          </p>
        </>
      )}
    </Section>
  );
}

/* ── Holding attribution ────────────────────────────────────────────────── */

function HoldingList({ title, rows, emptyText }) {
  return (
    <div className="ofa-attr__col">
      <h3 className="ofa-subtitle">{title}</h3>
      {rows.length === 0 ? (
        <p className="tcc-state">
          <span>{emptyText}</span>
        </p>
      ) : (
        <div className="ofa-scroll">
          <table className="ofa-table ofa-table--attr">
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col">Sector</th>
                <th scope="col">Analyst</th>
                <th scope="col" className="ofa-num">
                  Gain or loss
                </th>
                <th scope="col" className="ofa-num" title="Gain or loss as a percent of total cost">
                  % of cost
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ticker}>
                  <td role="rowheader" className="tcc-mono">
                    {r.ticker}
                  </td>
                  <td className={r.sector ? undefined : 'tcc-na'}>{r.sector || NA}</td>
                  <td className={r.analyst_name ? undefined : 'tcc-na'}>
                    {r.analyst_name || 'Unassigned'}
                  </td>
                  <td className={`ofa-num tcc-mono ${toneClass(r.contribution_usd)}`}>
                    {fmtSignedMoney(r.contribution_usd)}
                  </td>
                  <td className={`ofa-num tcc-mono ${toneClass(r.contribution_pct)}`}>
                    {fmtSignedPct(r.contribution_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function HoldingAttribution({ fund, onRetry }) {
  const loading = fund.status === 'loading';
  const c = fund.data?.contributors || { top: [], bottom: [] };
  const none = c.top.length === 0 && c.bottom.length === 0;
  return (
    <Section
      id="ofa-attr"
      title="Holding attribution"
      className="ofa-attr"
      aside={<Scope>Current holdings, gain or loss since purchase</Scope>}
    >
      {fund.status === 'error' ? (
        <SectionError message="Could not load holding attribution." onRetry={onRetry} />
      ) : loading ? (
        <div className="ofa-attr__grid">
          <SkelRows rows={5} />
          <span className="tcc-vrule" aria-hidden="true" />
          <SkelRows rows={5} />
        </div>
      ) : none ? (
        <Empty href="/org-trading" action="Open trading desk">
          No positions with a gain or a loss yet.
        </Empty>
      ) : (
        <div className="ofa-attr__grid">
          <HoldingList title="Top contributors" rows={c.top} emptyText="No holding is at a gain." />
          <span className="tcc-vrule" aria-hidden="true" />
          <HoldingList
            title="Top detractors"
            rows={c.bottom}
            emptyText="No holding is at a loss."
          />
        </div>
      )}
    </Section>
  );
}

/* ── Pitch outcomes ─────────────────────────────────────────────────────── */

const outcomeRead = (r, k) => {
  if (k === 'state') return r.has_outcome ? pitchState(r.current_state).order : null;
  if (k === 'analyst') return r.analyst || null;
  return r[k];
};

export function PitchOutcomes({ fund, onRetry }) {
  const [sort, setSort] = useState({ key: 'alpha_pct', dir: 'desc' });
  const [all, setAll] = useState(false);
  const loading = fund.status === 'loading';
  const data = fund.data?.attribution?.byPitch;
  const rows = useMemo(() => sortRows(data || [], sort.key, sort.dir, outcomeRead), [data, sort]);
  const LIMIT = 10;
  const shown = all ? rows : rows.slice(0, LIMIT);
  const th = { sort, onSort: setSort };

  return (
    <Section
      id="ofa-outcomes"
      title="Pitch outcomes"
      className="ofa-outcomes"
      aside={<Scope>All pitches</Scope>}
    >
      {fund.status === 'error' ? (
        <SectionError message="Could not load pitch outcomes." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={5} />
      ) : rows.length === 0 ? (
        <Empty href="/org-team-hub/pitches" action="Open pitch pipeline">
          No pitches with outcomes yet.
        </Empty>
      ) : (
        <>
          <div className="ofa-scroll">
            <table className="ofa-table ofa-table--outcomes">
              <thead>
                <tr>
                  <SortTh {...th} col="ticker" label="Ticker" firstDir="asc" />
                  <SortTh {...th} col="analyst" label="Analyst" firstDir="asc" />
                  <SortTh
                    {...th}
                    col="return_pct"
                    label="Return"
                    num
                    title="Price change since the decision date"
                  />
                  <SortTh
                    {...th}
                    col="alpha_pct"
                    label="Alpha"
                    num
                    title="Return less the S&P 500 fund over the same days"
                  />
                  <SortTh {...th} col="state" label="State" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const st = r.has_outcome ? pitchState(r.current_state) : pitchState(null);
                  return (
                    <tr key={r.pitch_id || `${r.ticker}-${r.analyst_member_id}`}>
                      <td role="rowheader" className="tcc-mono">
                        {r.ticker}
                      </td>
                      <td className={r.analyst ? undefined : 'tcc-na'}>
                        {r.analyst || 'Unassigned'}
                      </td>
                      <td className={`ofa-num tcc-mono ${toneClass(r.return_pct)}`}>
                        {fmtSignedPct(r.return_pct)}
                      </td>
                      <td className={`ofa-num tcc-mono ${toneClass(r.alpha_pct)}`}>
                        {fmtSignedPct(r.alpha_pct)}
                      </td>
                      <td>
                        <span
                          className={`ofa-pstate tcc-${st.tone}`}
                          title={
                            r.has_outcome
                              ? undefined
                              : 'A reading appears 30 days after the pitch is decided.'
                          }
                        >
                          <i className={`bi ${st.icon}`} aria-hidden="true" />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="ofa-tablefoot">
            <span>
              Showing <span className="tcc-mono">{shown.length}</span> of{' '}
              <span className="tcc-mono">{rows.length}</span> pitches. Outperforming and
              underperforming mean more than 5 points either side of the benchmark.
            </span>
            {rows.length > LIMIT && (
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent ofa-action"
                onClick={() => setAll((v) => !v)}
              >
                {all ? 'Show fewer' : 'Show all'}
              </button>
            )}
          </div>
        </>
      )}
    </Section>
  );
}

/* ── Team attention map ─────────────────────────────────────────────────── */

/**
 * What members are reading about. Only served to executives and permitted
 * managers; the page hides the section for everyone else and when there is
 * too little activity to show without pointing at a person.
 */
export function AttentionMap({ attention, onRetry }) {
  if (attention.status === 'forbidden') return null;
  const groups = attentionGroups(attention.data?.dimensions);
  if (attention.status === 'ready' && groups.length === 0) return null;
  const floor = attention.data?.k ?? 3;
  return (
    <div className="tcc-row tcc-row--single">
      <Section
        id="ofa-attention"
        title="Team attention map"
        className="ofa-attention"
        aside={
          attention.status === 'ready' ? (
            <Scope>
              Executives and permitted managers only
              {attention.data?.computedAt ? `. Updated ${fmtDate(attention.data.computedAt)}` : ''}
            </Scope>
          ) : null
        }
      >
        {attention.status === 'error' ? (
          <SectionError message="Could not load the team attention map." onRetry={onRetry} />
        ) : attention.status === 'loading' ? (
          <SkelRows rows={4} />
        ) : (
          <>
            <div className="ofa-attention__grid">
              {groups.map((g) => (
                <div key={g.key} className="ofa-attention__group">
                  <h3 className="ofa-subtitle">{g.label}</h3>
                  <ul className="ofa-attention__rows">
                    {g.rows.map((r) => (
                      <li key={r.value}>
                        <span className="ofa-attention__topic" title={r.value}>
                          {r.value}
                        </span>
                        <span className="ofa-attention__bar" aria-hidden="true">
                          <span style={{ width: `${r.share}%` }} />
                        </span>
                        <span className="tcc-mono ofa-attention__count">
                          {r.members}
                          <span className="tcc-sr"> members</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="ofa-foot">
              What members have been reading about. Each number is how many members, and a topic
              only appears once at least {floor} members have read about it, so no one person can be
              picked out.
            </p>
          </>
        )}
      </Section>
    </div>
  );
}

/* ── Council standing and since last meeting ────────────────────────────── */

function Pair({ label, tone, children }) {
  return (
    <div className="tcc-pair">
      <dt>{label}</dt>
      <dd className={`tcc-mono${tone ? ` ${tone}` : ''}`}>{children}</dd>
    </div>
  );
}

export function CouncilStanding({ standing, onRetry }) {
  const loading = standing.status === 'loading';
  const s = standing.data;
  return (
    <Section id="ofa-standing" title="Council standing" className="ofa-standing">
      {standing.status === 'error' ? (
        <SectionError message="Could not load competition standing." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={3} />
      ) : !s ? (
        <Empty href="/org-competitions" action="Open competitions">
          The council is not entered in an open competition.
        </Empty>
      ) : (
        <>
          <p className="ofa-sub">{s.name}</p>
          <dl className="tcc-pairs">
            <Pair label="Competition rank" tone={s.rank == null ? 'tcc-na' : undefined}>
              {s.rank == null ? NA : s.field ? `${s.rank} of ${s.field}` : String(s.rank)}
            </Pair>
            <Pair label="Return since entry" tone={toneClass(s.return_pct)}>
              {fmtSignedPct(s.return_pct)}
            </Pair>
            <Pair label="Councils entered" tone={s.field == null ? 'tcc-na' : undefined}>
              {s.field == null ? NA : String(s.field)}
            </Pair>
            {s.ends_at && <Pair label="Ends">{fmtDate(s.ends_at)}</Pair>}
          </dl>
          <ArrowLink href="/org-competitions" className="ofa-morelink">
            Open competitions
          </ArrowLink>
        </>
      )}
    </Section>
  );
}

export function SinceLastMeeting({ fund, onRetry }) {
  const loading = fund.status === 'loading';
  const m = fund.data?.sinceLastMeeting;
  return (
    <Section id="ofa-meeting" title="Since last meeting" className="ofa-meeting">
      {fund.status === 'error' ? (
        <SectionError message="Could not load changes since the last meeting." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={5} />
      ) : !m ? (
        <Empty href="/org-team-hub/meetings" action="Open meetings">
          The council has no meetings on record yet.
        </Empty>
      ) : (
        <dl className="tcc-pairs">
          <Pair label="Meeting date">{fmtDate(m.since_date)}</Pair>
          <Pair label="Days ago">{m.days_ago ?? NA}</Pair>
          <Pair label="Change in fund value" tone={toneClass(m.fund_value_delta)}>
            {fmtSignedMoney(m.fund_value_delta)}
          </Pair>
          <Pair label="Change in return" tone={toneClass(m.return_delta_pct)}>
            {m.return_delta_pct == null
              ? NA
              : `${fmtSignedPct(m.return_delta_pct).replace('%', '')} pts`}
          </Pair>
          <Pair label="Holdings added">{m.positions_added ?? NA}</Pair>
          <Pair label="Pitches decided">{m.pitches_decided ?? NA}</Pair>
        </dl>
      )}
    </Section>
  );
}
