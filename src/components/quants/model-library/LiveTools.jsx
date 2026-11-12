'use client';

import { useCallback, useState } from 'react';

const pct = (v, digits = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : 'n/a');
const num = (v, digits = 2) => (Number.isFinite(v) ? v.toFixed(digits) : 'n/a');

/* Shared runner: POST a body, hold loading / error / data. */
function useModelRun(path) {
  const [state, setState] = useState({ loading: false, error: null, data: null });
  const run = useCallback(
    async (body) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Something went wrong');
        setState({ loading: false, error: null, data: json });
      } catch (e) {
        setState({ loading: false, error: e.message || 'Something went wrong', data: null });
      }
    },
    [path],
  );
  return [state, run];
}

function RunBar({ value, onChange, onRun, loading, placeholder, label, children }) {
  return (
    <div className="ftqm-runbar">
      <input
        className="ftq-pm-input"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onRun()}
      />
      {children}
      <button type="button" className="ftq-btn-ghost" onClick={onRun} disabled={loading}>
        {loading ? 'Running...' : 'Run'}
      </button>
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="ftqm-stat">
      <p className="ftqm-stat-label">{label}</p>
      <p className="ftqm-stat-value">{value}</p>
      {note ? <p className="ftqm-stat-note">{note}</p> : null}
    </div>
  );
}

/* ------------------------------ GARCH ------------------------------ */

function VolChart({ series, forecast, longRun }) {
  const W = 600;
  const H = 180;
  const all = [...series.map((p) => p.vol), ...forecast.map((p) => p.vol), longRun];
  const lo = Math.min(...all) * 0.92;
  const hi = Math.max(...all) * 1.05;
  const total = series.length + forecast.length;
  const x = (i) => (i / (total - 1)) * W;
  const y = (v) => H - ((v - lo) / (hi - lo || 1)) * H;
  const hist = series.map((p, i) => `${x(i).toFixed(1)},${y(p.vol).toFixed(1)}`).join(' ');
  const last = series.length - 1;
  const fc = [
    `${x(last).toFixed(1)},${y(series[last].vol).toFixed(1)}`,
    ...forecast.map((p, i) => `${x(series.length + i).toFixed(1)},${y(p.vol).toFixed(1)}`),
  ].join(' ');
  return (
    <figure className="ftqm-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Annualized volatility: fitted history, forecast and long-run level"
      >
        <line className="ftqm-line-ref" x1="0" x2={W} y1={y(longRun)} y2={y(longRun)} />
        <polyline className="ftqm-line" points={hist} />
        <polyline className="ftqm-line ftqm-line--forecast" points={fc} />
      </svg>
      <figcaption className="ftqm-chart-axis">
        <span>{series[0].date}</span>
        <span className="ftqm-legend">
          <i className="ftqm-key" /> Fitted
          <i className="ftqm-key ftqm-key--forecast" /> Forecast
          <i className="ftqm-key ftqm-key--ref" /> Long-run
        </span>
        <span>+{forecast.length} days</span>
      </figcaption>
    </figure>
  );
}

export function GarchTool() {
  const [ticker, setTicker] = useState('SPY');
  const [{ loading, error, data }, run] = useModelRun('/api/quants/models/garch');
  const go = () => ticker.trim() && run({ ticker });

  return (
    <div>
      <RunBar
        value={ticker}
        onChange={setTicker}
        onRun={go}
        loading={loading}
        placeholder="SPY"
        label="Ticker"
      />
      {error ? <p className="ftqm-error">{error}</p> : null}
      {data ? (
        <>
          <div className="ftqm-stats">
            <Stat label="Volatility now" value={pct(data.currentVol)} note="Annualized" />
            <Stat label="Tomorrow" value={pct(data.nextVol)} note="One day ahead" />
            <Stat label="Long-run level" value={pct(data.sampleVol)} note="Sample average" />
            <Stat
              label="Shock half-life"
              value={data.halfLifeDays ? `${num(data.halfLifeDays, 0)} days` : 'n/a'}
              note={`alpha ${num(data.alpha, 3)}, beta ${num(data.beta, 3)}`}
            />
          </div>
          <VolChart series={data.series} forecast={data.forecast} longRun={data.sampleVol} />
          <p className="ftqm-note">
            {data.ticker}: volatility is {data.nextVol > data.sampleVol ? 'above' : 'below'} its
            long-run level and the model expects it to drift back. Fitted on {data.observations}{' '}
            daily returns through {data.asOf}. This forecasts the size of moves, not their
            direction.
            {data.atBoundary
              ? ' The fit sits at the edge of the allowed range, so treat the half-life as rough.'
              : ''}
          </p>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------ Markov ----------------------------- */

export function MarkovTool() {
  const [ticker, setTicker] = useState('SPY');
  const [mode, setMode] = useState('volatility');
  const [{ loading, error, data }, run] = useModelRun('/api/quants/models/markov');
  const go = () => ticker.trim() && run({ ticker, mode });

  return (
    <div>
      <RunBar
        value={ticker}
        onChange={setTicker}
        onRun={go}
        loading={loading}
        placeholder="SPY"
        label="Ticker"
      >
        <select
          className="ftq-select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          aria-label="State definition"
        >
          <option value="volatility">Volatility states</option>
          <option value="direction">Direction states</option>
        </select>
      </RunBar>
      {error ? <p className="ftqm-error">{error}</p> : null}
      {data ? (
        <>
          <div className="ftqm-table-wrap">
            <table className="ftqm-matrix">
              <caption className="ftqm-caption">
                Probability of tomorrow&apos;s state (columns) given today&apos;s (rows)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Today</th>
                  {data.states.map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                  <th scope="col">Avg run</th>
                </tr>
              </thead>
              <tbody>
                {data.states.map((s, i) => (
                  <tr key={s} className={i === data.currentState ? 'is-current' : ''}>
                    <th scope="row">
                      {s}
                      {i === data.currentState ? <span className="ftqm-now">Now</span> : null}
                    </th>
                    {data.matrix[i].map((p, j) => (
                      <td
                        key={data.states[j]}
                        style={{
                          background: `color-mix(in srgb, var(--ftqm-accent) ${Math.round(p * 60)}%, transparent)`,
                        }}
                      >
                        {pct(p, 0)}
                      </td>
                    ))}
                    <td>
                      {data.expectedRunDays[i] ? `${num(data.expectedRunDays[i], 1)}d` : 'n/a'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ftqm-stats">
            {data.states.map((s, i) => (
              <Stat
                key={s}
                label={`${s} tomorrow`}
                value={pct(data.nextProbabilities[i], 0)}
                note={`Long run ${pct(data.stationary[i], 0)}`}
              />
            ))}
          </div>
          <p className="ftqm-note">
            {data.hasMemory
              ? `Today's state changes tomorrow's odds for ${data.ticker} (chi-square ${num(data.chiSquare, 1)}, p ${data.pValue < 0.001 ? 'under 0.001' : num(data.pValue, 3)}).`
              : `No reliable memory here for ${data.ticker}: tomorrow's odds look the same whatever today was (chi-square ${num(data.chiSquare, 1)}, p ${num(data.pValue, 3)}).`}{' '}
            Based on {data.observations} trading days through {data.asOf}.{' '}
            {data.mode === 'volatility'
              ? 'States are the calmest, middle and most turbulent third of daily moves by size.'
              : 'States are days more than half a standard deviation below or above the average, and everything between.'}
          </p>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------- PCA ------------------------------- */

export function PcaTool() {
  const [input, setInput] = useState('AAPL, MSFT, NVDA, JPM, XOM, JNJ');
  const [{ loading, error, data }, run] = useModelRun('/api/quants/models/pca');
  const go = () => {
    const tickers = input
      .split(/[,\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length >= 3) run({ tickers });
  };

  return (
    <div>
      <RunBar
        value={input}
        onChange={setInput}
        onRun={go}
        loading={loading}
        placeholder="AAPL, MSFT, NVDA, JPM, XOM, JNJ"
        label="Tickers, 3 to 10"
      />
      {error ? <p className="ftqm-error">{error}</p> : null}
      {data ? (
        <>
          <p className="ftqm-label">Variance explained</p>
          <ul className="ftqm-scree">
            {data.explained.map((e, i) => (
              <li key={`pc-${i + 1}`} className="ftqm-scree-row">
                <span className="ftqm-scree-name">PC{i + 1}</span>
                <span className="ftqm-rubric-track" aria-hidden>
                  <span className="ftqm-rubric-fill" style={{ width: `${e * 100}%` }} />
                </span>
                <span className="ftqm-rubric-score">{pct(e, 0)}</span>
              </li>
            ))}
          </ul>
          <div className="ftqm-table-wrap">
            <table className="ftqm-matrix">
              <caption className="ftqm-caption">
                Loadings: how much each stock moves with each component
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ticker</th>
                  {data.components.map((c) => (
                    <th key={c.index} scope="col">
                      PC{c.index}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.tickers.map((t, i) => (
                  <tr key={t}>
                    <th scope="row">{t}</th>
                    {data.components.map((c) => {
                      const v = c.loadings[i].value;
                      return (
                        <td
                          key={c.index}
                          style={{
                            background: `color-mix(in srgb, var(${v >= 0 ? '--ftqm-accent' : '--negative'}) ${Math.round(Math.min(Math.abs(v), 1) * 55)}%, transparent)`,
                          }}
                        >
                          {v >= 0 ? '+' : ''}
                          {num(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ftqm-note">
            The first component explains {pct(data.explained[0], 0)} of how these{' '}
            {data.tickers.length} stocks move. When every PC1 loading has the same sign it is the
            shared market factor; later components split the group into stocks that move against
            each other. Based on {data.observations} shared trading days through {data.asOf}.
            {data.skipped?.length ? ` No usable price history for ${data.skipped.join(', ')}.` : ''}
          </p>
        </>
      ) : null}
    </div>
  );
}
