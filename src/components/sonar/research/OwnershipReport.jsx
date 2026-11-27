'use client';

/**
 * Sonar (Nov 27 2026): the Institutional Ownership Analysis answer. Renders the composition's
 * computed `ownership` result (lib/sonar/composer/ownership.js) after the founder's two
 * concepts: a direct answer, four tiles, the ranked table with a ranking control, the
 * participation bars, quarter-over-quarter participation, breadth across reporting periods,
 * the largest reporting managers, findings, caveats and the methodology.
 *
 * Every figure is a computed value. A missing figure reads N/A, never zero. The ranking
 * control re-sorts with the same deterministic comparator the server used. It is built from
 * the research board's own card system (srb-card, srb-exec, srb-kpi, srb-table, srb-pill in
 * research-board.css) so it reads as one Sonar answer; ownership-report.css holds only what
 * the board has no class for. Sonar card rule: no outlines, tokens only, findings only.
 */

import { useMemo, useState } from 'react';
import {
  METRICS,
  rankOwnership,
  quarterLabel,
  fmtUsd,
  fmtInt,
  fmtPct,
  fmtSigned,
} from '@/lib/sonar/composer/ownership';
import './research-board.css';
import './ownership-report.css';

const SERIES = [
  'var(--chart-cat-1)',
  'var(--chart-cat-2)',
  'var(--chart-cat-3)',
  'var(--chart-cat-4)',
  'var(--chart-cat-5)',
];
const STATE_TONE = {
  complete: 'is-ok',
  limited: 'is-warn',
  partial: 'is-warn',
  needs_input: 'is-warn',
  failed: 'is-bad',
};

function Tile({ label, value, note, tone = '' }) {
  return (
    <li className={`srb-card srb-kpi sio-kpi ${tone}`}>
      <span className="srb-kpi-value">{value}</span>
      <span className="srb-kpi-label">{label}</span>
      {note ? <span className="srb-kpi-sub">{note}</span> : null}
    </li>
  );
}

function Bars({ rows }) {
  const top = rows.filter((r) => r.rank != null).slice(0, 10);
  const max = Math.max(1, ...top.map((r) => r.managers));
  if (!top.length) return null;
  return (
    <ol className="sio-bars" aria-label="Distinct 13F reporting managers per holding">
      {top.map((r) => (
        <li key={r.cusip} className="sio-bar">
          <span className="sio-bar-name srb-mono">{r.ticker}</span>
          <span className="sio-bar-track" aria-hidden="true">
            <span
              className={`sio-bar-fill ${r.floor ? 'is-floor' : ''}`}
              style={{ width: `${(r.managers / max) * 100}%` }}
            />
          </span>
          <span className="sio-bar-value srb-mono">{fmtInt(r.managers)}</span>
        </li>
      ))}
    </ol>
  );
}

function Trend({ trend }) {
  if (!trend?.series?.length) return null;
  const W = 520;
  const H = 200;
  const pad = { l: 44, r: 64, t: 12, b: 28 };
  const all = trend.series.flatMap((s) => s.values).filter((v) => v != null);
  if (!all.length) return null;
  const lo = Math.floor((Math.min(...all) * 0.95) / 50) * 50;
  const hi = Math.ceil((Math.max(...all) * 1.02) / 50) * 50;
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / (trend.periods.length - 1 || 1);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  /* End labels sit at least 12px apart so close series stay readable. */
  const ends = trend.series
    .map((s, k) => {
      const i = s.values
        .map((v, j) => (v == null ? -1 : j))
        .filter((j) => j >= 0)
        .pop();
      return i == null ? null : { k, y: y(s.values[i]) + 4 };
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 12) ends[i].y = ends[i - 1].y + 12;
  const labelY = Object.fromEntries(ends.map((e) => [e.k, e.y]));
  return (
    <figure className="sio-trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="sio-trend-t">
        <title id="sio-trend-t">
          Distinct 13F reporting managers per quarter for the five most widely held holdings
        </title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="sio-gridline" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="sio-axis">
              {fmtInt(t)}
            </text>
          </g>
        ))}
        {trend.periods.map((p, i) => (
          <text key={p} x={x(i)} y={H - 8} textAnchor="middle" className="sio-axis">
            {quarterLabel(p)}
          </text>
        ))}
        {trend.series.map((s, k) => {
          const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
          const last = pts[pts.length - 1];
          return (
            <g key={s.cusip}>
              <polyline
                points={pts.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke={SERIES[k % SERIES.length]}
                strokeWidth="2"
              />
              {pts.map((p) => (
                <circle key={p.join()} cx={p[0]} cy={p[1]} r="3" fill={SERIES[k % SERIES.length]} />
              ))}
              {last ? (
                <text
                  x={last[0] + 8}
                  y={labelY[k] ?? last[1] + 4}
                  className="sio-axis sio-series-label"
                  fill={SERIES[k % SERIES.length]}
                >
                  {s.ticker}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="srb-cap">
        Filers loaded per quarter:{' '}
        {trend.periods.map((p, i) => `${quarterLabel(p)} ${fmtInt(trend.filers[i])}`).join(', ')}.
        Counts move with the number of filers loaded as well as with ownership.
      </figcaption>
      <table className="srb-sr">
        <caption>Managers per quarter</caption>
        <thead>
          <tr>
            <th scope="col">Stock</th>
            {trend.periods.map((p) => (
              <th key={p} scope="col">
                {quarterLabel(p)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trend.series.map((s) => (
            <tr key={s.cusip}>
              <th scope="row">{s.ticker}</th>
              {s.values.map((v, i) => (
                <td key={trend.periods[i]}>{fmtInt(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default function OwnershipReport({ analysis, fulfillment = null, onFollowUp = null }) {
  const o = analysis?.ownership;
  const [metric, setMetric] = useState(o?.metric || 'managers');
  const rows = useMemo(() => (o?.rows ? rankOwnership(o.rows, metric) : []), [o, metric]);
  if (!o) return null;
  const name = o.subject?.name || 'These';
  const isMember = o.universe?.kind === 'politician';
  const q = quarterLabel(o.period);
  const ranked = rows.filter((r) => r.rank != null);
  const byManagers = o.rows.filter((r) => r.rank != null).sort((a, b) => b.managers - a.managers);
  const leader = byManagers[0] || null;
  const qoq = o.prior
    ? ranked.reduce(
        (t, r) => ({
          added: t.added + (r.newManagers || 0),
          exited: t.exited + (r.exitedManagers || 0),
          up: t.up + (r.change > 0 ? 1 : 0),
          down: t.down + (r.change < 0 ? 1 : 0),
        }),
        { added: 0, exited: 0, up: 0, down: 0 },
      )
    : null;
  const followUps = [
    metric !== 'value' ? `Rank ${name}'s holdings by aggregate 13F value` : null,
    o.prior ? `Which of ${name}'s holdings added the most 13F managers?` : null,
    `Fundamental analysis of ${name}'s top 5 holdings`,
  ].filter(Boolean);

  if (analysis.status !== 'done' || !o.rows?.length) {
    return (
      <section className="srb sio" aria-labelledby="sio-h">
        <div className="srb-card srb-exec">
          <p className="srb-eyebrow">Institutional ownership</p>
          <h2 id="sio-h" className="srb-exec-title">
            The ownership ranking did not complete
          </h2>
          <p className="srb-lede">{analysis.failed || 'No eligible holdings were found.'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="srb sio" aria-labelledby="sio-h">
      <div className="srb-card srb-exec">
        <div className="srb-exec-top">
          <p className="srb-eyebrow">
            <i className="bi bi-bank" aria-hidden="true" />
            {isMember ? 'Congressional' : '13F'} × institutional intelligence
          </p>
          {fulfillment ? (
            <span className={`sio-state ${STATE_TONE[fulfillment.state] || ''}`}>
              {fulfillment.label}
            </span>
          ) : null}
        </div>
        <h2 id="sio-h" className="srb-exec-title">
          Which {name} holdings are most widely held by investment firms?
        </h2>
        <ul className="srb-exec-meta">
          <li>
            <i className="bi bi-calendar3" aria-hidden="true" />
            13F quarter ending <span className="srb-mono">{o.period}</span>
          </li>
          <li>
            <i className="bi bi-building" aria-hidden="true" />
            <span className="srb-mono">{fmtInt(o.coverage?.filers)}</span> filers loaded
          </li>
          <li>
            <i className="bi bi-person-badge" aria-hidden="true" />
            Counted as distinct reporting managers (filer CIKs)
          </li>
        </ul>
        <div className="srb-exec-points">
          <p className="srb-exec-label">Direct answer</p>
          <p className="sio-answer">{o.answer?.text}</p>
        </div>
      </div>

      <ul className="srb-kpis">
        <Tile
          label={isMember ? `Eligible ${name} equities` : 'Holdings ranked'}
          value={fmtInt(o.universe?.eligible)}
          note={`of ${fmtInt(o.universe?.total)} ${isMember ? 'disclosed holdings with a ticker' : 'positions in the filing'}`}
        />
        <Tile
          label="Matched 13F securities"
          value={fmtInt(o.rows.filter((r) => r.rank != null).length)}
          note="Reported by at least one manager"
        />
        <Tile
          label="Most 13F managers"
          value={leader ? fmtInt(leader.managers) : 'N/A'}
          note={leader ? `${leader.ticker}, ${leader.issuer}` : null}
          tone="is-accent"
        />
        <Tile label="Reporting quarter" value={q} note={`Period ${o.period}`} />
      </ul>

      <div className="sio-grid">
        <div className="srb-card sio-span-2">
          <div className="sio-card-head">
            <p className="srb-eyebrow">Most widely held equities</p>
            <div className="sio-seg" role="group" aria-label="Rank by">
              {Object.values(METRICS).map((m) =>
                m.key === 'change' && !o.prior ? null : (
                  <button
                    key={m.key}
                    type="button"
                    className={`sio-seg-btn ${metric === m.key ? 'is-on' : ''}`}
                    aria-pressed={metric === m.key}
                    onClick={() => setMetric(m.key)}
                  >
                    {m.short}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="srb-tablewrap">
            <table className="srb-table sio-table">
              <caption className="srb-sr">
                {name} holdings ranked by {METRICS[metric].label.toLowerCase()}, {q}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="is-num">
                    #
                  </th>
                  <th scope="col">Stock</th>
                  <th scope="col" className="is-num">
                    {o.universe?.weightLabel || 'Weight'}
                  </th>
                  <th scope="col" className="is-num">
                    13F managers
                  </th>
                  <th scope="col" className="is-num">
                    13F value
                  </th>
                  <th scope="col" className="is-num">
                    Δ Q/Q
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.cusip} className={r.rank == null ? 'is-muted' : ''}>
                    <td className="is-num">{r.rank ?? 'N/A'}</td>
                    <th scope="row">
                      <span className="srb-mono sio-ticker">{r.ticker}</span>
                      <span className="sio-issuer">
                        {r.issuer}
                        {r.partnership ? ', partnership units' : ''}
                      </span>
                    </th>
                    <td className="is-num">
                      {r.weight != null ? fmtPct(r.weight) : 'N/A'}
                      {r.floor ? <span className="sio-flag">floor</span> : null}
                    </td>
                    <td className="is-num">{fmtInt(r.managers)}</td>
                    <td className="is-num">{r.managers ? fmtUsd(r.value) : 'N/A'}</td>
                    <td
                      className={`is-num ${r.change > 0 ? 'is-up' : r.change < 0 ? 'is-down' : ''}`}
                    >
                      {r.change == null ? 'N/A' : fmtSigned(r.change)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="srb-cap">
            Δ Q/Q is the net change in managers among the {fmtInt(o.coverage?.comparable)} filers
            that reported in both {quarterLabel(o.prior)} and {q}. Floor marks a position estimated
            at the $1,001 disclosure minimum.
          </p>
        </div>

        <div className="srb-card">
          <p className="srb-eyebrow">Institutional participation</p>
          <Bars rows={byManagers} />
          <p className="srb-cap">Distinct 13F reporting managers, {q}.</p>
        </div>
      </div>

      {qoq ? (
        <ul className="srb-kpis">
          <Tile
            label="Quarterly participation"
            value={`${qoq.up} up · ${qoq.down} down`}
            note={`Holdings with more or fewer managers than ${quarterLabel(o.prior)}`}
          />
          <Tile
            label="New 13F managers"
            value={fmtInt(qoq.added)}
            note="Positions opened by comparable filers"
            tone="is-up"
          />
          <Tile
            label="Exited 13F managers"
            value={fmtInt(qoq.exited)}
            note="Positions closed by comparable filers"
            tone="is-down"
          />
          <Tile
            label="Data coverage"
            value={fmtPct(o.coverage?.ratio, 0)}
            note={`${fmtInt(o.coverage?.filers)} of ${fmtInt(o.coverage?.best)} filers in the best recent quarter`}
          />
        </ul>
      ) : null}

      <div className="sio-grid">
        {o.trend ? (
          <div className="srb-card sio-span-2">
            <p className="srb-eyebrow">Ownership breadth across reporting periods</p>
            <Trend trend={o.trend} />
          </div>
        ) : null}
        {o.managers?.length ? (
          <div className="srb-card">
            <p className="srb-eyebrow">Largest reporting managers</p>
            <ol className="sio-mgrs">
              {o.managers.map((m) => (
                <li key={m.cik} className="sio-mgr">
                  <span className="sio-mgr-name">{m.name || `CIK ${m.cik}`}</span>
                  <span className="sio-mgr-meta srb-mono">
                    CIK {m.cik} · {q} 13F · {m.holdings.slice(0, 4).join(', ')}
                  </span>
                  <span className="sio-mgr-value srb-mono">{fmtUsd(m.value)}</span>
                </li>
              ))}
            </ol>
            <p className="srb-cap">
              Summed reported value in these holdings, among each holding&apos;s five largest
              reporters.
            </p>
          </div>
        ) : null}
      </div>

      <div className="sio-grid">
        {o.answer?.findings?.length ? (
          <div className="srb-card">
            <p className="srb-eyebrow">Key findings</p>
            <ul className="sio-list">
              {o.answer.findings.map((x) => (
                <li key={x.title}>
                  <strong>{x.title}.</strong> {x.explanation}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="srb-card">
          <p className="srb-eyebrow">Interpretation and caveats</p>
          <ul className="sio-list">
            {(o.limitations || []).slice(0, 4).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
        <div className="srb-card">
          <p className="srb-eyebrow">Methodology and evidence</p>
          <ol className="sio-list">
            <li>
              <strong>Universe.</strong> {o.universe?.source}. {fmtInt(o.universe?.eligible)} common
              equities kept
              {o.universe?.untickered
                ? `; ${fmtInt(o.universe.untickered)} bond or private positions have no ticker`
                : ''}
              .
            </li>
            <li>
              <strong>Identifiers.</strong> Tickers matched to CUSIPs through the security master;
              ambiguous or unmatched tickers are listed, never guessed.
            </li>
            <li>
              <strong>Quarter.</strong> {q} is the latest quarter past its 45-day filing deadline
              with at least 90% of the best recent quarter&apos;s filers loaded.
            </li>
            <li>
              <strong>Count.</strong> Common-share rows only (no options or principal amounts),
              amendments applied, one count per filer CIK.
            </li>
            <li>
              <strong>Comparison.</strong>{' '}
              {o.prior
                ? `${quarterLabel(o.prior)} against ${q} on ${fmtInt(o.coverage?.comparable)} filers present in both.`
                : 'No prior quarter available.'}
            </li>
          </ol>
          {o.states?.length ? (
            <ul className="sio-states">
              {o.states.map((s) => (
                <li key={s.key} className={`sio-state-row is-${s.key}`}>
                  {s.label}
                </li>
              ))}
            </ul>
          ) : null}
          {o.excluded?.length ? (
            <details className="sio-details">
              <summary>Excluded holdings ({o.excluded.length})</summary>
              <ul>
                {o.excluded.map((x) => (
                  <li key={`${x.ticker}-${x.issuer}`}>
                    <span className="srb-mono">{x.ticker || 'N/A'}</span> {x.issuer}: {x.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <p className="srb-cap">
            Ownership percentage is not shown: it needs shares outstanding on the same date.
            {o.durationMs != null ? ` Computed in ${(o.durationMs / 1000).toFixed(1)}s.` : ''}
          </p>
        </div>
      </div>

      {onFollowUp ? (
        <div className="srb-card sio-follow">
          <p className="srb-eyebrow">Continue the research</p>
          <div className="sio-pills">
            {followUps.map((t) => (
              <button key={t} type="button" className="srb-pill" onClick={() => onFollowUp(t)}>
                <i className="bi bi-arrow-return-right" aria-hidden="true" />
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
