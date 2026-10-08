'use client';

/**
 * Lobbying and contracts (tab D): how much a company lobbied against the
 * federal contract value it won, the correlation between the two across
 * companies, and a ranking by award dollars won per dollar lobbied.
 *
 * The statistics recompute in the browser from the rows on screen (stats.js),
 * so excluding name matches or switching the window always agrees with the
 * table and the scatter. Name-matched companies (an exact match on the
 * normalised company name, not yet hand-verified) carry a NAME MATCH tag and
 * draw as hollow points.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCwh } from './CwhProvider';
import { DASH, count, money } from './cwh-format';
import { lobbyingStats } from './stats';

const WINDOWS = [
  { years: 1, label: 'This year' },
  { years: 2, label: 'Two years' },
];

const COLS = [
  { key: 'company', label: 'COMPANY' },
  { key: 'ticker', label: 'TICKER' },
  { key: 'lobbying', label: 'LOBBYING', num: true },
  { key: 'awards', label: 'AWARDS', num: true },
  { key: 'awardValue', label: 'AWARD VALUE', num: true },
  { key: 'ratio', label: 'AWARDS PER $1 LOBBIED', num: true },
];

/* Rounds away a negative zero ('-0.00' reads as a sign that is not there). */
const fix = (v, d = 2) => {
  if (v == null || !Number.isFinite(v)) return DASH;
  const t = v.toFixed(d);
  return Number(t) === 0 ? (0).toFixed(d) : t;
};
const fmtP = (p) => (p == null ? DASH : p < 0.001 ? '< 0.001' : p.toFixed(3));
const ratioText = (v) =>
  v == null || !Number.isFinite(v)
    ? DASH
    : `$${v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(v >= 10 ? 0 : 1)}`;

/* ── log-log scatter ─────────────────────────────────────────────────── */

const SW = 520;
const SH = 260;
const PAD = { l: 52, r: 12, t: 10, b: 30 };

function Scatter({ rows }) {
  const pts = rows.filter((r) => r.lobbying > 0 && r.awardValue > 0);
  if (pts.length < 2) return null;
  const lx = pts.map((r) => Math.log10(r.lobbying));
  const ly = pts.map((r) => Math.log10(r.awardValue));
  const x0 = Math.floor(Math.min(...lx));
  const x1 = Math.ceil(Math.max(...lx));
  const y0 = Math.floor(Math.min(...ly));
  const y1 = Math.ceil(Math.max(...ly));
  const sx = (v) => PAD.l + ((v - x0) / Math.max(x1 - x0, 1)) * (SW - PAD.l - PAD.r);
  const sy = (v) => SH - PAD.b - ((v - y0) / Math.max(y1 - y0, 1)) * (SH - PAD.t - PAD.b);
  const xt = [];
  for (let e = x0; e <= x1; e += 1) xt.push(e);
  const yt = [];
  for (let e = y0; e <= y1; e += 1) yt.push(e);
  return (
    <figure className="cwh-lr-scatter">
      <svg
        viewBox={`0 0 ${SW} ${SH}`}
        role="img"
        aria-label={`Lobbying against award value for ${pts.length} companies, both on log scales`}
      >
        {yt.map((e) => (
          <g key={`y${e}`}>
            <line className="cwh-lr-grid" x1={PAD.l} x2={SW - PAD.r} y1={sy(e)} y2={sy(e)} />
            <text
              className="cwh-lr-tick"
              x={PAD.l - 6}
              y={sy(e)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {money(10 ** e)}
            </text>
          </g>
        ))}
        {xt.map((e) => (
          <g key={`x${e}`}>
            <line className="cwh-lr-grid" x1={sx(e)} x2={sx(e)} y1={PAD.t} y2={SH - PAD.b} />
            <text className="cwh-lr-tick" x={sx(e)} y={SH - PAD.b + 16} textAnchor="middle">
              {money(10 ** e)}
            </text>
          </g>
        ))}
        {pts.map((r, i) => (
          <circle
            key={r.ticker}
            className={`cwh-lr-pt${r.matched ? ' is-matched' : ''}`}
            cx={sx(lx[i])}
            cy={sy(ly[i])}
            r={4}
          >
            <title>
              {`${r.ticker}: lobbied ${money(r.lobbying)}, won ${money(r.awardValue)}${r.matched ? ' (name match)' : ''}`}
            </title>
          </circle>
        ))}
      </svg>
      <figcaption className="cwh-caption">
        Lobbying (across) against award value (up), both on log scales. Hollow points are name
        matches.
      </figcaption>
    </figure>
  );
}

/* ── tab ──────────────────────────────────────────────────────────────── */

export default function LobbyingRatio({ initial }) {
  const { openCompany } = useCwh();
  const [years, setYears] = useState(1);
  const [withMatched, setWithMatched] = useState(true);
  const [byYears, setByYears] = useState({ 1: initial });
  const [sort, setSort] = useState({ key: 'ratio', desc: true });
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (byYears[years] && !byYears[years].error) return undefined;
    let live = true;
    fetch(`/api/datasets/capitol/lobbying-ratio?years=${years}`)
      .then((r) => r.json())
      .then((d) => live && setByYears((b) => ({ ...b, [years]: d.ok ? d : { error: true } })))
      .catch(() => live && setByYears((b) => ({ ...b, [years]: { error: true } })));
    return () => {
      live = false;
    };
  }, [years, byYears]);

  const data = byYears[years];
  const all = useMemo(
    () =>
      (data?.rows || []).map((r) => ({
        ...r,
        ratio: r.lobbying > 0 && r.awardValue != null ? r.awardValue / r.lobbying : null,
      })),
    [data],
  );
  const rows = useMemo(
    () => (withMatched ? all : all.filter((r) => !r.matched)),
    [all, withMatched],
  );
  const stats = useMemo(() => lobbyingStats(rows), [rows]);
  const matchedN = all.filter((r) => r.matched).length;

  const view = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const x = a[sort.key];
        const y = b[sort.key];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
        return sort.desc ? -c : c;
      }),
    [rows, sort],
  );

  const tiles = [
    {
      label: 'Pearson r',
      value: fix(stats.r),
      title: 'Linear correlation of lobbying and award dollars',
    },
    {
      label: 'r²',
      value: fix(stats.r2, 3),
      title: 'Share of the variation in award value lobbying explains linearly',
    },
    {
      label: 'Spearman ρ',
      value: fix(stats.rho),
      title: 'Rank correlation, robust to a few very large companies',
    },
    {
      label: 'r on log dollars',
      value: fix(stats.logR),
      title: 'Correlation of the logarithms of the two amounts',
    },
    {
      label: 'p, two-tailed',
      value: fmtP(stats.p),
      title: 'Chance of an r this far from zero if there were no relationship',
    },
    { label: 'Companies (n)', value: count(stats.n) },
  ];

  return (
    <>
      <div className="cwh-mod-head">
        <div>
          <h3 className="cwh-h4">Lobbying against contract awards</h3>
          <p className="cwh-caption">
            Companies that lobbied and won federal contracts: does more lobbying go with more award
            dollars, and who wins the most per dollar lobbied?
          </p>
        </div>
        <div className="cwh-lr-controls">
          <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Window">
            {WINDOWS.map((w) => (
              <button
                key={w.years}
                type="button"
                className={`cwh-pill${years === w.years ? ' is-active' : ''}`}
                aria-pressed={years === w.years}
                onClick={() => setYears(w.years)}
              >
                {w.label}
              </button>
            ))}
          </div>
          <label className="cwh-lr-check">
            <input
              type="checkbox"
              checked={withMatched}
              onChange={(e) => setWithMatched(e.target.checked)}
            />
            Include name matches <span className="cwh-mono cwh-faint">({count(matchedN)})</span>
          </label>
        </div>
      </div>

      {!data ? (
        <div aria-busy="true" aria-label="Lobbying and contracts loading">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="cwh-skel" />
          ))}
        </div>
      ) : data.error ? (
        <p className="cwh-empty">
          This signal could not be loaded just now. It refreshes on its own; try again in a minute.
        </p>
      ) : !rows.length ? (
        <p className="cwh-empty">
          {all.length
            ? 'No hand-verified company has both lobbying and awards in this window. Include name matches to see more.'
            : 'Appears when a company that lobbied also has contract awards in the window.'}
        </p>
      ) : (
        <>
          <dl className="cwh-lr-stats" aria-live="polite">
            {tiles.map((t) => (
              <div key={t.label} className="cwh-lr-stat" title={t.title}>
                <dt>{t.label}</dt>
                <dd className="cwh-mono">{t.value}</dd>
              </div>
            ))}
          </dl>
          <p className="cwh-lr-reading">
            Across <b className="cwh-mono">{count(stats.n)}</b> companies, lobbying and award value
            show <b>{stats.reading}</b>
            {stats.r != null ? (
              <>
                {' '}
                (r = <span className="cwh-mono">{fix(stats.r)}</span>, p ={' '}
                <span className="cwh-mono">{fmtP(stats.p)}</span>)
              </>
            ) : null}
            .{' '}
            {stats.r != null && Math.abs(stats.r) < 0.3
              ? 'On these figures, spending more on lobbying does not go with winning more in awards.'
              : 'A correlation across companies is not evidence that lobbying wins contracts.'}
          </p>

          <div className="cwh-lr-grid-2">
            <Scatter rows={rows} />
            <div className="cwh-scroll cwh-lr-table">
              <table className="cwh-table">
                <thead>
                  <tr>
                    {COLS.map((c) => (
                      <th
                        key={c.key}
                        scope="col"
                        className={c.num ? 'is-num' : undefined}
                        aria-sort={
                          sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'
                        }
                      >
                        <button
                          type="button"
                          className="cwh-sort"
                          onClick={() =>
                            setSort((s) => ({
                              key: c.key,
                              desc: s.key === c.key ? !s.desc : Boolean(c.num),
                            }))
                          }
                        >
                          {c.label}
                          <i
                            className={`bi ${sort.key === c.key ? (sort.desc ? 'bi-caret-down-fill' : 'bi-caret-up-fill') : 'bi-chevron-expand'}`}
                            aria-hidden="true"
                          />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.map((r) => (
                    <tr key={r.ticker}>
                      <td data-label="Company" className="cwh-strong">
                        {r.company}
                        {r.matched ? (
                          <span
                            className="cwh-lr-tag"
                            title={`Matched by company name to the lobbying client "${r.client}"; not yet hand-verified`}
                          >
                            NAME MATCH
                          </span>
                        ) : null}
                      </td>
                      <td data-label="Ticker">
                        <button
                          type="button"
                          className="cwh-tk"
                          onClick={() => openCompany({ ticker: r.ticker, name: r.company })}
                        >
                          {r.ticker}
                        </button>
                      </td>
                      <td data-label="Lobbying" className="cwh-mono is-num">
                        {money(r.lobbying)}
                      </td>
                      <td data-label="Awards" className="cwh-mono is-num">
                        {count(r.awards)}
                      </td>
                      <td data-label="Award value" className="cwh-mono is-num">
                        {money(r.awardValue)}
                      </td>
                      <td data-label="Per $1 lobbied" className="cwh-mono is-num cwh-strong">
                        {ratioText(r.ratio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
