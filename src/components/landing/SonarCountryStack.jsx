'use client';

/**
 * Country pings in the Sonar band.
 *
 *   CountryOecdRow    Sourced matches row: four OECD Economic Outlook headline
 *                     figures with their peer rank, plus the next projection.
 *   CountryEmpireRow  Sourced matches row: Global Empire Rankings composite
 *                     rank and the strongest dimensions as bars.
 *   CountryStack      The right-hand stack, in the slot the company price
 *                     chart and the politician portfolio use: a key chart
 *                     that tells the country's story, then Relevant News.
 *
 * The key chart picks the series furthest from its own 20-year median (the
 * server computes it; see landing-country.js) and lets the visitor switch to
 * any other series the country carries. Every number on screen comes from the
 * dossier. OECD projection years are drawn dashed in the warning tone and
 * labelled, never blended into the actual line.
 *
 * Same .snr-fund / .snr-news shells as the company and politician stacks, so
 * the band geometry, the card entrance and the orbital's "last card landed"
 * signal hold unchanged. Styles: sonar-country.css, scoped snr-cty-.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import './sonar-country.css';

/* ── shared helpers (the band's own are module-private) ─────────────────── */

function usePixelBox() {
  const [box, setBox] = useState(null);
  const roRef = useRef(null);
  const setNode = useCallback((node) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setBox({ w: width, h: height });
    });
    ro.observe(node);
    roRef.current = ro;
  }, []);
  useEffect(() => () => roRef.current?.disconnect(), []);
  return [box, setNode];
}

function relativeDay(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!Number.isFinite(days)) return null;
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

const isPct = (unit) => /%/.test(unit || '');

function fmt(v, decimals = 1, unit = '') {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'n/a';
  return `${v.toFixed(decimals)}${isPct(unit) ? '%' : ''}`;
}

function fmtSigned(v, decimals = 1, unit = '') {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'n/a';
  return `${v > 0 ? '+' : ''}${fmt(v, decimals, unit)}`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

const HEADLINE_LABEL = {
  'eo-gdpv_annpct': 'REAL GDP',
  'eo-cpi_ytypct': 'INFLATION',
  'eo-unr': 'UNEMPLOYMENT',
  'eo-ggflq': 'GOVT DEBT',
};

/* One sentence per series, from its own stats. No adjectives the numbers do
   not carry: "above its 20-year norm", never "soaring". */
function storyLine(s) {
  const a = Math.abs(s.z);
  if (a < 0.5) return `${s.label} is close to its ${s.normYears}-year norm`;
  return `${s.label} is running ${s.z > 0 ? 'above' : 'below'} its ${s.normYears}-year norm`;
}

/* ── Sourced matches rows ───────────────────────────────────────────────── */

export function CountryOecdRow({ data, name }) {
  if (!data?.headline?.length) return null;
  const proj = data.headline.filter((h) => h.projection);
  return (
    <div className="snr-rich snr-cty-row">
      <span className="snr-rich-name">{name}</span>
      <div className={`snr-stat-strip${data.headline.length === 3 ? ' snr-stat-strip--3' : ''}`}>
        {data.headline.map((h) => (
          <div key={h.slug} className="snr-stat">
            <span className="snr-stat-label">{HEADLINE_LABEL[h.slug] || h.short}</span>
            <span className="snr-stat-value">{fmt(h.latest.value, h.decimals, h.unit)}</span>
            <span className="snr-stat-cap">
              {h.latest.year}
              {h.peer ? ` · ${ordinal(h.peer.rank)} of ${h.peer.of}` : ''}
            </span>
          </div>
        ))}
      </div>
      {proj.length ? (
        <p className="snr-cty-proj">
          <span className="snr-cty-proj-chip">PROJ</span>
          OECD projects {proj[0].projection.year}:{' '}
          {proj
            .map(
              (h) =>
                `${(HEADLINE_LABEL[h.slug] || h.short).toLowerCase()} ${fmt(h.projection.value, h.decimals, h.unit)}`,
            )
            .join(', ')}
        </p>
      ) : null}
      <a className="snr-rich-link" href={`/datasets/oecd-macro?a=${encodeURIComponent(data.area)}`}>
        Open in OECD Macro
        <i className="bi bi-arrow-up-right" aria-hidden="true" />
      </a>
    </div>
  );
}

function EmpireBars({ dims, limit = 5 }) {
  if (!dims?.length) return null;
  return (
    <ul className="snr-cty-bars">
      {dims.slice(0, limit).map((d) => (
        <li key={d.id} className="snr-cty-bar">
          <span className="snr-cty-bar-name">{d.name}</span>
          <span className="snr-cty-bar-track" aria-hidden="true">
            <span style={{ width: `${Math.max(2, Math.min(100, d.score))}%` }} />
          </span>
          <span className="snr-cty-bar-val">{d.score.toFixed(0)}</span>
          <span className="snr-cty-bar-rank">{d.rank ? `#${d.rank}` : ''}</span>
        </li>
      ))}
    </ul>
  );
}

/* Where one country sits among every ranked country on one dimension: a
   strip of faint ticks (all countries, by score), the searched country's
   tick in mint, rank and score beside it. The whole card is the link to
   that dimension's table on the Global Empire Rankings page. */
function EmpireRankCard({ dim, name }) {
  const { dist = [], score, rank, of } = dim;
  return (
    <Link
      href={dim.href}
      className="snr-emp-card"
      aria-label={`${dim.name}: ${name} ranks ${ordinal(rank)} of ${of}. Open the ${dim.name} table`}
    >
      <span className="snr-emp-rank">#{rank}</span>
      <span className="snr-emp-body">
        <span className="snr-emp-name">{dim.name}</span>
        <span className="snr-emp-strip" aria-hidden="true">
          {dist.map((v, i) => (
            <span key={i} className="snr-emp-tick" style={{ left: `${v}%` }} />
          ))}
          <span className="snr-emp-tick snr-emp-tick--me" style={{ left: `${score}%` }} />
        </span>
        <span className="snr-emp-cap">
          {ordinal(rank)} of {of} · score {score.toFixed(1)}
          {dim.category ? ` · ${dim.category}` : ''}
        </span>
      </span>
      <i className="bi bi-arrow-up-right snr-emp-go" aria-hidden="true" />
    </Link>
  );
}

/* The EMPIRE RANKINGS row: the composite line, then the three dimensions the
   country ranks highest in. The rankings page is a public /datasets page, so
   the link is not gated. */
export function CountryEmpireRow({ data, name }) {
  if (!data) return null;
  const top = data.top || [];
  return (
    <div className="snr-rich snr-cty-row">
      <span className="snr-rich-name">{name}</span>
      <p className="snr-emp-lede">
        {data.rank
          ? `${ordinal(data.rank)} of ${data.of} on Ezana's composite`
          : 'Too few live dimensions for a composite rank'}
        {` · ${data.coverage.present} of ${data.coverage.total} dimensions · ${data.year}`}
      </p>
      {top.length ? (
        <div className="snr-emp-top">
          <span className="snr-stat-label">RANKS HIGHEST IN</span>
          {top.map((d) => (
            <EmpireRankCard key={d.id} dim={d} name={name} />
          ))}
        </div>
      ) : null}
      <Link href={data.href} className="snr-rich-link">
        Open Global Empire Rankings
        <i className="bi bi-arrow-up-right" aria-hidden="true" />
      </Link>
    </div>
  );
}

/* ── the key chart ──────────────────────────────────────────────────────── */

const PAD = { l: 6, r: 6, t: 14, b: 6 };

function StoryChart({ story, projectionFrom }) {
  const [box, setNode] = usePixelBox();
  const pts = story?.points || [];
  if (pts.length < 2) return null;

  const W = box?.w ?? 100;
  const H = box?.h ?? 30;
  const values = pts.map((p) => p.value).concat(story.median);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (story.signed) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  const span = max - min || 1;
  const y0 = pts[0].year;
  const yN = pts[pts.length - 1].year;
  const x = (yr) => PAD.l + ((yr - y0) / (yN - y0 || 1)) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - ((v - min) / span) * (H - PAD.t - PAD.b);
  const line = (list) =>
    list.map((p) => `${x(p.year).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ');

  const actual = pts.filter((p) => !p.proj);
  const lastActual = actual[actual.length - 1];
  /* The projection segment starts AT the last actual point so the two lines
     join without a gap, and only the projected years are dashed. */
  const proj = pts.filter((p) => p.proj);
  const projLine = proj.length && lastActual ? [lastActual, ...proj] : [];
  const showZero = story.signed && min < 0 && max > 0;
  const bx = lastActual ? x(lastActual.year) : null;

  return (
    <div className="snr-spark snr-cty-plot" ref={setNode}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${story.label}, ${y0} to ${yN}`}>
        {box && proj.length && bx != null ? (
          <rect
            x={bx}
            y={0}
            width={Math.max(0, W - PAD.r - bx)}
            height={H}
            className="snr-cty-projband"
          />
        ) : null}
        {showZero ? (
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="snr-cty-zero" />
        ) : null}
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={y(story.median)}
          y2={y(story.median)}
          className="snr-cty-median"
        />
        <polyline points={line(actual)} className="snr-cty-line" />
        {projLine.length ? (
          <polyline points={line(projLine)} className="snr-cty-line--proj" />
        ) : null}
        {box ? (
          <>
            <circle
              cx={x(story.peak.year)}
              cy={y(story.peak.value)}
              r={2}
              className="snr-cty-dot"
            />
            <circle
              cx={x(story.trough.year)}
              cy={y(story.trough.value)}
              r={2}
              className="snr-cty-dot"
            />
            {lastActual ? (
              <circle
                cx={x(lastActual.year)}
                cy={y(lastActual.value)}
                r={3.5}
                className="snr-cty-ring"
              />
            ) : null}
            <text
              x={W - PAD.r}
              y={Math.max(10, y(story.median) - 4)}
              className="snr-cty-median-label"
            >
              {story.normYears}Y MEDIAN {fmt(story.median, story.decimals, story.unit)}
            </text>
          </>
        ) : null}
      </svg>
      <div className="snr-cty-axis" aria-hidden="true">
        <span>{y0}</span>
        {proj.length ? (
          <span className="snr-cty-axis-proj">OECD proj. from {projectionFrom}</span>
        ) : null}
        <span>{yN}</span>
      </div>
    </div>
  );
}

function StoryCard({ dossier }) {
  const o = dossier.oecd;
  const stories = o?.stories || [];
  const [sel, setSel] = useState(o?.storyIndex ?? 0);
  const s = stories[sel] || stories[0];
  if (!s) return null;
  return (
    <div className="snr-fund snr-fund--wide snr-fund--cty">
      <div className="snr-fund-head">
        <span className="snr-fund-ticker">{dossier.iso3}</span>
        <span className="snr-range-chip">KEY CHART</span>
        <span className="snr-rule-soft" />
        <span className="snr-fund-name">{dossier.name}</span>
      </div>
      <div className="snr-cty-tabs" role="tablist" aria-label="Indicator">
        {stories.map((st, i) => (
          <button
            key={st.slug}
            type="button"
            role="tab"
            aria-selected={i === sel}
            className={`snr-cty-tab${i === sel ? ' is-active' : ''}`}
            onClick={() => setSel(i)}
            title={st.label}
          >
            {i === o.storyIndex ? <i className="snr-cty-tab-dot" aria-hidden="true" /> : null}
            {st.short}
          </button>
        ))}
      </div>
      <p className="snr-cty-headline">{storyLine(s)}</p>
      <div className="snr-fund-body">
        <StoryChart story={s} projectionFrom={o.projectionFrom} />
        <div className="snr-fund-grid">
          <div className="snr-stat">
            <span className="snr-stat-label">Latest</span>
            <span className="snr-stat-value">
              {s.signed
                ? fmtSigned(s.latest.value, s.decimals, s.unit)
                : fmt(s.latest.value, s.decimals, s.unit)}
            </span>
            <span className="snr-stat-cap">{s.latest.year}</span>
          </div>
          <div className="snr-stat">
            <span className="snr-stat-label">{s.normYears}Y median</span>
            <span className="snr-stat-value">{fmt(s.median, s.decimals, s.unit)}</span>
            <span className="snr-stat-cap">{Math.abs(s.z).toFixed(1)} sd away</span>
          </div>
          <div className="snr-stat">
            <span className="snr-stat-label">Peak</span>
            <span className="snr-stat-value">{fmt(s.peak.value, s.decimals, s.unit)}</span>
            <span className="snr-stat-cap">{s.peak.year}</span>
          </div>
          <div className="snr-stat">
            <span className="snr-stat-label">Trough</span>
            <span className="snr-stat-value">{fmt(s.trough.value, s.decimals, s.unit)}</span>
            <span className="snr-stat-cap">{s.trough.year}</span>
          </div>
        </div>
      </div>
      <p className="snr-pol-note">
        {s.label}, {s.unit}. Source: OECD Economic Outlook. Dashed years are OECD projections.
      </p>
    </div>
  );
}

/* No OECD coverage (most non-members): the Empire profile carries the card. */
function EmpireCard({ dossier, onGate }) {
  const e = dossier.empire;
  return (
    <div className="snr-fund snr-fund--wide snr-fund--cty">
      <div className="snr-fund-head">
        <span className="snr-fund-ticker">{dossier.iso3}</span>
        <span className="snr-range-chip">POWER PROFILE</span>
        <span className="snr-rule-soft" />
        <span className="snr-fund-name">{dossier.name}</span>
      </div>
      <p className="snr-cty-headline">
        {e.rank
          ? `${ordinal(e.rank)} of ${e.of} on Ezana's Global Empire Rankings`
          : `${e.coverage.present} of ${e.coverage.total} ranking dimensions scored`}
      </p>
      <EmpireBars dims={e.dims} limit={7} />
      <p className="snr-pol-note">
        Dimension scores of 100, {e.year}. Source: Ezana Global Empire Rankings.{' '}
        <button type="button" className="snr-cty-inline-link" onClick={onGate}>
          See every dimension
        </button>
      </p>
    </div>
  );
}

/* ── the stack ──────────────────────────────────────────────────────────── */

/* newsSlot (Oct 19): the /datasets results band hands in the "news around it"
   rail, which takes the Relevant News card's place. Absent on the landing band,
   which keeps the card exactly as before. */
export function CountryStack({ dossier, onGate, newsSlot = null, topSlot = null }) {
  const hasStory = Boolean(dossier.oecd?.stories?.length);
  const hasEmpire = Boolean(dossier.empire?.dims?.length);
  const news = dossier.news || [];
  const echo = dossier.echo || [];
  if (!hasStory && !hasEmpire && !news.length && !echo.length && !newsSlot && !topSlot) {
    return null;
  }
  return (
    <div className="snr-stack">
      {topSlot}
      {hasStory ? (
        <StoryCard dossier={dossier} />
      ) : hasEmpire ? (
        <EmpireCard dossier={dossier} onGate={onGate} />
      ) : null}

      {newsSlot ? (
        newsSlot
      ) : news.length || echo.length ? (
        <div className="snr-news">
          <div className="snr-card-head">
            <span className="snr-panel-title">{dossier.newsTitle || 'Relevant News'}</span>
            <span className="snr-rule-soft" aria-hidden="true" />
          </div>
          <div className="snr-news-list">
            {news.map((n) => (
              <a
                key={n.url}
                className="snr-news-item"
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="snr-news-title">{n.title}</span>
                <span className="snr-news-meta">
                  {n.source}
                  {relativeDay(n.publishedAt) ? ` · ${relativeDay(n.publishedAt)}` : ''}
                </span>
              </a>
            ))}
            {echo.map((e) => (
              <a key={e.slug} className="snr-news-item" href={`/echo/${e.slug}`}>
                <span className="snr-news-title">
                  <span className="snr-echo-chip">
                    <i className="bi bi-broadcast-pin" aria-hidden="true" />
                    ECHO
                  </span>
                  {e.title}
                </span>
                <span className="snr-news-meta">
                  Ezana Echo
                  {relativeDay(e.publishedAt) ? ` · ${relativeDay(e.publishedAt)}` : ''}
                </span>
              </a>
            ))}
          </div>
          <button type="button" className="snr-news-more" onClick={onGate}>
            More coverage in Sonar
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default CountryStack;
