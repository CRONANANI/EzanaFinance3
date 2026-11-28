'use client';

/**
 * Sonar 5.0 (Nov 24 2026): the Research Composer's computed results at the top of a research
 * report. It renders from the `composition` event alone, so the overlap and the fundamentals
 * stay on screen when the written analysis is slow or fails.
 *
 * Every number shown is a value the composition computed from stored records. A missing figure
 * is shown as N/A, never as zero. A heatmap tint is relative to the other companies in the same
 * table and says so.
 */

import { useMemo } from 'react';
import OwnershipReport from './OwnershipReport';
import './composition-report.css';

const METRICS = [
  { key: 'revenue_growth', label: 'Revenue growth', kind: 'pct', better: 'high' },
  { key: 'operating_margin', label: 'Operating margin', kind: 'pct', better: 'high' },
  { key: 'fcf_margin', label: 'FCF margin', kind: 'pct', better: 'high' },
  { key: 'roe', label: 'ROE', kind: 'pct', better: 'high' },
  { key: 'debt_to_equity', label: 'Debt to equity', kind: 'x', better: 'low' },
];

const STATE_TONE = {
  complete: 'is-ok',
  limited: 'is-warn',
  partial: 'is-warn',
  needs_input: 'is-warn',
  failed: 'is-bad',
};

const OBJ_ICON = {
  done: 'bi-check-circle',
  limited: 'bi-dash-circle',
  empty: 'bi-circle',
  needs_input: 'bi-question-circle',
  failed: 'bi-x-circle',
};

function usd(v) {
  if (v == null || !Number.isFinite(Number(v))) return 'N/A';
  const n = Number(v);
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmt(v, kind) {
  if (v == null || !Number.isFinite(Number(v))) return 'N/A';
  return kind === 'x' ? `${Number(v).toFixed(2)}x` : `${(Number(v) * 100).toFixed(1)}%`;
}

/** Tint step 0 to 4 for a value against the other values in its column. */
function tierFor(v, sorted, better) {
  if (v == null || sorted.length < 2) return null;
  const idx = sorted.findIndex((x) => x >= v);
  const pct = (idx < 0 ? sorted.length - 1 : idx) / (sorted.length - 1);
  const p = better === 'low' ? 1 - pct : pct;
  return Math.min(4, Math.floor(p * 5));
}

function short(label) {
  return String(label || '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
}

/* Sonar 6.2: a calculated column as the server labelled it (pct is a fraction). */
function cell(v, unit) {
  if (v == null || v === '') return 'N/A';
  if (unit === 'usd') return usd(v);
  if (unit === 'pct') return fmt(v, 'pct');
  if (unit === 'x') return fmt(v, 'x');
  if (unit === 'count') return Number.isFinite(Number(v)) ? Number(v).toLocaleString() : 'N/A';
  return String(v);
}

/** Any analysis that names its columns (screen, comparison, dependence). */
function CalculatedTable({ analysis }) {
  const cols = analysis.columns || [];
  if (!cols.length || !analysis.table?.length) return null;
  return (
    <div className="scr5-table-wrap">
      <table className="scr5-table">
        <caption className="scr5-sr">{analysis.title || analysis.capability}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} scope="col" className={c.unit ? 'is-num' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {analysis.table.map((r, i) => (
            <tr key={`${r.ticker || r.fiscal_year || i}`}>
              {cols.map((c) => (
                <td
                  key={c.key}
                  className={
                    c.unit ? 'is-num scr5-mono' : c.key === 'ticker' ? 'scr5-mono' : undefined
                  }
                >
                  {cell(r[c.key], c.unit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Funnel({ steps }) {
  if (!steps?.length) return null;
  return (
    <ol className="scr5-pipe" aria-label="Screening steps">
      {steps.map((s, i) => (
        <li key={s.step || s.label} className="scr5-pipe-step">
          <span className="scr5-pipe-n">{i + 1}</span>
          <span className="scr5-pipe-t">{s.label}</span>
          <span className="scr5-pipe-d">
            {Number(s.count || 0).toLocaleString()} companies
            {s.noData ? `, ${s.noData} without the data` : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

function DependenceTiles({ d }) {
  if (!d) return null;
  return (
    <div className="scr5-tiles">
      <Tile
        label={`Awards started, FY${d.latestFiscalYear ?? ''}`}
        value={usd(d.latestObligations)}
        note={
          d.obligationGrowth != null
            ? `Obligated to date; ${fmt(d.obligationGrowth, 'pct')} vs prior year's awards`
            : 'Obligated to date'
        }
      />
      <Tile
        label="Filed annual revenue"
        value={usd(d.revenue)}
        note={d.fiscalYearEnd ? `Fiscal year ending ${d.fiscalYearEnd}` : null}
      />
      <Tile
        label={`FY${d.pairedFiscalYear ?? ''} awards to revenue`}
        value={d.obligationsToRevenue != null ? fmt(d.obligationsToRevenue, 'pct') : 'N/A'}
        note={
          d.pairedOverlapMonths != null
            ? `Periods share ${d.pairedOverlapMonths} of 12 months. Exposure indicator, not a revenue share`
            : 'Exposure indicator, not a revenue share'
        }
      />
      <Tile
        label="Recognized government revenue share"
        value={
          d.recognizedGovernmentShare != null
            ? fmt(d.recognizedGovernmentShare, 'pct')
            : 'Not available'
        }
        note={
          d.recognizedGovernmentShare != null
            ? `${d.recognizedLabel || 'Government'} segment, company-reported`
            : 'Segment disclosures are not in the filed data'
        }
      />
    </div>
  );
}

function Tile({ label, value, note }) {
  return (
    <div className="scr5-tile">
      <p className="scr5-tile-label">{label}</p>
      <p className="scr5-tile-value">{value}</p>
      {note ? <p className="scr5-tile-note">{note}</p> : null}
    </div>
  );
}

function SharedTable({ set }) {
  if (!set.matches.length) return null;
  const leftName = set.left?.short || 'Left';
  const rightName = set.right?.short || 'Right';
  return (
    <div className="scr5-table-wrap">
      <table className="scr5-table">
        <caption className="scr5-sr">Securities found in both datasets</caption>
        <thead>
          <tr>
            <th scope="col">Ticker</th>
            <th scope="col">Company</th>
            <th scope="col" className="is-num">
              {leftName} est. exposure
            </th>
            <th scope="col" className="is-num">
              {rightName} 13F value
            </th>
            <th scope="col">Match</th>
          </tr>
        </thead>
        <tbody>
          {set.matches.map((m) => (
            <tr key={m.cusip || m.ticker}>
              <td className="scr5-mono">{m.tickers?.join(', ') || m.ticker || 'N/A'}</td>
              <td>{m.issuer || 'N/A'}</td>
              <td className="is-num scr5-mono">{usd(m.leftEst)}</td>
              <td className="is-num scr5-mono">{usd(m.rightValue)}</td>
              <td>
                <span className="scr5-chip">
                  {set.stats?.level === 'issuer' ? 'Same issuer' : 'Same security (CUSIP)'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Heatmap({ analysis }) {
  const rows = useMemo(() => analysis.table || [], [analysis.table]);
  const cols = useMemo(
    () =>
      METRICS.map((m) => ({
        ...m,
        sorted: rows
          .map((r) => r.ratios?.[m.key])
          .filter((v) => v != null && Number.isFinite(Number(v)))
          .map(Number)
          .sort((a, b) => a - b),
      })),
    [rows],
  );
  if (!rows.length) return null;
  return (
    <div className="scr5-table-wrap">
      <table className="scr5-table scr5-heat">
        <caption className="scr5-sr">Fundamentals from filed annual figures</caption>
        <thead>
          <tr>
            <th scope="col">Company</th>
            <th scope="col" className="is-num">
              Revenue (FY)
            </th>
            {cols.map((c) => (
              <th key={c.key} scope="col" className="is-num">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.ticker || r.issuer}>
              <th scope="row">
                <span className="scr5-mono">{r.ticker || 'N/A'}</span>
                <span className="scr5-sub">{r.issuer}</span>
              </th>
              <td className="is-num scr5-mono">{usd(r.ratios?.revenue)}</td>
              {cols.map((c) => {
                const v = r.ratios?.[c.key];
                const t = tierFor(v == null ? null : Number(v), c.sorted, c.better);
                return (
                  <td
                    key={c.key}
                    className={`is-num scr5-mono ${v == null ? 'is-na' : t == null ? '' : `is-t${t}`}`}
                  >
                    {fmt(v, c.kind)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="scr5-legend">
        <span className="scr5-swatch is-t0" aria-hidden="true" />
        <span className="scr5-swatch is-t2" aria-hidden="true" />
        <span className="scr5-swatch is-t4" aria-hidden="true" /> Shading compares each company with
        the others in this table (lower debt to equity shades stronger). N/A means the figure is not
        in the company&apos;s filings.
      </p>
    </div>
  );
}

function Pipeline({ comp, set, fa }) {
  const steps = [];
  if (set) {
    steps.push({
      t: `${set.left?.short || 'Left'} positions`,
      d: `${set.left?.count ?? 'N/A'} identified securities${set.left?.asOf ? `, ${set.left.asOf}` : ''}`,
    });
    steps.push({
      t: `${set.right?.short || 'Right'} holdings`,
      d: `${set.right?.count ?? 'N/A'} rows${set.right?.periods?.length ? `, period ${set.right.periods.join(', ')}` : ''}`,
    });
    steps.push({
      t: 'Matched',
      d: `${set.stats?.overlap ?? 0} by ${set.stats?.level === 'issuer' ? 'issuer' : 'CUSIP'}`,
    });
  }
  if (fa)
    steps.push({
      t: 'Fundamentals',
      d: fa.coverage
        ? `${fa.coverage.withData} of ${fa.coverage.selected} with filed financials`
        : fa.status,
    });
  if (!steps.length) return null;
  return (
    <ol className="scr5-pipe">
      {steps.map((s, i) => (
        <li key={s.t} className="scr5-pipe-step">
          <span className="scr5-pipe-n">{i + 1}</span>
          <span className="scr5-pipe-t">{s.t}</span>
          <span className="scr5-pipe-d">{s.d}</span>
        </li>
      ))}
      {comp.durationMs != null ? (
        <li className="scr5-pipe-time">Computed in {(comp.durationMs / 1000).toFixed(1)}s</li>
      ) : null}
    </ol>
  );
}

export default function CompositionReport({ composition: comp, onFollowUp = null }) {
  if (!comp || typeof comp !== 'object') return null;
  const f = comp.fulfillment;
  const set = (comp.sets || []).find((s) => s.op === 'intersect') || comp.sets?.[0] || null;
  const fa = (comp.analyses || []).find((a) => a.capability === 'fundamental-analysis') || null;
  /* Nov 27 2026: an institutional ownership ranking has its own answer layout. On its own it
     is the whole block; beside other analyses it renders first and they follow. */
  const own = (comp.analyses || []).find((a) => a.capability === 'institutional-ownership') || null;
  if (own && !set && !fa && (comp.analyses || []).length === 1)
    return <OwnershipReport analysis={own} fulfillment={f} onFollowUp={onFollowUp} />;
  const others = (comp.analyses || []).filter((a) => a !== fa && a !== own);
  const title = set
    ? `${short(set.left?.short)} × ${short(set.right?.short)} | Shared Holdings${fa ? ' Fundamental Analysis' : ''}`
    : comp.subject?.name
      ? `${comp.subject.name} | Research Composer results`
      : 'Research Composer results';
  const empty = set && set.op === 'intersect' && (set.stats?.overlap ?? 0) === 0;
  const limitations = [
    ...new Set([
      ...(comp.sets || []).flatMap((x) => x.notes || []),
      ...(comp.analyses || []).flatMap((a) => a.limitations || []),
    ]),
  ];
  const followUps = empty
    ? [
        `Compare ${short(set.left?.short)} with ${short(set.right?.short)}'s top 50 holdings`,
        `Match ${short(set.left?.short)} and ${short(set.right?.short)} by issuer instead of security`,
      ]
    : [];

  return (
    <section className="scr5" aria-labelledby="scr5-h">
      <header className="scr5-head">
        <p className="scr5-eyebrow">
          <i className="bi bi-diagram-3" aria-hidden="true" /> Research Composer
        </p>
        <h2 id="scr5-h" className="scr5-title">
          {title}
        </h2>
        {f ? <span className={`scr5-state ${STATE_TONE[f.state] || ''}`}>{f.label}</span> : null}
      </header>

      {own ? <OwnershipReport analysis={own} onFollowUp={null} /> : null}

      {set ? (
        <div className="scr5-tiles">
          <Tile
            label={`${short(set.left?.short)} positions`}
            value={set.left?.count ?? 'N/A'}
            note={set.left?.asOf || null}
          />
          <Tile
            label={`${short(set.right?.short)} holdings`}
            value={set.right?.count ?? 'N/A'}
            note={set.right?.periods?.length ? `Period ${set.right.periods.join(', ')}` : null}
          />
          <Tile
            label="Matching securities"
            value={set.stats?.overlap ?? 0}
            note={set.stats?.level === 'issuer' ? 'By issuer' : 'By CUSIP'}
          />
          <Tile
            label="Fundamentals covered"
            value={fa?.coverage ? `${fa.coverage.withData} of ${fa.coverage.selected}` : 'N/A'}
            note={fa ? 'Filed annual figures' : 'Not requested'}
          />
        </div>
      ) : null}

      {empty ? (
        <div className="scr5-empty" role="status">
          <p>
            No security appears in both datasets at the{' '}
            {set.stats?.level === 'issuer' ? 'issuer' : 'security'} level, so there is nothing to
            analyse. That is a computed result, not a missing one.
          </p>
          {onFollowUp ? (
            <div className="scr5-follow">
              {followUps.map((q) => (
                <button key={q} type="button" className="scr5-pill" onClick={() => onFollowUp(q)}>
                  {q}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {set?.matches?.length ? (
        <div className="scr5-block">
          <h3 className="scr5-h3">Securities in both datasets</h3>
          <SharedTable set={set} />
        </div>
      ) : null}

      {fa?.table?.length ? (
        <div className="scr5-block">
          <h3 className="scr5-h3">Fundamental strength</h3>
          <Heatmap analysis={fa} />
        </div>
      ) : null}

      {others.map((a) =>
        a.status === 'done' && (a.table?.length || a.dependence) ? (
          <div key={a.key} className="scr5-block">
            <h3 className="scr5-h3">{a.title || a.capability}</h3>
            <DependenceTiles d={a.dependence} />
            {a.dependence?.topAgencies?.length ? (
              <CalculatedTable
                analysis={{
                  title: `Awarding agencies, FY${a.dependence.latestFiscalYear} awards`,
                  columns: [
                    { key: 'agency', label: 'Awarding agency' },
                    { key: 'total', label: 'Value obligated to date', unit: 'usd' },
                    { key: 'share', label: 'Share', unit: 'pct' },
                  ],
                  table: a.dependence.topAgencies,
                }}
              />
            ) : null}
            <Funnel steps={a.funnel} />
            {a.columns?.length ? (
              <CalculatedTable analysis={a} />
            ) : (
              <p className="scr5-note">
                {a.table.length} companies computed. The figures are cited in the findings below.
              </p>
            )}
            {a.aligned === false ? (
              <p className="scr5-note">
                These companies close their fiscal years in different months, so the periods overlap
                only in part.
              </p>
            ) : null}
          </div>
        ) : null,
      )}

      <div className="scr5-block">
        <h3 className="scr5-h3">How this was calculated</h3>
        <Pipeline comp={comp} set={set} fa={fa} />
        {set ? (
          <p className="scr5-note">
            A match means the security appears in both latest available datasets. The dates differ
            by source, so it does not mean both held it on the same day.
            {set.left?.semantics ? ` ${set.left.semantics}` : ''}
          </p>
        ) : null}
        {limitations.length ? (
          <ul className="scr5-caveats">
            {limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {f?.objectives?.length ? (
        <ul className="scr5-objectives" aria-label="Required outputs">
          {f.objectives.map((o) => (
            <li key={o.id} className={`scr5-obj is-${o.status}`}>
              <i className={`bi ${OBJ_ICON[o.status] || 'bi-circle'}`} aria-hidden="true" />
              <span>{o.label}</span>
              {o.detail ? <span className="scr5-sub">{o.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {comp.failures?.length ? (
        <div className="scr5-fail" role="status">
          {comp.failures.map((x) => (
            <p key={x.key}>
              <strong>{x.title}</strong>: {x.failed}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
