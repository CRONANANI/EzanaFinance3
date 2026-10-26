'use client';

/**
 * The country_rank briefing's charts (sonar-country-ranking-fix, B5):
 * where the country ranks (KPI tiles), the largest economies with the
 * country highlighted, its rank over time (rank 1 at the top), size against
 * growth, the gap to the next rank, and the Global Empire pillars against the
 * top three. Every number comes from the dossier's rank block (one World
 * Bank snapshot, one common year per metric) or the Empire read; every
 * chart footer names source, year, scope and measure type. Findings only.
 */
import { useMemo, useState } from 'react';
import './country-rank.css';

const METRIC_SHORT = {
  gdp_nominal_usd: 'Nominal GDP',
  gdp_ppp: 'GDP, PPP',
  gdp_per_capita_usd: 'GDP per capita',
  gdp_per_capita_ppp: 'GDP per capita, PPP',
  gdp_growth_real: 'Real GDP growth',
};

function fmt(id, v) {
  if (v == null || !Number.isFinite(Number(v))) return '·';
  const n = Number(v);
  if (id === 'gdp_growth_real') return `${n.toFixed(1)}%`;
  if (id === 'gdp_per_capita_usd' || id === 'gdp_per_capita_ppp')
    return `$${Math.round(n).toLocaleString('en-US')}`;
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(0)}B`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function Foot({ source, year, scope, measure = 'Observed' }) {
  return (
    <p className="crk-foot">
      {source}
      {year ? ` · ${year}` : ''}
      {scope ? ` · ${scope}` : ''}
      {measure ? ` · ${measure}` : ''}
    </p>
  );
}

function Empty({ children }) {
  return <p className="crk-empty">{children}</p>;
}

/* 1. Where it ranks */
function Tiles({ view, empire, attribution }) {
  const ids = ['gdp_nominal_usd', 'gdp_ppp', 'gdp_per_capita_usd', 'gdp_growth_real'];
  return (
    <div className="crk-tiles">
      {ids.map((id) => {
        const m = view?.metrics?.[id];
        return (
          <div key={id} className="crk-tile">
            <span className="crk-tile-label">{METRIC_SHORT[id]}</span>
            {m?.rank != null ? (
              <>
                <span className="crk-tile-rank crk-mono">#{m.rank}</span>
                <span className="crk-tile-meta crk-mono">
                  of {m.of} economies · {fmt(id, m.value)} · {m.year}
                </span>
                <span className="crk-tile-src">{attribution} · Observed</span>
              </>
            ) : (
              <span className="crk-tile-meta">Not yet loaded from the World Bank import.</span>
            )}
          </div>
        );
      })}
      <div className="crk-tile">
        <span className="crk-tile-label">Global Empire Rankings</span>
        {empire?.rank != null ? (
          <>
            <span className="crk-tile-rank crk-mono">#{empire.rank}</span>
            <span className="crk-tile-meta crk-mono">
              of {empire.of} · composite {empire.composite} · {empire.year}
            </span>
            <span className="crk-tile-src">Ezana Global Empire Rankings · Composite score</span>
          </>
        ) : (
          <span className="crk-tile-meta">Not scored for this country.</span>
        )}
      </div>
    </div>
  );
}

/* 2. Largest economies, with a toggle */
function Largest({ view, name, attribution, scope }) {
  const avail = ['gdp_nominal_usd', 'gdp_ppp', 'gdp_per_capita_usd'].filter(
    (id) => view?.metrics?.[id]?.bars?.top?.length,
  );
  const [metric, setMetric] = useState(avail[0] || null);
  const m = metric ? view.metrics[metric] : null;
  if (!m) return <Empty>Size rankings appear once the World Bank GDP series are imported.</Empty>;
  const rows = [...m.bars.top, ...(m.bars.tail.length ? [null, ...m.bars.tail] : [])];
  const max = Math.max(...m.bars.top.map((r) => r.value), 1);
  return (
    <div>
      <div className="crk-seg" role="group" aria-label="Measure">
        {avail.map((id) => (
          <button
            key={id}
            type="button"
            className={`crk-seg-btn${id === metric ? ' is-on' : ''}`}
            aria-pressed={id === metric}
            onClick={() => setMetric(id)}
          >
            {METRIC_SHORT[id]}
          </button>
        ))}
      </div>
      <ol className="crk-bars">
        {rows.map((r, i) =>
          r ? (
            <li key={r.iso3} className={`crk-bar${r.iso3 === view.iso3 ? ' is-me' : ''}`}>
              <span className="crk-mono crk-dim">{r.rank}</span>
              <span className="crk-bar-name">{r.name}</span>
              <span className="crk-bar-track" aria-hidden="true">
                <span style={{ width: `${Math.max(1, (r.value / max) * 100)}%` }} />
              </span>
              <span className="crk-mono">{fmt(metric, r.value)}</span>
            </li>
          ) : (
            <li key={`gap-${i}`} className="crk-bar-gap" aria-hidden="true">
              ⋯
            </li>
          ),
        )}
      </ol>
      <Foot source={attribution} year={m.year} scope={scope} />
      <span className="crk-sr">{name} is highlighted.</span>
    </div>
  );
}

/* 3. Rank over time, rank 1 at the top */
function RankOverTime({ view, attribution, scope }) {
  const series = ['gdp_nominal_usd', 'gdp_ppp', 'gdp_per_capita_usd']
    .map((id) => ({ id, pts: (view?.metrics?.[id]?.history || []).filter((p) => p.rank != null) }))
    .filter((s) => s.pts.length >= 2)
    .slice(0, 2);
  if (!series.length)
    return <Empty>Rank history appears once the World Bank series are imported.</Empty>;
  const all = series.flatMap((s) => s.pts);
  const x0 = Math.min(...all.map((p) => p.year));
  const x1 = Math.max(...all.map((p) => p.year));
  const r1 = Math.max(...all.map((p) => p.rank));
  const W = 560;
  const H = 200;
  const pad = 28;
  const x = (y) => pad + ((y - x0) / Math.max(1, x1 - x0)) * (W - pad * 2);
  const yy = (r) => pad / 2 + ((r - 1) / Math.max(1, r1 - 1)) * (H - pad * 1.5);
  return (
    <div>
      <svg
        className="crk-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Rank over time, ${x0} to ${x1}; rank 1 at the top`}
      >
        <line x1={pad} x2={W - pad} y1={yy(1)} y2={yy(1)} className="crk-grid" />
        <text x={4} y={yy(1) + 4} className="crk-axis">
          #1
        </text>
        <text x={4} y={yy(r1) + 4} className="crk-axis">
          #{r1}
        </text>
        <text x={pad} y={H - 2} className="crk-axis">
          {x0}
        </text>
        <text x={W - pad} y={H - 2} className="crk-axis" textAnchor="end">
          {x1}
        </text>
        {series.map((s, k) => (
          <polyline
            key={s.id}
            fill="none"
            className={`crk-line crk-line--${k}`}
            points={s.pts.map((p) => `${x(p.year)},${yy(p.rank)}`).join(' ')}
          />
        ))}
      </svg>
      <p className="crk-legend">
        {series.map((s, k) => (
          <span key={s.id}>
            <i className={`crk-key crk-key--${k}`} aria-hidden="true" /> {METRIC_SHORT[s.id]}
          </span>
        ))}
      </p>
      <Foot source={attribution} year={`${x0}–${x1}`} scope={scope} />
    </div>
  );
}

/* 4. Size and growth */
function SizeGrowth({ view, attribution, scope }) {
  const sc = view?.scatter;
  const top = useMemo(() => {
    const m = view?.metrics?.[sc?.sizeMetric];
    return new Set((m?.bars?.top || []).map((r) => r.iso3));
  }, [view, sc]);
  if (!sc?.points?.length) return <Empty>Appears once size and growth share a common year.</Empty>;
  const pts = sc.points.filter((p) => p.size > 0 && Number.isFinite(p.growth));
  const lx = (v) => Math.log10(v);
  const xs = pts.map((p) => lx(p.size));
  const gs = pts.map((p) => p.growth);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const g0 = Math.max(Math.min(...gs), -15);
  const g1 = Math.min(Math.max(...gs), 20);
  const W = 560;
  const H = 240;
  const pad = 30;
  const x = (v) => pad + ((lx(v) - x0) / Math.max(0.01, x1 - x0)) * (W - pad * 2);
  const y = (g) =>
    H - pad - ((Math.min(g1, Math.max(g0, g)) - g0) / Math.max(0.01, g1 - g0)) * (H - pad * 2);
  return (
    <div>
      <svg
        className="crk-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Economy size against real growth, ${sc.year}`}
      >
        <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} className="crk-grid" />
        <text x={4} y={y(0) - 3} className="crk-axis">
          0%
        </text>
        <text x={W - pad} y={H - 6} className="crk-axis" textAnchor="end">
          larger {METRIC_SHORT[sc.sizeMetric]} (log) →
        </text>
        {pts.map((p) => {
          const me = p.iso3 === view.iso3;
          const lab = me || top.has(p.iso3);
          return (
            <g key={p.iso3}>
              <circle
                cx={x(p.size)}
                cy={y(p.growth)}
                r={me ? 5 : 2.6}
                className={me ? 'crk-dot is-me' : top.has(p.iso3) ? 'crk-dot is-top' : 'crk-dot'}
              />
              {lab ? (
                <text
                  x={x(p.size) > W * 0.72 ? x(p.size) - 6 : x(p.size) + 6}
                  y={y(p.growth) + 3}
                  textAnchor={x(p.size) > W * 0.72 ? 'end' : 'start'}
                  className={me ? 'crk-lab is-me' : 'crk-lab'}
                >
                  {p.name}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <Foot source={attribution} year={sc.year} scope={scope} />
    </div>
  );
}

/* 5. Gap to the next rank */
function Gap({ view, attribution, scope }) {
  const id = ['gdp_nominal_usd', 'gdp_ppp', 'gdp_per_capita_usd'].find(
    (k) => view?.metrics?.[k]?.gap,
  );
  const m = id ? view.metrics[id] : null;
  if (!m) return <Empty>Appears once a size ranking is available.</Empty>;
  const growth = new Map((view.scatter?.points || []).map((p) => [p.iso3, p.growth]));
  const rows = [m.gap.above, { ...m.gap.me, gap: null }, m.gap.below].filter(Boolean);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div>
      <ul className="crk-gap">
        {rows.map((r) => (
          <li key={r.iso3} className={r.iso3 === view.iso3 ? 'is-me' : ''}>
            <span className="crk-mono crk-dim">#{r.rank}</span>
            <span className="crk-bar-name">{r.name}</span>
            <span className="crk-bar-track" aria-hidden="true">
              <span style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="crk-mono">{fmt(id, r.value)}</span>
            <span className="crk-mono crk-dim">
              {[
                r.gap != null ? `gap ${fmt(id, r.gap)}` : null,
                growth.has(r.iso3) ? `growth ${growth.get(r.iso3).toFixed(1)}%` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </li>
        ))}
      </ul>
      <Foot source={attribution} year={m.year} scope={`${METRIC_SHORT[id]}; ${scope}`} />
    </div>
  );
}

/* 6. Empire pillars against the top three */
function Pillars({ empire, name }) {
  if (!empire?.dims?.length) return <Empty>Not scored on the Global Empire Rankings.</Empty>;
  const leaders = (empire.leaders || []).filter((l) => l.iso !== empire.iso);
  const dims = empire.dims.slice(0, 10);
  return (
    <div>
      <table className="crk-pillars">
        <caption className="crk-sr">Pillar scores, 0 to 100, {name} against the top three</caption>
        <thead>
          <tr>
            <th scope="col">Pillar</th>
            <th scope="col">{name}</th>
            {leaders.map((l) => (
              <th key={l.iso} scope="col">
                {l.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dims.map((d) => (
            <tr key={d.id}>
              <th scope="row">{d.name}</th>
              <td>
                <span className="crk-pill-track" aria-hidden="true">
                  <span style={{ width: `${d.score}%` }} />
                </span>
                <span className="crk-mono">{d.score.toFixed(0)}</span>
                {d.rank ? <span className="crk-mono crk-dim"> #{d.rank}</span> : null}
              </td>
              {leaders.map((l) => (
                <td key={l.iso} className="crk-mono">
                  {l.dims?.[d.id] != null ? l.dims[d.id].toFixed(0) : '·'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Foot
        source="Ezana Global Empire Rankings"
        year={empire.year}
        scope="0–100 pillar scores"
        measure="Composite of observed indicators"
      />
    </div>
  );
}

export function CountryRankPanel({ dossier, onFollowup = null, tone = 'band' }) {
  const rank = dossier?.rank;
  if (!rank) return null;
  const view = rank.view;
  const empire = dossier.empire;
  const name = view?.name || dossier.name;
  const props = { view, attribution: rank.attribution, scope: rank.scope, name };
  return (
    <section className={`crk crk--${tone}`} aria-labelledby="crk-title">
      <div className="crk-inner">
        <p className="crk-eyebrow">Country ranking</p>
        <h2 id="crk-title" className="crk-title">
          Where {name} ranks
        </h2>
        {rank.lede ? <p className="crk-lede">{rank.lede}</p> : null}
        {rank.source === 'world_bank_lighthouse' ? (
          <p className="crk-note">
            GDP per capita and growth only until the weekly World Bank GDP import has run.
          </p>
        ) : null}
        <Tiles view={view} empire={empire} attribution={rank.attribution} />
        <div className="crk-grid2">
          <div className="crk-card">
            <h3 className="crk-h3">Largest economies</h3>
            <Largest {...props} />
          </div>
          <div className="crk-card">
            <h3 className="crk-h3">{name}&rsquo;s rank over time</h3>
            <RankOverTime {...props} />
          </div>
          <div className="crk-card">
            <h3 className="crk-h3">Size and growth</h3>
            <SizeGrowth {...props} />
          </div>
          <div className="crk-card">
            <h3 className="crk-h3">Gap to the next rank</h3>
            <Gap {...props} />
          </div>
          <div className="crk-card crk-card--wide">
            <h3 className="crk-h3">
              Global Empire Rankings pillars
              {empire && dossier.iso3 ? (
                <a
                  className="crk-link"
                  href={`/datasets/global-empire-lighthouse?country=${encodeURIComponent(dossier.iso3)}`}
                >
                  Open {name} on Global Empire Rankings{' '}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </a>
              ) : null}
            </h3>
            <Pillars empire={empire ? { ...empire, iso: dossier.iso3 } : null} name={name} />
          </div>
        </div>
        {rank.followups?.length ? (
          <div className="crk-follow" aria-label="Follow-up questions">
            {rank.followups.map((f) =>
              f.href ? (
                <a key={f.label} className="crk-chip" href={f.href}>
                  {f.label} <i className="bi bi-arrow-right" aria-hidden="true" />
                </a>
              ) : (
                <button
                  key={f.label}
                  type="button"
                  className="crk-chip"
                  disabled={!onFollowup}
                  onClick={() => onFollowup?.(f.query)}
                >
                  {f.label}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default CountryRankPanel;
