'use client';

import { useMemo, useState } from 'react';
import { fmtInt, fmtPct, fmtRatio, fmtSignedPct, linePaths, tone } from './lab-format';

const W = 960;
const H = 220;

const DATASETS = [
  ['congress_buy', 'Congress purchases'],
  ['congress_sell', 'Congress sales'],
  ['insider_purchase', 'Insider open-market purchases'],
  ['insider_sale', 'Insider open-market sales'],
];

function PathChart({ study }) {
  const chart = useMemo(() => {
    const values = study.curve.map((p) => p.meanAbnormal);
    const zero = study.curve.map(() => 0);
    const { paths, min, max } = linePaths([values, zero], W, H);
    const entryIndex = study.curve.findIndex((p) => p.offset === 0);
    const x = study.curve.length > 1 ? 4 + (entryIndex / (study.curve.length - 1)) * (W - 8) : 0;
    return { line: paths[0], zero: paths[1], min, max, x };
  }, [study]);
  const first = study.curve[0];
  const last = study.curve[study.curve.length - 1];
  return (
    <figure className="ql-chart">
      <figcaption className="ql-chart-cap">
        <span className="ql-eyebrow">Average return against {study.benchmark}</span>
        <span className="ql-legend">
          {fmtSignedPct(chart.min)} to {fmtSignedPct(chart.max)} · dashed: no difference, and the
          entry
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Average return relative to ${study.benchmark} from ${Math.abs(first.offset)} sessions before the entry to ${last.offset} sessions after, ending at ${fmtSignedPct(last.meanAbnormal)}`}
      >
        <path d={chart.zero} className="ql-line ql-line--bench" />
        <path
          d={`M${chart.x.toFixed(1)} 4L${chart.x.toFixed(1)} ${H - 4}`}
          className="ql-line ql-line--bench"
        />
        <path d={chart.line} className="ql-line ql-line--strategy" />
      </svg>
      <div className="ql-axis">
        <span>{Math.abs(first.offset)} sessions before entry</span>
        <span>{last.offset} sessions after</span>
      </div>
    </figure>
  );
}

export function EventStudyCard() {
  const [dataset, setDataset] = useState('congress_buy');
  const [years, setYears] = useState(2);
  const [ticker, setTicker] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [study, setStudy] = useState(null);

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/quants/event-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset,
          years,
          ticker: ticker.trim() || undefined,
          minAmount: Number(minAmount) || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'The study could not be run. Try again.');
      setStudy(json);
    } catch (err) {
      setStudy(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="db-card qe-card">
      <div className="db-card-header">
        <h3 className="ftq-section-title">
          <i className="bi bi-calendar-event" aria-hidden /> Event Study
        </h3>
      </div>
      <div className="ftq-card-body-pad">
        <div className="ql-root qr-card">
          <p className="ql-hint">
            What did a stock do after a trade was made public, compared with the market? Each event
            is dated by the day it was disclosed, never the day it happened, and the return starts
            at the next session&apos;s open: the first price anyone reading the filing could get.
          </p>
          <div className="ql-row ql-row--tight">
            <label className="ql-field">
              <span className="ql-label">Event</span>
              <select
                className="ql-input"
                value={dataset}
                onChange={(e) => setDataset(e.target.value)}
              >
                {DATASETS.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ql-field">
              <span className="ql-label">Look back</span>
              <select
                className="ql-input"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
              >
                {[1, 2, 3, 5].map((y) => (
                  <option key={y} value={y}>
                    {y} {y === 1 ? 'year' : 'years'}
                  </option>
                ))}
              </select>
            </label>
            <label className="ql-field">
              <span className="ql-label">One ticker (optional)</span>
              <input
                className="ql-input ql-input--short"
                type="text"
                maxLength={10}
                value={ticker}
                placeholder="All"
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
              />
            </label>
            <label className="ql-field">
              <span className="ql-label">Minimum size, USD (optional)</span>
              <input
                className="ql-input ql-input--num"
                type="number"
                min={0}
                step={1000}
                value={minAmount}
                placeholder="Any"
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </label>
            <button type="button" className="ql-btn ql-btn--primary" disabled={busy} onClick={run}>
              {busy ? 'Running study' : 'Run study'}
            </button>
          </div>

          {error && (
            <div className="ql-errors" role="alert">
              <p>{error}</p>
            </div>
          )}

          {study?.empty && (
            <p className="ql-hint">
              No {study.label.toLowerCase()} with a public date were found between {study.from} and{' '}
              {study.to}
              {study.undated
                ? `. ${study.undated} rows had no public date and cannot be used.`
                : '.'}
            </p>
          )}

          {study && !study.empty && (
            <>
              <p className="ql-hint">
                {study.label}, {study.from} to {study.to}
                {study.ticker ? `, ${study.ticker} only` : ''}: {fmtInt(study.measured)} events
                measured on {fmtInt(study.tickers)} tickers and {fmtInt(study.entryDates)} entry
                dates.
              </p>
              <ul className="ql-warnings">
                {study.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>

              <PathChart study={study} />

              <div className="ql-table-wrap">
                <table className="ql-table">
                  <thead>
                    <tr>
                      <th scope="col">Sessions held</th>
                      <th scope="col" className="ql-num">
                        Events
                      </th>
                      <th scope="col" className="ql-num">
                        Average against market
                      </th>
                      <th scope="col" className="ql-num">
                        Median
                      </th>
                      <th scope="col" className="ql-num">
                        Beat the market
                      </th>
                      <th scope="col" className="ql-num">
                        Stock
                      </th>
                      <th scope="col" className="ql-num">
                        Market
                      </th>
                      <th scope="col" className="ql-num">
                        t-statistic
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {study.horizons.map((h) => (
                      <tr key={h.horizon}>
                        <th scope="row">{h.horizon}</th>
                        <td className="ql-num">{fmtInt(h.events)}</td>
                        <td className={`ql-num ql-strong ${tone(h.meanAbnormal)}`}>
                          {fmtSignedPct(h.meanAbnormal)}
                        </td>
                        <td className={`ql-num ${tone(h.medianAbnormal)}`}>
                          {fmtSignedPct(h.medianAbnormal)}
                        </td>
                        <td className="ql-num">{fmtPct(h.positiveShare, 0)}</td>
                        <td className="ql-num">{fmtSignedPct(h.meanStock)}</td>
                        <td className="ql-num">{fmtSignedPct(h.meanMarket)}</td>
                        <td className="ql-num">{fmtRatio(h.tStat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="ql-hint">
                A t-statistic beyond about 2 in either direction is the usual threshold, and here it
                is an upper bound: it treats every event as independent, which they are not.
              </p>
            </>
          )}

          <p className="ql-hint">
            For educational and informational purposes only. Not financial advice. Past performance
            does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EventStudyCard;
