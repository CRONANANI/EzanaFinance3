'use client';

/**
 * Sanctions & Trade Policy Tracking. Presentation layer over the whole OFAC
 * SDN list: every figure is aggregated from sanctions_entries (no sample
 * data). Modelled on the Government Contracts page: a filter rail beside the
 * main column, metric cards, a hero card, and an explorer table, with the
 * newest additions published to the dataset ticker.
 *
 * One filter state drives the listings table; the map, the ranked bars, the
 * jurisdiction table, the treemap and the ticker all write into it, then
 * bring the table into view.
 *
 * Honest limits, stated on the page:
 *   - "Based in" is the address country OFAC publishes; 3k+ listings carry
 *     none. "Targeted by" is the program's own jurisdiction. They differ.
 *   - The Added date exists only for listings that arrived after the first
 *     (baseline) load; earlier listings show a dash, not a guessed date.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { THEMES, atlasName, programMeta, themeOf } from '@/lib/sanctions/programs';
import './sanctions.css';

/* ── formatting ─────────────────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const pctOf = (n, d) => {
  if (!d) return '0%';
  const p = (n / d) * 100;
  if (p >= 10) return `${Math.round(p)}%`;
  if (p >= 0.1) return `${p.toFixed(1)}%`;
  return '<0.1%';
};
const shortDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const TYPES = [
  { key: 'entity', label: 'Corporations', long: 'Corporations & entities', color: 'var(--info)' },
  { key: 'individual', label: 'Individuals', long: 'Individuals', color: 'var(--purple)' },
  { key: 'vessel', label: 'Vessels', long: 'Vessels', color: 'var(--cyan)' },
  { key: 'aircraft', label: 'Aircraft', long: 'Aircraft', color: 'var(--warning)' },
];
const TYPE_BY_KEY = Object.fromEntries(TYPES.map((t) => [t.key, t]));
const NO_FILTER = { type: '', country: '', program: '', q: '', page: 1 };
const sameFilter = (a, b) =>
  a.type === b.type &&
  a.country === b.country &&
  a.program === b.program &&
  a.q === b.q &&
  a.page === b.page;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/* ── small pieces ───────────────────────────────────────────────────── */

function MetricCard({ label, value, meta, accent, children }) {
  return (
    <div className="snx-metric" style={accent ? { '--snx-accent': accent } : undefined}>
      <span className="snx-metric-label">{label}</span>
      {value != null ? <span className="snx-metric-value">{value}</span> : null}
      {children}
      {meta ? <span className="snx-metric-meta">{meta}</span> : null}
    </div>
  );
}

/** Stacked composition bar by entry type (share of `total`). */
function TypeStrip({ counts, total, label }) {
  return (
    <div className="snx-strip" role="img" aria-label={label}>
      {TYPES.map((t) =>
        counts[t.key] ? (
          <span
            key={t.key}
            className="snx-strip-seg"
            style={{ width: `${(counts[t.key] / total) * 100}%`, background: t.color }}
          />
        ) : null,
      )}
    </div>
  );
}

function ProgramChip({ code, onPick, active }) {
  const meta = programMeta(code);
  const theme = themeOf(code);
  const body = (
    <>
      <span className="snx-chip-dot" style={{ background: theme.color }} aria-hidden="true" />
      {code}
    </>
  );
  if (!onPick) {
    return (
      <span className="snx-chip" title={meta.label}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`snx-chip snx-chip--btn${active ? ' is-on' : ''}`}
      title={`${meta.label}: filter listings`}
      aria-pressed={active}
      onClick={() => onPick(code)}
    >
      {body}
    </button>
  );
}

function TypeTag({ type }) {
  const t = TYPE_BY_KEY[type] || TYPE_BY_KEY.entity;
  return (
    <span className="snx-type" style={{ '--snx-type': t.color }}>
      {t.label === 'Corporations' ? 'Entity' : t.label.replace(/s$/, '')}
    </span>
  );
}

/* ── map ────────────────────────────────────────────────────────────── */

const BINS = [
  { min: 1000, mix: 92, label: '1,000+' },
  { min: 250, mix: 72, label: '250–999' },
  { min: 50, mix: 52, label: '50–249' },
  { min: 10, mix: 34, label: '10–49' },
  { min: 1, mix: 18, label: '1–9' },
];
const binOf = (n) => BINS.find((b) => n >= b.min) || null;
const fillFor = (n) => {
  const b = binOf(n);
  return b
    ? `color-mix(in srgb, var(--emerald) ${b.mix}%, var(--snx-map-empty))`
    : 'var(--snx-map-empty)';
};

function WorldMap({ map, countries, selected, onPick }) {
  const wrapRef = useRef(null);
  const [tip, setTip] = useState(null);
  const atlasSet = useMemo(() => new Set(map.countries.map((c) => c.name)), [map]);
  /* Several OFAC names can fold into one outline (Gaza, West Bank and
     Palestinian all draw as Palestine): sum them and remember the largest,
     which is what a click filters on. */
  const byAtlas = useMemo(() => {
    const m = new Map();
    let unmapped = 0;
    for (const c of countries) {
      const a = atlasName(c.name, atlasSet);
      if (!a) {
        unmapped += c.total;
        continue;
      }
      const rec = m.get(a) || { total: 0, names: [], lead: c.name };
      rec.total += c.total;
      rec.names.push(c.name);
      m.set(a, rec);
    }
    return { m, unmapped };
  }, [countries, atlasSet]);

  const move = (e, name) => {
    const rec = byAtlas.m.get(name);
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    setTip({
      x: e.clientX - box.left,
      y: e.clientY - box.top,
      name: rec?.names.length === 1 ? rec.names[0] : name,
      total: rec?.total || 0,
    });
  };
  const pick = (name) => {
    const rec = byAtlas.m.get(name);
    if (rec) onPick(rec.lead);
  };
  const selectedAtlas = selected ? atlasName(selected, atlasSet) : null;

  return (
    <div className="snx-map" ref={wrapRef} onMouseLeave={() => setTip(null)}>
      <svg
        className="snx-map-svg"
        viewBox={`0 0 ${map.w} ${map.h}`}
        role="img"
        aria-label="World map shaded by the number of OFAC listings with an address in each country. The ranked view lists the same figures."
      >
        {map.countries.map((c) => {
          const rec = byAtlas.m.get(c.name);
          return (
            <path
              key={c.name}
              d={c.d}
              className={`snx-map-country${rec ? ' has-data' : ''}${selectedAtlas === c.name ? ' is-on' : ''}`}
              style={{ fill: fillFor(rec?.total || 0) }}
              onMouseMove={rec ? (e) => move(e, c.name) : undefined}
              onClick={rec ? () => pick(c.name) : undefined}
            />
          );
        })}
        {map.points.map((p) => {
          const rec = byAtlas.m.get(p.name);
          if (!rec) return null;
          return (
            <circle
              key={p.name}
              cx={p.x}
              cy={p.y}
              r="1.7"
              className={`snx-map-dot${selectedAtlas === p.name ? ' is-on' : ''}`}
              style={{ fill: fillFor(rec.total) }}
              onMouseMove={(e) => move(e, p.name)}
              onClick={() => pick(p.name)}
            />
          );
        })}
      </svg>
      {tip ? (
        <span className="snx-map-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.name}</b>
          <span>{fmt(tip.total)} listings · click to filter</span>
        </span>
      ) : null}
      <div className="snx-map-legend" aria-hidden="true">
        <span className="snx-map-legend-label">Listings based there</span>
        {[...BINS].reverse().map((b) => (
          <span key={b.label} className="snx-map-legend-bin">
            <i style={{ background: fillFor(b.min) }} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RankedCountries({ countries, selected, onPick, limit = 15 }) {
  const rows = countries.slice(0, limit);
  const max = rows[0]?.total || 1;
  return (
    <ol className="snx-ranked">
      {rows.map((c, i) => (
        <li key={c.name}>
          <button
            type="button"
            className={`snx-ranked-row${selected === c.name ? ' is-on' : ''}`}
            aria-pressed={selected === c.name}
            onClick={() => onPick(c.name)}
          >
            <span className="snx-ranked-rank">{String(i + 1).padStart(2, '0')}</span>
            <span className="snx-ranked-name">{c.name}</span>
            <span className="snx-ranked-bar" aria-hidden="true">
              {TYPES.map((t) =>
                c[t.key] ? (
                  <span
                    key={t.key}
                    style={{ width: `${(c[t.key] / max) * 100}%`, background: t.color }}
                  />
                ) : null,
              )}
            </span>
            <span className="snx-ranked-n">{fmt(c.total)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* ── treemap (squarified) ───────────────────────────────────────────── */

/** Pure: squarified layout of items with .value into a w x h box. */
function squarify(items, x, y, w, h) {
  const out = [];
  let rest = items.filter((it) => it.value > 0);
  const total = rest.reduce((s, it) => s + it.value, 0);
  if (!total) return out;
  const scale = (w * h) / total;
  let box = { x, y, w, h };
  const worst = (row, side) => {
    const s = row.reduce((a, r) => a + r.value * scale, 0);
    let mx = 0;
    let mn = Infinity;
    for (const r of row) {
      const a = r.value * scale;
      if (a > mx) mx = a;
      if (a < mn) mn = a;
    }
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (rest.length) {
    const side = Math.min(box.w, box.h);
    const row = [rest[0]];
    let i = 1;
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) {
      row.push(rest[i]);
      i += 1;
    }
    const area = row.reduce((a, r) => a + r.value * scale, 0);
    if (box.w >= box.h) {
      const cw = area / box.h;
      let cy = box.y;
      for (const r of row) {
        const ch = (r.value * scale) / cw;
        out.push({ ...r, x: box.x, y: cy, w: cw, h: ch });
        cy += ch;
      }
      box = { x: box.x + cw, y: box.y, w: box.w - cw, h: box.h };
    } else {
      const rh = area / box.w;
      let cx = box.x;
      for (const r of row) {
        const cw = (r.value * scale) / rh;
        out.push({ ...r, x: cx, y: box.y, w: cw, h: rh });
        cx += cw;
      }
      box = { x: box.x, y: box.y + rh, w: box.w, h: box.h - rh };
    }
    rest = rest.slice(row.length);
  }
  return out;
}

function ProgramTreemap({ programs, selected, onPick }) {
  const TOP = 28;
  const tiles = useMemo(() => {
    const top = programs.slice(0, TOP).map((p) => ({ ...p, value: p.total }));
    const tail = programs.slice(TOP);
    if (tail.length) {
      top.push({
        code: null,
        name: `${tail.length} more`,
        value: tail.reduce((s, p) => s + p.total, 0),
        total: tail.reduce((s, p) => s + p.total, 0),
        more: tail.length,
      });
    }
    return squarify(top, 0, 0, 100, 100);
  }, [programs]);
  return (
    <div className="snx-tree" role="list">
      {tiles.map((t) => {
        const theme = t.code ? themeOf(t.code) : THEMES.other;
        const meta = t.code ? programMeta(t.code) : null;
        /* Labels only where they fit: a tile shows its code from about
           70px wide, the count below that line, the name only on big tiles. */
        const showCode = t.w > 9 && t.h > 7;
        const showN = showCode && t.h > 13;
        const big = showN && t.h > 19 && t.w > 18;
        const style = {
          left: `${t.x}%`,
          top: `${t.y}%`,
          width: `${t.w}%`,
          height: `${t.h}%`,
          '--snx-tile': theme.color,
        };
        const label = meta
          ? `${meta.label} (${t.code}): ${fmt(t.total)} listings. Filter listings.`
          : `${t.more} smaller programs: ${fmt(t.total)} listings`;
        return t.code ? (
          <button
            key={t.code}
            type="button"
            role="listitem"
            className={`snx-tile${selected === t.code ? ' is-on' : ''}`}
            style={style}
            aria-label={label}
            title={label}
            onClick={() => onPick(t.code)}
          >
            {showCode ? <span className="snx-tile-code">{t.code}</span> : null}
            {big ? <span className="snx-tile-name">{meta.label}</span> : null}
            {showN ? <span className="snx-tile-n">{fmt(t.total)}</span> : null}
          </button>
        ) : (
          <span key="more" role="listitem" className="snx-tile is-more" style={style} title={label}>
            <span className="snx-tile-code">{t.name}</span>
            <span className="snx-tile-n">{fmt(t.total)}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ── rail ───────────────────────────────────────────────────────────── */

function FilterGroup({ title, meta, children }) {
  return (
    <div className="snx-filter">
      <div className="snx-filter-head">
        <span className="snx-filter-title">{title}</span>
        {meta != null ? <span className="snx-filter-meta">{meta}</span> : null}
      </div>
      {children}
    </div>
  );
}

function RailList({ items, selected, onPick, render, placeholder, ariaLabel }) {
  const [term, setTerm] = useState('');
  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    return t ? items.filter((it) => it.search.includes(t)) : items;
  }, [items, term]);
  const max = items[0]?.total || 1;
  return (
    <>
      <label className="snx-rail-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
      </label>
      <div className="snx-rail-list">
        {shown.length === 0 ? (
          <p className="snx-rail-note">No match for “{term}”.</p>
        ) : (
          shown.map((it) => (
            <button
              key={it.key}
              type="button"
              className={`snx-rail-row${selected === it.key ? ' is-on' : ''}`}
              aria-pressed={selected === it.key}
              onClick={() => onPick(selected === it.key ? '' : it.key)}
              title={it.title}
            >
              {render(it)}
              <span className="snx-rail-n">{fmt(it.total)}</span>
              <span
                className="snx-rail-bar"
                style={{ width: `${Math.max(2, (it.total / max) * 100)}%` }}
                aria-hidden="true"
              />
            </button>
          ))
        )}
      </div>
    </>
  );
}

/* ── listings ───────────────────────────────────────────────────────── */

function Listings({ data, filter, setFilter, loading, error, summary, baselineLabel, tableRef }) {
  const headingId = useId();
  const from = data.total ? (filter.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.total, filter.page * data.pageSize);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const typeTabs = [
    { key: '', label: 'All', n: summary.active },
    ...TYPES.map((t) => ({ key: t.key, label: t.label, n: summary.byType[t.key] })),
  ];
  const active = [
    filter.country && { k: 'country', label: `Based in ${filter.country}` },
    filter.program && { k: 'program', label: `Program ${filter.program}` },
    filter.q && { k: 'q', label: `Name contains “${filter.q}”` },
  ].filter(Boolean);

  return (
    <section className="snx-card snx-listings" ref={tableRef} aria-labelledby={headingId}>
      <div className="snx-card-head">
        <div>
          <h2 id={headingId} className="snx-card-title">
            Who is on the list
          </h2>
          <p className="snx-card-sub">
            Corporations, individuals, vessels and aircraft on the OFAC SDN list, newest first.
          </p>
        </div>
      </div>

      <div className="snx-tabs" role="group" aria-label="Entry type">
        {typeTabs.map((t) => (
          <button
            key={t.key || 'all'}
            type="button"
            aria-pressed={filter.type === t.key}
            className={`snx-tab${filter.type === t.key ? ' is-on' : ''}`}
            onClick={() => setFilter({ ...filter, type: t.key, page: 1 })}
          >
            {t.label}
            <span className="snx-tab-n">{fmt(t.n)}</span>
          </button>
        ))}
      </div>

      {active.length ? (
        <div className="snx-active">
          {active.map((a) => (
            <button
              key={a.k}
              type="button"
              className="snx-active-chip"
              onClick={() => setFilter({ ...filter, [a.k]: '', page: 1 })}
              aria-label={`Remove filter: ${a.label}`}
            >
              {a.label}
              <i className="bi bi-x" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            className="snx-active-clear"
            onClick={() => setFilter({ ...NO_FILTER, type: filter.type })}
          >
            Clear filters
          </button>
        </div>
      ) : null}

      <p className="snx-count" aria-live="polite">
        {error
          ? error
          : data.total
            ? `${fmt(from)}–${fmt(to)} of ${fmt(data.total)} listings`
            : loading
              ? 'Loading…'
              : 'No listings match these filters.'}
      </p>

      <div className={`snx-table-wrap${loading ? ' is-loading' : ''}`} aria-busy={loading}>
        <table className="snx-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Programs</th>
              <th scope="col">Based in</th>
              <th scope="col" className="snx-num">
                Added
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td className="snx-td-name" data-label="Name">
                  {r.name}
                </td>
                <td data-label="Type">
                  <TypeTag type={r.type} />
                </td>
                <td data-label="Programs">
                  <span className="snx-chips">
                    {r.programs.slice(0, 3).map((p) => (
                      <ProgramChip
                        key={p}
                        code={p}
                        active={filter.program === p}
                        onPick={(code) => setFilter({ ...filter, program: code, page: 1 })}
                      />
                    ))}
                    {r.programs.length > 3 ? (
                      <span className="snx-chip-more">+{r.programs.length - 3}</span>
                    ) : null}
                  </span>
                </td>
                <td data-label="Based in" className="snx-td-country">
                  {r.countries.length ? (
                    <>
                      {r.countries[0]}
                      {r.countries.length > 1 ? (
                        <span className="snx-muted"> +{r.countries.length - 1}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="snx-muted">Not stated</span>
                  )}
                </td>
                <td data-label="Added" className="snx-num snx-mono">
                  {r.firstSeen && summary.baseline && r.firstSeen > summary.baseline ? (
                    shortDate(r.firstSeen)
                  ) : (
                    <span
                      className="snx-muted"
                      title={`On the list when tracking began (${baselineLabel})`}
                    >
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="snx-pager">
        <button
          type="button"
          className="snx-pager-btn"
          disabled={filter.page <= 1 || loading}
          onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
        >
          <i className="bi bi-chevron-left" aria-hidden="true" /> Previous
        </button>
        <span className="snx-pager-pos snx-mono">
          Page {fmt(filter.page)} of {fmt(pages)}
        </span>
        <button
          type="button"
          className="snx-pager-btn"
          disabled={filter.page >= pages || loading}
          onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
        >
          Next <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>
      <p className="snx-fine">
        The Added date appears only for listings that arrived after tracking began on{' '}
        {baselineLabel || 'the first load'}; a dash means the listing was already on the list then.
      </p>
    </section>
  );
}

/* ── page ───────────────────────────────────────────────────────────── */

export default function SanctionsClient({
  summary,
  firstPage,
  newest = [],
  map,
  baselineLabel,
  syncedLabel,
}) {
  const reduced = useReducedMotion();
  const [filter, setFilterState] = useState(NO_FILTER);
  const [data, setData] = useState(firstPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(firstPage?.error || null);
  const [mapView, setMapView] = useState('map');
  const [allTargets, setAllTargets] = useState(false);
  const [query, setQuery] = useState('');
  const tableRef = useRef(null);
  const reqId = useRef(0);

  const [railOpen, setRailOpen] = useState(true);
  useEffect(() => {
    if (window.matchMedia('(max-width: 900px)').matches) setRailOpen(false);
  }, []);

  /* Filter changes made outside the search box (chip removal, clear, the
     ticker) write the box's text too, so the two never disagree. */
  const setFilter = useCallback((next) => {
    setFilterState(next);
    setQuery(next.q);
  }, []);

  /* Name search debounces into the filter. */
  useEffect(() => {
    const t = setTimeout(() => {
      setFilterState((f) => (f.q === query.trim() ? f : { ...f, q: query.trim(), page: 1 }));
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (sameFilter(filter, NO_FILTER)) {
      setData(firstPage);
      setError(firstPage?.error || null);
      return undefined;
    }
    const id = ++reqId.current;
    const ctrl = new AbortController();
    const sp = new URLSearchParams();
    for (const k of ['type', 'country', 'program', 'q']) if (filter[k]) sp.set(k, filter[k]);
    if (filter.page > 1) sp.set('page', String(filter.page));
    setLoading(true);
    fetch(`/api/datasets/sanctions?${sp}`, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (id !== reqId.current) return;
        if (!res.ok) {
          setError(
            res.status === 429
              ? 'Too many requests. Wait a moment and try again.'
              : 'The listings could not be loaded. Try again shortly.',
          );
          return;
        }
        setError(null);
        setData(body);
      })
      .catch((e) => {
        if (e?.name !== 'AbortError' && id === reqId.current) {
          setError('The listings could not be loaded. Check your connection.');
        }
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
    return () => ctrl.abort();
  }, [filter, firstPage]);

  const toTable = useCallback(() => {
    tableRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [reduced]);
  const pickCountry = useCallback(
    (c) => {
      setFilterState((f) => ({ ...f, country: f.country === c ? '' : c, page: 1 }));
      toTable();
    },
    [toTable],
  );
  const pickProgram = useCallback(
    (p) => {
      setFilterState((f) => ({ ...f, program: f.program === p ? '' : p, page: 1 }));
      toTable();
    },
    [toTable],
  );

  /* Ticker: the newest additions. */
  const tickerItems = useMemo(
    () =>
      newest.slice(0, 30).map((e) => ({
        id: String(e.id),
        lead: e.programs[0] || 'OFAC',
        main: e.name,
        value: e.countries[0] || TYPE_BY_KEY[e.type]?.label || 'Listed',
        _name: e.name,
      })),
    [newest],
  );
  const onTickerSelect = useCallback(
    (it) => {
      setFilter({ ...NO_FILTER, q: it._name });
      toTable();
    },
    [setFilter, toTable],
  );
  usePublishTicker({
    items: tickerItems,
    onSelect: onTickerSelect,
    ariaLabel: 'Newest additions to the OFAC sanctions list',
  });

  const countryItems = useMemo(
    () =>
      summary.countries.map((c) => ({
        key: c.name,
        total: c.total,
        search: c.name.toLowerCase(),
        title: c.name,
      })),
    [summary.countries],
  );
  const programItems = useMemo(
    () =>
      summary.programs.map((p) => {
        const meta = programMeta(p.code);
        return {
          key: p.code,
          total: p.total,
          search: `${p.code} ${meta.label}`.toLowerCase(),
          title: meta.label,
          color: themeOf(p.code).color,
          label: meta.label,
        };
      }),
    [summary.programs],
  );

  const empty = !summary.active;
  const topCountry = summary.countries[0];
  const topProgram = summary.programs[0];
  const mappedNote = summary.noCountry
    ? `${fmt(summary.noCountry)} listings (${pctOf(summary.noCountry, summary.active)}) carry no address country.`
    : null;

  return (
    <div className="snx-page">
      <header className="snx-header">
        <p className="snx-eyebrow">Datasets · US Treasury OFAC</p>
        <h1 className="snx-title">Sanctions &amp; trade policy</h1>
        <p className="snx-lead">
          Every individual, company, vessel and aircraft on the US Specially Designated Nationals
          list: where they are based, the programs behind each listing, and what was added since
          tracking began.
        </p>
      </header>

      <HubQueryLink dimension="lighthouse" />

      {empty ? (
        <section className="snx-card snx-empty">
          <i className="bi bi-shield-exclamation" aria-hidden="true" />
          <p>The sanctions list has not loaded yet. It refreshes daily from the US Treasury.</p>
        </section>
      ) : (
        <>
          <div className="snx-metrics">
            <MetricCard
              label="Active listings"
              value={fmt(summary.active)}
              meta={
                summary.addedSince
                  ? `+${fmt(summary.addedSince)} since ${baselineLabel}`
                  : `Tracking since ${baselineLabel}`
              }
            />
            <MetricCard
              label="Countries"
              value={fmt(summary.countries.length)}
              meta={
                topCountry
                  ? `${topCountry.name} leads · ${pctOf(topCountry.total, summary.active)}`
                  : null
              }
              accent="var(--info)"
            />
            <MetricCard
              label="Programs"
              value={fmt(summary.programs.length)}
              meta={topProgram ? `Largest · ${topProgram.code}` : null}
              accent="var(--warning)"
            />
            <MetricCard label="Who is listed" accent="var(--purple)">
              <TypeStrip
                counts={summary.byType}
                total={summary.active}
                label={TYPES.map(
                  (t) => `${t.long} ${pctOf(summary.byType[t.key], summary.active)}`,
                ).join(', ')}
              />
              <span className="snx-strip-legend">
                {TYPES.map((t) => (
                  <span key={t.key}>
                    <i style={{ background: t.color }} aria-hidden="true" />
                    {t.label} {pctOf(summary.byType[t.key], summary.active)}
                  </span>
                ))}
              </span>
            </MetricCard>
          </div>

          <div className="snx-body">
            <aside className="snx-rail" aria-label="Filters">
              <details
                className="snx-rail-fold"
                open={railOpen}
                onToggle={(e) => setRailOpen(e.currentTarget.open)}
              >
                <summary className="snx-rail-fold-head">
                  Filters
                  <i className="bi bi-chevron-down" aria-hidden="true" />
                </summary>
                <FilterGroup title="Name">
                  <label className="snx-rail-search">
                    <i className="bi bi-search" aria-hidden="true" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search a name"
                      aria-label="Search listings by name"
                    />
                  </label>
                </FilterGroup>
                <FilterGroup title="Based in" meta={fmt(summary.countries.length)}>
                  <RailList
                    items={countryItems}
                    selected={filter.country}
                    onPick={(c) => setFilterState((f) => ({ ...f, country: c, page: 1 }))}
                    placeholder="Filter countries"
                    ariaLabel="Filter the country list"
                    render={(it) => <span className="snx-rail-label">{it.key}</span>}
                  />
                </FilterGroup>
                <FilterGroup title="Program" meta={fmt(summary.programs.length)}>
                  <RailList
                    items={programItems}
                    selected={filter.program}
                    onPick={(p) => setFilterState((f) => ({ ...f, program: p, page: 1 }))}
                    placeholder="Filter programs"
                    ariaLabel="Filter the program list"
                    render={(it) => (
                      <span className="snx-rail-label">
                        <i
                          className="snx-rail-dot"
                          style={{ background: it.color }}
                          aria-hidden="true"
                        />
                        <span className="snx-rail-code">{it.key}</span>
                        <span className="snx-rail-sub">{it.label}</span>
                      </span>
                    )}
                  />
                </FilterGroup>
              </details>
            </aside>

            <div className="snx-main">
              <section className="snx-card snx-hero" aria-labelledby="snx-where">
                <div className="snx-card-head">
                  <div>
                    <h2 id="snx-where" className="snx-card-title">
                      Where listed parties are based
                    </h2>
                    <p className="snx-card-sub">
                      Address countries OFAC publishes with each listing. Select a country to filter
                      the list.
                    </p>
                  </div>
                  <div className="snx-seg" role="group" aria-label="View">
                    <button
                      type="button"
                      className={`snx-seg-btn${mapView === 'map' ? ' is-on' : ''}`}
                      aria-pressed={mapView === 'map'}
                      onClick={() => setMapView('map')}
                    >
                      <i className="bi bi-globe2" aria-hidden="true" /> Map
                    </button>
                    <button
                      type="button"
                      className={`snx-seg-btn${mapView === 'ranked' ? ' is-on' : ''}`}
                      aria-pressed={mapView === 'ranked'}
                      onClick={() => setMapView('ranked')}
                    >
                      <i className="bi bi-bar-chart-steps" aria-hidden="true" /> Ranked
                    </button>
                  </div>
                </div>
                {mapView === 'map' ? (
                  <WorldMap
                    map={map}
                    countries={summary.countries}
                    selected={filter.country}
                    onPick={pickCountry}
                  />
                ) : (
                  <>
                    <RankedCountries
                      countries={summary.countries}
                      selected={filter.country}
                      onPick={pickCountry}
                    />
                    <span className="snx-strip-legend snx-ranked-legend">
                      {TYPES.map((t) => (
                        <span key={t.key}>
                          <i style={{ background: t.color }} aria-hidden="true" />
                          {t.label}
                        </span>
                      ))}
                    </span>
                  </>
                )}
                {mappedNote ? <p className="snx-fine">{mappedNote}</p> : null}
              </section>

              <section className="snx-card" aria-labelledby="snx-targets">
                <div className="snx-card-head">
                  <div>
                    <h2 id="snx-targets" className="snx-card-title">
                      Countries under a US sanctions program
                    </h2>
                    <p className="snx-card-sub">
                      Jurisdictions named by an OFAC program, with every listing filed under it.
                      Select a program to filter the list.
                    </p>
                  </div>
                </div>
                <div className="snx-table-wrap">
                  <table className={`snx-table snx-table--targets${allTargets ? ' is-all' : ''}`}>
                    <thead>
                      <tr>
                        <th scope="col">Jurisdiction</th>
                        <th scope="col">Programs</th>
                        <th scope="col" className="snx-num">
                          Listings
                        </th>
                        <th scope="col" className="snx-num">
                          Corporations
                        </th>
                        <th scope="col" className="snx-num">
                          Individuals
                        </th>
                        <th scope="col" className="snx-num">
                          Vessels &amp; aircraft
                        </th>
                        <th scope="col" className="snx-num">
                          Based there
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.targets.map((t) => (
                        <tr key={t.name}>
                          <th scope="row" className="snx-td-name" data-label="Jurisdiction">
                            {t.name}
                          </th>
                          <td data-label="Programs">
                            <span className="snx-chips">
                              {t.codes.slice(0, 4).map((c) => (
                                <ProgramChip
                                  key={c}
                                  code={c}
                                  active={filter.program === c}
                                  onPick={pickProgram}
                                />
                              ))}
                              {t.codes.length > 4 ? (
                                <span className="snx-chip-more">+{t.codes.length - 4}</span>
                              ) : null}
                            </span>
                          </td>
                          <td className="snx-num snx-mono snx-strong" data-label="Listings">
                            {fmt(t.total)}
                          </td>
                          <td className="snx-num snx-mono" data-label="Corporations">
                            {fmt(t.entity)}
                          </td>
                          <td className="snx-num snx-mono" data-label="Individuals">
                            {fmt(t.individual)}
                          </td>
                          <td className="snx-num snx-mono" data-label="Vessels & aircraft">
                            {fmt(t.vessel + t.aircraft)}
                          </td>
                          <td className="snx-num snx-mono" data-label="Based there">
                            {t.basedThere ? (
                              fmt(t.basedThere)
                            ) : (
                              <span className="snx-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {summary.targets.length > 8 ? (
                  <button
                    type="button"
                    className="snx-more-btn"
                    aria-expanded={allTargets}
                    onClick={() => setAllTargets((v) => !v)}
                  >
                    {allTargets ? 'Show fewer' : `Show all ${summary.targets.length} jurisdictions`}
                  </button>
                ) : null}
                <p className="snx-fine">
                  A listing can fall under several programs, so jurisdictions overlap. Based there
                  counts listings with an address in that country, whatever the program.
                </p>
              </section>

              <div className="snx-pair">
                <section className="snx-card" aria-labelledby="snx-programs">
                  <div className="snx-card-head">
                    <div>
                      <h2 id="snx-programs" className="snx-card-title">
                        Programs by size
                      </h2>
                      <p className="snx-card-sub">Listings per program, coloured by theme.</p>
                    </div>
                  </div>
                  <ProgramTreemap
                    programs={summary.programs}
                    selected={filter.program}
                    onPick={pickProgram}
                  />
                  <ul className="snx-themes">
                    {summary.themes.map((t) => (
                      <li key={t.key}>
                        <i
                          style={{ background: (THEMES[t.key] || THEMES.other).color }}
                          aria-hidden="true"
                        />
                        <span>{(THEMES[t.key] || THEMES.other).label}</span>
                        <span className="snx-mono">{fmt(t.total)}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="snx-card" aria-labelledby="snx-new">
                  <div className="snx-card-head">
                    <div>
                      <h2 id="snx-new" className="snx-card-title">
                        Newest additions
                      </h2>
                      <p className="snx-card-sub">
                        {summary.addedSince
                          ? `${fmt(summary.addedSince)} added since ${baselineLabel}`
                          : `Tracking since ${baselineLabel}`}
                      </p>
                    </div>
                    <span className="snx-badge">New</span>
                  </div>
                  {newest.length ? (
                    <ol className="snx-new">
                      {newest.slice(0, 6).map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            className="snx-new-row"
                            onClick={() => onTickerSelect({ _name: e.name })}
                          >
                            <span className="snx-new-name">{e.name}</span>
                            <span className="snx-new-meta">
                              <TypeTag type={e.type} />
                              {e.programs[0] ? <ProgramChip code={e.programs[0]} /> : null}
                              {e.countries[0] ? <span>{e.countries[0]}</span> : null}
                            </span>
                            <span className="snx-new-date snx-mono">{shortDate(e.firstSeen)}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="snx-rail-note">
                      Additions appear here from the day after the list was first loaded.
                    </p>
                  )}
                </section>
              </div>

              <Listings
                data={data}
                filter={filter}
                setFilter={setFilter}
                loading={loading}
                error={error}
                summary={summary}
                baselineLabel={baselineLabel}
                tableRef={tableRef}
              />

              <section className="snx-card snx-source" aria-labelledby="snx-source">
                <h2 id="snx-source" className="snx-card-title">
                  How we source it
                </h2>
                <p>
                  The US Treasury Office of Foreign Assets Control (OFAC) Specially Designated
                  Nationals list, public domain, refreshed daily
                  {syncedLabel ? ` (last refreshed ${syncedLabel})` : ''}. Countries come from the
                  addresses OFAC publishes with each entry; program names are OFAC&apos;s own tags.
                </p>
                <p>
                  The first daily load ({baselineLabel}) is the baseline, so additions are dated
                  only from then. Entries OFAC removes are marked delisted and leave these figures.
                  Findings only, never advice.
                </p>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
