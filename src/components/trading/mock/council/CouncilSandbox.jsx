'use client';

/**
 * Council sandbox: the council layer of Mock Portfolio (/trading/mock), shown
 * only to council members once their membership is known. The paper account
 * itself (orders, review, close, reset, theses, journal) is unchanged for
 * everyone and keeps its own routes; nothing here places, changes or blocks
 * an order, and real fund data is read-only.
 *
 *   CouncilHeader       heading, sample switch and a compact strip: sandbox
 *                       value and return, real fund return, fund benchmark,
 *                       open pitches, fund challenge rank
 *   CouncilCards        Sandbox versus real fund (rebased over one window),
 *                       IPS snapshot of the sandbox, sector weights against
 *                       the stored cap, pitches with Load into ticket, the
 *                       real fund's holdings (read-only), fund challenge
 *                       standing
 *   CouncilOrderCheck   the council's stored rules read against the sandbox
 *                       after the order being typed, in the ticket and in the
 *                       review dialog. Descriptive only.
 *
 * Every figure comes from src/lib/org-mock-portfolio-model.js over the
 * viewer's own sandbox and the council's own records, or the labelled sample
 * (master admin and demo accounts only), which is never saved.
 */
import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { Skeleton, SkeletonRegion } from '@/components/ds';
import { CHART } from '@/lib/chart-theme';
import {
  COMPARE_RANGES,
  IPS_STATES,
  NA,
  chartGeometry,
  challengeRows,
  clipToRange,
  fmtDate,
  fmtPct,
  fmtSignedPct,
  fmtUSD,
  fundHoldings,
  fundReturn,
  ipsSummary,
  parseCompactDollars,
  pitchRows,
  rebaseCompare,
  sandboxBook,
  sandboxIpsCheck,
  sectorResolver,
  sectorWeights,
  toneOf,
} from '@/lib/org-mock-portfolio-model';
import './council-sandbox.css';

const LINKS = {
  compliance: '/org-team-hub/compliance',
  pipeline: '/org-team-hub/pitches',
  desk: '/org-trading',
  challenges: '/org-competitions?tab=fund',
};

/* ── States ─────────────────────────────────────────────────────────────── */

function Loading({ label, rows = 3 }) {
  return (
    <SkeletonRegion label={label} className="cmk-skel">
      {['100%', '82%', '64%', '90%', '72%'].slice(0, rows).map((w) => (
        <Skeleton key={w} height={10} width={w} />
      ))}
    </SkeletonRegion>
  );
}

function Empty({ children, href, onClick, action }) {
  return (
    <div className="cmk-state">
      <p>{children}</p>
      {href ? (
        <Link href={href} className="cmk-link">
          {action}
        </Link>
      ) : onClick ? (
        <button type="button" className="cmk-link" onClick={onClick}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

function Failed({ children, onRetry }) {
  return (
    <div className="cmk-state cmk-state--error" role="alert">
      <p>
        <i className="bi bi-exclamation-circle" aria-hidden="true" />
        <span>{children}</span>
      </p>
      <button type="button" className="cmk-link" onClick={onRetry}>
        <i className="bi bi-arrow-clockwise" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function Section({ area, icon, title, aside, children, busy, controls }) {
  const id = useId();
  return (
    <section
      className={`cmk-sec cmk-sec--${area}`}
      aria-labelledby={id}
      aria-busy={busy || undefined}
    >
      <div className="cmk-sec__head">
        <h3 id={id} className="cmk-sec__title">
          <i className={`bi ${icon}`} aria-hidden="true" />
          <span>{title}</span>
        </h3>
        {controls}
        {aside ? <span className="cmk-sec__aside">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

/* A part of the extras: error when the request failed or the route sent
   that part as null. */
function part(extras, key) {
  if (extras.status !== 'ready') return { status: extras.status, data: null, retry: extras.retry };
  const data = extras.data?.[key];
  return data == null
    ? { status: 'error', data: null, retry: extras.retry }
    : { status: 'ready', data, retry: extras.retry };
}

const TONE = { up: 'cmk-up', down: 'cmk-down', warn: 'cmk-warn', muted: 'cmk-muted' };

function StateWord({ state, short = false }) {
  const s = IPS_STATES[state] || IPS_STATES.untested;
  return (
    <span className={`cmk-word ${TONE[s.tone]}`}>
      <i className={`bi ${s.icon}`} aria-hidden="true" />
      {short && state === 'block' ? 'Would be blocked' : s.label}
    </span>
  );
}

function Signed({ v }) {
  return <span className={`cmk-num ${TONE[toneOf(v)] || ''}`}>{fmtSignedPct(v)}</span>;
}

/* ── Shared derivation ──────────────────────────────────────────────────── */

/**
 * The books the council layer reads. `real` is the viewer's own paper
 * account; while the sample shows, the cards read the sample sandbox instead,
 * but the order check always reads the real account (it checks the real
 * order being typed).
 */
function useBooks(council, real, marketSectors) {
  const { policyPositions, sandbox, sampleActive } = council;
  return useMemo(() => {
    const sectorOf = sectorResolver({ fundPositions: policyPositions || [], marketSectors });
    const realBook = sandboxBook({
      positions: real?.positions || [],
      cash: real?.cash ?? 0,
      sectorOf,
    });
    const cardBook =
      sampleActive && sandbox
        ? sandboxBook({ positions: sandbox.positions, cash: sandbox.cash, sectorOf })
        : realBook;
    const start = sampleActive && sandbox ? sandbox.startingCash : real?.startingCash;
    return {
      sectorOf,
      realBook,
      cardBook,
      start,
      returnPct: start > 0 && cardBook.total > 0 ? (cardBook.total / start - 1) * 100 : null,
    };
  }, [policyPositions, sandbox, sampleActive, real, marketSectors]);
}

/* ── Header and strip ───────────────────────────────────────────────────── */

export function CouncilHeader({ council, real, marketSectors, councilName = null }) {
  const headId = useId();
  const { fund, extras, sampleActive, sampleAvailable, viewerMemberId } = council;
  const books = useBooks(council, real, marketSectors);
  const pitches = part(extras, 'pitches');
  const challenges = part(extras, 'challenges');
  const name = sampleActive ? 'Sample council' : councilName || 'Your council';

  const fundReady = fund.status === 'ready';
  const fr = fundReady ? fundReturn(fund.raw?.positions || []) : null;
  const bench = fundReady ? fund.raw?.benchmark : null;
  const rows =
    pitches.status === 'ready'
      ? pitchRows(pitches.data, fund.raw?.members || [], viewerMemberId)
      : [];
  const mine = rows.filter((r) => r.mine).length;
  const standing = challenges.status === 'ready' ? challengeRows(challenges.data)[0] : null;
  const sandboxLoading = sampleActive ? false : real?.loading;

  const cells = [
    {
      label: 'Sandbox value',
      icon: 'bi-wallet2',
      status: sandboxLoading ? 'loading' : 'ready',
      value: <span className="cmk-num">{fmtUSD(books.cardBook.total)}</span>,
    },
    {
      label: 'Sandbox return',
      icon: 'bi-graph-up-arrow',
      status: sandboxLoading ? 'loading' : 'ready',
      value: <Signed v={books.returnPct} />,
    },
    {
      label: 'Real fund since inception',
      icon: 'bi-bank',
      status: fund.status,
      value: <Signed v={fr?.pct} />,
    },
    {
      label: bench?.symbol ? `Fund benchmark (${bench.symbol})` : 'Fund benchmark',
      icon: 'bi-bar-chart-line',
      status: fund.status,
      value: <Signed v={bench?.pct} />,
    },
    {
      label: mine ? 'My open pitches' : 'Open pitches',
      icon: 'bi-easel',
      status: pitches.status,
      value: <span className="cmk-num">{mine || rows.length}</span>,
    },
    {
      label: 'Fund challenge rank',
      icon: 'bi-trophy',
      status: challenges.status,
      value: (
        <span className="cmk-num">
          {standing?.rank != null
            ? standing.field
              ? `${standing.rank} of ${standing.field}`
              : standing.rank
            : NA}
        </span>
      ),
    },
  ];
  const failed = cells.filter((c) => c.status === 'error');

  return (
    <section className="cmk-head" aria-labelledby={headId}>
      <div className="cmk-head__row">
        <div className="cmk-head__title">
          <h2 id={headId}>
            <i className="bi bi-people" aria-hidden="true" />
            Council sandbox
          </h2>
          <span className="cmk-muted">
            {name}. Visible to council members only. The sandbox is simulated and never trades the
            real fund.
          </span>
        </div>
        <div className="cmk-head__actions">
          {sampleActive ? (
            <span className="cmk-sample">
              <i className="bi bi-info-circle" aria-hidden="true" /> Sample content
            </span>
          ) : null}
          {sampleAvailable ? (
            <button
              type="button"
              className="cmk-tb"
              aria-pressed={!sampleActive}
              onClick={() => council.setShowSample(!sampleActive)}
            >
              {sampleActive ? 'Show council data' : 'Show sample content'}
            </button>
          ) : null}
          <Link href={LINKS.desk} className="cmk-link">
            Trading Desk <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
      {sampleActive ? (
        <p className="cmk-note">
          The council figures below are a sample sandbox and the sample council, and nothing on them
          is saved. Your own paper account is unchanged, and the order check reads it.
        </p>
      ) : null}
      <div className="cmk-strip">
        {cells.map((c) => (
          <div key={c.label} className="cmk-kpi">
            <i className={`bi ${c.icon} cmk-kpi__icon`} aria-hidden="true" />
            <span className="cmk-kpi__text">
              <span className="cmk-kpi__label">{c.label}</span>
              {c.status === 'loading' ? (
                <Skeleton height={14} width={64} />
              ) : c.status === 'error' ? (
                <span className="cmk-kpi__value cmk-muted">{NA}</span>
              ) : (
                <span className="cmk-kpi__value">{c.value}</span>
              )}
            </span>
          </div>
        ))}
      </div>
      {failed.length ? (
        <Failed
          onRetry={() => {
            if (fund.status === 'error') fund.retry?.();
            if (extras.status === 'error' || pitches.status === 'error') extras.retry?.();
          }}
        >
          Some council figures could not be loaded.
        </Failed>
      ) : null}
    </section>
  );
}

/* ── The order check (ticket and review dialog) ─────────────────────────── */

/**
 * order: { side, symbol, amount } of the ticket, or null. The check never
 * feeds back into the order: it has no callbacks.
 */
export function CouncilOrderCheck({
  council,
  real,
  marketSectors,
  order = null,
  marketCapText = null,
  variant = 'ticket',
}) {
  const marketCap = parseCompactDollars(marketCapText);
  const { fund, sampleActive } = council;
  const books = useBooks(council, real, marketSectors);
  const titleId = useId();
  const rules = fund.raw?.rules;
  const hasOrder = Boolean(order?.symbol && order.amount > 0);
  const check = useMemo(
    () =>
      fund.status === 'ready'
        ? sandboxIpsCheck({
            rules: rules || [],
            book: books.realBook,
            order: hasOrder ? { ...order, sector: books.sectorOf(order.symbol) } : null,
            marketCap,
          })
        : null,
    [fund.status, rules, books, hasOrder, order, marketCap],
  );

  let body;
  if (fund.status === 'loading') body = <Loading label="Loading the council's rules" />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>We couldn&rsquo;t load the council&rsquo;s rules.</Failed>;
  else if (!check?.hasRules)
    body = (
      <Empty href={LINKS.compliance} action="Compliance">
        The council has no active IPS rules stored.
      </Empty>
    );
  else if (!hasOrder)
    body = <p className="cmk-muted cmk-small">Enter an order to check it against these rules.</p>;
  else
    body = (
      <>
        <p className="cmk-small cmk-soft">{ipsSummary(check.counts)}</p>
        <ul className="cmk-rules cmk-rules--compact">
          {check.rows.map((r) => (
            <li key={r.id}>
              <span className="cmk-rules__label">{r.label}</span>
              <StateWord state={r.state} short={variant === 'ticket'} />
              <span className="cmk-rules__detail">{r.detail}</span>
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <div
      className={`cmk-check cmk-check--${variant}`}
      role="group"
      aria-labelledby={titleId}
      aria-live="polite"
    >
      <p id={titleId} className="cmk-check__title">
        <i className="bi bi-shield-check" aria-hidden="true" />
        Council IPS check
        {sampleActive ? <span className="cmk-sample">Sample rules</span> : null}
      </p>
      <p className="cmk-faint cmk-small">
        Descriptive only. It never stops or changes a sandbox order, and nothing is logged.
      </p>
      {body}
    </div>
  );
}

/* ── The council cards ──────────────────────────────────────────────────── */

export function CouncilCards({ council, real, marketSectors, range, onRange, onLoadTicker }) {
  const headId = useId();
  const { fund, extras, series, viewerMemberId, sampleActive } = council;
  const books = useBooks(council, real, marketSectors);
  const pitches = part(extras, 'pitches');
  const snapshots = part(extras, 'snapshots');
  const challenges = part(extras, 'challenges');
  const sandboxLoading = !sampleActive && real?.loading;

  return (
    <section className="cmk-band" aria-labelledby={headId}>
      <div className="cmk-band__head">
        <h2 id={headId}>
          <i className="bi bi-people" aria-hidden="true" />
          Council features
        </h2>
        <span className="cmk-muted cmk-small">
          {sampleActive ? 'Sample content. ' : ''}Read-only. Real fund records are never changed
          here.
        </span>
      </div>

      <CompareCard
        series={series}
        snapshots={snapshots}
        range={range}
        onRange={onRange}
        sampleActive={sampleActive}
      />

      <div className="cmk-pair">
        <Section
          area="ips"
          icon="bi-shield-check"
          title="IPS snapshot"
          aside="Descriptive"
          busy={fund.status === 'loading' || sandboxLoading}
        >
          <IpsSnapshot fund={fund} book={books.cardBook} loading={sandboxLoading} />
        </Section>
        <span className="cmk-pair__rule" aria-hidden="true" />
        <Section
          area="sectors"
          icon="bi-layers"
          title="Sector weights"
          busy={fund.status === 'loading' || sandboxLoading}
        >
          <SectorCard
            fund={fund}
            book={books.cardBook}
            policyPositions={council.policyPositions}
            loading={sandboxLoading}
          />
        </Section>
      </div>

      <PitchesCard
        pitches={pitches}
        fund={fund}
        viewerMemberId={viewerMemberId}
        onLoadTicker={onLoadTicker}
      />

      <HoldingsCard fund={fund} />

      <Section
        area="challenge"
        icon="bi-trophy"
        title="Fund challenge standing"
        busy={challenges.status === 'loading'}
      >
        <ChallengeCard part={challenges} />
      </Section>
    </section>
  );
}

/* ── Sandbox versus real fund ───────────────────────────────────────────── */

function CompareCard({ series, snapshots, range, onRange, sampleActive }) {
  const status =
    series.status === 'error' || snapshots.status === 'error'
      ? 'error'
      : series.status === 'loading' || snapshots.status === 'loading'
        ? 'loading'
        : 'ready';
  const cmp = useMemo(() => {
    if (status !== 'ready') return null;
    const points = sampleActive
      ? clipToRange(series.data?.points || [], range)
      : series.data?.points || [];
    return rebaseCompare({
      points,
      benchmark: series.data?.benchmark || [],
      snapshots: snapshots.data || [],
    });
  }, [status, series.data, snapshots.data, range, sampleActive]);
  const geo = useMemo(() => (cmp ? chartGeometry(cmp) : null), [cmp]);
  const gradId = useId().replace(/:/g, '');

  const controls = (
    <div className="cmk-ranges" role="group" aria-label="Range">
      {COMPARE_RANGES.map((r) => (
        <button
          key={r}
          type="button"
          className={`cmk-range cmk-num${range === r ? ' is-on' : ''}`}
          aria-pressed={range === r}
          onClick={() => onRange(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );

  let body;
  if (status === 'loading')
    body = (
      <SkeletonRegion label="Loading the comparison" className="cmk-chart-skel">
        <Skeleton height={200} width="100%" />
      </SkeletonRegion>
    );
  else if (status === 'error')
    body = (
      <Failed
        onRetry={() => {
          if (series.status === 'error') series.retry?.();
          if (snapshots.status === 'error') snapshots.retry?.();
        }}
      >
        We couldn&rsquo;t load the comparison.
      </Failed>
    );
  else if (!cmp?.start)
    body = <Empty>Your sandbox has no value history yet. Place a paper order to start one.</Empty>;
  else {
    const legend = [
      ['sandbox', 'Sandbox', cmp.last.sandbox],
      ['fund', 'Real fund', cmp.last.fund],
      ['spy', 'S&P 500', cmp.last.spy],
    ];
    body = (
      <div className="cmk-compare">
        <div className="cmk-compare__chart">
          {geo ? (
            <svg
              viewBox={`0 0 ${geo.w} ${geo.h}`}
              className="cmk-svg"
              role="img"
              aria-label={`Sandbox ${fmtSignedPct(cmp.last.sandbox)}, real fund ${fmtSignedPct(cmp.last.fund)}, S&P 500 ${fmtSignedPct(cmp.last.spy)} from ${fmtDate(cmp.start)} to ${fmtDate(cmp.end)}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: 'var(--chart-fill-start)' }} />
                  <stop offset="100%" style={{ stopColor: 'var(--chart-fill-end)' }} />
                </linearGradient>
              </defs>
              {geo.ticks.map((t) => (
                <g key={t.v}>
                  <line
                    x1={geo.left}
                    x2={geo.right}
                    y1={t.y}
                    y2={t.y}
                    className="cmk-grid"
                    strokeDasharray={CHART.gridDash}
                  />
                  <text x={geo.left - 6} y={t.y + 4} className="cmk-tick" textAnchor="end">
                    {`${t.v > 0 ? '+' : ''}${t.v.toFixed(Math.abs(t.v) < 10 && t.v % 1 ? 1 : 0)}%`}
                  </text>
                </g>
              ))}
              <line
                x1={geo.left}
                x2={geo.right}
                y1={geo.zeroY}
                y2={geo.zeroY}
                className="cmk-zero"
              />
              {geo.paths.area ? <path d={geo.paths.area} fill={`url(#${gradId})`} /> : null}
              {geo.paths.spy ? (
                <path
                  d={geo.paths.spy}
                  className="cmk-line cmk-line--spy"
                  strokeDasharray={CHART.benchmarkDash}
                  strokeWidth={CHART.secondaryStrokeWidth}
                />
              ) : null}
              {geo.paths.fund ? (
                <path
                  d={geo.paths.fund}
                  className="cmk-line cmk-line--fund"
                  strokeWidth={CHART.primaryStrokeWidth}
                />
              ) : null}
              <path
                d={geo.paths.sandbox}
                className="cmk-line cmk-line--sandbox"
                strokeWidth={CHART.primaryStrokeWidth}
              />
              {geo.xLabels.map((l, i) => (
                <text
                  key={l.t}
                  x={l.x}
                  y={geo.h - 4}
                  className="cmk-tick"
                  textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
                >
                  {l.label}
                </text>
              ))}
            </svg>
          ) : null}
        </div>
        <div className="cmk-compare__side">
          <ul className="cmk-legend">
            {legend.map(([key, label, v]) => (
              <li key={key}>
                <span className={`cmk-swatch cmk-swatch--${key}`} aria-hidden="true" />
                <span>{label}</span>
                <Signed v={v} />
              </li>
            ))}
          </ul>
          <p className="cmk-faint cmk-small">
            Each line starts at 0% on <span className="cmk-num">{fmtDate(cmp.start)}</span>, the
            first day of the sandbox in this range, and runs to{' '}
            <span className="cmk-num">{fmtDate(cmp.end)}</span>.
          </p>
          {cmp.fundNote === 'none' ? (
            <p className="cmk-small cmk-soft">
              The real fund has no daily value history for this range, so its line is not drawn.
            </p>
          ) : cmp.fundNote === 'late' ? (
            <p className="cmk-small cmk-soft">
              The fund&rsquo;s history in this range starts on{' '}
              <span className="cmk-num">{fmtDate(cmp.fundStart)}</span>; its line starts at 0%
              there.
            </p>
          ) : null}
          {!cmp.spy.length ? (
            <p className="cmk-small cmk-soft">The S&amp;P 500 line is unavailable right now.</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Section
      area="compare"
      icon="bi-graph-up"
      title="Sandbox versus real fund"
      busy={status === 'loading'}
      controls={controls}
    >
      {body}
    </Section>
  );
}

/* ── IPS snapshot ───────────────────────────────────────────────────────── */

function IpsSnapshot({ fund, book, loading }) {
  if (fund.status === 'loading' || loading)
    return <Loading label="Loading the IPS snapshot" rows={4} />;
  if (fund.status === 'error')
    return <Failed onRetry={fund.retry}>We couldn&rsquo;t load the council&rsquo;s rules.</Failed>;
  const check = sandboxIpsCheck({ rules: fund.raw?.rules || [], book });
  if (!check.hasRules)
    return (
      <Empty href={LINKS.compliance} action="Compliance">
        The council has no active IPS rules stored.
      </Empty>
    );
  return (
    <>
      <p className="cmk-small cmk-soft">
        Your sandbox holdings read against the council&rsquo;s rules. {ipsSummary(check.counts)}
      </p>
      <ul className="cmk-rules">
        {check.rows.map((r) => (
          <li key={r.id}>
            <span className="cmk-rules__label">{r.label}</span>
            <StateWord state={r.state} />
            <span className="cmk-rules__detail">{r.detail}</span>
          </li>
        ))}
      </ul>
      <p className="cmk-faint cmk-small">
        Hard rules are the ones the council&rsquo;s pitch form refuses. Nothing here stops a sandbox
        order.
      </p>
    </>
  );
}

/* ── Sector weights ─────────────────────────────────────────────────────── */

function SectorCard({ fund, book, policyPositions, loading }) {
  if (fund.status === 'loading' || loading)
    return <Loading label="Loading sector weights" rows={4} />;
  if (fund.status === 'error')
    return <Failed onRetry={fund.retry}>We couldn&rsquo;t load the fund&rsquo;s sectors.</Failed>;
  const w = sectorWeights({
    book,
    fundPositions: policyPositions || [],
    rules: fund.raw?.rules || [],
  });
  if (!w.rows.length)
    return (
      <Empty href={LINKS.desk} action="Trading Desk">
        Neither the sandbox nor the fund holds a position yet.
      </Empty>
    );
  const over = (flag) =>
    flag ? (
      <i className="bi bi-exclamation-triangle cmk-warn" aria-label="Above the cap" role="img" />
    ) : null;
  return (
    <>
      <div className="cmk-table-wrap">
        <table className="cmk-table">
          <thead>
            <tr>
              <th scope="col">Sector</th>
              <th scope="col" className="is-num">
                Sandbox
              </th>
              <th scope="col" className="is-num">
                Real fund
              </th>
              <th scope="col" className="is-num">
                Cap
              </th>
            </tr>
          </thead>
          <tbody>
            {w.rows.map((r) => (
              <tr key={r.sector}>
                <td className={r.unclassified ? 'cmk-muted' : undefined}>{r.sector}</td>
                <td className="is-num">
                  <span className="cmk-num">{fmtPct(r.sandbox)}</span> {over(r.sandboxOver)}
                </td>
                <td className="is-num">
                  <span className="cmk-num">{fmtPct(r.fund)}</span> {over(r.fundOver)}
                </td>
                <td className="is-num cmk-num">{r.cap == null ? NA : `${r.cap}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="cmk-faint cmk-small">
        Share of each one&rsquo;s total value. Sandbox cash is{' '}
        <span className="cmk-num">{fmtPct(w.sandboxCash)}</span>.
        {w.cap == null ? (
          ' No sector cap is stored.'
        ) : (
          <> The cap is the council&rsquo;s lowest active stored sector cap.</>
        )}
      </p>
    </>
  );
}

/* ── Pitches ────────────────────────────────────────────────────────────── */

function PitchesCard({ pitches, fund, viewerMemberId, onLoadTicker }) {
  const status =
    pitches.status === 'error' || fund.status === 'error'
      ? 'error'
      : pitches.status === 'loading' || fund.status === 'loading'
        ? 'loading'
        : 'ready';
  const rows = useMemo(
    () =>
      status === 'ready' ? pitchRows(pitches.data, fund.raw?.members || [], viewerMemberId) : [],
    [status, pitches.data, fund.raw, viewerMemberId],
  );
  const mineCount = rows.filter((r) => r.mine).length;
  const [pick, setPick] = useState(null);
  const view = pick || (mineCount ? 'mine' : 'all');
  const shown = view === 'mine' ? rows.filter((r) => r.mine) : rows;

  const controls =
    status === 'ready' && rows.length ? (
      <div className="cmk-ranges" role="group" aria-label="Pitches shown">
        {[
          ['mine', `Mine (${mineCount})`],
          ['all', `All open (${rows.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`cmk-range${view === id ? ' is-on' : ''}`}
            aria-pressed={view === id}
            onClick={() => setPick(id)}
          >
            {label}
          </button>
        ))}
      </div>
    ) : null;

  let body;
  if (status === 'loading') body = <Loading label="Loading pitches" rows={4} />;
  else if (status === 'error')
    body = (
      <Failed
        onRetry={() => {
          if (pitches.status === 'error') pitches.retry?.();
          if (fund.status === 'error') fund.retry?.();
        }}
      >
        We couldn&rsquo;t load the council&rsquo;s pitches.
      </Failed>
    );
  else if (!rows.length)
    body = (
      <Empty href={LINKS.pipeline} action="Pitch Pipeline">
        The council has no open pitches.
      </Empty>
    );
  else if (!shown.length)
    body = (
      <Empty onClick={() => setPick('all')} action="Show all open pitches">
        You have no open pitches.
      </Empty>
    );
  else
    body = (
      <div className="cmk-table-wrap">
        <table className="cmk-table cmk-table--pitches">
          <thead>
            <tr>
              <th scope="col">Ticker</th>
              <th scope="col">Company</th>
              <th scope="col">Analyst</th>
              <th scope="col">Stage</th>
              <th scope="col" className="is-num">
                Expected return
              </th>
              <th scope="col" className="is-num">
                <span className="cmk-sr">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="cmk-num cmk-ticker">{r.ticker}</td>
                <td className="cmk-ellipsis">{r.company || NA}</td>
                <td>{r.mine ? 'You' : r.analyst || NA}</td>
                <td>{r.stage}</td>
                <td className="is-num">
                  <Signed v={r.expected} />
                </td>
                <td className="is-num">
                  <button
                    type="button"
                    className="cmk-link"
                    onClick={() => onLoadTicker(r.ticker, r.company || r.ticker)}
                    aria-label={`Load ${r.ticker} into the order ticket`}
                  >
                    Load into ticket
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <Section
      area="pitches"
      icon="bi-easel"
      title="Pitches"
      busy={status === 'loading'}
      controls={controls}
      aside="Load into ticket fills the order ticket. Nothing is placed."
    >
      {body}
    </Section>
  );
}

/* ── Real fund holdings ─────────────────────────────────────────────────── */

const HOLDINGS_LIMIT = 12;

function HoldingsCard({ fund }) {
  const [all, setAll] = useState(false);
  const rows = useMemo(() => (fund.status === 'ready' ? fundHoldings(fund.raw) : []), [fund]);
  const shown = all ? rows : rows.slice(0, HOLDINGS_LIMIT);

  let body;
  if (fund.status === 'loading') body = <Loading label="Loading the fund's holdings" rows={5} />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>We couldn&rsquo;t load the fund&rsquo;s holdings.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.desk} action="Trading Desk">
        The real fund holds no positions yet.
      </Empty>
    );
  else
    body = (
      <>
        <div className="cmk-table-wrap">
          <table className="cmk-table">
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col">Company</th>
                <th scope="col">Sector</th>
                <th scope="col">Team</th>
                <th scope="col" className="is-num">
                  Weight
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="cmk-num cmk-ticker">{r.ticker}</td>
                  <td className="cmk-ellipsis">{r.name || NA}</td>
                  <td>{r.sector || NA}</td>
                  <td>{r.team || NA}</td>
                  <td className="is-num">
                    <span className="cmk-num">{fmtPct(r.weight)}</span>
                    {!r.priced ? <span className="cmk-faint cmk-small"> at cost</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > HOLDINGS_LIMIT ? (
          <button
            type="button"
            className="cmk-link cmk-link--start"
            onClick={() => setAll((v) => !v)}
          >
            {all ? 'Show fewer' : `Show all ${rows.length}`}
          </button>
        ) : null}
      </>
    );

  return (
    <Section
      area="holdings"
      icon="bi-grid-3x3"
      title="Real fund holdings"
      busy={fund.status === 'loading'}
      aside={
        <>
          <i className="bi bi-lock" aria-hidden="true" /> Read-only
        </>
      }
    >
      {body}
    </Section>
  );
}

/* ── Fund challenge standing ────────────────────────────────────────────── */

function ChallengeCard({ part: p }) {
  if (p.status === 'loading') return <Loading label="Loading fund challenge standing" rows={2} />;
  if (p.status === 'error')
    return <Failed onRetry={p.retry}>We couldn&rsquo;t load the challenge standing.</Failed>;
  const rows = challengeRows(p.data);
  if (!rows.length)
    return (
      <Empty href={LINKS.challenges} action="View challenges">
        The council is not entered in a fund challenge.
      </Empty>
    );
  return (
    <ul className="cmk-challenges">
      {rows.map((r) => (
        <li key={r.id}>
          <span className="cmk-challenges__name">{r.name}</span>
          <span className="cmk-stat">
            <span className="cmk-stat__label">Rank</span>
            <span className="cmk-num cmk-stat__value">
              {r.rank != null ? (r.field ? `${r.rank} of ${r.field}` : r.rank) : NA}
            </span>
          </span>
          <span className="cmk-stat">
            <span className="cmk-stat__label">Return since entry</span>
            <span className="cmk-stat__value">
              <Signed v={r.return_pct} />
            </span>
          </span>
          <span className="cmk-stat">
            <span className="cmk-stat__label">Ends</span>
            <span className="cmk-num cmk-stat__value">{fmtDate(r.ends_at)}</span>
          </span>
          <span className="cmk-stat">
            <span className="cmk-stat__label">Status</span>
            <span className="cmk-stat__value">
              {r.status === 'active' ? 'Active' : r.status || NA}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
