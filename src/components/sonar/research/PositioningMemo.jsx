'use client';

/**
 * PositioningMemo: deep research's strategic positioning assessment
 * (Nov 2026). "How is Microsoft positioning itself to capture value from the
 * AI infrastructure boom? Connect its financial performance, government
 * contracts, industry exposure, and relevant lobbying activity."
 *
 * Briefed the way a senior analyst briefs a managing director: the central
 * conclusion and the investment question first (never the share price);
 * then each angle as an exhibit beside the analyst's findings, what the
 * records cannot establish and the data to request next:
 *
 *   1. Revenue conversion       KPI tiles and the revenue mix with growth
 *   2. Capex and monetization   capital spending against cash generation
 *   3. Government contracts     obligations by fiscal year and agency
 *   4. Value chain              where the company operates, layer by layer
 *   5. Lobbying and policy      spend, peers and policy areas
 *   6. Competition              hyperscaler capex against cloud revenue
 *   7. Risks, scenarios, the spending-to-results chain, evidence gaps
 *
 * Charts follow the dataviz rules: one axis per chart, the categorical
 * tokens in fixed order, a legend for two or more series, hover titles on
 * every mark, a table view for each chart, and incomplete periods drawn as
 * outlines. Tokens only (EZANA_BRANDING_GUIDE), page prefix `spm-`.
 */
import { useState } from 'react';
import {
  Cites,
  Claim,
  Risk,
  Positioning,
  Associations,
  Competitors,
  Peers,
  Disclosures,
  Scenarios,
  Chain,
  usd,
  pct,
} from './InvestmentMemo';
import './investment-memo.css';
import './positioning-memo.css';

const signedPct = (r) =>
  r == null || !Number.isFinite(Number(r)) ? '–' : `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1)}%`;
const fyLabel = (end) => `FY ${String(end).slice(0, 7)}`;

/* ── Chart primitives ──────────────────────────────────────────────── */

/** Axis labels: compact, no trailing decimals ($200B, $2.5M). */
function tick(v) {
  const n = Number(v);
  const a = Math.abs(n);
  const fmt = (x, u) => `$${Number(x.toFixed(1))}${u}`;
  if (a >= 1e12) return fmt(n / 1e12, 'T');
  if (a >= 1e9) return fmt(n / 1e9, 'B');
  if (a >= 1e6) return fmt(n / 1e6, 'M');
  if (a >= 1e3) return fmt(n / 1e3, 'K');
  return `$${Math.round(n)}`;
}

/** Nice upper bound for an axis. */
function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function TableToggle({ children, label = 'Show the numbers' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="spm-tabletoggle">
      <button type="button" className="spm-linkbtn" onClick={() => setOpen((o) => !o)}>
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-table'}`} aria-hidden="true" />{' '}
        {open ? 'Hide the numbers' : label}
      </button>
      {open ? <div className="srm-table-wrap">{children}</div> : null}
    </div>
  );
}

function Legend({ series }) {
  if (series.length < 2) return null;
  return (
    <div className="spm-legend">
      {series.map((s) => (
        <span key={s.key} className="spm-key">
          <span
            className={`spm-swatch spm-c${s.c}${s.outline ? ' is-outline' : ''}`}
            aria-hidden="true"
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Grouped columns on one USD axis. groups: [{ label, values: [n|null], incomplete? }]
 * series: [{ key, label, c }] (c = categorical slot 1..8).
 */
function Columns({ groups, series, title, height = 220 }) {
  const all = groups.flatMap((g) => g.values).filter((v) => Number.isFinite(v));
  if (!all.length) return null;
  const max = niceMax(Math.max(0, ...all));
  const min = Math.min(0, ...all);
  const lo = min < 0 ? -niceMax(-min) : 0;
  const W = 960;
  const H = height;
  const padL = 52;
  const padB = 26;
  const plotH = H - padB - 8;
  const y = (v) => 8 + ((max - v) / (max - lo)) * plotH;
  const gw = (W - padL) / groups.length;
  const bw = Math.max(6, Math.min(36, (gw - 12) / series.length - 2));
  const ticks = [lo, lo + (max - lo) / 2, max].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <figure className="spm-chart">
      <figcaption className="srr-chart-title">{title}</figcaption>
      <div className="spm-scroll">
        <svg
          className="spm-svg spm-svg-wide"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={title}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="spm-grid" />
              <text x={padL - 6} y={y(t) + 4} className="spm-tick" textAnchor="end">
                {tick(t)}
              </text>
            </g>
          ))}
          {groups.map((g, gi) => {
            const x0 = padL + gi * gw + (gw - series.length * (bw + 2)) / 2;
            return (
              <g key={g.label}>
                {series.map((s, si) => {
                  const v = g.values[si];
                  if (!Number.isFinite(v)) return null;
                  const top = y(Math.max(0, v));
                  const h = Math.max(1, Math.abs(y(v) - y(0)));
                  return (
                    <rect
                      key={s.key}
                      x={x0 + si * (bw + 2)}
                      y={top}
                      width={bw}
                      height={h}
                      rx="2"
                      className={`spm-bar spm-c${s.c}${g.incomplete ? ' is-incomplete' : ''}`}
                    >
                      <title>{`${g.label}, ${s.label}: ${usd(v)}${g.incomplete ? ' (incomplete)' : ''}`}</title>
                    </rect>
                  );
                })}
                <text
                  x={padL + gi * gw + gw / 2}
                  y={H - 8}
                  className="spm-tick"
                  textAnchor="middle"
                >
                  {g.label}
                </text>
              </g>
            );
          })}
          <line x1={padL} x2={W} y1={y(0)} y2={y(0)} className="spm-axis" />
        </svg>
      </div>
      <Legend series={series} />
    </figure>
  );
}

/** One small-multiple panel: two lines on the shared USD scale. */
function MultiPanel({ c, max, subject }) {
  const W = 220;
  const H = 130;
  const pad = 10;
  const ys = c.years;
  if (!ys.length) return null;
  const x = (i) =>
    pad + (ys.length === 1 ? (W - 2 * pad) / 2 : (i / (ys.length - 1)) * (W - 2 * pad));
  const y = (v) => H - 22 - (v / max) * (H - 40);
  const line = (k) =>
    ys
      .map((p, i) => (Number.isFinite(p[k]) ? `${x(i).toFixed(1)},${y(p[k]).toFixed(1)}` : null))
      .filter(Boolean)
      .join(' ');
  const hasCloud = ys.some((p) => Number.isFinite(p.cloud));
  return (
    <figure className={`spm-panel${subject ? ' is-subject' : ''}`}>
      <figcaption className="spm-panel-title">
        <span>{c.name}</span> <span className="srr-mono spm-dim">{c.ticker}</span>
      </figcaption>
      <svg
        className="spm-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${c.name} capital expenditure${hasCloud ? ' and cloud revenue' : ''}`}
      >
        <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} className="spm-axis" />
        <line x1={pad} x2={W - pad} y1={y(max / 2)} y2={y(max / 2)} className="spm-grid" />
        {hasCloud ? <polyline points={line('cloud')} className="spm-line spm-c1" /> : null}
        <polyline points={line('capex')} className="spm-line spm-c2" />
        {ys.map((p, i) => (
          <g key={p.periodEnd}>
            {Number.isFinite(p.cloud) ? (
              <circle cx={x(i)} cy={y(p.cloud)} r="4" className="spm-dot spm-c1">
                <title>{`${c.name} ${fyLabel(p.periodEnd)}: ${c.cloudLabel} revenue ${usd(p.cloud)}`}</title>
              </circle>
            ) : null}
            <circle cx={x(i)} cy={y(p.capex)} r="4" className="spm-dot spm-c2">
              <title>{`${c.name} ${fyLabel(p.periodEnd)}: capital expenditure ${usd(p.capex)}`}</title>
            </circle>
            <text x={x(i)} y={H - 6} className="spm-tick" textAnchor="middle">
              {String(p.periodEnd).slice(0, 4)}
            </text>
          </g>
        ))}
      </svg>
      <p className="spm-panel-note">
        {hasCloud ? `Cloud line: ${c.cloudLabel}` : 'No cloud revenue line reported'}
      </p>
    </figure>
  );
}

/* ── Exhibits ──────────────────────────────────────────────────────── */

function Kpis({ capex }) {
  const q = capex?.quarters?.[0];
  if (!q) return null;
  const ago = (capex.quarters || []).find((x) => x.periodEnd === q.yearAgo) || null;
  const yoy = (k) => (ago && Number.isFinite(q[k]) && ago[k] ? q[k] / ago[k] - 1 : null);
  const tiles = [
    ['Revenue', q.revenue, yoy('revenue')],
    ['Operating income', q.operating_income, yoy('operating_income')],
    ['Operating cash flow', q.operating_cash_flow, yoy('operating_cash_flow')],
    ['Capital expenditure', q.capex, yoy('capex')],
    ['Free cash flow', q.fcf, ago?.fcf ? q.fcf / ago.fcf - 1 : null],
  ].filter(([, v]) => Number.isFinite(v));
  return (
    <div>
      <p className="srm-sub">
        Quarter ended <span className="srr-mono">{q.periodEnd}</span>
        {q.derived
          ? ' (fourth fiscal quarter, derived as the fiscal year less three quarters)'
          : ''}
        {q.yearAgo ? (
          <>
            , against the quarter ended <span className="srr-mono">{q.yearAgo}</span>
          </>
        ) : null}
        . From SEC filings.
      </p>
      <div className="spm-kpis">
        {tiles.map(([label, v, g]) => (
          <div key={label} className="spm-kpi">
            <span className="spm-kpi-label">{label}</span>
            <span className="spm-kpi-val srr-mono">{usd(v)}</span>
            <span
              className={`spm-kpi-delta srr-mono${g == null ? '' : g >= 0 ? ' is-up' : ' is-down'}`}
            >
              {g == null ? 'no year-earlier quarter' : `${signedPct(g)} year over year`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueMix({ segments }) {
  const rows = segments?.segments || [];
  if (!rows.length) return null;
  const max = Math.max(...rows.map((s) => s.value));
  return (
    <figure className="spm-chart">
      <figcaption className="srr-chart-title">
        Revenue by reported segment, quarter ended {segments.date}
      </figcaption>
      <div className="spm-mix">
        {rows.slice(0, 8).map((s) => (
          <div key={s.segment} className="spm-mix-row" title={`${s.segment}: ${usd(s.value)}`}>
            <span className="spm-mix-label">{s.segment}</span>
            <span className="spm-mix-track" aria-hidden="true">
              <span
                className="spm-mix-fill spm-c1"
                style={{ width: `${Math.max(1, (s.value / max) * 100)}%` }}
              />
            </span>
            <span className="srr-mono spm-mix-val">{usd(s.value)}</span>
            <span
              className={`srr-mono spm-mix-g${s.growth == null ? '' : s.growth >= 0 ? ' is-up' : ' is-down'}`}
            >
              {signedPct(s.growth)}
            </span>
          </div>
        ))}
      </div>
      <p className="spm-note">
        Growth is against the quarter ended {segments.prevDate || 'a year earlier'}, as each segment
        is reported.
        {rows.some((s) => s.changeShare != null)
          ? ` Largest share of the year-over-year increase: ${[...rows]
              .filter((s) => s.changeShare != null && s.changeShare > 0)
              .sort((a, b) => b.changeShare - a.changeShare)
              .slice(0, 2)
              .map((s) => `${s.segment} ${pct(s.changeShare)}`)
              .join(', ')}.`
          : ''}
      </p>
    </figure>
  );
}

function CapexExhibit({ capex }) {
  const years = [...(capex?.years || [])].filter((y) => Number.isFinite(y.capex)).reverse();
  if (!years.length) return null;
  const series = [
    { key: 'capex', label: 'Capital expenditure', c: 2 },
    { key: 'ocf', label: 'Operating cash flow', c: 1 },
    { key: 'fcf', label: 'Free cash flow', c: 3 },
  ];
  return (
    <div>
      <Columns
        title="Capital expenditure against cash generation, by fiscal year"
        series={series}
        groups={years.map((y) => ({
          label: fyLabel(y.periodEnd),
          values: [y.capex, y.operating_cash_flow, y.fcf],
        }))}
      />
      <div className="spm-intensity">
        {years.map((y) => (
          <span key={y.periodEnd} className="spm-intensity-cell">
            <span className="spm-dim">{fyLabel(y.periodEnd)}</span>
            <span className="srr-mono">{pct(y.capexToRevenue)}</span>
            <span className="spm-dim">of revenue</span>
          </span>
        ))}
      </div>
      <TableToggle>
        <table className="srm-table">
          <thead>
            <tr>
              <th scope="col">Period ended</th>
              <th scope="col">Revenue</th>
              <th scope="col">Operating cash flow</th>
              <th scope="col">Capex</th>
              <th scope="col">Free cash flow</th>
              <th scope="col">Capex / revenue</th>
              <th scope="col">D&amp;A</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...(capex.years || []).map((p) => ({ ...p, kind: 'Fiscal year' })),
              ...(capex.quarters || [])
                .slice(0, 8)
                .map((p) => ({ ...p, kind: p.derived ? 'Quarter (derived)' : 'Quarter' })),
            ].map((p) => (
              <tr key={`${p.kind}:${p.periodEnd}`}>
                <td>
                  <span className="srr-mono">{p.periodEnd}</span>{' '}
                  <span className="srm-dim">{p.kind}</span>
                </td>
                <td className="srr-mono">{usd(p.revenue)}</td>
                <td className="srr-mono">{usd(p.operating_cash_flow)}</td>
                <td className="srr-mono">{usd(p.capex)}</td>
                <td className="srr-mono">{usd(p.fcf)}</td>
                <td className="srr-mono">{pct(p.capexToRevenue)}</td>
                <td className="srr-mono">{usd(p.depreciation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableToggle>
      <p className="spm-note">
        Free cash flow is operating cash flow less capital expenditure. Capital expenditure is cash
        paid for property and equipment; assets acquired under finance leases are not included.
        {capex.rpo?.value
          ? ` Remaining performance obligation (contracted revenue not yet recognized): ${usd(capex.rpo.value)} at ${capex.rpo.date}.`
          : ''}
      </p>
    </div>
  );
}

function ContractsExhibit({ k }) {
  if (!k?.years?.length) return null;
  const years = k.years.slice(-10);
  return (
    <div>
      <div className="spm-stats">
        <span className="spm-stat">
          <span className="spm-kpi-label">
            Obligated, FY{years[0].fy} to FY{years[years.length - 1].fy}
          </span>
          <span className="srr-mono spm-kpi-val">
            {usd(years.reduce((s, y) => s + y.amount, 0))}
          </span>
        </span>
        {k.growth != null ? (
          <span className="spm-stat">
            <span className="spm-kpi-label">FY{k.lastComplete} change (latest complete year)</span>
            <span className="srr-mono spm-kpi-val">{signedPct(k.growth)}</span>
          </span>
        ) : null}
        {k.agencies?.[0] ? (
          <span className="spm-stat">
            <span className="spm-kpi-label">
              Largest agency, FY{k.agencyWindow.from} to FY{k.agencyWindow.to}
            </span>
            <span className="srr-mono spm-kpi-val">{pct(k.agencies[0].share)}</span>
            <span className="spm-dim">{k.agencies[0].agency}</span>
          </span>
        ) : null}
      </div>
      <Columns
        title="Federal contract obligations on prime awards, by fiscal year"
        series={[{ key: 'amount', label: 'Obligations', c: 1 }]}
        groups={years.map((y) => ({
          label: `FY${String(y.fy).slice(2)}`,
          values: [y.amount],
          incomplete: !y.complete,
        }))}
        height={200}
      />
      {k.incomplete?.length ? (
        <p className="spm-note">
          <span className="spm-swatch spm-c1 is-outline" aria-hidden="true" /> Outlined years are
          incomplete: the Department of Defense publishes contract actions with a 90-day delay.
        </p>
      ) : null}
      {k.agencies?.length ? (
        <div className="spm-mix" aria-label="Obligations by agency">
          {k.agencies.slice(0, 5).map((a) => (
            <div key={a.agency} className="spm-mix-row">
              <span className="spm-mix-label">{a.agency}</span>
              <span className="spm-mix-track" aria-hidden="true">
                <span
                  className="spm-mix-fill spm-c1"
                  style={{ width: `${Math.max(1, a.share * 100)}%` }}
                />
              </span>
              <span className="srr-mono spm-mix-val">{usd(a.amount)}</span>
              <span className="srr-mono spm-mix-g">{pct(a.share)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {k.awards?.length ? (
        <TableToggle label="Show the largest awards">
          <table className="srm-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Agency</th>
                <th scope="col">Action</th>
                <th scope="col">Obligated to date</th>
                <th scope="col">Ceiling (all options)</th>
                <th scope="col">Award</th>
              </tr>
            </thead>
            <tbody>
              {k.awards.map((a) => (
                <tr key={`${a.piid || a.date}:${a.amount}`}>
                  <td className="srr-mono">{String(a.date || '').slice(0, 10)}</td>
                  <td>{a.subAgency || a.agency}</td>
                  <td className="srr-mono">{usd(a.amount)}</td>
                  <td className="srr-mono">{usd(a.obligated)}</td>
                  <td className="srr-mono">{usd(a.ceiling)}</td>
                  <td className="srr-mono">{a.piid || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableToggle>
      ) : null}
      <ul className="spm-caveats">
        <li>Obligations are what agencies committed on prime awards, not company revenue.</li>
        <li>
          Purchases made through resellers or other prime contractors are recorded under those
          companies.
        </li>
        <li>A ceiling is the maximum with every option exercised, not money spent.</li>
      </ul>
    </div>
  );
}

function ValueChainExhibit({ chain, assessments = [], onCite }) {
  if (!chain?.layers?.length) return null;
  const byLayer = new Map(assessments.map((a) => [a.layer, a.assessment]));
  return (
    <div>
      <ol className="spm-chain" aria-label="AI infrastructure value chain, upstream to downstream">
        {chain.layers.map((l, i) => (
          <li key={l.id} className={`spm-layer${l.subject ? ' is-subject' : ''}`}>
            <span className="spm-layer-n srr-mono">{String(i + 1).padStart(2, '0')}</span>
            <div className="spm-layer-body">
              <h4 className="spm-layer-title">{l.label}</h4>
              <p className="spm-dim spm-layer-role">{l.role}</p>
              {l.subject ? (
                <p className="spm-layer-pos">
                  <span className="spm-tag">{chain.name}</span> {l.subject.products}.{' '}
                  <span className="spm-dim">{l.subject.monetization}.</span>
                  {l.subject.source ? (
                    <a
                      className="srm-disc-src"
                      href={l.subject.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {' '}
                      {l.subject.source.title}, {l.subject.source.date}
                      <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                    </a>
                  ) : null}
                </p>
              ) : (
                <p className="spm-dim spm-layer-pos">Not a layer {chain.name} sells in.</p>
              )}
              {byLayer.get(l.id) ? <Claim c={byLayer.get(l.id)} onCite={onCite} /> : null}
              {l.others?.length ? (
                <p className="spm-layer-co srr-mono">{l.others.join(' · ')}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="spm-note">
        Ezana&rsquo;s map of the AI infrastructure value chain: an analytical framework with
        representative listed companies, not an exhaustive list or a ranking.
      </p>
    </div>
  );
}

function LobbyingExhibit({ p }) {
  if (!p?.byYear?.length) return null;
  const lastFull = Math.max(...p.byYear.map((b) => b.year)) - 1;
  const cmp = [
    { ticker: p.ticker, amount: p.byYear.find((b) => b.year === lastFull)?.amount, subject: true },
    ...(p.peers || []).map((x) => ({
      ticker: x.ticker,
      amount: x.byYear.find((b) => b.year === lastFull)?.amount,
    })),
  ].filter((r) => Number.isFinite(r.amount));
  const cmax = Math.max(1, ...cmp.map((r) => r.amount));
  const thisYear = Math.max(...p.byYear.map((b) => b.year));
  return (
    <div>
      <Columns
        title={`${p.name} federal lobbying by year (Senate LDA)`}
        series={[{ key: 'spend', label: 'Reported lobbying', c: 1 }]}
        groups={p.byYear.map((b) => ({
          label: String(b.year),
          values: [b.amount],
          incomplete: b.year === thisYear,
        }))}
        height={190}
      />
      <p className="spm-note">
        {p.selfFiled
          ? 'Counted from the reports the company files itself, which include its outside firms. '
          : ''}
        The outlined year covers the quarters reported so far.
      </p>
      {cmp.length > 1 ? (
        <figure className="spm-chart">
          <figcaption className="srr-chart-title">
            Federal lobbying in {lastFull}, same counting rules
          </figcaption>
          <div className="spm-mix">
            {cmp
              .sort((a, b) => b.amount - a.amount)
              .map((r) => (
                <div key={r.ticker} className={`spm-mix-row${r.subject ? ' is-subject' : ''}`}>
                  <span className="spm-mix-label srr-mono">{r.ticker}</span>
                  <span className="spm-mix-track" aria-hidden="true">
                    <span
                      className={`spm-mix-fill ${r.subject ? 'spm-c1' : 'spm-c8'}`}
                      style={{ width: `${(r.amount / cmax) * 100}%` }}
                    />
                  </span>
                  <span className="srr-mono spm-mix-val">{usd(r.amount)}</span>
                  <span />
                </div>
              ))}
          </div>
        </figure>
      ) : null}
      {p.areas?.length ? (
        <div className="srm-table-wrap">
          <table className="srm-table">
            <caption className="srm-caption">Policy areas named in its lobbying reports</caption>
            <thead>
              <tr>
                <th scope="col">Policy area</th>
                <th scope="col">Reports</th>
                <th scope="col">Share</th>
                <th scope="col">Latest</th>
                <th scope="col">Why it matters to the build</th>
              </tr>
            </thead>
            <tbody>
              {p.areas.map((a) => (
                <tr key={a.id}>
                  <td>{a.label}</td>
                  <td className="srr-mono">{a.reports}</td>
                  <td className="srr-mono">{pct(a.share)}</td>
                  <td className="srr-mono">{a.latest || '–'}</td>
                  <td className="srm-wrap">{a.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {p.firms?.length ? (
        <p className="spm-note">
          Outside firms:{' '}
          {p.firms
            .slice(0, 6)
            .map((f) => `${f.firm} (${usd(f.amount)})`)
            .join(', ')}
          .
        </p>
      ) : null}
      <p className="spm-note">
        An LDA issue code shows that a report touched an area. It is not the position taken, and
        lobbying is never evidence that it caused a decision or an award.
      </p>
    </div>
  );
}

function HyperscalerExhibit({ h }) {
  const list = h?.companies || [];
  if (list.length < 2) return null;
  const max = niceMax(
    Math.max(
      ...list.flatMap((c) => c.years.flatMap((y) => [y.capex, y.cloud].filter(Number.isFinite))),
    ),
  );
  return (
    <figure className="spm-chart">
      <figcaption className="srr-chart-title">
        Capital expenditure against cloud revenue, by fiscal year (same scale, up to {tick(max)})
      </figcaption>
      <div className="spm-multiples">
        {list.map((c) => (
          <MultiPanel key={c.ticker} c={c} max={max} subject={c.ticker === h.subject} />
        ))}
      </div>
      <Legend
        series={[
          { key: 'cloud', label: 'Cloud revenue (reported segment)', c: 1 },
          { key: 'capex', label: 'Capital expenditure', c: 2 },
        ]}
      />
      <TableToggle>
        <table className="srm-table">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Fiscal year ended</th>
              <th scope="col">Capex</th>
              <th scope="col">Cloud revenue</th>
              <th scope="col">Cloud line</th>
            </tr>
          </thead>
          <tbody>
            {list.flatMap((c) =>
              c.years.map((y) => (
                <tr
                  key={`${c.ticker}:${y.periodEnd}`}
                  className={c.ticker === h.subject ? 'is-subject' : undefined}
                >
                  <td className="srr-mono">{c.ticker}</td>
                  <td className="srr-mono">{y.periodEnd}</td>
                  <td className="srr-mono">{usd(y.capex)}</td>
                  <td className="srr-mono">{usd(y.cloud)}</td>
                  <td>{c.cloudLabel || '–'}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </TableToggle>
      <p className="spm-note">
        Each company&rsquo;s own fiscal years. Cloud revenue is the segment line each company
        reports; the lines are defined differently, so compare trends, not levels.
      </p>
    </figure>
  );
}

function SectionBlock({ s, onCite }) {
  if (!s) return null;
  return (
    <div className="spm-analysis">
      {s.findings?.length ? (
        <ul className="spm-findings">
          {s.findings.map((f) => (
            <li key={f.id}>
              <Claim c={f} onCite={onCite} />
            </li>
          ))}
        </ul>
      ) : null}
      <Claim c={s.interpretation} onCite={onCite} lead="My interpretation" />
      {s.cannotConclude?.length ? (
        <div className="spm-cannot">
          <span className="srm-claim-lead">What the records do not establish</span>
          <ul>
            {s.cannotConclude.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {s.dataRequests?.length ? (
        <div className="spm-requests">
          <span className="srm-claim-lead">Data to request next</span>
          <ul>
            {s.dataRequests.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Exhibit({ id, n, title, sub, section, onCite, children }) {
  const hasChildren = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  if (!hasChildren && !section) return null;
  return (
    <section className="srm-section spm-exhibit" aria-labelledby={`spm-${id}-h`}>
      <h2 id={`spm-${id}-h`} className="srr-h2">
        <span className="spm-n srr-mono">{n}</span> {section?.title || title}
      </h2>
      {sub ? <p className="srm-sub">{sub}</p> : null}
      {children}
      <SectionBlock s={section} onCite={onCite} />
    </section>
  );
}

function RiskTable({ risks, onCite }) {
  if (!risks?.length) return null;
  return (
    <section className="srm-section" aria-labelledby="spm-risks-h">
      <h2 id="spm-risks-h" className="srr-h2">
        The investment risks, ranked
      </h2>
      <p className="srm-sub">
        Analytical risk categories with their evidence; open one for the detail.
      </p>
      <div className="srm-table-wrap">
        <table className="srm-table spm-risk-table">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Risk</th>
              <th scope="col">Why it matters</th>
              <th scope="col">What to monitor</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id}>
                <td className="srr-mono">{r.rank}</td>
                <td className="srm-wrap">
                  {r.title} <span className={`srm-priority is-${r.priority}`}>{r.priority}</span>
                </td>
                <td className="srm-wrap">
                  {(r.implication || r.assessment)?.text || r.question || '–'}
                </td>
                <td className="srm-wrap">{r.watch?.join('; ') || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {risks.map((r) => (
        <details key={r.id} id={r.id} className="spm-risk-detail">
          <summary>
            {r.rank}. {r.title}
          </summary>
          <Risk r={r} onCite={onCite} />
        </details>
      ))}
    </section>
  );
}

export default function PositioningMemo({ report, panels = {}, onCite }) {
  if (!report) return null;
  const sec = (a) => (report.sections || []).find((s) => s.angle === a) || null;
  const disc = (kinds) => (panels.disclosures || []).filter((d) => kinds.includes(d.kind));
  /* Exhibits are numbered in the order they appear; one with nothing to show is skipped. */
  const shown = [
    [
      'fin',
      panels.capex?.quarters?.length || panels.segments?.segments?.length || sec('financials'),
    ],
    ['infra', panels.capex?.years?.length || sec('infrastructure')],
    ['gov', panels.contractsProfile?.years?.length || sec('contracts')],
    ['chain', panels.valueChain?.layers?.length || sec('industry')],
    [
      'lobby',
      panels.lobbyingProfile?.byYear?.length || panels.associations?.length || sec('lobbying'),
    ],
    [
      'comp',
      (panels.hyperscalers?.companies?.length || 0) > 1 ||
        (panels.peers?.rows?.length || 0) > 1 ||
        panels.competitors?.length ||
        sec('competition'),
    ],
  ]
    .filter(([, has]) => Boolean(has))
    .map(([id]) => id);
  const num = (id) => String(shown.indexOf(id) + 1).padStart(2, '0');
  return (
    <div className="srm spm">
      <section className="srr-conclusion" aria-labelledby="spm-concl-h">
        <h2 id="spm-concl-h" className="srr-h2">
          Central conclusion
        </h2>
        {report.centralQuestion ? <p className="srm-central">{report.centralQuestion}</p> : null}
        {report.executiveConclusion ? (
          <p className="srr-conclusion-text">
            {report.executiveConclusion.text}{' '}
            <Cites markers={report.executiveConclusion.markers} onCite={onCite} />
          </p>
        ) : null}
        {report.investmentQuestion ? (
          <div className="spm-question">
            <span className="srm-claim-lead">The key investment question</span>
            <p>
              {report.investmentQuestion.text}{' '}
              <Cites markers={report.investmentQuestion.markers} onCite={onCite} />
            </p>
          </div>
        ) : null}
        {report.executiveView?.length ? (
          <div className="spm-view">
            <span className="srm-claim-lead">What I would tell the managing director</span>
            <ul>
              {report.executiveView.map((c) => (
                <li key={c.id}>
                  {c.text} <Cites markers={c.markers} onCite={onCite} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {report.deterministic ? (
          <p className="srr-note">
            The written assessment did not complete, so the records are grouped by section and
            quoted without an assessment.
          </p>
        ) : null}
      </section>

      <Exhibit
        id="fin"
        n={num('fin')}
        title="Financial performance: is demand becoming revenue?"
        section={sec('financials')}
        onCite={onCite}
      >
        <Kpis capex={panels.capex} />
        <RevenueMix segments={panels.segments} />
      </Exhibit>

      <Exhibit
        id="infra"
        n={num('infra')}
        title="Capital spending and monetization"
        sub="The return question: how much of the spending turns into revenue and cash."
        section={sec('infrastructure')}
        onCite={onCite}
      >
        <CapexExhibit capex={panels.capex} />
        <Disclosures data={disc(['cloud_ai_metrics', 'infrastructure_commitments'])} />
      </Exhibit>

      <Exhibit
        id="gov"
        n={num('gov')}
        title="Government contracts"
        section={sec('contracts')}
        onCite={onCite}
      >
        <ContractsExhibit k={panels.contractsProfile} />
      </Exhibit>

      <Exhibit
        id="chain"
        n={num('chain')}
        title="Industry exposure: where it captures value in the chain"
        section={sec('industry')}
        onCite={onCite}
      >
        <ValueChainExhibit
          chain={panels.valueChain}
          assessments={report.valueChain}
          onCite={onCite}
        />
      </Exhibit>

      <Exhibit
        id="lobby"
        n={num('lobby')}
        title="Lobbying and policy"
        section={sec('lobbying')}
        onCite={onCite}
      >
        <LobbyingExhibit p={panels.lobbyingProfile} />
        <Associations data={panels.associations} />
      </Exhibit>

      <Exhibit
        id="comp"
        n={num('comp')}
        title="Competitive positioning"
        section={sec('competition')}
        onCite={onCite}
      >
        <HyperscalerExhibit h={panels.hyperscalers} />
        <Peers peers={panels.peers} />
        <Competitors data={panels.competitors} />
      </Exhibit>

      <Positioning p={panels.positioning} />
      <RiskTable risks={report.risks} onCite={onCite} />
      <Scenarios scenarios={report.scenarios} onCite={onCite} />
      <Chain
        chain={report.chain}
        onCite={onCite}
        title="How spending becomes results"
        sub="Each link is marked supported only where a cited record supports it."
      />

      {report.dataGaps?.length ? (
        <section className="srm-section" aria-labelledby="spm-gaps-h">
          <h2 id="spm-gaps-h" className="srr-h2">
            What Sonar cannot establish yet
          </h2>
          <ul className="srr-list">
            {report.dataGaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
