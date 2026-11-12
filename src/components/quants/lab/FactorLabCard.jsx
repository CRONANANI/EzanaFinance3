'use client';

import { useMemo, useState } from 'react';
import { fmtInt, fmtPct, fmtRatio, fmtSignedPct, linePaths, tone } from './lab-format';

const W = 960;
const H = 240;

const FACTOR_OPTIONS = [
  ['momentum_12_1', 'Momentum, 12 months skipping the last'],
  ['momentum_6_1', 'Momentum, 6 months skipping the last'],
  ['reversal_1', 'Short-term reversal, 1 month'],
  ['low_volatility_12', 'Low volatility, 12 months'],
];

const EMPTY_REASONS = {
  not_set_up: 'The factor universe has not been set up yet.',
  no_prices:
    'Prices for the factor universe have not been loaded yet. They fill in overnight; try again tomorrow.',
  too_few:
    'Not enough stocks have the price history this factor needs yet. The history fills in overnight.',
};

function Stat({ label, value, hint, toneClass = '' }) {
  return (
    <div className="ql-stat">
      <dt className="ql-label">{label}</dt>
      <dd className={`ql-stat-value ${toneClass}`}>{value}</dd>
      {hint && <dd className="ql-stat-hint">{hint}</dd>}
    </div>
  );
}

function GrowthChart({ study }) {
  const chart = useMemo(() => {
    const { paths, min, max } = linePaths(
      [
        study.curve.map((p) => p.top),
        study.curve.map((p) => p.bottom),
        study.curve.map((p) => p.universe),
      ],
      W,
      H,
    );
    return { top: paths[0], bottom: paths[1], universe: paths[2], min, max };
  }, [study]);
  const first = study.curve[0];
  const last = study.curve[study.curve.length - 1];
  return (
    <figure className="ql-chart">
      <figcaption className="ql-chart-cap">
        <span className="ql-eyebrow">Growth of 1</span>
        <span className="ql-legend">
          <span className="ql-key ql-key--strategy" /> Top group
          <span className="ql-key qf-key--bottom" /> Bottom group
          <span className="ql-key ql-key--bench" /> All stocks
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Growth of 1 from ${first.month} to ${last.month}: top group ${fmtRatio(last.top)}, bottom group ${fmtRatio(last.bottom)}, all stocks ${fmtRatio(last.universe)}`}
      >
        <path d={chart.universe} className="ql-line ql-line--bench" />
        <path d={chart.bottom} className="ql-line qf-line--bottom" />
        <path d={chart.top} className="ql-line ql-line--strategy" />
      </svg>
      <div className="ql-axis">
        <span>
          {first.month} · low {fmtRatio(chart.min)}
        </span>
        <span>
          high {fmtRatio(chart.max)} · {last.month}
        </span>
      </div>
    </figure>
  );
}

export function FactorLabCard() {
  const [factor, setFactor] = useState('momentum_12_1');
  const [years, setYears] = useState(5);
  const [groups, setGroups] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [study, setStudy] = useState(null);

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/quants/factors?factor=${factor}&years=${years}&groups=${groups}`,
      );
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

  const widest = study?.groupStats
    ? Math.max(...study.groupStats.map((g) => Math.abs(g.meanMonthly || 0)), 1e-9)
    : 1;

  return (
    <div className="db-card qe-card">
      <div className="db-card-header">
        <h3 className="ftq-section-title">
          <i className="bi bi-layers" aria-hidden /> Factor Lab
        </h3>
      </div>
      <div className="ftq-card-body-pad">
        <div className="ql-root qr-card">
          <p className="ql-hint">
            A factor ranks every stock by one measurable trait. Each month the lab sorts a fixed
            list of large US companies by the factor, using prices up to that day only, and then
            measures what each group did over the following month.
          </p>
          <div className="ql-row ql-row--tight">
            <label className="ql-field ql-field--grow">
              <span className="ql-label">Factor</span>
              <select
                className="ql-input"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
              >
                {FACTOR_OPTIONS.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ql-field">
              <span className="ql-label">History</span>
              <select
                className="ql-input"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
              >
                {[3, 5, 10].map((y) => (
                  <option key={y} value={y}>
                    {y} years
                  </option>
                ))}
              </select>
            </label>
            <label className="ql-field">
              <span className="ql-label">Groups</span>
              <select
                className="ql-input"
                value={groups}
                onChange={(e) => setGroups(Number(e.target.value))}
              >
                <option value={3}>3 (thirds)</option>
                <option value={5}>5 (fifths)</option>
                <option value={10}>10 (tenths)</option>
              </select>
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
            <p className="ql-hint">{EMPTY_REASONS[study.reason] || EMPTY_REASONS.no_prices}</p>
          )}

          {study && !study.empty && (
            <>
              <p className="ql-hint">
                <strong>{study.label}.</strong> {study.summary} Measured over {fmtInt(study.months)}{' '}
                months, {study.from} to {study.to}, on about {fmtInt(study.stocks.average)} stocks a
                month.
              </p>
              <ul className="ql-warnings">
                {study.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>

              <dl className="ql-stats">
                <Stat
                  label="Top minus bottom"
                  value={fmtSignedPct(study.spread.annualised)}
                  toneClass={tone(study.spread.annualised)}
                  hint={`A year, before costs. t-statistic ${fmtRatio(study.spread.tStat)}`}
                />
                <Stat
                  label="Spread Sharpe"
                  value={fmtRatio(study.spread.sharpe)}
                  hint={`Worst month ${fmtSignedPct(study.spread.worstMonth)}`}
                />
                <Stat
                  label="Months it worked"
                  value={fmtPct(study.spread.hitRate, 0)}
                  hint="Top group beat the bottom group"
                />
                <Stat
                  label="Information coefficient"
                  value={fmtRatio(study.ic.mean, 3)}
                  hint={`Rank correlation with next month. t-statistic ${fmtRatio(study.ic.tStat)}`}
                />
                <Stat
                  label="Top group turnover"
                  value={fmtPct(study.turnover, 0)}
                  hint="Replaced each month"
                />
                <Stat
                  label="Steadiness across groups"
                  value={fmtRatio(study.monotonicity)}
                  hint="1 means each step up in rank earned more"
                />
              </dl>

              <GrowthChart study={study} />

              <div className="qr-pair">
                <div>
                  <h4 className="ql-eyebrow ql-eyebrow--spaced">Average return by group</h4>
                  <div className="ql-table-wrap">
                    <table className="ql-table">
                      <thead>
                        <tr>
                          <th scope="col">Group</th>
                          <th scope="col" className="ql-num">
                            A month
                          </th>
                          <th scope="col" />
                          <th scope="col" className="ql-num">
                            A year
                          </th>
                          <th scope="col" className="ql-num">
                            Volatility
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {study.groupStats.map((g) => (
                          <tr key={g.group}>
                            <th scope="row">
                              {g.group === 1
                                ? '1 (lowest rank)'
                                : g.group === study.groups
                                  ? `${g.group} (highest rank)`
                                  : g.group}
                            </th>
                            <td className={`ql-num ${tone(g.meanMonthly)}`}>
                              {fmtSignedPct(g.meanMonthly)}
                            </td>
                            <td>
                              <span className="qr-share qf-bar">
                                <span
                                  className={`qr-share-fill${g.meanMonthly < 0 ? ' qf-bar--negative' : ''}`}
                                  style={{
                                    width: `${Math.min((Math.abs(g.meanMonthly || 0) / widest) * 100, 100)}%`,
                                  }}
                                />
                              </span>
                            </td>
                            <td className={`ql-num ${tone(g.annualised)}`}>
                              {fmtSignedPct(g.annualised, 1)}
                            </td>
                            <td className="ql-num">{fmtPct(g.volatility, 1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h4 className="ql-eyebrow ql-eyebrow--spaced">How long the signal lasts</h4>
                  <div className="ql-table-wrap">
                    <table className="ql-table">
                      <thead>
                        <tr>
                          <th scope="col">Months ahead</th>
                          <th scope="col" className="ql-num">
                            Information coefficient
                          </th>
                          <th scope="col" className="ql-num">
                            Months measured
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {study.decay.map((d) => (
                          <tr key={d.months}>
                            <th scope="row">{d.months}</th>
                            <td className={`ql-num ${tone(d.meanIc)}`}>{fmtRatio(d.meanIc, 3)}</td>
                            <td className="ql-num">{fmtInt(d.observations)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="ql-hint">
                    The same ranking scored against returns further out. Longer horizons overlap
                    from month to month, so read them as direction, not as separate evidence.
                  </p>
                </div>
              </div>
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

export default FactorLabCard;
