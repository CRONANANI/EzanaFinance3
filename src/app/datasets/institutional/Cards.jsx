'use client';

/**
 * Institutional Holdings cards 1, 2, 3, 5 and 6: Quarter Ledger, Filing
 * Season Clock, Net Flow Board, Sector Rotation, Fresh Conviction & Clean
 * Exits. Spec: institutional-handoff/04-SPEC.md section 4. Components
 * render; every number comes from the model or the snapshot.
 */
import { useMemo, useState } from 'react';
import {
  divergingScale,
  filingCurveDiff,
  flowAdjustedChange,
  netBreadth,
  pctFiled,
  sectorRows,
} from '@/lib/titans/institutional-model';
import { whaleScore } from '@/lib/whale-score';
import { int, pct, quarterShort, shortDate, signedInt, signedPct, usd } from '@/lib/titans/format';
import { Card, M, ScoreChip, Skel } from './ui';

const CLOCK_H = 210;
const DEADLINE_DAYS = 45;

/* ── Card 1: Quarter Ledger ──────────────────────────────────────────── */

export function LedgerRow({ overview, chip, chipPartial }) {
  const o = overview;
  const delta = (nowV, priorV) => (nowV != null && priorV != null ? nowV - priorV : null);
  const tiles = [
    {
      label: 'Filers',
      value: int(o?.filers) ?? M,
      delta: signedInt(delta(o?.filers, o?.prior?.filers)),
      note: 'vs prior quarter',
    },
    {
      label: 'Reported value',
      value: usd(o?.totalValueUsd) ?? M,
      delta:
        delta(o?.totalValueUsd, o?.prior?.totalValueUsd) != null
          ? `${delta(o?.totalValueUsd, o?.prior?.totalValueUsd) >= 0 ? '+' : '-'}${usd(Math.abs(delta(o?.totalValueUsd, o?.prior?.totalValueUsd)))}`
          : null,
      note: 'price and flow',
    },
    {
      label: 'Positions',
      value: int(o?.holdings) ?? M,
      delta: signedInt(delta(o?.holdings, o?.prior?.holdings)),
      note: 'vs prior quarter',
    },
    {
      label: 'Filers with a prior quarter',
      value: int(o?.filersWithPrior) ?? M,
      delta: o?.filers ? pct((o.filersWithPrior / o.filers) * 100, 1) : null,
      ink: true,
      note: 'of filers · base for every change',
    },
  ];
  return (
    <div className="inst-ledger">
      {tiles.map((t) => (
        <div key={t.label} className="inst-card inst-tile">
          <p className="inst-tile-top">
            <span className="inst-eyebrow">{t.label}</span>
            <span className="inst-mono inst-muted">{chipPartial ? `${chip} · partial` : chip}</span>
          </p>
          <p className="inst-kpi">{t.value}</p>
          <p className="inst-tile-delta inst-mono">
            {t.delta ? (
              <span
                className={t.ink ? '' : `inst-${String(t.delta).startsWith('-') ? 'neg' : 'pos'}`}
              >
                {t.delta}
              </span>
            ) : (
              M
            )}{' '}
            <span className="inst-muted">{t.note}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Card 2: Filing Season Clock ─────────────────────────────────────── */

export function FilingClockCard({ curve, openQuarter, priorQuarterLabel, onManager, loading }) {
  const openPts = curve?.open || [];
  const priorPts = curve?.prior || [];
  const day = curve?.todayDay ?? curve?.today_day ?? null;
  const filed = openPts.length ? openPts[openPts.length - 1][1] : 0;
  const priorFinal = curve?.priorFinal ?? curve?.prior_final ?? 0;
  const diff = filingCurveDiff(openPts, priorPts, day ?? 0);
  const sameDayPrior = filed - diff;
  const filedPct = pctFiled(filed, priorFinal);
  const daysLeft = day != null ? Math.max(0, DEADLINE_DAYS - day) : null;
  const deadlineLabel = shortDate(curve?.deadline);
  const qLabel = quarterShort(openQuarter);
  const maxY = Math.max(priorFinal, filed, 1);

  const path = (pts, close) => {
    if (!pts.length) return '';
    const seg = pts
      .map(([d, c], i) => `${i ? 'L' : 'M'} ${(d / DEADLINE_DAYS) * 100} ${100 - (c / maxY) * 100}`)
      .join(' ');
    if (!close) return seg;
    const last = pts[pts.length - 1];
    return `${seg} L ${(last[0] / DEADLINE_DAYS) * 100} 100 L ${(pts[0][0] / DEADLINE_DAYS) * 100} 100 Z`;
  };

  const empty =
    !loading && !openPts.length
      ? `No 13F-HR filed yet for ${qLabel}. The window opened ${shortDate(openQuarter)} and closes ${deadlineLabel}.`
      : null;

  return (
    <Card
      id="inst-clock"
      icon="bi-hourglass-split"
      eyebrow="Filing season clock"
      title={`How much of ${qLabel} has been filed, and who filed early?`}
      chip={`${qLabel} · partial`}
      chipPartial
      sourceExtra={deadlineLabel ? `Partial until ${deadlineLabel}.` : null}
      empty={empty}
    >
      {loading ? (
        <>
          <Skel h={60} />
          <Skel h={CLOCK_H} />
        </>
      ) : (
        <>
          <div className="inst-clock-kpis">
            <div>
              <p className="inst-kpi inst-kpi--md">{int(filed) ?? M}</p>
              <p className="inst-note">
                managers filed, day {day ?? M} of {DEADLINE_DAYS}
              </p>
            </div>
            <div>
              <p className={`inst-kpi inst-kpi--md ${diff >= 0 ? 'inst-pos' : 'inst-neg'}`}>
                {signedInt(diff) ?? M}
              </p>
              <p className="inst-note">
                vs {priorQuarterLabel} on the same day ({int(sameDayPrior) ?? M})
              </p>
            </div>
            <div>
              <p className="inst-kpi inst-kpi--md">{daysLeft ?? M}</p>
              <p className="inst-note">days to the {deadlineLabel} deadline</p>
            </div>
          </div>

          <div className="inst-clock-chart">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line
                className="inst-grid"
                x1={(15 / 45) * 100}
                y1="0"
                x2={(15 / 45) * 100}
                y2="100"
              />
              <line
                className="inst-grid"
                x1={(30 / 45) * 100}
                y1="0"
                x2={(30 / 45) * 100}
                y2="100"
              />
              <path className="inst-clock-prior" d={path(priorPts)} />
              <path className="inst-clock-openfill" d={path(openPts, true)} />
              <path className="inst-clock-open" d={path(openPts)} />
              {day != null ? (
                <line
                  className="inst-clock-today"
                  x1={(day / 45) * 100}
                  y1="0"
                  x2={(day / 45) * 100}
                  y2="100"
                />
              ) : null}
            </svg>
            {day != null ? (
              <span className="inst-clock-tag inst-mono" style={{ left: `${(day / 45) * 100}%` }}>
                Today · {shortDate(new Date().toISOString())?.replace(/, \d{4}$/, '')}
              </span>
            ) : null}
            <span className="inst-clock-final inst-mono">
              {priorQuarterLabel} final {int(priorFinal)}
            </span>
            <p className="inst-axis inst-mono" aria-hidden="true">
              <span>{shortDate(openQuarter)?.replace(/, \d{4}$/, '')} · day 0</span>
              <span>day 15</span>
              <span>day 30</span>
              <span>{deadlineLabel?.replace(/, \d{4}$/, '')} · day 45</span>
            </p>
            <p className="inst-legend">
              <span>
                <i className="inst-dot inst-dot--watch" aria-hidden="true" /> {qLabel} so far
                {filedPct != null ? ` (${pct(filedPct * 100, 1)} of ${priorQuarterLabel})` : ''}
              </span>
              <span>
                <i className="inst-dot inst-dot--ghost" aria-hidden="true" /> {priorQuarterLabel},
                full window
              </span>
            </p>
          </div>

          {curve?.earlyMovers?.length || curve?.early_movers?.length ? (
            <div className="inst-movers">
              <p className="inst-eyebrow">Early movers · largest managers already filed</p>
              {(curve.earlyMovers || curve.early_movers).map((m) => {
                const head = m.headline;
                const headText = head
                  ? `${head.kind === 'new' ? 'New' : head.kind === 'largest_cut' ? 'Largest cut' : 'Largest add'} ${head.ticker}`
                  : null;
                return (
                  <div key={m.cik || m.filer || m.filer_name} className="inst-mover">
                    <span className="inst-mover-name">
                      {m.cik && onManager ? (
                        <button
                          type="button"
                          className="inst-link"
                          onClick={() => onManager(m.cik)}
                        >
                          {m.filer || m.filer_name}
                        </button>
                      ) : (
                        m.filer || m.filer_name
                      )}
                      <span className="inst-mono inst-muted">
                        Filed {shortDate(m.filedAt || m.filed_at)} · {int(m.positions)} positions
                      </span>
                    </span>
                    {headText ? <span className="inst-pill inst-mono">{headText}</span> : null}
                    <span className="inst-mono inst-mover-value">
                      {usd(m.valueUsd ?? m.value_usd)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

/* ── Card 3: Net Flow Board ──────────────────────────────────────────── */

const FLOW_TABS = [
  { id: 'buy', label: 'Most net buyers' },
  { id: 'sell', label: 'Most net sellers' },
  { id: 'new', label: 'Most managers newly entering' },
];

export function NetFlowCard({ overview, chip, chipPartial, onSecurity }) {
  const [tab, setTab] = useState('buy');
  const rows = useMemo(() => {
    const breadth = overview?.breadth || [];
    if (tab === 'new') {
      return [...(overview?.newlyEntering || [])]
        .sort((a, b) => b.newCount - a.newCount)
        .slice(0, 8);
    }
    const sorted = [...breadth].sort((a, b) =>
      tab === 'buy' ? netBreadth(b) - netBreadth(a) : netBreadth(a) - netBreadth(b),
    );
    return sorted.slice(0, 8);
  }, [overview, tab]);
  const scaleMax = useMemo(() => {
    const vals = rows.flatMap((r) =>
      tab === 'new' ? [r.newCount || 0] : [r.buyers || 0, r.sellers || 0],
    );
    const max = Math.max(1, ...vals);
    return Math.ceil(max / 100) * 100;
  }, [rows, tab]);

  const empty =
    overview && !(overview.breadth || []).length
      ? 'Changes need a prior-quarter filing. They appear once both quarters are parsed.'
      : null;

  return (
    <Card
      id="inst-flow"
      icon="bi-arrow-left-right"
      eyebrow="Net flow board"
      title="Which stocks are more managers buying than selling?"
      chip={chip}
      chipPartial={chipPartial}
      empty={empty}
    >
      <div className="inst-tabs" role="tablist" aria-label="Net flow view">
        {FLOW_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`inst-tab${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="inst-flow-rows">
        {rows.map((r) => {
          const net = tab === 'new' ? r.newCount : netBreadth(r);
          return (
            <button
              key={r.cusip}
              type="button"
              className="inst-flow-row"
              onClick={() => onSecurity(r.ticker || r.cusip)}
              aria-label={`${r.ticker || r.issuer}: ${tab === 'new' ? `${int(r.newCount)} managers newly entering` : `${int(r.buyers)} buying, ${int(r.sellers)} selling, net ${signedInt(net)}`}. Open the Security X-ray.`}
            >
              <span className="inst-mono inst-flow-ticker">{r.ticker || <em>{r.issuer}</em>}</span>
              <span className="inst-flow-left" aria-hidden="true">
                {tab !== 'new' ? (
                  <>
                    <span className="inst-mono inst-muted">{int(r.sellers)}</span>
                    <span
                      className="inst-bar inst-bar--sell"
                      style={{ width: `${((r.sellers || 0) / scaleMax) * 78}%` }}
                    />
                  </>
                ) : null}
              </span>
              <span className="inst-flow-right" aria-hidden="true">
                <span
                  className="inst-bar inst-bar--buy"
                  style={{
                    width: `${(((tab === 'new' ? r.newCount : r.buyers) || 0) / scaleMax) * 78}%`,
                  }}
                />
                <span className="inst-mono inst-muted">
                  {tab === 'new' ? `${int(r.holdersNow)} holders` : int(r.buyers)}
                </span>
              </span>
              <span className={`inst-mono inst-flow-net ${net >= 0 ? 'inst-pos' : 'inst-neg'}`}>
                {signedInt(net)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="inst-note inst-note--method">
        <i className="bi bi-info-circle" aria-hidden="true" /> Counts managers, not dollars. Buyers
        are new, added or doubled positions; sellers are trimmed or exited. Built from share counts,
        so a price move alone never counts as buying. Base: {int(overview?.filersWithPrior) ?? M}{' '}
        managers with a prior-quarter filing.
      </p>
    </Card>
  );
}

/* ── Card 5: Sector Rotation ─────────────────────────────────────────── */

export function SectorRotationCard({ overview, chip, chipPartial }) {
  const rows = useMemo(() => sectorRows(overview?.sectors), [overview]);
  const flowMax = useMemo(() => divergingScale(rows.map((r) => r.flowUsd)), [rows]);
  const shareMax = 0.3;
  return (
    <Card
      id="inst-sectors"
      icon="bi-layers"
      eyebrow="Sector rotation"
      title="Where did institutional money move between sectors?"
      chip={chip}
      chipPartial={chipPartial}
      empty={
        overview && !rows.length ? 'Sector rollups appear once both quarters are parsed.' : null
      }
    >
      <div className="inst-sector-rows">
        {rows.map((r) => (
          <div
            key={r.sector}
            className="inst-sector-row"
            title={`${r.sector}: ${pct(r.sharePrior * 100, 1)} to ${pct(r.shareNow * 100, 1)} of equity value · flow ${r.flowUsd >= 0 ? '+' : '-'}${usd(Math.abs(r.flowUsd))}`}
          >
            <span
              className={`inst-sector-name${r.sector === 'Unclassified' ? ' is-unclassified' : ''}`}
            >
              {r.sector}
            </span>
            <span className="inst-dumbbell" aria-hidden="true">
              <span
                className={`inst-dumbbell-connector${r.up ? '' : ' is-down'}`}
                style={{
                  left: `${(Math.min(r.shareNow, r.sharePrior) / shareMax) * 100}%`,
                  width: `${(Math.abs(r.shareNow - r.sharePrior) / shareMax) * 100}%`,
                }}
              />
              <span
                className="inst-dumbbell-prior"
                style={{ left: `${(r.sharePrior / shareMax) * 100}%` }}
              />
              <span
                className={`inst-dumbbell-now${r.up ? '' : ' is-down'}`}
                style={{ left: `${(r.shareNow / shareMax) * 100}%` }}
              />
            </span>
            <span className="inst-mono inst-sector-pcts">
              <span className="inst-muted">{pct(r.sharePrior * 100, 1)}</span>{' '}
              <span className={r.up ? 'inst-pos' : 'inst-neg'}>{pct(r.shareNow * 100, 1)}</span>
            </span>
            <span className="inst-diverging" aria-hidden="true">
              <span className="inst-diverging-zero" />
              <span
                className={`inst-diverging-bar${r.flowUsd >= 0 ? '' : ' is-down'}`}
                style={{
                  width: `${(Math.abs(r.flowUsd) / flowMax) * 50}%`,
                  [r.flowUsd >= 0 ? 'left' : 'right']: '50%',
                }}
              />
            </span>
          </div>
        ))}
      </div>
      <p className="inst-legend">
        <span>
          <i className="inst-dot inst-dot--hollow" aria-hidden="true" /> prior share
        </span>
        <span>
          <i className="inst-dot inst-dot--buy" aria-hidden="true" /> current share up
        </span>
        <span>
          <i className="inst-dot inst-dot--decline" aria-hidden="true" /> current share down
        </span>
      </p>
      <p className="inst-note">
        Flow-adjusted change is share change times current price, so buying shows apart from price
        appreciation. Value with no mapped ticker or sector stays in its own Unclassified band.
      </p>
    </Card>
  );
}

/* ── Card 6: Fresh Conviction & Clean Exits ──────────────────────────── */

const BOOK_SCALE = 0.125;

function MoveRow({ kind, r, onManager, onSecurity }) {
  const pctBook = kind === 'new' ? r.pctOfBook : r.pctOfPriorBook;
  const value = kind === 'new' ? r.valueUsd : r.valuePrior;
  const score = whaleScore({
    kind: 'institutional',
    valueUsd: value,
    sharesNow: kind === 'new' ? r.shares : 0,
    sharesPrior: kind === 'new' ? 0 : r.sharesPrior,
    fundTotalUsd: pctBook ? value / pctBook : null,
    changeType: kind === 'new' ? 'new' : 'exited',
  });
  return (
    <div className="inst-move-row">
      <button type="button" className="inst-link inst-ellipsis" onClick={() => onManager(r.cik)}>
        {r.filer || r.cik}
      </button>
      <button
        type="button"
        className="inst-link inst-mono"
        onClick={() => onSecurity(r.ticker || r.cusip)}
      >
        {r.ticker || 'CUSIP'}
      </button>
      <span className="inst-bookbar" aria-hidden="true">
        <span
          className={`inst-bookbar-fill${kind === 'new' ? '' : ' is-exit'}`}
          style={{ width: `${Math.min(100, ((pctBook || 0) / BOOK_SCALE) * 100)}%` }}
        />
        <span className="inst-mono inst-bookbar-label">
          {pctBook != null ? `${pct(pctBook * 100, 1)} book` : M}
        </span>
      </span>
      <span className={`inst-mono inst-move-value${kind === 'new' ? '' : ' inst-muted'}`}>
        {usd(value) ?? M}
      </span>
      <ScoreChip
        score={score?.score}
        factors="Whale Score factors: conviction 40, newness 30, fund concentration 20, size 10."
      />
    </div>
  );
}

export function FreshExitsCard({ overview, chip, chipPartial, onManager, onSecurity }) {
  const fresh = (overview?.newPositions || []).slice(0, 5);
  const exits = (overview?.exits || []).slice(0, 5);
  return (
    <Card
      id="inst-moves"
      icon="bi-person-badge"
      eyebrow="Fresh conviction and clean exits"
      title="What were the boldest new bets and the full exits this quarter?"
      chip={chip}
      chipPartial={chipPartial}
      empty={
        overview && !fresh.length && !exits.length
          ? 'No new positions or full exits of $100M or more this quarter.'
          : null
      }
    >
      <p className="inst-list-head">
        <i className="inst-dot inst-dot--buy" aria-hidden="true" />
        <span className="inst-eyebrow">Largest new positions</span>
      </p>
      {fresh.map((r) => (
        <MoveRow
          key={`${r.cik}-${r.cusip}`}
          kind="new"
          r={r}
          onManager={onManager}
          onSecurity={onSecurity}
        />
      ))}
      <p className="inst-list-head">
        <i className="inst-dot inst-dot--sell" aria-hidden="true" />
        <span className="inst-eyebrow">Largest complete exits · held before, zero now</span>
      </p>
      {exits.map((r) => (
        <MoveRow
          key={`${r.cik}-${r.cusip}`}
          kind="exit"
          r={r}
          onManager={onManager}
          onSecurity={onSecurity}
        />
      ))}
      <p className="inst-note inst-mono-note">
        Bar = % of that manager&apos;s book (exits: prior quarter). Chip = Whale Score 0 to 100:
        conviction 40, newness 30, fund concentration 20, size 10. Positions of $100M or more.
      </p>
    </Card>
  );
}
