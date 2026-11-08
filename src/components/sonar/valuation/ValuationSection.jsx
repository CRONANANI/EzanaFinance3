'use client';

/**
 * ValuationSection (Nov 2026): the deep research Valuation section for an answer about one
 * listed company. Rendered only when the deep sections are open (canRender('valuation')).
 * Data: lib/sonar/valuation/model.js buildValuationModel.
 *
 *   A. Historical valuation: each multiple's value, median, interquartile range, percentile,
 *      observations and window
 *   B. Comparable companies: industry peers on the same trailing measures, the subject's peer
 *      percentile (labelled as such), and how the peers were chosen
 *   C. Discounted cash flow: every assumption with its source, the five-year forecast, the
 *      bridge to value per share; or the inputs that are missing
 *   D. Scenarios: bear, base and bull with the assumptions behind each
 *   E. Sensitivity: WACC against terminal growth; earnings against the P/E multiple
 *   F. Conclusion: observations, model outputs, interpretation and risks, each labelled
 *
 * Styles: valuation.css (vsn-). Tokens only.
 */
import { useId } from 'react';
import { fmtMetric, fmtDate } from './ValuationSnapshot';
import './valuation.css';

const ordinal = (p) => {
  const n = Math.round(p);
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${s}`;
};
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const usd = (v) => {
  if (!num(v)) return 'n/a';
  const a = Math.abs(v);
  const [d, s] = a >= 1e12 ? [1e12, 'T'] : a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : [1, ''];
  return `${v < 0 ? '−' : ''}$${(a / d).toFixed(d === 1 ? 2 : 1)}${s}`;
};
const px = (v) => (num(v) ? `$${v.toFixed(2)}` : 'n/a');
const x1 = (v) => (num(v) ? `${v.toFixed(1)}x` : 'n/a');
const p1 = (v) => (num(v) ? `${v.toFixed(1)}%` : 'n/a');

const KIND = {
  observation: { label: 'Observation', icon: 'bi-eye' },
  model: { label: 'Model output', icon: 'bi-calculator' },
  interpretation: { label: 'Interpretation', icon: 'bi-lightbulb' },
  risk: { label: 'Risk', icon: 'bi-exclamation-triangle' },
};
const SOURCE = { reported: 'Reported', market: 'Market', assumption: 'Assumption', model: 'Model' };

function Card({ id, title, icon, children, wide = false }) {
  return (
    <section className={`vsn-card${wide ? ' is-wide' : ''}`} aria-labelledby={id}>
      <h3 id={id} className="vsn-card-title">
        <i className={`bi ${icon}`} aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function History({ h }) {
  const id = useId();
  const rows = (h?.metrics || []).filter((m) => m.status !== 'unavailable');
  if (!rows.length) return null;
  return (
    <Card id={id} title="Historical valuation" icon="bi-clock-history" wide>
      <div
        className="vsn-tablewrap"
        role="region"
        aria-label="Historical valuation table"
        tabIndex={0}
      >
        <table className="vsn-table">
          <caption className="vsn-sr">
            Each multiple today against its {h.lookbackYears}-year month-end history
          </caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col" className="is-num">
                Today
              </th>
              <th scope="col" className="is-num">
                Median
              </th>
              <th scope="col" className="is-num">
                25th to 75th
              </th>
              <th scope="col" className="is-num">
                Historical percentile
              </th>
              <th scope="col">Window</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <th scope="row">{m.label}</th>
                <td className="is-num">{m.status === 'nm' ? 'NM' : fmtMetric(m)}</td>
                <td className="is-num">{m.median != null ? fmtMetric(m, m.median) : 'n/a'}</td>
                <td className="is-num">
                  {m.p25 != null ? `${fmtMetric(m, m.p25)} to ${fmtMetric(m, m.p75)}` : 'n/a'}
                </td>
                <td className="is-num">
                  {m.percentile != null ? (
                    ordinal(m.percentile)
                  ) : (
                    <span className="vsn-muted">{m.note}</span>
                  )}
                </td>
                <td>
                  {m.window
                    ? `${fmtDate(m.window.from)} to ${fmtDate(m.window.to)}, ${m.observations} obs.${m.excludedNm ? ` (${m.excludedNm} NM left out)` : ''}`
                    : m.basis || 'n/a'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="vsn-note">
        Month-end market cap over trailing four-quarter fundamentals as filed by that date (point in
        time). Percentile: share of observations at or below today&apos;s value. For FCF yield a
        higher percentile means a lower valuation.
      </p>
    </Card>
  );
}

function Peers({ p }) {
  const id = useId();
  if (!p?.rows?.length)
    return p?.logic ? (
      <Card id={id} title="Comparable companies" icon="bi-people">
        <p className="vsn-note">{p.logic.note}</p>
      </Card>
    ) : null;
  const cols = [
    ['marketCap', 'Market cap', usd],
    ['pe', 'P/E', x1],
    ['evEbitda', 'EV/EBITDA', x1],
    ['ps', 'P/S', x1],
    ['fcfYield', 'FCF yield', p1],
    ['revenueGrowth', 'Revenue growth', p1],
    ['operatingMargin', 'Operating margin', p1],
  ];
  const all = p.subject?.ticker ? [{ ...p.subject, isSubject: true }, ...p.rows] : p.rows;
  return (
    <Card id={id} title="Comparable companies" icon="bi-people" wide>
      <div
        className="vsn-tablewrap"
        role="region"
        aria-label="Comparable companies table"
        tabIndex={0}
      >
        <table className="vsn-table">
          <caption className="vsn-sr">
            The company and its industry peers on trailing twelve-month measures
          </caption>
          <thead>
            <tr>
              <th scope="col">Company</th>
              {cols.map(([k, l]) => (
                <th key={k} scope="col" className="is-num">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {all.map((r) => (
              <tr key={r.ticker} className={r.isSubject ? 'is-subject' : undefined}>
                <th scope="row">
                  {r.name} <span className="vsn-muted">{r.ticker}</span>
                </th>
                {cols.map(([k, , f]) => (
                  <td key={k} className="is-num">
                    {f(r[k])}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="is-median">
              <th scope="row">Peer median</th>
              {cols.map(([k, , f]) => (
                <td key={k} className="is-num">
                  {k === 'marketCap' ? '' : f(p.medians[k])}
                </td>
              ))}
            </tr>
            <tr className="is-median">
              <th scope="row">Peer percentile of {p.subject?.ticker}</th>
              {cols.map(([k]) => (
                <td key={k} className="is-num">
                  {k !== 'marketCap' && p.subjectPercentile[k] != null
                    ? ordinal(p.subjectPercentile[k])
                    : ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <details className="vsn-details">
        <summary>How the peers were chosen</summary>
        <p>{p.logic?.note}</p>
        {p.logic?.scaleNote ? <p>{p.logic.scaleNote}</p> : null}
        <p>
          Source: {p.logic?.source}. A peer percentile ranks {p.subject?.ticker} among these peers
          and is separate from its historical percentile.
        </p>
      </details>
    </Card>
  );
}

function Dcf({ d }) {
  const id = useId();
  if (!d) return null;
  if (!d.ok)
    return (
      <Card id={id} title="Discounted cash flow" icon="bi-diagram-3">
        <p className="vsn-note">
          No DCF:{' '}
          {d.error ||
            `${(d.missing || []).join(', ')} ${(d.missing || []).length === 1 ? 'is' : 'are'} not available`}
          . A DCF without its inputs would be a guess presented as a value.
        </p>
      </Card>
    );
  const r = d.result;
  return (
    <Card id={id} title="Discounted cash flow" icon="bi-diagram-3" wide>
      <div className="vsn-dcf">
        <dl className="vsn-assume">
          {d.assumptions.map((a) => (
            <div key={a.label}>
              <dt>{a.label}</dt>
              <dd>
                {a.value}
                <span className={`vsn-src is-${a.source}`}>{SOURCE[a.source] || a.source}</span>
                {a.note ? <span className="vsn-muted"> {a.note}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
        <div className="vsn-tablewrap" role="region" aria-label="DCF forecast" tabIndex={0}>
          <table className="vsn-table">
            <caption className="vsn-sr">
              Five-year free cash flow forecast and the bridge to value per share
            </caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col" className="is-num">
                  Growth
                </th>
                <th scope="col" className="is-num">
                  Revenue
                </th>
                <th scope="col" className="is-num">
                  EBIT
                </th>
                <th scope="col" className="is-num">
                  FCFF
                </th>
                <th scope="col" className="is-num">
                  Present value
                </th>
              </tr>
            </thead>
            <tbody>
              {r.years.map((y) => (
                <tr key={y.year}>
                  <th scope="row">Year {y.year}</th>
                  <td className="is-num">{p1(y.growth * 100)}</td>
                  <td className="is-num">{usd(y.revenue)}</td>
                  <td className="is-num">{usd(y.ebit)}</td>
                  <td className="is-num">{usd(y.fcff)}</td>
                  <td className="is-num">{usd(y.pv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="vsn-bridge">
          <div>
            <dt>Present value of the forecast</dt>
            <dd>{usd(r.pvForecast)}</dd>
          </div>
          <div>
            <dt>Present value of the terminal value</dt>
            <dd>{usd(r.pvTerminal)}</dd>
          </div>
          <div>
            <dt>Enterprise value</dt>
            <dd>{usd(r.enterpriseValue)}</dd>
          </div>
          <div>
            <dt>Less debt, plus cash</dt>
            <dd>{usd(r.equityValue - r.enterpriseValue)}</dd>
          </div>
          <div>
            <dt>Equity value</dt>
            <dd>{usd(r.equityValue)}</dd>
          </div>
          <div className="is-total">
            <dt>Implied value per share (model output)</dt>
            <dd>{px(r.perShare)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

function Scenarios({ s, price }) {
  const id = useId();
  if (!s?.length) return null;
  return (
    <Card id={id} title="Valuation scenarios" icon="bi-signpost-split" wide>
      <div className="vsn-tablewrap" role="region" aria-label="Scenarios" tabIndex={0}>
        <table className="vsn-table">
          <caption className="vsn-sr">Bear, base and bull cases with their assumptions</caption>
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th scope="col" className="is-num">
                Starting growth
              </th>
              <th scope="col" className="is-num">
                Operating margin
              </th>
              <th scope="col" className="is-num">
                WACC
              </th>
              <th scope="col" className="is-num">
                Value per share
              </th>
              <th scope="col" className="is-num">
                vs price
              </th>
            </tr>
          </thead>
          <tbody>
            {s.map((c) => (
              <tr key={c.id} className={c.id === 'base' ? 'is-subject' : undefined}>
                <th scope="row">{c.label}</th>
                <td className="is-num">{p1(c.assumptions.startGrowthPct)}</td>
                <td className="is-num">{p1(c.assumptions.marginPct)}</td>
                <td className="is-num">{p1(c.assumptions.waccPct)}</td>
                <td className="is-num">{px(c.perShare)}</td>
                <td className="is-num">
                  {num(c.vsPricePct)
                    ? `${c.vsPricePct >= 0 ? '+' : '−'}${Math.abs(c.vsPricePct).toFixed(1)}%`
                    : 'n/a'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="vsn-note">
        Bear: growth 3 points lower, margin 2 points lower, WACC 1 point higher. Bull: growth 3
        points higher, margin 2 points higher, WACC 0.5 points lower. Price {px(price)}.
      </p>
    </Card>
  );
}

function Grid({
  title,
  rowHead,
  colHead,
  rows,
  cols,
  cells,
  fmtCol = (c) => c,
  fmtRow = (r) => r,
}) {
  return (
    <div className="vsn-tablewrap" role="region" aria-label={title} tabIndex={0}>
      <table className="vsn-table vsn-grid">
        <caption className="vsn-sr">{title}</caption>
        <thead>
          <tr>
            <th scope="col">
              {rowHead} / {colHead}
            </th>
            {cols.map((c, j) => (
              <th key={j} scope="col" className="is-num">
                {fmtCol(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row">{fmtRow(r)}</th>
              {cells[i].map((v, j) => (
                <td
                  key={j}
                  className={`is-num${i === Math.floor(rows.length / 2) && j === Math.floor(cols.length / 2) ? ' is-base' : ''}`}
                >
                  {px(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sensitivity({ s }) {
  const id = useId();
  if (!s?.waccGrowth && !s?.growthMultiple) return null;
  return (
    <Card id={id} title="Sensitivity" icon="bi-grid-3x3" wide>
      {s.waccGrowth ? (
        <>
          <p className="vsn-grid-title">Value per share: WACC against terminal growth</p>
          <Grid
            title="Value per share by WACC and terminal growth"
            rowHead="WACC"
            colHead="Terminal growth"
            rows={s.waccGrowth.rows}
            cols={s.waccGrowth.cols}
            cells={s.waccGrowth.cells}
            fmtRow={(r) => `${r.toFixed(2)}%`}
            fmtCol={(c) => `${c.toFixed(1)}%`}
          />
        </>
      ) : null}
      {s.growthMultiple ? (
        <>
          <p className="vsn-grid-title">
            Price on next fiscal year EPS (consensus ${s.growthMultiple.eps.toFixed(2)}, year ending{' '}
            {fmtDate(s.growthMultiple.fiscalYearEnd)}) against the stock&apos;s own P/E range
          </p>
          <Grid
            title="Price by EPS and P/E multiple"
            rowHead="EPS"
            colHead="P/E"
            rows={s.growthMultiple.rows}
            cols={s.growthMultiple.cols}
            cells={s.growthMultiple.cells}
            fmtRow={(r) => r.label}
            fmtCol={(c) => `${c.label} (${c.value.toFixed(1)}x)`}
          />
        </>
      ) : null}
    </Card>
  );
}

function Conclusion({ items }) {
  const id = useId();
  if (!items?.length) return null;
  return (
    <Card id={id} title="Valuation conclusion" icon="bi-flag" wide>
      <ul className="vsn-concl">
        {items.map((c, i) => (
          <li key={i} className={`vsn-concl-row is-${c.kind}`}>
            <span className="vsn-kind">
              <i className={`bi ${KIND[c.kind]?.icon || 'bi-dot'}`} aria-hidden="true" />
              {KIND[c.kind]?.label || c.kind}
            </span>
            <p>{c.text}</p>
          </li>
        ))}
      </ul>
      <p className="vsn-note">Findings only, not investment advice.</p>
    </Card>
  );
}

export function ValuationSection({ model }) {
  const id = useId();
  if (!model) return null;
  return (
    <section className="vsn-section" aria-labelledby={id}>
      <h2 id={id} className="vsn-eyebrow">
        <i className="bi bi-speedometer2" aria-hidden="true" />
        Valuation
        <span className="vsn-meta"> as of {fmtDate(model.asOf)}</span>
      </h2>
      <div className="vsn-cards">
        <Conclusion items={model.conclusion} />
        <History h={model.history} />
        <Peers p={model.peers} />
        <Dcf d={model.dcf} />
        <Scenarios s={model.scenarios} price={model.dcf?.inputs?.price} />
        <Sensitivity s={model.sensitivity} />
      </div>
    </section>
  );
}

export default ValuationSection;
