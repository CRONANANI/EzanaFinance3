'use client';

/**
 * Sonar adaptive research: a chart of typed series (Nov 2026).
 *
 * Draws what the report section holds and nothing else: categories, and one or more series
 * of numbers the executor computed or read from a record. There is no smoothing, no
 * interpolation and no placeholder: a section without at least two real values is removed by
 * the report schema before it reaches this component.
 *
 *   one series with long category names (managers, countries)  -> horizontal bars
 *   one or two series over time or short labels                -> vertical grouped bars
 *   kind 'line'                                                -> lines over an ordered axis
 *
 * A text table of the same values follows for screen readers.
 */

const FORMATS = {
  money(v) {
    const a = Math.abs(v);
    const s = v < 0 ? '-' : '';
    if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
    if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
    return `${s}$${Math.round(a).toLocaleString('en-US')}`;
  },
  count(v) {
    const a = Math.abs(v);
    const s = v < 0 ? '-' : '';
    if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)}M`;
    return `${s}${Math.round(a).toLocaleString('en-US')}`;
  },
  percent: (v) => `${v.toFixed(1)}%`,
  dollars: (v) => `$${v.toFixed(2)}`,
  number: (v) => v.toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 }),
};
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const TONES = ['a', 'b', 'c'];

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function Legend({ series }) {
  if (series.length < 2) return null;
  return (
    <ul className="sarc-legend">
      {series.map((s, i) => (
        <li key={s.name}>
          <i className={`sarc-swatch sarc-tone--${TONES[i % TONES.length]}`} aria-hidden="true" />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

function HorizontalBars({ categories, values, fmt }) {
  const max = Math.max(...values.filter(finite).map(Math.abs), 0) || 1;
  return (
    <ol className="sarc-hbars">
      {categories.map((c, i) =>
        finite(values[i]) ? (
          <li key={`${i}-${c}`}>
            <span className="sarc-hbar-label">{c}</span>
            <span className="sarc-hbar-track" aria-hidden="true">
              <span
                className={`sarc-hbar-fill${values[i] < 0 ? ' sarc-hbar-fill--neg' : ''}`}
                style={{ inlineSize: `${Math.max(0.5, (Math.abs(values[i]) / max) * 100)}%` }}
              />
            </span>
            <span className="sarc-hbar-value">{fmt(values[i])}</span>
          </li>
        ) : null,
      )}
    </ol>
  );
}

const W = 720;
const H = 240;
const PAD = { l: 8, r: 8, t: 10, b: 26 };

function Plot({ kind, categories, series, fmt }) {
  const all = series.flatMap((s) => s.values).filter(finite);
  const lo = Math.min(0, ...all);
  const hi = niceMax(Math.max(0, ...all));
  const floor = lo < 0 ? -niceMax(-lo) : 0;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const y = (v) => PAD.t + innerH * (1 - (v - floor) / (hi - floor));
  const band = innerW / categories.length;
  const ticks = [floor, floor + (hi - floor) / 2, hi];
  /* Label every category when they fit, otherwise an even sample. */
  const every = Math.max(1, Math.ceil(categories.length / 8));
  return (
    <div className="sarc-plot">
      <div className="sarc-yaxis" aria-hidden="true">
        {[...ticks].reverse().map((t) => (
          <span key={t}>{fmt(t)}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-hidden="true">
        {ticks.map((t) => (
          <line key={t} className="sarc-grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
        ))}
        {floor < 0 ? (
          <line className="sarc-zero" x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} />
        ) : null}
        {kind === 'line'
          ? series.map((s, si) => {
              const pts = s.values
                .map((v, i) => (finite(v) ? `${PAD.l + band * (i + 0.5)},${y(v)}` : null))
                .filter(Boolean);
              return pts.length >= 2 ? (
                <polyline
                  key={s.name}
                  className={`sarc-line sarc-tone--${TONES[si % TONES.length]}`}
                  points={pts.join(' ')}
                />
              ) : null;
            })
          : series.map((s, si) => {
              const gap = Math.min(10, band * 0.18);
              const bw = (band - gap * 2) / series.length;
              return s.values.map((v, i) =>
                finite(v) && v !== 0 ? (
                  <rect
                    key={`${s.name}-${i}`}
                    className={`sarc-bar sarc-tone--${TONES[si % TONES.length]}`}
                    x={PAD.l + band * i + gap + bw * si}
                    width={Math.max(1, bw - 1)}
                    y={Math.min(y(v), y(0))}
                    height={Math.max(1, Math.abs(y(v) - y(0)))}
                  />
                ) : null,
              );
            })}
      </svg>
      <div className="sarc-xaxis" aria-hidden="true">
        {categories.map((c, i) => (
          <span key={`${i}-${c}`}>{i % every === 0 ? c : ''}</span>
        ))}
      </div>
    </div>
  );
}

export default function SonarSeriesChart({ section }) {
  const { categories = [], series = [], kind = 'bar', format = 'number' } = section;
  const fmt = FORMATS[format] || FORMATS.number;
  const horizontal =
    kind === 'bar' &&
    series.length === 1 &&
    categories.reduce((s, c) => s + String(c).length, 0) / categories.length > 9;
  return (
    <figure className="sarc">
      <Legend series={series} />
      {horizontal ? (
        <HorizontalBars categories={categories} values={series[0].values} fmt={fmt} />
      ) : (
        <Plot kind={kind} categories={categories} series={series} fmt={fmt} />
      )}
      <table className="sxb-sr">
        <caption>{section.title}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            {series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c, i) => (
            <tr key={`${i}-${c}`}>
              <th scope="row">{c}</th>
              {series.map((s) => (
                <td key={s.name}>{finite(s.values[i]) ? fmt(s.values[i]) : 'Not available'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
