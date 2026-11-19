'use client';

/**
 * Supporting research tabs for the selected stock (Nov 19th, 2026):
 * Financials, Ownership & Flows, Filings & Events and Sonar Research.
 * Each loads its own data (useResearchPart) only when the tab opens.
 * Reported values, filings and derived ratios are labelled as such.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { isNum, fmtSignedPct, signOf } from '@/lib/research/company-research';
import { useResearchPart } from '@/hooks/useResearchPart';
import { UxCard, UxState, fmtBig, fmtCount, fmtDay, fmtRatioPct } from './ux-shared';

/* ── Financials ─────────────────────────────────────────────────────── */

const lineOf = (st, key) => st?.lines?.find((l) => l.key === key)?.values || [];
const div = (a, b) => (isNum(a) && isNum(b) && b !== 0 ? a / b : null);

function derivedRatios(fin) {
  const n = fin.income.periods.length;
  const rev = lineOf(fin.income, 'revenue');
  const gp = lineOf(fin.income, 'grossProfit');
  const op = lineOf(fin.income, 'operatingIncome');
  const ni = lineOf(fin.income, 'netIncome');
  const ebitda = lineOf(fin.income, 'ebitda');
  const fcf = lineOf(fin.cashflow, 'freeCashFlow');
  const capex = lineOf(fin.cashflow, 'capitalExpenditure');
  const ca = lineOf(fin.balance, 'totalCurrentAssets');
  const cl = lineOf(fin.balance, 'totalCurrentLiabilities');
  const debt = lineOf(fin.balance, 'totalDebt');
  const eq = lineOf(fin.balance, 'totalStockholdersEquity');
  const nd = lineOf(fin.balance, 'netDebt');
  const at = (arr, i) => (i < arr.length ? arr[i] : null);
  const rows = [
    ['Revenue growth', (i) => (i > 0 ? div(at(rev, i), at(rev, i - 1)) - 1 : null), 'pct'],
    ['Gross margin', (i) => div(at(gp, i), at(rev, i)), 'pct'],
    ['Operating margin', (i) => div(at(op, i), at(rev, i)), 'pct'],
    ['Net margin', (i) => div(at(ni, i), at(rev, i)), 'pct'],
    ['FCF margin', (i) => div(at(fcf, i), at(rev, i)), 'pct'],
    ['Capex, % of revenue', (i) => div(Math.abs(at(capex, i) ?? NaN), at(rev, i)), 'pct'],
    ['Current ratio', (i) => div(at(ca, i), at(cl, i)), 'x'],
    ['Debt / equity', (i) => div(at(debt, i), at(eq, i)), 'x'],
    ['Net debt / EBITDA', (i) => div(at(nd, i), at(ebitda, i)), 'x'],
  ];
  return rows.map(([label, f, kind]) => ({
    label,
    kind,
    values: Array.from({ length: n }, (_, i) => {
      const v = f(i);
      return isNum(v) ? v : null;
    }),
  }));
}

const FIN_VIEWS = [
  ['income', 'Income statement'],
  ['balance', 'Balance sheet'],
  ['cashflow', 'Cash flow'],
  ['ratios', 'Ratios'],
];

export function FinancialsTab({ symbol }) {
  const fin = useResearchPart(symbol, 'financials');
  const [view, setView] = useState('income');
  const ratios = useMemo(() => (fin.data ? derivedRatios(fin.data) : null), [fin.data]);
  if (fin.status !== 'ready') {
    return <UxState status={fin.status} error={fin.error} onRetry={fin.retry} rows={8} />;
  }
  const st = view === 'ratios' ? null : fin.data[view];
  const periods = fin.data.income.periods;
  return (
    <div className="ux-tab">
      <div className="ux-seg ux-seg--tabs" role="tablist" aria-label="Financial statements">
        {FIN_VIEWS.map(([id, label]) => (
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
            {FIN_VIEWS.find((v) => v[0] === view)?.[1] || view}, annual, reported
          </caption>
          <thead>
            <tr>
              <th scope="col">{view === 'ratios' ? 'Derived' : 'USD, as reported'}</th>
              {(st?.periods || periods).map((p) => (
                <th key={p.label} scope="col">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view === 'ratios'
              ? ratios.map((r) => (
                  <tr key={r.label}>
                    <th scope="row">{r.label}</th>
                    {r.values.map((v, i) => (
                      <td key={i} className="rc-num">
                        {v == null ? 'N/A' : r.kind === 'pct' ? fmtRatioPct(v) : `${v.toFixed(2)}x`}
                      </td>
                    ))}
                  </tr>
                ))
              : st.lines.map((l) => (
                  <tr
                    key={l.key}
                    className={
                      /income$|Profit|profit|Total|cash flow|Free/.test(l.label) ? 'is-total' : ''
                    }
                  >
                    <th scope="row">{l.label}</th>
                    {l.values.map((v, i) => (
                      <td key={i} className="rc-num">
                        {l.key === 'epsDiluted'
                          ? isNum(v)
                            ? `$${v.toFixed(2)}`
                            : 'N/A'
                          : /Shs/.test(l.key)
                            ? fmtCount(v)
                            : fmtBig(v, { brackets: true })}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <p className="ux-foot">
        Source: {fin.data.source}. Ratios are calculated from these reported figures. Negative
        values are shown in brackets.
        {periods.length
          ? ` Latest period ends ${fmtDay(periods[periods.length - 1].date)}${periods[periods.length - 1].filed ? `, filed ${fmtDay(periods[periods.length - 1].filed)}` : ''}.`
          : ''}
      </p>
    </div>
  );
}

/* ── Ownership & Flows ──────────────────────────────────────────────── */

const TX_CODES = {
  P: 'Open-market purchase',
  S: 'Open-market sale',
  A: 'Grant or award',
  M: 'Option exercise',
  F: 'Tax withholding',
  G: 'Gift',
  D: 'Disposition to issuer',
  C: 'Conversion',
};

export function OwnershipTab({ symbol, research }) {
  const own = useResearchPart(symbol, 'ownership');
  if (own.status !== 'ready') {
    return <UxState status={own.status} error={own.error} onRetry={own.retry} rows={8} />;
  }
  const { institutional: inst, stakes, insiders, insiderSource } = own.data;
  const sharesOut =
    isNum(research.quote.marketCap) && isNum(research.quote.price) && research.quote.price > 0
      ? research.quote.marketCap / research.quote.price
      : null;
  const pctHeld = inst && sharesOut ? (inst.totalShares / sharesOut) * 100 : null;
  const qoq =
    inst && isNum(inst.previousShares) && inst.previousShares > 0
      ? (inst.totalShares / inst.previousShares - 1) * 100
      : null;
  const fresh = inst
    ? Date.now() < new Date(`${inst.period}T00:00:00Z`).getTime() + 46 * 864e5
    : false;
  const ch = inst?.changes;
  const chTotal = ch ? ch.opened + ch.added + ch.reduced + ch.closed : 0;

  return (
    <div className="ux-tab">
      {inst ? (
        <>
          <ul className="ux-kpis">
            <li>
              <span>13F holders, {fmtDay(inst.period)}</span>
              <strong className="rc-num">{inst.holders.toLocaleString('en-US')}</strong>
              <em className="rc-num">
                {isNum(inst.previousHolders)
                  ? `${inst.previousHolders.toLocaleString('en-US')} prior quarter`
                  : ' '}
              </em>
            </li>
            <li>
              <span>Shares held</span>
              <strong className="rc-num">{fmtCount(inst.totalShares)}</strong>
              <em className="rc-num">
                {isNum(pctHeld) ? `≈${pctHeld.toFixed(1)}% of shares outstanding` : ' '}
              </em>
            </li>
            <li>
              <span>Reported value</span>
              <strong className="rc-num">{fmtBig(inst.totalValue)}</strong>
              <em>at quarter end</em>
            </li>
            <li>
              <span>Shares held vs prior quarter</span>
              <strong className={`rc-num rc-tone--${signOf(qoq)}`}>
                {isNum(qoq) ? fmtSignedPct(qoq) : 'N/A'}
              </strong>
              <em>{inst.previousPeriod ? `vs ${fmtDay(inst.previousPeriod)}` : ' '}</em>
            </li>
          </ul>
          {fresh ? (
            <p className="ux-foot" role="note">
              <i className="bi bi-hourglass-split" aria-hidden="true" /> Filings for this quarter
              are still arriving (they are due 45 days after quarter end), so totals may rise.
            </p>
          ) : null}

          {ch && chTotal ? (
            <UxCard
              id="ux-own-changes"
              title="How 13F filers moved"
              icon="bi-arrow-left-right"
              info={`${fmtDay(inst.previousPeriod)} to ${fmtDay(inst.period)}`}
            >
              <div
                className="ux-split"
                role="img"
                aria-label={`New positions ${ch.opened}, added ${ch.added}, reduced ${ch.reduced}, closed ${ch.closed}`}
              >
                {[
                  ['opened', 'New', ch.opened],
                  ['added', 'Added', ch.added],
                  ['reduced', 'Reduced', ch.reduced],
                  ['closed', 'Closed', ch.closed],
                ].map(([k, label, n]) =>
                  n ? (
                    <span
                      key={k}
                      className={`ux-split__seg ux-split__seg--${k}`}
                      style={{ flexGrow: n }}
                    />
                  ) : null,
                )}
              </div>
              <ul className="ux-split__legend">
                <li>
                  <span className="ux-split__dot ux-split__seg--opened" aria-hidden="true" /> New{' '}
                  <b className="rc-num">{ch.opened}</b>
                </li>
                <li>
                  <span className="ux-split__dot ux-split__seg--added" aria-hidden="true" /> Added{' '}
                  <b className="rc-num">{ch.added}</b>
                </li>
                <li>
                  <span className="ux-split__dot ux-split__seg--reduced" aria-hidden="true" />{' '}
                  Reduced <b className="rc-num">{ch.reduced}</b>
                </li>
                <li>
                  <span className="ux-split__dot ux-split__seg--closed" aria-hidden="true" /> Closed{' '}
                  <b className="rc-num">{ch.closed}</b>
                </li>
              </ul>
            </UxCard>
          ) : null}

          <UxCard id="ux-own-top" title="Largest 13F holders" icon="bi-bank">
            <div className="ux-table-wrap">
              <table className="rc-table">
                <caption className="rc-sr">
                  Largest institutional holders, {fmtDay(inst.period)}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Filer</th>
                    <th scope="col">Shares</th>
                    <th scope="col">Value</th>
                    <th scope="col">Change in shares</th>
                    <th scope="col">Filed</th>
                  </tr>
                </thead>
                <tbody>
                  {inst.top.map((h) => (
                    <tr key={h.cik}>
                      <th scope="row">{h.name}</th>
                      <td className="rc-num">{fmtCount(h.shares)}</td>
                      <td className="rc-num">{fmtBig(h.value)}</td>
                      <td className={`rc-num rc-tone--${signOf(h.changeShares)}`}>
                        {h.isNew
                          ? 'New position'
                          : isNum(h.changeShares)
                            ? `${h.changeShares > 0 ? '+' : ''}${fmtCount(h.changeShares)}`
                            : 'N/A'}
                      </td>
                      <td className="rc-num">{fmtDay(h.filedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </UxCard>
        </>
      ) : (
        <p className="ux-state">No Form 13F holdings are on file for this ticker.</p>
      )}

      <div className="ux-grid ux-grid--2">
        <UxCard id="ux-own-stakes" title="Schedule 13D and 13G stakes" icon="bi-flag">
          {stakes.length ? (
            <ul className="ux-mini-list ux-mini-list--rows">
              {stakes.map((s) => (
                <li key={`${s.filer}${s.filedAt}${s.form}`}>
                  <span>
                    {s.filer}
                    <span className="ux-muted">
                      {' '}
                      · {s.form}
                      {s.amendment ? ' (amended)' : ''}
                    </span>
                  </span>
                  <span className="rc-num">
                    {isNum(s.percent) ? `${s.percent.toFixed(1)}%` : 'N/A'}
                    <span className="ux-muted"> · {fmtDay(s.filedAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ux-state">No 13D or 13G filings on file.</p>
          )}
        </UxCard>
        <UxCard
          id="ux-own-insiders"
          title="Insider transactions (Form 4)"
          icon="bi-person-badge"
          info={insiderSource || undefined}
        >
          {insiders.length ? (
            <div className="ux-table-wrap">
              <table className="rc-table">
                <caption className="rc-sr">Recent insider transactions</caption>
                <thead>
                  <tr>
                    <th scope="col">Insider</th>
                    <th scope="col">Type</th>
                    <th scope="col">Shares</th>
                    <th scope="col">Value</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {insiders.slice(0, 12).map((t, i) => (
                    <tr key={`${t.name}${t.date}${i}`}>
                      <th scope="row">
                        {t.name}
                        {t.title ? <span className="ux-muted"> · {t.title}</span> : null}
                      </th>
                      <td>
                        {TX_CODES[t.code] ||
                          (t.direction
                            ? t.direction === 'acquired'
                              ? 'Acquired'
                              : 'Disposed'
                            : t.code || 'N/A')}
                      </td>
                      <td
                        className={`rc-num rc-tone--${t.direction === 'acquired' ? 'up' : t.direction === 'disposed' ? 'down' : 'flat'}`}
                      >
                        {t.direction === 'disposed' ? '-' : t.direction === 'acquired' ? '+' : ''}
                        {fmtCount(t.shares)}
                      </td>
                      <td className="rc-num">
                        {isNum(t.value) && t.value > 0 ? fmtBig(t.value) : 'N/A'}
                      </td>
                      <td className="rc-num">{fmtDay(t.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ux-state">No Form 4 transactions were returned.</p>
          )}
        </UxCard>
      </div>
      <p className="ux-foot">
        13F reports long positions held at quarter end by managers over $100M, filed up to 45 days
        later: a change between quarters is not a trade date or a capital flow. Options positions
        are excluded. Percent of shares outstanding uses market cap divided by price. Source: SEC
        EDGAR filings in Ezana&apos;s institutional dataset.{' '}
        <Link href="/datasets/institutional" className="rc-link-btn">
          Open institutional holdings
        </Link>
      </p>
    </div>
  );
}

/* ── Filings & Events ───────────────────────────────────────────────── */

const FORM_FILTERS = [
  ['all', 'All'],
  ['10-K', '10-K'],
  ['10-Q', '10-Q'],
  ['8-K', '8-K'],
  ['4', 'Form 4'],
  ['other', 'Other'],
];
const MAIN_FORMS = /^(10-K|10-Q|8-K|4)(\/A)?$/;

export function FilingsTab({ symbol }) {
  const f = useResearchPart(symbol, 'filings');
  const [form, setForm] = useState('all');
  if (f.status !== 'ready') {
    return <UxState status={f.status} error={f.error} onRetry={f.retry} rows={8} />;
  }
  const { sec, upcoming, reported, secSource } = f.data;
  const list = sec.filter((s) =>
    form === 'all'
      ? true
      : form === 'other'
        ? !MAIN_FORMS.test(s.form)
        : s.form === form || s.form === `${form}/A`,
  );
  return (
    <div className="ux-tab">
      <div className="ux-grid ux-grid--2">
        <UxCard id="ux-fil-up" title="Upcoming earnings" icon="bi-calendar-check">
          {upcoming.length ? (
            <ul className="ux-timeline">
              {upcoming.map((e) => (
                <li key={e.date} className="ux-timeline__item">
                  <span className="ux-timeline__dot is-future" aria-hidden="true" />
                  <div className="ux-timeline__text">
                    <span>
                      {e.quarter ? `Q${e.quarter} ${e.year} ` : ''}earnings
                      {e.hour === 'amc' ? ', after close' : e.hour === 'bmo' ? ', before open' : ''}
                    </span>
                    <span className="ux-muted rc-num">
                      {fmtDay(e.date)}
                      {isNum(e.epsEstimate) ? ` · EPS est. $${e.epsEstimate.toFixed(2)}` : ''}
                      {isNum(e.revenueEstimate)
                        ? ` · revenue est. ${fmtBig(e.revenueEstimate)}`
                        : ''}
                    </span>
                  </div>
                  <span className="ux-tag">Expected</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ux-state">No earnings date in the next 180 days on the calendar.</p>
          )}
          <p className="ux-foot">
            Calendar dates are expected, not confirmed, until the company announces them.
          </p>
        </UxCard>
        <UxCard id="ux-fil-hist" title="Reported EPS vs consensus" icon="bi-clipboard-check">
          {reported.length ? (
            <div className="ux-table-wrap">
              <table className="rc-table">
                <caption className="rc-sr">Reported EPS against the consensus estimate</caption>
                <thead>
                  <tr>
                    <th scope="col">Reported</th>
                    <th scope="col">Actual</th>
                    <th scope="col">Estimate</th>
                    <th scope="col">Surprise</th>
                  </tr>
                </thead>
                <tbody>
                  {reported.map((r) => {
                    const s =
                      isNum(r.epsActual) && isNum(r.epsEstimate) && Math.abs(r.epsEstimate) > 1e-9
                        ? ((r.epsActual - r.epsEstimate) / Math.abs(r.epsEstimate)) * 100
                        : null;
                    return (
                      <tr key={r.date}>
                        <th scope="row" className="rc-num">
                          {fmtDay(r.date)}
                        </th>
                        <td className="rc-num">
                          {isNum(r.epsActual) ? `$${r.epsActual.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="rc-num">
                          {isNum(r.epsEstimate) ? `$${r.epsEstimate.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className={`rc-num rc-tone--${signOf(s)}`}>
                          {isNum(s) ? fmtSignedPct(s) : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ux-state">No reported earnings history was returned.</p>
          )}
          <p className="ux-foot">Surprise = (actual - estimate) / |estimate|.</p>
        </UxCard>
      </div>

      <UxCard
        id="ux-fil-sec"
        title="SEC filings, last 12 months"
        icon="bi-file-earmark-text"
        info={secSource || undefined}
      >
        <div className="ux-seg ux-seg--tabs" role="group" aria-label="Form type">
          {FORM_FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={form === id}
              className={form === id ? 'is-on' : ''}
              onClick={() => setForm(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {list.length ? (
          <div className="ux-table-wrap">
            <table className="rc-table">
              <caption className="rc-sr">SEC filings</caption>
              <thead>
                <tr>
                  <th scope="col">Form</th>
                  <th scope="col">Filed</th>
                  <th scope="col">Document</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => (
                  <tr key={`${s.form}${s.filedAt}${i}`}>
                    <th scope="row" className="rc-num">
                      {s.form}
                    </th>
                    <td className="rc-num">{fmtDay(s.filedAt)}</td>
                    <td>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          Open on EDGAR{' '}
                          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                          <span className="rc-sr"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ux-state">No filings of this type in the last 12 months.</p>
        )}
      </UxCard>
    </div>
  );
}

/* ── Sonar Research ─────────────────────────────────────────────────── */

export function SonarResearchTab({ symbol, research }) {
  const name = research.profile.name || symbol;
  const sector = research.profile.sector;
  const asks = [
    `Build a bull case and a bear case for ${name} (${symbol}) with the evidence for each`,
    `What does ${symbol}'s latest earnings call say about guidance and demand?`,
    `How exposed is ${name} to government contracts and policy?`,
    `Which institutions added or cut ${symbol} last quarter, and why might they have?`,
    sector
      ? `How does ${symbol} compare with the largest ${sector} companies on valuation and growth?`
      : `Who are ${symbol}'s closest competitors and how do they compare?`,
    `What are the key risks to ${name} over the next 12 months?`,
  ];
  return (
    <div className="ux-tab ux-sonar">
      <p className="ux-sonar__lede">
        Ezana Sonar researches {name} across filings, ownership, Congress trading, contracts and
        news, with every answer sourced. Start from one of these, or ask your own.
      </p>
      <ul className="ux-sonar__asks">
        {asks.map((q) => (
          <li key={q}>
            <Link href={`/sonar?q=${encodeURIComponent(q)}`} className="ux-sonar__ask">
              <i className="bi bi-broadcast" aria-hidden="true" />
              <span>{q}</span>
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/sonar?q=${encodeURIComponent(`${symbol} company research brief`)}`}
        className="ux-primary-btn"
      >
        Open a full Sonar brief on {symbol}
      </Link>
    </div>
  );
}
