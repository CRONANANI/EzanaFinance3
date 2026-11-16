'use client';

/**
 * "For our council": the council band of Ezana Echo (/ezana-echo), shown
 * only to council members once their membership is known. The public front
 * page is unchanged for everyone; this band sits between the Article of the
 * Month and Latest Stories.
 *
 *   strip              holdings, sector teams, open pitches, stories on our names
 *   Echo on our names  stories tagged with a held or open-pitch ticker
 *   Pitch prep reading open pitches that have Echo stories on them
 *   My saved articles  the viewer's own saved list (private to them)
 *   Council reads      the council's published research, exemplars first
 *   Sector coverage    each sector team, who covers it, its Echo stories
 *
 * Every figure comes from src/lib/org-ezana-echo-model.js over the council's
 * own records (or the labelled sample, master admin and demo accounts only)
 * and Echo's real published stories. Nothing on the band writes. Collapse
 * is remembered per viewer in this browser.
 */
import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { Skeleton, SkeletonRegion } from '@/components/ds';
import {
  LINKS,
  NA,
  councilReads,
  namesRows,
  ourTickers,
  pitchPrepRows,
  sampleSavedRows,
  savedRows,
  sectorRows,
  stripFigures,
} from '@/lib/org-ezana-echo-model';
import './echo-council.css';

const storeKey = (userId) => `echo.council.collapsed.${userId || 'viewer'}`;

/* ── States ─────────────────────────────────────────────────────────────── */

function Loading({ label, rows = 4 }) {
  return (
    <SkeletonRegion label={label} className="ecc-skel">
      {['92%', '74%', '84%', '60%', '70%'].slice(0, rows).map((w) => (
        <span key={w} className="ecc-skel__row">
          <Skeleton height={10} width={44} />
          <Skeleton height={10} width={w} />
        </span>
      ))}
    </SkeletonRegion>
  );
}

function Empty({ children, href, onClick, action }) {
  return (
    <div className="ecc-state">
      <p>{children}</p>
      {href ? (
        <Link href={href} className="ecc-link">
          {action}
        </Link>
      ) : onClick ? (
        <button type="button" className="ecc-link" onClick={onClick}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

function Failed({ children, onRetry }) {
  return (
    <div className="ecc-state ecc-state--error" role="alert">
      <p>
        <i className="bi bi-exclamation-circle" aria-hidden="true" />
        <span>{children}</span>
      </p>
      <button type="button" className="ecc-link" onClick={onRetry}>
        <i className="bi bi-arrow-clockwise" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function Col({ icon, title, note, aside, children, busy, wide = false }) {
  const id = useId();
  return (
    <section
      className={`ecc-col${wide ? ' ecc-col--wide' : ''}`}
      aria-labelledby={id}
      aria-busy={busy || undefined}
    >
      <div className="ecc-col__head">
        <h3 id={id} className="ecc-col__title">
          <i className={`bi ${icon}`} aria-hidden="true" />
          <span>{title}</span>
        </h3>
        {aside ? <span className="ecc-faint ecc-col__aside">{aside}</span> : null}
      </div>
      {note ? <p className="ecc-col__note">{note}</p> : null}
      {children}
    </section>
  );
}

/* Combined status of several parts: error wins, then loading. */
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

/* ── The band ───────────────────────────────────────────────────────────── */

export default function EchoCouncilBand({
  council,
  stories,
  councilName = null,
  userId = null,
  onBrowse,
  onOurNames,
}) {
  const { fund, extras, saved, sampleActive, sampleAvailable, setShowSample } = council;
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(storeKey(userId)) === '1');
    } catch {
      /* storage blocked: the band opens expanded */
    }
  }, [userId]);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(storeKey(userId), next ? '1' : '0');
    } catch {
      /* the choice still holds for this visit */
    }
  };

  const raw = fund.raw;
  const x = extras.data;
  const bothReady = fund.status === 'ready' && extras.status === 'ready';
  const tickers = useMemo(() => ourTickers(raw, x?.pitches || []), [raw, x]);
  const names = useMemo(
    () => (bothReady ? namesRows(stories, tickers) : { total: 0, rows: [] }),
    [bothReady, stories, tickers],
  );
  const strip = bothReady ? stripFigures(raw, x.pitches || [], names.total) : null;
  const members = useMemo(() => {
    const list = [...(x?.members || [])];
    const seen = new Set(list.map((m) => m.id));
    for (const m of raw?.members || []) if (!seen.has(m.id)) list.push(m);
    return list;
  }, [x, raw]);

  const name = sampleActive ? 'Sample council' : councilName || 'your council';
  const bodyId = useId();
  const headId = useId();

  return (
    <section className="ecc-band" aria-labelledby={headId}>
      <div className="ecc-head">
        <div className="ecc-head__title">
          <h2 id={headId}>For our council</h2>
          <span className="ecc-muted">
            Echo on the names {name} holds and pitches. Visible to council members only.
          </span>
        </div>
        <div className="ecc-head__actions">
          {sampleActive ? <span className="ecc-faint">Sample content</span> : null}
          {sampleAvailable ? (
            <button
              type="button"
              className="ecc-tb"
              aria-pressed={!sampleActive}
              onClick={() => setShowSample(!sampleActive)}
            >
              {sampleActive ? 'Show council data' : 'Show sample content'}
            </button>
          ) : null}
          <Link href={LINKS.teamHub} className="ecc-link">
            Open in Team Hub <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="ecc-tb"
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={toggle}
          >
            {collapsed ? 'Expand' : 'Collapse'}
            <i className={`bi bi-chevron-${collapsed ? 'down' : 'up'}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {collapsed ? (
        <p className="ecc-summary ecc-num" id={bodyId}>
          {strip
            ? `${name} · ${strip.holdings} holdings · ${strip.pitches} open pitches · ${strip.stories} Echo stories on our names`
            : name}
        </p>
      ) : (
        <div id={bodyId}>
          <Strip status={joint(fund, extras)} strip={strip} onRetry={retryAll(fund, extras)} />
          <div className="ecc-grid">
            <Col
              icon="bi-graph-up"
              title="Echo on our names"
              note="Stories tagged with a ticker we hold or pitch."
              busy={joint(fund, extras) === 'loading'}
            >
              <NamesCard
                status={joint(fund, extras)}
                names={names}
                onRetry={retryAll(fund, extras)}
                onBrowse={onBrowse}
                onOurNames={onOurNames}
              />
            </Col>
            <Col
              icon="bi-layers"
              title="Pitch prep reading"
              note="Echo stories on the names in our pipeline."
              busy={extras.status === 'loading'}
            >
              <PitchCard extras={extras} stories={stories} members={members} />
            </Col>
            <Col
              icon="bi-bookmark"
              title="My saved articles"
              note="Your own list. No one else in the council sees it."
              busy={!sampleActive && saved.status === 'loading'}
            >
              <SavedCard
                saved={saved}
                sampleActive={sampleActive}
                stories={stories}
                onBrowse={onBrowse}
              />
            </Col>
            <Col
              icon="bi-journal-text"
              title="Council reads"
              note="Published research from our Research Library, exemplars first."
              busy={extras.status === 'loading'}
            >
              <ReadsCard extras={extras} members={members} />
            </Col>
            <Col
              icon="bi-diagram-3"
              title="Sector coverage"
              note="Each sector team, who covers it and the Echo stories on its holdings."
              busy={fund.status === 'loading'}
              wide
            >
              <SectorCard fund={fund} stories={stories} />
            </Col>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Strip ──────────────────────────────────────────────────────────────── */

function Strip({ status, strip, onRetry }) {
  if (status === 'error')
    return (
      <div className="ecc-strip ecc-strip--state">
        <Failed onRetry={onRetry}>We couldn&rsquo;t load the council&rsquo;s names.</Failed>
      </div>
    );
  const cell = (label, value, detail) => (
    <div className="ecc-kpi">
      <span className="ecc-kpi__label">{label}</span>
      {status === 'loading' ? (
        <Skeleton height={14} width={64} />
      ) : (
        <span className="ecc-kpi__value ecc-num">{value}</span>
      )}
      {status === 'loading' ? null : detail ? (
        <span className="ecc-kpi__detail">{detail}</span>
      ) : null}
    </div>
  );
  const list = (arr, mono = true) =>
    arr && arr.length ? <span className={mono ? 'ecc-num' : undefined}>{arr.join(', ')}</span> : NA;
  return (
    <div className="ecc-strip" aria-busy={status === 'loading' || undefined}>
      {cell('Holdings', strip ? strip.holdings : NA, strip ? list(strip.heldList) : null)}
      {cell(
        'Sector teams',
        strip ? strip.teams.length : NA,
        strip ? list(strip.teams, false) : null,
      )}
      {cell('Open pitches', strip ? strip.pitches : NA, strip ? list(strip.pitchList) : null)}
      {cell('Echo stories on our names', strip ? strip.stories : NA, null)}
    </div>
  );
}

/* ── Cards ──────────────────────────────────────────────────────────────── */

function NamesCard({ status, names, onRetry, onBrowse, onOurNames }) {
  if (status === 'loading') return <Loading label="Loading Echo on our names" />;
  if (status === 'error')
    return <Failed onRetry={onRetry}>We couldn&rsquo;t load the council&rsquo;s names.</Failed>;
  if (!names.rows.length)
    return (
      <Empty onClick={onBrowse} action="Browse all stories">
        No Echo stories mention our names yet.
      </Empty>
    );
  return (
    <>
      <ul className="ecc-rows">
        {names.rows.map((r) => (
          <li key={r.id} className="ecc-row ecc-row--names">
            <span className="ecc-ticker ecc-num" title={r.kind}>
              {r.ticker}
            </span>
            <Link href={r.href} className="ecc-rowlink">
              <span>{r.title}</span>
              <span className="ecc-meta">
                {r.kind}
                {r.more > 0 ? ` and ${r.more} more of ours` : ''}
              </span>
            </Link>
            <span className="ecc-num ecc-date">{r.date}</span>
          </li>
        ))}
      </ul>
      {onOurNames ? (
        <button type="button" className="ecc-link" onClick={onOurNames}>
          Show all {names.total} in Latest Stories{' '}
          <i className="bi bi-arrow-down" aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
}

function PitchCard({ extras, stories, members }) {
  const data = useMemo(
    () =>
      extras.status === 'ready' && extras.data?.pitches
        ? pitchPrepRows(stories, extras.data.pitches, members)
        : null,
    [extras, stories, members],
  );
  if (extras.status === 'loading') return <Loading label="Loading pitch prep reading" />;
  if (extras.status === 'error' || !data)
    return <Failed onRetry={extras.retry}>We couldn&rsquo;t load the pipeline.</Failed>;
  if (!data.open)
    return (
      <Empty href={LINKS.pitches} action="Open Pitch Pipeline">
        No pitches in the pipeline yet.
      </Empty>
    );
  if (!data.rows.length)
    return (
      <Empty href={LINKS.pitches} action="Open Pitch Pipeline">
        No Echo stories mention our {data.open} open pitches yet.
      </Empty>
    );
  return (
    <ul className="ecc-rows">
      {data.rows.map((r) => (
        <li key={r.id} className="ecc-row ecc-row--names">
          <Link href={LINKS.pitch(r.id)} className="ecc-ticker ecc-num ecc-tickerlink">
            {r.ticker}
          </Link>
          <Link href={r.story.href} className="ecc-rowlink">
            <span>{r.story.title}</span>
            <span className="ecc-meta">
              {r.stage}
              {r.lead ? ` · ${r.lead}` : ''}
            </span>
          </Link>
          <span className="ecc-num ecc-date" title="Echo stories on this name">
            {r.count} {r.count === 1 ? 'story' : 'stories'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SavedCard({ saved, sampleActive, stories, onBrowse }) {
  const data = useMemo(() => {
    if (sampleActive) return sampleSavedRows(stories);
    if (saved.status !== 'ready') return null;
    const list = Array.isArray(saved.data?.saved)
      ? saved.data.saved
      : (saved.data?.savedIds || []).map((id) => ({ id, savedAt: null }));
    return savedRows(stories, list);
  }, [sampleActive, saved, stories]);
  if (!sampleActive && saved.status === 'loading')
    return <Loading label="Loading your saved articles" rows={3} />;
  if (!data)
    return <Failed onRetry={saved.retry}>We couldn&rsquo;t load your saved articles.</Failed>;
  if (!data.rows.length)
    return (
      <Empty onClick={onBrowse} action="Browse latest stories">
        {data.missing
          ? 'Your saved articles are no longer published.'
          : 'You have not saved any articles.'}
      </Empty>
    );
  return (
    <ul className="ecc-rows">
      {data.rows.map((r) => (
        <li key={r.id} className="ecc-row ecc-row--saved">
          <Link href={r.href} className="ecc-rowlink">
            <span>{r.title}</span>
          </Link>
          <span className="ecc-num ecc-date" title="Saved on">
            {r.date}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ReadsCard({ extras, members }) {
  if (extras.status === 'loading') return <Loading label="Loading council reads" />;
  if (extras.status === 'error' || !extras.data?.notes)
    return <Failed onRetry={extras.retry}>We couldn&rsquo;t load council research.</Failed>;
  const rows = councilReads(extras.data.notes, members);
  if (!rows.length)
    return (
      <Empty href={LINKS.library} action="Open Research Library">
        No council research published yet.
      </Empty>
    );
  return (
    <ul className="ecc-rows">
      {rows.map((r) => (
        <li key={r.id} className="ecc-row ecc-row--saved">
          <Link href={r.href} className="ecc-rowlink">
            <span>{r.title}</span>
            <span className="ecc-meta">
              <span className={r.kind === 'Exemplar' ? 'ecc-accent' : undefined}>{r.kind}</span>
              {` · ${r.author}`}
            </span>
          </Link>
          <span className="ecc-num ecc-date">{r.date}</span>
        </li>
      ))}
    </ul>
  );
}

function SectorCard({ fund, stories }) {
  if (fund.status === 'loading') return <Loading label="Loading sector coverage" />;
  if (fund.status === 'error')
    return <Failed onRetry={fund.retry}>We couldn&rsquo;t load sector coverage.</Failed>;
  const rows = sectorRows(fund.raw, stories);
  if (!rows.length)
    return (
      <Empty href={LINKS.orgChart} action="Open the org chart">
        No sector teams set up yet.
      </Empty>
    );
  return (
    <div className="ecc-table" role="table" aria-label="Sector coverage">
      <div className="ecc-tr ecc-tr--head" role="row">
        <span role="columnheader">Sector team</span>
        <span role="columnheader">Covered by</span>
        <span role="columnheader" className="ecc-r">
          Holdings
        </span>
        <span role="columnheader" className="ecc-r">
          Echo stories
        </span>
        <span role="columnheader" className="ecc-hide-sm">
          Newest story
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="ecc-tr" role="row">
          <span role="cell" className="ecc-strong">
            {r.name}
          </span>
          <span role="cell" className="ecc-ellipsis" title={r.owners}>
            {r.owners}
          </span>
          <span role="cell" className="ecc-r ecc-num">
            {r.holdings}
          </span>
          <span role="cell" className="ecc-r ecc-num">
            {r.count}
          </span>
          <span role="cell" className="ecc-hide-sm ecc-ellipsis">
            {r.latest ? (
              <Link href={r.latest.href} className="ecc-rowlink" title={r.latest.title}>
                {r.latest.title}
              </Link>
            ) : (
              <span className="ecc-muted">{NA}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
