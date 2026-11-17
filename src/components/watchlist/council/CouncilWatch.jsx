'use client';

/**
 * "Council watch": the council section of the Watchlist (/watchlist), shown
 * only to council members once their membership is known. The personal
 * watchlist above it is unchanged for everyone.
 *
 *   strip                names on watch, held, pitched only, unassigned,
 *                        stale or no research, near a cap
 *   Council coverage     every held name and open pitch: owner (handoff, then
 *                        sector coverage, then pitch analyst), last research,
 *                        weight against the stored position cap, pitch stage;
 *                        filters All, My coverage, Gaps
 *   Desk watch           each sector team: names, sleeve weight, coverage, gaps
 *   IPS watch            largest positions and sectors against stored caps
 *                        (descriptive, never a block)
 *   Coverage assignments open Coverage assignments the viewer can see
 *   Coming up            committee sessions, meetings, coverage due dates
 *
 * Every figure comes from src/lib/org-watchlist-model.js over the council's
 * own records (or the labelled sample, master admin and demo accounts only).
 * The only actions are the viewer's own: add a name to their personal list
 * (refused while the sample shows) and, with the right, Send to team.
 */
import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { Skeleton, SkeletonRegion } from '@/components/ds';
import {
  LINKS,
  NA,
  RESEARCH_TEXT,
  comingUp,
  coverageAssignments,
  coverageRows,
  deskRows,
  filterRows,
  fmtDate,
  fmtShare,
  ipsWatch,
  sortRows,
  stripFigures,
} from '@/lib/org-watchlist-model';
import './council-watch.css';

/* ── States ─────────────────────────────────────────────────────────────── */

function Loading({ label, rows = 4 }) {
  return (
    <SkeletonRegion label={label} className="cwl-skel">
      {['92%', '74%', '84%', '60%', '70%', '80%'].slice(0, rows).map((w) => (
        <span key={w} className="cwl-skel__row">
          <Skeleton height={10} width={44} />
          <Skeleton height={10} width={w} />
        </span>
      ))}
    </SkeletonRegion>
  );
}

function Empty({ children, href, onClick, action }) {
  return (
    <div className="cwl-state">
      <p>{children}</p>
      {href ? (
        <Link href={href} className="cwl-link">
          {action}
        </Link>
      ) : onClick ? (
        <button type="button" className="cwl-link" onClick={onClick}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

function Failed({ children, onRetry }) {
  return (
    <div className="cwl-state cwl-state--error" role="alert">
      <p>
        <i className="bi bi-exclamation-circle" aria-hidden="true" />
        <span>{children}</span>
      </p>
      <button type="button" className="cwl-link" onClick={onRetry}>
        <i className="bi bi-arrow-clockwise" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function Col({ area, icon, title, aside, children, busy }) {
  const id = useId();
  return (
    <section
      className={`cwl-col cwl-col--${area}`}
      aria-labelledby={id}
      aria-busy={busy || undefined}
    >
      <div className="cwl-col__head">
        <h3 id={id} className="cwl-col__title">
          <i className={`bi ${icon}`} aria-hidden="true" />
          <span>{title}</span>
        </h3>
        {aside ? <span className="cwl-col__aside">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

/* A part of the page's extras: error when the request failed or that part
   arrived as null (the route sends null for a part it could not read). */
function part(extras, key) {
  if (extras.status !== 'ready') return { status: extras.status, data: null, retry: extras.retry };
  const data = extras.data?.[key];
  return data == null
    ? { status: 'error', data: null, retry: extras.retry }
    : { status: 'ready', data, retry: extras.retry };
}
function joint(...parts) {
  if (parts.some((p) => p.status === 'error')) return 'error';
  if (parts.some((p) => p.status === 'loading')) return 'loading';
  return 'ready';
}
const retryAll =
  (...parts) =>
  () => {
    for (const p of parts) if (p.status === 'error') p.retry?.();
  };

const TONE = { up: 'cwl-up', down: 'cwl-down', warn: 'cwl-warn', na: 'cwl-muted' };
const READ_ICON = {
  Within: 'bi-check2',
  Nearing: 'bi-exclamation-triangle',
  Above: 'bi-exclamation-octagon',
};

function Reading({ reading }) {
  if (!reading || reading.text === NA) return <span className="cwl-muted">{NA}</span>;
  const icon = READ_ICON[reading.text];
  return (
    <span className={`cwl-word ${TONE[reading.tone] || ''}`}>
      {icon ? <i className={`bi ${icon}`} aria-hidden="true" /> : null}
      {reading.text}
    </span>
  );
}

/* ── The section ────────────────────────────────────────────────────────── */

export default function CouncilWatch({
  council,
  councilName = null,
  listLabel = null,
  onList = () => false,
  onAddToList,
  onSendToTeam = null,
}) {
  const { fund, extras, policyPositions, viewerMemberId, sampleActive, sampleAvailable } = council;
  const headId = useId();
  const pitches = part(extras, 'pitches');
  const assignments = part(extras, 'assignments');
  const meetings = part(extras, 'meetings');
  const sessions = part(extras, 'sessions');

  const rows = useMemo(
    () =>
      fund.status === 'ready'
        ? coverageRows(fund.raw, pitches.status === 'ready' ? extras.data : null, viewerMemberId)
        : [],
    [fund.status, fund.raw, pitches.status, extras.data, viewerMemberId],
  );
  const listStatus = joint(fund, pitches);
  const strip = listStatus === 'ready' ? stripFigures(rows) : null;
  const name = sampleActive ? 'Sample council' : councilName || 'Your council';

  return (
    <section className="cwl-band" aria-labelledby={headId}>
      <div className="cwl-head">
        <div className="cwl-head__title">
          <h2 id={headId}>
            <i className="bi bi-people" aria-hidden="true" />
            Council watch
          </h2>
          <span className="cwl-muted">{name}. Visible to council members only.</span>
        </div>
        <div className="cwl-head__actions">
          {sampleActive ? (
            <span className="cwl-faint">
              <i className="bi bi-info-circle" aria-hidden="true" /> Sample content
            </span>
          ) : null}
          {sampleAvailable ? (
            <button
              type="button"
              className="cwl-tb"
              aria-pressed={!sampleActive}
              onClick={() => council.setShowSample(!sampleActive)}
            >
              {sampleActive ? 'Show council data' : 'Show sample content'}
            </button>
          ) : null}
          <Link href={LINKS.library} className="cwl-link">
            Research Library <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <Strip status={listStatus} strip={strip} onRetry={retryAll(fund, pitches)} />

      <CoverageList
        status={listStatus}
        onRetry={retryAll(fund, pitches)}
        rows={rows}
        strip={strip}
        sampleActive={sampleActive}
        listLabel={listLabel}
        onList={onList}
        onAddToList={onAddToList}
        onSendToTeam={onSendToTeam}
      />

      <div className="cwl-grid">
        <Col area="desk" icon="bi-diagram-3" title="Desk watch" busy={listStatus === 'loading'}>
          <DeskCard
            status={listStatus}
            onRetry={retryAll(fund, pitches)}
            raw={fund.raw}
            rows={rows}
          />
        </Col>
        <Col
          area="ips"
          icon="bi-shield-check"
          title="IPS watch"
          aside="Descriptive"
          busy={listStatus === 'loading'}
        >
          <IpsCard
            status={listStatus}
            onRetry={retryAll(fund, pitches)}
            raw={fund.raw}
            rows={rows}
            policyPositions={policyPositions}
          />
        </Col>
        <Col
          area="assign"
          icon="bi-clipboard-check"
          title="Coverage assignments"
          busy={assignments.status === 'loading'}
        >
          <AssignCard part={assignments} now={extras.data?.now} />
        </Col>
        <Col
          area="coming"
          icon="bi-calendar3"
          title="Coming up"
          aside="Next 30 days"
          busy={joint(meetings, sessions, assignments) === 'loading'}
        >
          <ComingCard
            status={joint(meetings, sessions, assignments)}
            onRetry={retryAll(meetings, sessions, assignments)}
            extras={extras.data}
          />
        </Col>
      </div>
    </section>
  );
}

/* ── Strip (KPI values 18px mono, hairlines between cells) ─────────────── */

function Strip({ status, strip, onRetry }) {
  if (status === 'error')
    return (
      <div className="cwl-strip cwl-strip--state">
        <Failed onRetry={onRetry}>We couldn&rsquo;t load the council&rsquo;s names.</Failed>
      </div>
    );
  const cells = [
    ['Names on watch', strip?.names, 'bi-binoculars'],
    ['Held', strip?.held, 'bi-briefcase'],
    ['Pitched only', strip?.pitched, 'bi-easel'],
    ['Unassigned', strip?.unassigned, 'bi-person-dash'],
    ['Stale or no research', strip?.stale, 'bi-clock-history'],
    ['Near a position cap', strip?.nearCap, 'bi-shield-exclamation'],
  ];
  return (
    <div className="cwl-strip" aria-busy={status === 'loading' || undefined}>
      {cells.map(([label, value, icon]) => (
        <div key={label} className="cwl-kpi">
          <i className={`bi ${icon} cwl-kpi__icon`} aria-hidden="true" />
          <span className="cwl-kpi__text">
            <span className="cwl-kpi__label">{label}</span>
            {status === 'loading' ? (
              <Skeleton height={14} width={32} />
            ) : (
              <span className="cwl-kpi__value cwl-num">{value ?? NA}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Council coverage ───────────────────────────────────────────────────── */

const LIMIT = 12;

const FILTERS = [
  ['all', 'All'],
  ['mine', 'My coverage'],
  ['gaps', 'Gaps'],
];

function SortHead({ id, label, sort, onSort, className = '' }) {
  const active = sort.key === id;
  return (
    <span
      role="columnheader"
      className={`cwl-th ${className}`}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" className="cwl-sort" onClick={() => onSort(id)}>
        {label}
        <i
          className={`bi ${active ? (sort.dir === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down') : 'bi-chevron-expand'}`}
          aria-hidden="true"
        />
      </button>
    </span>
  );
}

function CoverageList({
  status,
  onRetry,
  rows,
  strip,
  sampleActive,
  listLabel,
  onList,
  onAddToList,
  onSendToTeam,
}) {
  const headId = useId();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'default', dir: 'asc' });
  const [expanded, setExpanded] = useState(false);
  const onSort = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'weight' ? 'desc' : 'asc' },
    );
  const shown = useMemo(
    () => sortRows(filterRows(rows, filter), sort.key, sort.dir),
    [rows, filter, sort],
  );
  const counts = {
    all: rows.length,
    mine: strip?.mine ?? 0,
    gaps: rows.filter((r) => r.gap).length,
  };

  let body;
  if (status === 'loading') body = <Loading label="Loading council coverage" rows={6} />;
  else if (status === 'error')
    body = <Failed onRetry={onRetry}>We couldn&rsquo;t load the council&rsquo;s coverage.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.pipeline} action="Open Pitch Pipeline">
        Your council holds nothing and has no open pitches yet.
      </Empty>
    );
  else if (!shown.length)
    body = (
      <Empty onClick={() => setFilter('all')} action="Show all names">
        {filter === 'mine'
          ? 'No name on the list is yours: no handoff, sector coverage or pitch names you.'
          : 'Every name has an owner and research in the last 90 days.'}
      </Empty>
    );
  else
    body = (
      <div className="cwl-scroll">
        <div className="cwl-table" role="table" aria-labelledby={headId}>
          <div className="cwl-tr cwl-tr--head" role="row">
            <SortHead id="ticker" label="Name" sort={sort} onSort={onSort} />
            <span role="columnheader" className="cwl-th">
              On the book
            </span>
            <span role="columnheader" className="cwl-th cwl-col-team">
              Team
            </span>
            <span role="columnheader" className="cwl-th">
              Owner
            </span>
            <SortHead id="research" label="Last research" sort={sort} onSort={onSort} />
            <SortHead
              id="weight"
              label="Weight / cap"
              sort={sort}
              onSort={onSort}
              className="cwl-r"
            />
            <span role="columnheader" className="cwl-th">
              Pitch stage
            </span>
            <span role="columnheader" className="cwl-th cwl-r">
              Actions
            </span>
          </div>
          {(expanded ? shown : shown.slice(0, LIMIT)).map((r) => (
            <CoverageRow
              key={r.ticker}
              r={r}
              sampleActive={sampleActive}
              listLabel={listLabel}
              onList={onList}
              onAddToList={onAddToList}
              onSendToTeam={onSendToTeam}
            />
          ))}
        </div>
        {shown.length > LIMIT ? (
          <button
            type="button"
            className="cwl-link cwl-more"
            aria-expanded={expanded}
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? 'Show fewer' : `Show all ${shown.length} names`}
            <i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );

  return (
    <section
      className="cwl-cov"
      aria-labelledby={headId}
      aria-busy={status === 'loading' || undefined}
    >
      <div className="cwl-cov__head">
        <h3 id={headId} className="cwl-col__title">
          <i className="bi bi-list-check" aria-hidden="true" />
          <span>Council coverage</span>
        </h3>
        <div className="cwl-filters" role="group" aria-label="Filter council coverage">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`cwl-filter${filter === id ? ' is-on' : ''}`}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              disabled={status !== 'ready'}
            >
              {label}
              {status === 'ready' ? <span className="cwl-num">{counts[id]}</span> : null}
            </button>
          ))}
        </div>
        <Link href={LINKS.lineage} className="cwl-link cwl-cov__aside">
          Coverage lineage <i className="bi bi-arrow-up-right" aria-hidden="true" />
        </Link>
      </div>
      {body}
    </section>
  );
}

function CoverageRow({ r, sampleActive, listLabel, onList, onAddToList, onSendToTeam }) {
  const already = onList(r.ticker);
  const research =
    r.research === 'current'
      ? { icon: 'bi-check2-circle', cls: 'cwl-up' }
      : r.research === 'stale'
        ? { icon: 'bi-clock-history', cls: 'cwl-warn' }
        : { icon: 'bi-exclamation-circle', cls: 'cwl-warn' };
  return (
    <div className="cwl-tr" role="row">
      <span role="cell" className="cwl-name">
        <Link href={LINKS.research(r.ticker)} className="cwl-ticker cwl-num">
          {r.ticker}
        </Link>
        <span className="cwl-ellipsis cwl-muted" title={r.name || undefined}>
          {r.name || NA}
        </span>
      </span>
      <span role="cell" className="cwl-word">
        {r.held ? (
          <>
            <i className="bi bi-briefcase" aria-hidden="true" />
            {r.pitched ? 'Held, pitched' : 'Held'}
          </>
        ) : (
          <>
            <i className="bi bi-easel" aria-hidden="true" />
            Pitched
          </>
        )}
      </span>
      <span role="cell" className="cwl-ellipsis cwl-col-team">
        {r.team || NA}
      </span>
      <span role="cell" className="cwl-stack">
        {r.owner ? (
          <>
            <span className="cwl-ellipsis">
              {r.owner.name}
              {r.mine ? <span className="cwl-accent"> (you)</span> : null}
            </span>
            <span className="cwl-meta">{r.owner.source}</span>
          </>
        ) : (
          <span className="cwl-word cwl-warn">
            <i className="bi bi-person-dash" aria-hidden="true" />
            Unassigned
          </span>
        )}
      </span>
      <span role="cell" className="cwl-stack">
        <span className="cwl-num">{fmtDate(r.lastDocAt)}</span>
        <span className={`cwl-word cwl-meta ${research.cls}`}>
          <i className={`bi ${research.icon}`} aria-hidden="true" />
          {RESEARCH_TEXT[r.research]}
        </span>
      </span>
      <span role="cell" className="cwl-stack cwl-r">
        {r.held ? (
          <>
            <span className="cwl-num">
              {fmtShare(r.weight)}
              <span className="cwl-muted"> of {fmtShare(r.cap)}</span>
            </span>
            <span className="cwl-meta">
              <Reading reading={r.capReading} />
            </span>
          </>
        ) : (
          <span className="cwl-muted">Not held</span>
        )}
      </span>
      <span role="cell" className="cwl-stack">
        {r.pitch ? (
          <>
            <Link href={LINKS.pitch(r.pitch.id)} className="cwl-rowlink">
              {r.pitch.stageText}
            </Link>
            {r.pitch.analyst ? <span className="cwl-meta">By {r.pitch.analyst}</span> : null}
          </>
        ) : (
          <span className="cwl-muted">None open</span>
        )}
      </span>
      <span role="cell" className="cwl-actions">
        {already ? (
          <span className="cwl-word cwl-muted" title={listLabel ? `On ${listLabel}` : undefined}>
            <i className="bi bi-check2" aria-hidden="true" />
            On my list
          </span>
        ) : (
          <button
            type="button"
            className="cwl-tb"
            onClick={() => onAddToList?.(r, { sample: sampleActive })}
            aria-label={`Add ${r.ticker} to ${listLabel || 'my list'}`}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Add to my list
          </button>
        )}
        {onSendToTeam ? (
          <button
            type="button"
            className="cwl-icon"
            aria-label={`Send ${r.ticker} to team`}
            title="Send to team"
            onClick={() => onSendToTeam(r.ticker)}
          >
            <i className="bi bi-send" aria-hidden="true" />
          </button>
        ) : null}
        <Link
          href={LINKS.dossier(r.ticker)}
          className="cwl-icon"
          aria-label={`Open the ${r.ticker} dossier in the Research Library`}
          title="Research dossier"
        >
          <i className="bi bi-journal-text" aria-hidden="true" />
        </Link>
      </span>
    </div>
  );
}

/* ── Cards ──────────────────────────────────────────────────────────────── */

function DeskCard({ status, onRetry, raw, rows }) {
  if (status === 'loading') return <Loading label="Loading desk watch" />;
  if (status === 'error')
    return <Failed onRetry={onRetry}>We couldn&rsquo;t load the sector teams.</Failed>;
  const desks = deskRows(raw, rows);
  if (!desks.length)
    return (
      <Empty href={LINKS.orgChart} action="Open the org chart">
        No sector teams are set up yet.
      </Empty>
    );
  return (
    <div className="cwl-mini" role="table" aria-label="Sector teams">
      <div className="cwl-mtr cwl-mtr--desk cwl-mtr--head" role="row">
        <span role="columnheader">Team</span>
        <span role="columnheader" className="cwl-r">
          Held
        </span>
        <span role="columnheader" className="cwl-r">
          Pitched
        </span>
        <span role="columnheader" className="cwl-r">
          Weight
        </span>
        <span role="columnheader" className="cwl-hide-sm">
          Primary coverage
        </span>
        <span role="columnheader" className="cwl-r">
          Gaps
        </span>
      </div>
      {desks.map((d) => (
        <div key={d.id} className="cwl-mtr cwl-mtr--desk" role="row">
          <span role="cell" className="cwl-strong cwl-ellipsis">
            {d.name}
          </span>
          <span role="cell" className="cwl-num cwl-r">
            {d.held}
          </span>
          <span role="cell" className="cwl-num cwl-r">
            {d.pitched}
          </span>
          <span role="cell" className="cwl-num cwl-r">
            {fmtShare(d.weight)}
          </span>
          <span role="cell" className="cwl-ellipsis cwl-hide-sm" title={d.covering.join(', ')}>
            {d.covering.length ? d.covering.join(', ') : <span className="cwl-warn">None</span>}
          </span>
          <span role="cell" className={`cwl-num cwl-r${d.gaps ? ' cwl-warn' : ''}`}>
            {d.gaps}
          </span>
        </div>
      ))}
    </div>
  );
}

function IpsCard({ status, onRetry, raw, rows, policyPositions }) {
  if (status === 'loading') return <Loading label="Loading IPS watch" />;
  if (status === 'error')
    return <Failed onRetry={onRetry}>We couldn&rsquo;t load the policy limits.</Failed>;
  const ips = ipsWatch(raw, rows, policyPositions);
  if (!ips.hasRules)
    return (
      <Empty href={LINKS.compliance} action="Open Compliance">
        No position or sector cap is stored yet.
      </Empty>
    );
  if (!ips.positions.length && !ips.sectors.length)
    return (
      <Empty href={LINKS.compliance} action="Open Compliance">
        Nothing is held yet, so there is nothing to read against the caps.
      </Empty>
    );
  const line = (key, label, w, cap, reading) => (
    <li key={key} className="cwl-row cwl-row--ips">
      <span className="cwl-ellipsis">{label}</span>
      <span className="cwl-num cwl-r">
        {fmtShare(w)}
        <span className="cwl-muted"> of {fmtShare(cap)}</span>
      </span>
      <span className="cwl-r">
        <Reading reading={reading} />
      </span>
    </li>
  );
  return (
    <>
      <p className="cwl-sub">Largest positions</p>
      <ul className="cwl-rows">
        {ips.positions.map((p) =>
          line(
            p.ticker,
            <span className="cwl-ticker cwl-num">{p.ticker}</span>,
            p.weight,
            p.cap,
            p.reading,
          ),
        )}
      </ul>
      <p className="cwl-sub">Sectors</p>
      <ul className="cwl-rows">
        {ips.sectors.map((s) => line(s.sector, s.sector, s.weight, s.cap, s.reading))}
      </ul>
      {ips.prohibited.length ? (
        <p className="cwl-note cwl-down">
          <i className="bi bi-exclamation-octagon" aria-hidden="true" /> On the prohibited list:{' '}
          <span className="cwl-num">{ips.prohibited.join(', ')}</span>
        </p>
      ) : null}
      <Link href={LINKS.compliance} className="cwl-link">
        Open Compliance <i className="bi bi-arrow-right" aria-hidden="true" />
      </Link>
    </>
  );
}

function AssignCard({ part: p, now }) {
  if (p.status === 'loading') return <Loading label="Loading coverage assignments" rows={3} />;
  if (p.status === 'error')
    return <Failed onRetry={p.retry}>We couldn&rsquo;t load coverage assignments.</Failed>;
  const list = coverageAssignments(p.data, now || Date.now());
  if (!list.length)
    return (
      <Empty href={LINKS.assignments} action="Open Assignments">
        No open coverage assignments.
      </Empty>
    );
  return (
    <>
      <ul className="cwl-rows">
        {list.slice(0, 5).map((a) => (
          <li key={a.id} className="cwl-row cwl-row--assign">
            <span className="cwl-stack">
              <span className="cwl-ellipsis cwl-strong" title={a.title}>
                {a.title}
              </span>
              <span className="cwl-meta">
                {a.owner}, {a.status}
              </span>
            </span>
            <span className={`cwl-num cwl-date${a.overdue ? ' cwl-down' : ''}`}>
              {a.overdue ? (
                <>
                  <i className="bi bi-exclamation-circle" aria-hidden="true" /> Overdue
                </>
              ) : (
                a.due
              )}
            </span>
          </li>
        ))}
      </ul>
      <Link href={LINKS.assignments} className="cwl-link">
        Open Assignments <i className="bi bi-arrow-right" aria-hidden="true" />
      </Link>
    </>
  );
}

function ComingCard({ status, onRetry, extras }) {
  if (status === 'loading') return <Loading label="Loading what is coming up" rows={4} />;
  if (status === 'error')
    return <Failed onRetry={onRetry}>We couldn&rsquo;t load meetings and due dates.</Failed>;
  const items = comingUp(extras, { now: extras?.now || Date.now() });
  if (!items.length)
    return (
      <Empty href={LINKS.meetings} action="Open Meetings">
        Nothing is scheduled in the next 30 days.
      </Empty>
    );
  return (
    <ul className="cwl-rows">
      {items.map((it) => (
        <li key={it.id} className="cwl-row cwl-row--coming">
          <span className="cwl-num cwl-date cwl-date--left">{it.date}</span>
          <Link href={it.href} className="cwl-rowlink cwl-stack">
            <span className="cwl-ellipsis">{it.title}</span>
            <span className="cwl-meta">
              {it.kind}
              {it.tickers.length ? (
                <>
                  {': '}
                  <span className="cwl-num">{it.tickers.join(', ')}</span>
                </>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
