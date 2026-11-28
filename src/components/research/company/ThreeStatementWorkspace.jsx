'use client';

/**
 * 3-Statement Model workspace (Nov 19th, 2026). A deterministic, driver-based
 * forecast (src/lib/research/three-statement.js) built on the company's last
 * reported annual statements. Every number on screen comes from one run of
 * the engine with the drivers shown, so the KPIs, chart, statements,
 * sensitivity and findings always agree. The balance check is computed, not
 * asserted. The AI narrative that used to be the whole model is still one
 * click away as commentary.
 */
import { getMarketDataState } from '@/lib/market-sample/client-state';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { useResearchPart } from '@/hooks/useResearchPart';
import { recordModelRun } from '@/lib/research/model-runs';
import {
  SCENARIOS,
  baseFromFinancials,
  fcfSensitivity,
  runThreeStatement,
  scenarioDrivers,
} from '@/lib/research/three-statement';
import { UxState, fmtBig, fmtRatioPct } from './ux-shared';

const DRIVER_GROUPS = [
  {
    name: 'Growth and profitability',
    items: [
      ['revenueGrowth', 'Revenue growth (per year)', -30, 60],
      ['grossMargin', 'Gross margin', -50, 95],
      ['rdPct', 'R&D, % of revenue', 0, 60],
      ['sgaPct', 'SG&A, % of revenue', 0, 80],
    ],
  },
  {
    name: 'Capital and working capital',
    items: [
      ['daPct', 'D&A, % of revenue', 0, 40],
      ['capexPct', 'Capex, % of revenue', 0, 60],
      ['nwcPct', 'Net working capital, % of revenue', -50, 80],
    ],
  },
  {
    name: 'Financing and tax',
    items: [
      ['taxRate', 'Tax rate', 0, 45],
      ['interestRate', 'Interest rate on debt', 0, 20],
    ],
  },
];

function DriverInput({ id, label, value, min, max, onChange }) {
  const [draft, setDraft] = useState(Number.isFinite(value) ? value.toFixed(1) : '');
  useEffect(() => {
    setDraft(Number.isFinite(value) ? value.toFixed(1) : '');
  }, [value]);
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    else setDraft(Number.isFinite(value) ? value.toFixed(1) : '');
  };
  return (
    <div className="ux-driver">
      <label htmlFor={`ux3-${id}`}>{label}</label>
      <span className="ux-driver__field">
        <input
          id={`ux3-${id}`}
          className="rc-num"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={min}
          max={max}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        <span aria-hidden="true">%</span>
      </span>
    </div>
  );
}

const IS_ROWS = [
  ['revenue', 'Revenue', 'money', true],
  ['revenueGrowth', 'YoY growth', 'pct'],
  ['grossProfit', 'Gross profit', 'money', true],
  ['grossMargin', 'Gross margin', 'pct'],
  ['rd', 'R&D', 'neg'],
  ['sga', 'SG&A', 'neg'],
  ['ebit', 'Operating income (EBIT)', 'money', true],
  ['ebitMargin', 'Operating margin', 'pct'],
  ['da', 'D&A', 'money'],
  ['ebitda', 'EBITDA', 'money', true],
  ['ebitdaMargin', 'EBITDA margin', 'pct'],
  ['interest', 'Interest expense', 'neg'],
  ['tax', 'Income tax', 'neg'],
  ['netIncome', 'Net income', 'money', true],
  ['eps', 'EPS (diluted, base share count)', 'eps'],
];
const BS_ROWS = [
  ['cash', 'Cash and short-term investments', 'money'],
  ['nwc', 'Net working capital', 'money'],
  ['ppe', 'PP&E (net)', 'money'],
  ['otherAssets', 'Other assets (held flat)', 'money'],
  ['totalAssets', 'Total assets (as modelled)', 'money', true],
  ['debt', 'Debt (held flat)', 'money'],
  ['otherLiabilities', 'Other liabilities (held flat)', 'money'],
  ['equity', 'Shareholders’ equity', 'money'],
  ['totalFunding', 'Liabilities and equity', 'money', true],
  ['gap', 'Balance difference', 'money'],
];
const CF_ROWS = [
  ['netIncome', 'Net income', 'money'],
  ['da', 'Add back D&A', 'money'],
  ['dNwc', 'Increase in net working capital', 'neg'],
  ['cfo', 'Operating cash flow', 'money', true],
  ['capex', 'Capital expenditure', 'neg'],
  ['fcf', 'Free cash flow', 'money', true],
  ['fcfMargin', 'FCF margin', 'pct'],
];

function cell(kind, v) {
  if (kind === 'pct') return fmtRatioPct(v);
  if (kind === 'eps') return Number.isFinite(v) ? `$${v.toFixed(2)}` : 'N/A';
  if (kind === 'neg') return fmtBig(Number.isFinite(v) ? -v : v, { brackets: true });
  return fmtBig(v, { brackets: true });
}

function toCsv(years, base) {
  const rows = [['Line', base.label, ...years.map((y) => y.label)]];
  for (const [k, label, kind] of [...IS_ROWS, ...BS_ROWS, ...CF_ROWS]) {
    rows.push([
      label,
      '',
      ...years.map((y) => (Number.isFinite(y[k]) ? (kind === 'pct' ? y[k] * 100 : y[k]) : '')),
    ]);
  }
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function ThreeStatementWorkspace({ symbol, onAiCommentary }) {
  const fin = useResearchPart(symbol, 'financials');
  const base = useMemo(() => (fin.data ? baseFromFinancials(fin.data) : null), [fin.data]);
  const [scenario, setScenario] = useState('base');
  const [drivers, setDrivers] = useState(null);
  const [view, setView] = useState('is');
  const [simple, setSimple] = useState(false);

  useEffect(() => {
    if (base) setDrivers(scenarioDrivers(base, scenario));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const result = useMemo(
    () => (base && drivers ? runThreeStatement(base, drivers) : null),
    [base, drivers],
  );
  const sens = useMemo(
    () => (base && drivers ? fcfSensitivity(base, drivers) : null),
    [base, drivers],
  );

  useEffect(() => {
    if (result) {
      recordModelRun(symbol, 'threestatement', {
        value: null,
        note: `Balance check ${result.balance.pass ? 'pass' : 'fail'}, ${SCENARIOS[scenario]?.label || 'Custom'} case`,
      });
    }
  }, [symbol, result, scenario]);

  if (fin.status !== 'ready') {
    return (
      <div className="ux-model-body">
        <UxState
          status={fin.status}
          error={fin.error ? `Reported statements unavailable: ${fin.error}` : null}
          onRetry={fin.retry}
          rows={6}
        />
      </div>
    );
  }
  if (!base || !result) {
    return (
      <p className="ux-state" role="status">
        The reported statements for {symbol} are missing revenue, assets or equity, so a balanced
        forecast cannot be built.
      </p>
    );
  }

  const setDriver = (k, v) => {
    setScenario('custom');
    setDrivers((d) => ({ ...d, [k]: v }));
  };
  const pickScenario = (id) => {
    setScenario(id);
    setDrivers(scenarioDrivers(base, id));
  };
  const s = result.summary;
  const y = result.years;
  const chartData = [
    { label: `${base.label} A`, revenue: base.revenue, ebitda: base.ebitda, fcf: base.fcf },
    ...y.map((r, i) => ({
      label: `Y${i + 1} E`,
      revenue: r.revenue,
      ebitda: r.ebitda,
      fcf: r.fcf,
    })),
  ];
  const rows = view === 'is' ? IS_ROWS : view === 'bs' ? BS_ROWS : CF_ROWS;
  const baseCol = {
    revenue: base.revenue,
    grossProfit: base.grossProfit,
    ebit: base.ebit,
    ebitda: base.ebitda,
    netIncome: base.netIncome,
    fcf: base.fcf,
    capex: base.capex,
    cash: base.cash,
    nwc: base.nwc,
    ppe: base.ppe,
    otherAssets: base.otherAssets,
    debt: base.debt,
    otherLiabilities: base.otherLiabilities,
    equity: base.equity,
  };
  const download = () => {
    /* Sonar 6.4 final integration: an export built on demonstration data says so in the
       file and its name (state from the server's data-state header). */
    const sample = getMarketDataState() === 'sample';
    const csv = toCsv(y, base);
    const blob = new Blob(
      [
        sample
          ? `"SAMPLE DATA: synthetic demonstration figures, not reported financials"\n${csv}`
          : csv,
      ],
      { type: 'text/csv' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${symbol}-3-statement-${scenario}${sample ? '-SAMPLE' : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const findings = [
    `Revenue compounds at ${fmtRatioPct(s.revenueCagr)} a year to ${fmtBig(s.y5Revenue)} in year 5.`,
    `EBITDA margin reaches ${fmtRatioPct(s.y5EbitdaMargin)} in year 5, against ${fmtRatioPct(base.ebitda / base.revenue)} in ${base.label}.`,
    `Free cash flow margin is ${fmtRatioPct(s.y5FcfMargin)} in year 5 (${fmtBig(s.y5Fcf)}).`,
    Number.isFinite(s.y5NetDebtToEbitda)
      ? s.y5NetDebtToEbitda < 0
        ? `The model ends year 5 with net cash (net debt / EBITDA ${s.y5NetDebtToEbitda.toFixed(1)}x).`
        : `Net debt / EBITDA is ${s.y5NetDebtToEbitda.toFixed(1)}x in year 5.`
      : 'EBITDA is not positive in year 5, so leverage is not meaningful.',
  ];

  return (
    <div className="ux-model-body ux-3s">
      <div className={`ux-health ${result.balance.pass ? 'is-ok' : 'is-bad'}`} role="status">
        <i
          className={`bi ${result.balance.pass ? 'bi-check-circle-fill' : 'bi-x-octagon-fill'}`}
          aria-hidden="true"
        />
        <strong>Balance check: {result.balance.pass ? 'Pass' : 'Fail'}</strong>
        <span className="ux-muted rc-num">
          Largest assets minus liabilities-and-equity gap across five years:{' '}
          {fmtBig(result.balance.maxGap)} (tolerance $1M).
        </span>
        <span className="ux-muted">Base year {base.label}, reported.</span>
      </div>

      <div className="ux-3s__toolbar">
        <div className="ux-seg" role="group" aria-label="Scenario">
          {Object.entries(SCENARIOS).map(([id, sc]) => (
            <button
              key={id}
              type="button"
              aria-pressed={scenario === id}
              className={scenario === id ? 'is-on' : ''}
              onClick={() => pickScenario(id)}
            >
              {sc.label}
            </button>
          ))}
          {scenario === 'custom' ? <span className="ux-seg__custom">Custom</span> : null}
        </div>
        <span className="ux-muted ux-3s__scnote">
          {scenario === 'custom' ? 'Your edited drivers.' : SCENARIOS[scenario].note}
        </span>
        <div className="ux-3s__actions">
          <button
            type="button"
            className="ux-text-btn"
            aria-pressed={simple}
            onClick={() => setSimple((v) => !v)}
          >
            <i className="bi bi-chat-left-text" aria-hidden="true" /> Explain simply
          </button>
          <button type="button" className="ux-text-btn" onClick={() => pickScenario('base')}>
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Reset
          </button>
          <button type="button" className="ux-text-btn" onClick={download}>
            <i className="bi bi-download" aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>

      {simple ? (
        <p className="ux-simple">
          This model takes {symbol}&apos;s last reported year and rolls it forward five years using
          the percentages on the left. Profit adds to the company&apos;s cash and equity; spending
          on equipment and stock moves money from cash to those assets. Because every dollar is
          tracked on both sides, assets must equal liabilities plus equity, and the check above
          proves they do. It forecasts the business; it does not say what the shares are worth.
        </p>
      ) : null}

      <div className="ux-3s__grid">
        <aside className="ux-3s__drivers" aria-label="Assumptions">
          <h4 className="ux-kicker">Assumptions, % (defaults from reported history)</h4>
          {DRIVER_GROUPS.map((g) => (
            <fieldset key={g.name} className="ux-driver-group">
              <legend>{g.name}</legend>
              {g.items.map(([k, label, min, max]) => (
                <DriverInput
                  key={k}
                  id={k}
                  label={label}
                  value={drivers[k]}
                  min={min}
                  max={max}
                  onChange={(v) => setDriver(k, v)}
                />
              ))}
            </fieldset>
          ))}
          <p className="ux-foot">
            Held constant: debt, other assets, other liabilities, share count. No dividends or
            buybacks are assumed.
          </p>
        </aside>

        <div className="ux-3s__main">
          <ul className="ux-kpis">
            <li>
              <span>Revenue, year 5</span>
              <strong className="rc-num">{fmtBig(s.y5Revenue)}</strong>
              <em className="rc-num">{fmtRatioPct(s.revenueCagr)} CAGR</em>
            </li>
            <li>
              <span>EBITDA margin, year 5</span>
              <strong className="rc-num">{fmtRatioPct(s.y5EbitdaMargin)}</strong>
            </li>
            <li>
              <span>FCF margin, year 5</span>
              <strong className="rc-num">{fmtRatioPct(s.y5FcfMargin)}</strong>
            </li>
            <li>
              <span>Net debt / EBITDA, year 5</span>
              <strong className="rc-num">
                {Number.isFinite(s.y5NetDebtToEbitda)
                  ? `${s.y5NetDebtToEbitda.toFixed(1)}x`
                  : 'N/A'}
              </strong>
              <em>
                {Number.isFinite(s.y5NetDebtToEbitda) && s.y5NetDebtToEbitda < 0 ? 'Net cash' : ' '}
              </em>
            </li>
          </ul>

          <figure
            className="ux-chart"
            aria-label={`Revenue, EBITDA and free cash flow, ${base.label} reported and five forecast years`}
          >
            <figcaption className="ux-kicker">
              Forecast: revenue, EBITDA and FCF (A = reported, E = estimate)
            </figcaption>
            <div className="ux-chart__box">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid
                    strokeDasharray={CHART.gridDash}
                    stroke={CHART.gridStroke}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={CHART.tick}
                    axisLine={CHART.xAxisLine}
                    tickLine={false}
                  />
                  <YAxis
                    tick={CHART.tick}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                    tickFormatter={(v) => fmtBig(v)}
                  />
                  <Tooltip
                    formatter={(v, name) => [fmtBig(v), name]}
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="color-mix(in srgb, var(--emerald) 35%, transparent)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="ebitda"
                    name="EBITDA"
                    stroke={CHART.primaryStroke}
                    strokeWidth={CHART.primaryStrokeWidth}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="fcf"
                    name="FCF"
                    stroke={CHART.benchmarkStroke}
                    strokeDasharray={CHART.benchmarkDash}
                    strokeWidth={CHART.secondaryStrokeWidth}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </figure>

          <div className="ux-seg ux-seg--tabs" role="tablist" aria-label="Statement">
            {[
              ['is', 'Income statement'],
              ['bs', 'Balance sheet'],
              ['cf', 'Cash flow'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                className={view === id ? 'is-on' : ''}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ux-table-wrap">
            <table className="rc-table ux-fin-table">
              <caption className="rc-sr">
                Projected{' '}
                {view === 'is'
                  ? 'income statement'
                  : view === 'bs'
                    ? 'balance sheet'
                    : 'cash flow statement'}
                , USD
              </caption>
              <thead>
                <tr>
                  <th scope="col">USD</th>
                  <th scope="col">{base.label} A</th>
                  {y.map((r, i) => (
                    <th key={r.label} scope="col">
                      Y{i + 1} E
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([k, label, kind, strong]) => (
                  <tr
                    key={k}
                    className={`${strong ? 'is-total' : ''}${kind === 'pct' ? ' is-sub' : ''}`}
                  >
                    <th scope="row">{label}</th>
                    <td className="rc-num">
                      {baseCol[k] != null ? cell(kind === 'neg' ? 'neg' : kind, baseCol[k]) : ''}
                    </td>
                    {y.map((r) => (
                      <td key={r.label} className="rc-num">
                        {cell(kind, r[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="ux-3s__side">
          <h4 className="ux-kicker">Model findings</h4>
          <ul className="ux-checks">
            {findings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {sens ? (
            <div className="ux-sens">
              <h4 className="ux-kicker">Sensitivity: year-5 FCF</h4>
              <table className="rc-table">
                <caption className="rc-sr">
                  Year-5 free cash flow by revenue growth (rows) and gross margin (columns)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Growth \ GM</th>
                    {sens[0].cells.map((c) => (
                      <th key={c.margin} scope="col" className="rc-num">
                        {c.margin.toFixed(1)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sens.map((row, ri) => (
                    <tr key={row.growth}>
                      <th scope="row" className="rc-num">
                        {row.growth.toFixed(1)}%
                      </th>
                      {row.cells.map((c, ci) => (
                        <td
                          key={c.margin}
                          className={`rc-num${ri === 1 && ci === 1 ? ' is-base' : ''}`}
                        >
                          {fmtBig(c.fcf, { brackets: true })}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="ux-foot">
            A statement forecast, not a valuation: no per-share fair value is derived from it. For a
            value per share, open DCF Valuation.
          </p>
          <button type="button" className="ux-text-btn" onClick={onAiCommentary}>
            <i className="bi bi-stars" aria-hidden="true" /> Add AI commentary on this company
          </button>
        </aside>
      </div>
      <p className="ux-foot">Source: {fin.data.source}.</p>
    </div>
  );
}

export default ThreeStatementWorkspace;
