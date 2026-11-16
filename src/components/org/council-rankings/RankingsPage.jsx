'use client';

/**
 * Council Rankings (/council-rankings): the standing table of councils on one
 * blended rating (competition 60 percent, fund 40 percent). No events, dates
 * of events, teams or entry steps: those live on Competitions.
 *
 * Everyone sees the table (it is the public leaderboard). A signed-in
 * council member also sees their own council marked in emerald text, a KPI
 * strip for it, the councils directly above and below, and which part of the
 * rating is ahead. Executives and portfolio managers report the council's
 * fund ratios from here (the same form and route as Competitions).
 *
 * Sample content (master admin and demo accounts, labelled) replaces the
 * table while it shows; it is never mixed with real councils and nothing
 * done to it is saved.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VisuallyHidden } from '@/components/ds';
import {
  COMP_WEIGHT,
  COMPETITIONS_HREF,
  COUNCIL_FORM_HREF,
  FUND_ANALYTICS_HREF,
  FUND_WEIGHT,
  NA,
  SORTS,
  applySampleRatios,
  filterRows,
  fmtDate,
  fmtInt,
  fmtPctSigned,
  fmtRatio,
  fmtSigned,
  nextTier,
  ownStanding,
  partsLine,
  rankRows,
  sortOf,
  tierLabel,
} from '@/lib/council-rankings-model';
import { ArrowLink, Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';
import { ReportRatiosDialog } from './ReportRatiosDialog';
import { SelfReported, Signed, Tier } from './CouncilParts';
import '@/components/org/command-center/command-center.css';
import '@/styles/home-canvas.css';

const SAMPLE_URL = '/api/org/council-rankings/sample';

/* ── Small parts ────────────────────────────────────────────────────────── */
function Kpi({ icon, label, loading, na, title, children }) {
  return (
    <div className="tcc-kpi crx-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${na ? ' tcc-na' : ''}`}>
        {loading ? <Skel w={48} h={16} /> : children}
      </span>
    </div>
  );
}

function Search({ value, onChange }) {
  return (
    <label className="crx-search">
      <i className="bi bi-search" aria-hidden="true" />
      <span className="tcc-sr">Search councils</span>
      <input
        type="search"
        value={value}
        placeholder="Search councils"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TableSkeleton({ rows = 8 }) {
  return (
    <div className="crx-skel" aria-hidden="true">
      <Skel w="100%" h={12} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} w={`${100 - (i % 3) * 5}%`} h={16} />
      ))}
    </div>
  );
}

/** Keep the chosen order in the page address (?sort=competition). */
function writeSort(key) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (key && key !== 'overall') url.searchParams.set('sort', key);
  else url.searchParams.delete('sort');
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`)
    return;
  try {
    window.history.replaceState(window.history.state, '', next);
  } catch {
    /* The address could not be updated; the table itself is unaffected. */
  }
}

/* ── The table ──────────────────────────────────────────────────────────── */
function RankingsTable({ rows, myOrgId, sortKey }) {
  return (
    <div className="crx-tablewrap">
      <table className="crx-table">
        <caption className="tcc-sr">
          {`Councils by ${sortOf(sortKey).note}, high to low. Equal ratings share a rank.`}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="crx-c-rank crx-num">
              #
            </th>
            <th scope="col" className="crx-c-name">
              Council
            </th>
            <th scope="col" className="crx-c-tier">
              Tier
            </th>
            <th scope="col" className="crx-c-rating crx-num">
              Rating
            </th>
            <th scope="col" className="crx-c-part crx-num" title="Competition rating, judged">
              Comp
            </th>
            <th scope="col" className="crx-c-part crx-num" title="Fund rating, self-reported">
              Fund
            </th>
            <th scope="col" className="crx-c-ratio crx-num" title="Reported return">
              ROI
            </th>
            <th scope="col" className="crx-c-ratio crx-c-sharpe crx-num">
              Sharpe
            </th>
            <th scope="col" className="crx-c-move crx-num" title="Latest change to the rating">
              Move
            </th>
            <th scope="col" className="crx-c-date crx-num" title="Date of the latest change">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const mine = r.orgId === myOrgId;
            return (
              <tr key={r.orgId} className={mine ? 'is-mine' : undefined}>
                <td className="crx-c-rank crx-num tcc-mono">{r.rank}</td>
                <td className="crx-c-name">
                  <Link href={`/council-rankings/${r.orgId}`} className="crx-name">
                    {r.name}
                  </Link>
                  {mine && <span className="tcc-sr"> (your council)</span>}
                  {r.reported && r.selfReported && (
                    <span className="crx-name__sub">
                      <SelfReported period={r.period} />
                    </span>
                  )}
                </td>
                <td className="crx-c-tier">
                  <Tier tier={r.tier} />
                </td>
                <td className="crx-c-rating crx-num tcc-mono crx-strong">{fmtInt(r.rating)}</td>
                <td className="crx-c-part crx-num tcc-mono">{fmtInt(r.comp)}</td>
                <td className="crx-c-part crx-num tcc-mono">{fmtInt(r.fund)}</td>
                <td className={`crx-c-ratio crx-num tcc-mono${r.roi == null ? ' tcc-na' : ''}`}>
                  {fmtPctSigned(r.roi)}
                </td>
                <td
                  className={`crx-c-ratio crx-c-sharpe crx-num tcc-mono${r.sharpe == null ? ' tcc-na' : ''}`}
                >
                  {fmtRatio(r.sharpe)}
                </td>
                <td className="crx-c-move crx-num" title={r.moveAt ? fmtDate(r.moveAt) : undefined}>
                  <Signed value={r.move} />
                </td>
                <td className={`crx-c-date crx-num tcc-mono${r.moveAt ? '' : ' tcc-na'}`}>
                  {fmtDate(r.moveAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Your council: neighbours and what moves the rating ─────────────────── */
function YourCouncil({ standing, canReport, onReport }) {
  const { me, nearest } = standing;
  const parts = partsLine(me.comp, me.fund);
  return (
    <section className="crx-own" aria-labelledby="crx-own-title">
      <h2 className="tcc-title crx-own__title" id="crx-own-title">
        Your council
      </h2>
      <div className="tcc-row tcc-row--narrow crx-own__row">
        <div className="tcc-section">
          <h3 className="crx-subtitle">Nearest councils</h3>
          <table className="crx-table crx-mini">
            <caption className="tcc-sr">
              The councils directly above and below yours on the overall rating
            </caption>
            <thead>
              <tr>
                <th scope="col" className="crx-c-rank crx-num">
                  #
                </th>
                <th scope="col">Council</th>
                <th scope="col" className="crx-c-tier">
                  Tier
                </th>
                <th scope="col" className="crx-num">
                  Rating
                </th>
                <th scope="col" className="crx-num" title="Their rating less yours">
                  Gap
                </th>
              </tr>
            </thead>
            <tbody>
              {nearest.map((r) => (
                <tr key={r.orgId} className={r.gap === null ? 'is-mine' : undefined}>
                  <td className="crx-c-rank crx-num tcc-mono">{r.rank}</td>
                  <td>
                    <Link href={`/council-rankings/${r.orgId}`} className="crx-name">
                      {r.name}
                    </Link>
                  </td>
                  <td className="crx-c-tier">
                    <Tier tier={r.tier} />
                  </td>
                  <td className="crx-num tcc-mono">{fmtInt(r.rating)}</td>
                  <td className="crx-num">
                    {r.gap === null ? (
                      <span className="tcc-mono tcc-na">{NA}</span>
                    ) : (
                      <Signed value={r.gap} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="tcc-vrule" aria-hidden="true" />
        <div className="tcc-section">
          <h3 className="crx-subtitle">What moves the rating</h3>
          <dl className="crx-parts">
            <div className="crx-part">
              <dt>Competition rating ({COMP_WEIGHT}%)</dt>
              <dd className="tcc-mono crx-part__val">{fmtInt(me.comp)}</dd>
              <dd className="crx-part__why">
                {me.competed
                  ? 'From judged competition results'
                  : 'No placement in a judged event yet, so it reads 1000'}
              </dd>
            </div>
            <div className="crx-part">
              <dt>Fund rating ({FUND_WEIGHT}%)</dt>
              <dd className="tcc-mono crx-part__val">{fmtInt(me.fund)}</dd>
              <dd className="crx-part__why">
                {me.reported ? (
                  <>
                    From reported fund ratios, relative to every reporting council{' '}
                    {me.selfReported && <SelfReported period={me.period} />}
                  </>
                ) : (
                  'No fund ratios reported yet, so it reads 1000'
                )}
              </dd>
            </div>
          </dl>
          {parts && (
            <p className="crx-parts__line">
              <span>{parts.text}</span>
              {parts.ahead && <span className="tcc-mono">{fmtSigned(parts.by)}</span>}
              {parts.weaker === 'competition' && (
                <ArrowLink href={COMPETITIONS_HREF}>Competitions</ArrowLink>
              )}
              {parts.weaker === 'fund' &&
                (canReport ? (
                  <button
                    type="button"
                    className="tcc-textbtn tcc-textbtn--accent"
                    onClick={onReport}
                  >
                    Report fund ratios
                  </button>
                ) : (
                  <ArrowLink href={FUND_ANALYTICS_HREF}>Fund Analytics</ArrowLink>
                ))}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── The page ───────────────────────────────────────────────────────────── */
export function RankingsPage({
  rows: liveRows = [],
  failed = false,
  myOrgId: liveOrgId = null,
  isMember = false,
  canReport = false,
  sampleViewer = false,
  initialSort = null,
}) {
  const router = useRouter();
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', bundle: null } : { status: 'ready', bundle: null },
  );
  const [showSample, setShowSample] = useState(true);
  const [sortKey, setSortKey] = useState(() => sortOf(initialSort).key);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(false);
  const [notice, setNotice] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sampleViewer) return;
    (async () => {
      let bundle = null;
      try {
        const res = await fetch(SAMPLE_URL, { cache: 'no-store' });
        if (res.ok) bundle = (await res.json())?.sample || null;
      } catch {
        bundle = null;
      }
      if (alive.current) setSample({ status: 'ready', bundle });
    })();
  }, [sampleViewer]);

  useEffect(() => {
    setRetrying(false);
  }, [liveRows, failed]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;
  const loading = sampleViewer && sample.status === 'loading';
  const showFailed = !sampleActive && !loading && failed;

  /* Sample content replaces the table; it is never mixed with real rows. */
  const rows = useMemo(
    () => (sampleActive ? sample.bundle.rows : liveRows),
    [sampleActive, sample.bundle, liveRows],
  );
  const myOrgId = sampleActive ? sample.bundle.myOrgId : liveOrgId;
  const memberView = sampleActive || isMember;
  const reportable = canReport;

  const ranked = useMemo(() => rankRows(rows, sortKey), [rows, sortKey]);
  const shown = useMemo(() => filterRows(ranked, query), [ranked, query]);
  const standing = useMemo(() => ownStanding(rows, myOrgId), [rows, myOrgId]);
  const tierNext = standing ? nextTier(standing.me.rating) : null;

  /* Switching between sample content and council data starts fresh. */
  const lastSample = useRef(sampleActive);
  useEffect(() => {
    if (lastSample.current === sampleActive) return;
    lastSample.current = sampleActive;
    setNotice(null);
    setQuery('');
  }, [sampleActive]);

  const chooseSort = (key) => {
    setSortKey(key);
    writeSort(key);
  };

  const retry = useCallback(() => {
    setRetrying(true);
    router.refresh();
  }, [router]);

  const onSaved = ({ sample: wasSample }) => {
    setNotice(
      wasSample
        ? 'Fund ratios applied. Sample content: they are not saved, and the rating is not recalculated.'
        : 'Fund ratios saved. They show as self-reported, and the rating is recalculated once a day.',
    );
    if (!wasSample) router.refresh();
  };

  const myMetrics = standing?.me?.metrics || null;
  const busy = loading || retrying;

  /* ── Row 1: context and page actions ── */
  const actions = (
    <div className="crx-actions">
      <div className="crx-actions__context">
        {sampleActive && <span className="tcc-sample">Sample content</span>}
        {sampleAvailable && (
          <button
            type="button"
            className="tcc-textbtn"
            onClick={() => setShowSample(!sampleActive)}
          >
            {sampleActive ? 'Show council data' : 'Show sample content'}
          </button>
        )}
      </div>
      {memberView && (
        <div className="crx-actions__links">
          {reportable && (
            <button
              type="button"
              className="tcc-btn"
              onClick={() => setDialog(true)}
              disabled={busy}
            >
              <i className="bi bi-pencil-square" aria-hidden="true" />
              Report fund ratios
            </button>
          )}
          <Link href={COMPETITIONS_HREF} className="tcc-textbtn">
            Competitions
          </Link>
          <Link href={FUND_ANALYTICS_HREF} className="tcc-textbtn">
            Fund Analytics
          </Link>
        </div>
      )}
    </div>
  );

  /* ── Row 2: KPI strip ── */
  const own = standing;
  const leagueReporting = rows.filter((r) => r.reported).length;
  const top = ranked[0] || null;
  const kpis =
    memberView && (own || busy) ? (
      <div className="tcc-kpistrip crx-kpistrip" role="list" aria-label="Your council">
        <Kpi icon="bi-list-ol" label="Your council rank" loading={busy} na={!own}>
          {own ? `${own.rank} / ${own.field}` : NA}
        </Kpi>
        <Kpi icon="bi-bar-chart" label="Overall rating" loading={busy} na={!own}>
          {own ? fmtInt(own.me.rating) : NA}
        </Kpi>
        <Kpi
          icon="bi-trophy"
          label="Competition rating"
          loading={busy}
          na={!own}
          title="Judged results, weighted 60 percent"
        >
          {own ? fmtInt(own.me.comp) : NA}
        </Kpi>
        <Kpi
          icon="bi-graph-up"
          label="Fund rating"
          loading={busy}
          na={!own}
          title="Self-reported fund ratios, weighted 40 percent"
        >
          {own ? fmtInt(own.me.fund) : NA}
          {own?.me.reported && own.me.selfReported && (
            <i className="bi bi-exclamation-triangle crx-kpi__warn" aria-label="Self-reported" />
          )}
        </Kpi>
        <Kpi
          icon="bi-arrow-up"
          label="Gap to next council"
          loading={busy}
          na={!own || own.gapToNext === null}
          title="Points to the council directly above on the overall rating"
        >
          {own && own.gapToNext !== null ? fmtInt(own.gapToNext) : NA}
        </Kpi>
        <Kpi
          icon="bi-flag"
          label="Points to next tier"
          loading={busy}
          na={!own || !tierNext}
          title={tierNext ? `Points to ${tierLabel(tierNext.tier)}` : 'Already in the top tier'}
        >
          {own && tierNext ? fmtInt(tierNext.points) : NA}
        </Kpi>
      </div>
    ) : (
      <div
        className="tcc-kpistrip crx-kpistrip crx-kpistrip--league"
        role="list"
        aria-label="The table"
      >
        <Kpi icon="bi-people" label="Councils ranked" loading={busy} na={showFailed}>
          {showFailed ? NA : rows.length}
        </Kpi>
        <Kpi icon="bi-bar-chart" label="Highest rating" loading={busy} na={showFailed || !top}>
          {showFailed || !top ? NA : fmtInt(top.rating)}
        </Kpi>
        <Kpi
          icon="bi-graph-up"
          label="Reporting fund ratios"
          loading={busy}
          na={showFailed}
          title="Councils whose managers reported ratios (self-reported)"
        >
          {showFailed ? NA : leagueReporting}
        </Kpi>
        <Kpi
          icon="bi-clock-history"
          label="Latest change"
          loading={busy}
          na={showFailed || !rows.some((r) => r.moveAt)}
        >
          {showFailed
            ? NA
            : fmtDate(
                rows
                  .map((r) => r.moveAt)
                  .filter(Boolean)
                  .sort()
                  .pop() || null,
              )}
        </Kpi>
      </div>
    );

  /* ── The table section ── */
  let table;
  if (busy) table = <TableSkeleton />;
  else if (showFailed)
    table = <SectionError message="The rankings could not be loaded." onRetry={retry} />;
  else if (rows.length === 0)
    table = (
      <p className="tcc-state">
        <span>Rankings appear once councils place in judged events or report fund ratios.</span>
        {isMember && <ArrowLink href={COMPETITIONS_HREF}>Open Competitions</ArrowLink>}
      </p>
    );
  else if (shown.length === 0)
    table = (
      <p className="tcc-state">
        <span>No council matches this search.</span>
        <button
          type="button"
          className="tcc-textbtn tcc-textbtn--accent"
          onClick={() => setQuery('')}
        >
          Clear search
        </button>
      </p>
    );
  else table = <RankingsTable rows={shown} myOrgId={myOrgId} sortKey={sortKey} />;

  /* ── Your council ── */
  let ownSection = null;
  if (memberView && !busy && !showFailed) {
    if (standing) {
      ownSection = (
        <YourCouncil standing={standing} canReport={reportable} onReport={() => setDialog(true)} />
      );
    } else if (rows.length > 0 || isMember) {
      ownSection = (
        <section className="crx-own" aria-labelledby="crx-own-title">
          <h2 className="tcc-title crx-own__title" id="crx-own-title">
            Your council
          </h2>
          <p className="tcc-state">
            <span>
              Your council is not on the table yet. It appears after a placement in a judged event
              or a fund ratio report.
            </span>
            {canReport ? (
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={() => setDialog(true)}
              >
                Report fund ratios
              </button>
            ) : (
              <ArrowLink href={COMPETITIONS_HREF}>Open Competitions</ArrowLink>
            )}
          </p>
        </section>
      );
    }
  }

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page crx-page">
      <div className="crx-container">
        <VisuallyHidden>
          <h1>Council Rankings</h1>
        </VisuallyHidden>
        {actions}
        <div className="crx-kpis" aria-busy={busy || undefined}>
          {kpis}
        </div>
        <p className="crx-method">
          One standing table of councils. The rating is {COMP_WEIGHT}% competition (judged results,
          verified) and {FUND_WEIGHT}% fund (ratios the council reports, self-reported). Ratios
          only, never dollar amounts.
        </p>

        {notice && (
          <p className="crx-notice" role="status">
            <i className="bi bi-check2-circle" aria-hidden="true" />
            <span>{notice}</span>
            <button type="button" className="tcc-textbtn" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </p>
        )}

        <section
          className="crx-board"
          aria-labelledby="crx-board-title"
          aria-busy={busy || undefined}
        >
          <h2 className="tcc-sr" id="crx-board-title">
            Rankings
          </h2>
          <div className="crx-toolbar">
            <div className="tcc-toggles crx-sorts" role="group" aria-label="Rank by">
              {SORTS.map((s) => (
                <TextToggle
                  key={s.key}
                  pressed={sortKey === s.key}
                  onClick={() => chooseSort(s.key)}
                >
                  {s.label}
                </TextToggle>
              ))}
            </div>
            <Search value={query} onChange={setQuery} />
            <span className="crx-toolbar__note">Sorted by {sortOf(sortKey).note}, high to low</span>
          </div>
          {table}
        </section>

        {ownSection}

        {!memberView && (
          <p className="crx-method crx-method--foot">
            Council members see their own council marked and summarised here.
          </p>
        )}
        {memberView && !reportable && standing && (
          <p className="crx-method crx-method--foot">
            Executives and portfolio managers report the fund ratios, here or on{' '}
            <Link href={COUNCIL_FORM_HREF} className="tcc-link">
              Competitions
            </Link>
            .
          </p>
        )}
      </div>

      {dialog && reportable && (
        <ReportRatiosDialog
          metrics={myMetrics}
          sample={sampleActive}
          onSampleSave={(form) =>
            setSample((s) => ({ ...s, bundle: applySampleRatios(s.bundle, myOrgId, form) }))
          }
          onClose={() => setDialog(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

export default RankingsPage;
