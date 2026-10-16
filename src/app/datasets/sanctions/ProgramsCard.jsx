'use client';

/**
 * Programs by size: a squarified treemap of OFAC programs, coloured by theme.
 * Kept from the original page, with three additions:
 *   - Count or Share: share is of PROGRAM ASSIGNMENTS (a record under three
 *     programs is three assignments), the only base under which shares add
 *     to 100%.
 *   - A theme filter that redraws the treemap with one theme's programs.
 *   - A detail line for the hovered or selected program: full name, code,
 *     theme, target jurisdiction, count and share.
 * Selecting a tile sets the page's program filter, which shades the map,
 * filters the timeline and the listings.
 */
import { useMemo, useState } from 'react';
import { THEMES, programMeta, themeOf } from '@/lib/sanctions/programs';
import { Seg, fmt } from './ui';

const TOP = 28;

/** Pure: squarified layout of items with .value into a w x h box. */
export function squarify(items, x, y, w, h) {
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

const shareText = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : 'n/a');

export default function ProgramsCard({ programs, themes, selected, onPick, embedded = false }) {
  const [metric, setMetric] = useState('count');
  const [theme, setTheme] = useState('');
  const [hover, setHover] = useState(null);
  const assignments = useMemo(() => programs.reduce((s, p) => s + p.total, 0), [programs]);

  const shown = useMemo(
    () => (theme ? programs.filter((p) => programMeta(p.code).theme === theme) : programs),
    [programs, theme],
  );
  const tiles = useMemo(() => {
    const top = shown.slice(0, TOP).map((p) => ({ ...p, value: p.total }));
    const tail = shown.slice(TOP);
    if (tail.length) {
      const total = tail.reduce((s, p) => s + p.total, 0);
      top.push({ code: null, name: `${tail.length} more`, value: total, total, more: tail.length });
    }
    return squarify(top, 0, 0, 100, 100);
  }, [shown]);

  const focus = hover || selected;
  const focusRow = focus ? programs.find((p) => p.code === focus) : null;
  const focusMeta = focusRow ? programMeta(focusRow.code) : null;
  const val = (n) => (metric === 'share' ? shareText(n, assignments) : fmt(n));

  return (
    <section className={embedded ? 'snx-sub' : 'snx-card'} aria-labelledby="snx-programs">
      <div className="snx-card-head">
        <div>
          {embedded ? (
            <h3 id="snx-programs" className="snx-sub-title">
              Programs by size
            </h3>
          ) : (
            <h2 id="snx-programs" className="snx-card-title">
              Programs by size
            </h2>
          )}
          <p className="snx-card-sub">
            Listings per program, coloured by theme. Select one to shade the map and filter the
            page.
          </p>
        </div>
        <Seg
          label="Measure"
          value={metric}
          onChange={setMetric}
          options={[
            { key: 'count', label: 'Count' },
            { key: 'share', label: 'Share' },
          ]}
        />
      </div>

      <div className="snx-theme-filter" role="group" aria-label="Theme">
        <button
          type="button"
          className={`snx-theme-chip${theme === '' ? ' is-on' : ''}`}
          aria-pressed={theme === ''}
          onClick={() => setTheme('')}
        >
          All themes
        </button>
        {themes.map((t) => {
          const def = THEMES[t.key] || THEMES.other;
          return (
            <button
              key={t.key}
              type="button"
              className={`snx-theme-chip${theme === t.key ? ' is-on' : ''}`}
              aria-pressed={theme === t.key}
              onClick={() => setTheme(theme === t.key ? '' : t.key)}
              style={{ '--snx-theme': def.color }}
            >
              <i aria-hidden="true" />
              {def.label}
            </button>
          );
        })}
      </div>

      <div
        className="snx-tree"
        role="group"
        aria-label="Programs by listings"
        onMouseLeave={() => setHover(null)}
      >
        {tiles.map((t) => {
          const th = t.code ? themeOf(t.code) : THEMES.other;
          const meta = t.code ? programMeta(t.code) : null;
          const showCode = t.w > 9 && t.h > 7;
          const showN = showCode && t.h > 13;
          const big = showN && t.h > 19 && t.w > 18;
          const style = {
            left: `${t.x}%`,
            top: `${t.y}%`,
            width: `${t.w}%`,
            height: `${t.h}%`,
            '--snx-tile': th.color,
          };
          const label = meta
            ? `${meta.label} (${t.code}): ${fmt(t.total)} listings, ${shareText(t.total, assignments)} of program assignments.`
            : `${t.more} smaller programs: ${fmt(t.total)} listings`;
          return t.code ? (
            <button
              key={t.code}
              type="button"
              className={`snx-tile${selected === t.code ? ' is-on' : ''}`}
              style={style}
              aria-label={`${label} Select to filter.`}
              aria-pressed={selected === t.code}
              onMouseEnter={() => setHover(t.code)}
              onFocus={() => setHover(t.code)}
              onBlur={() => setHover(null)}
              onClick={() => onPick(t.code)}
            >
              {showCode ? <span className="snx-tile-code">{t.code}</span> : null}
              {big ? <span className="snx-tile-name">{meta.label}</span> : null}
              {showN ? <span className="snx-tile-n">{val(t.total)}</span> : null}
            </button>
          ) : (
            <span key="more" className="snx-tile is-more" style={style} title={label}>
              <span className="snx-tile-code">{t.name}</span>
              <span className="snx-tile-n">{val(t.total)}</span>
            </span>
          );
        })}
      </div>

      <p className="snx-tree-detail" aria-live="polite">
        {focusRow ? (
          <>
            <b>{focusMeta.label}</b> <span className="snx-mono">({focusRow.code})</span> ·{' '}
            {(THEMES[focusMeta.theme] || THEMES.other).label}
            {focusMeta.target ? ` · targets ${focusMeta.target}` : ' · global program'} ·{' '}
            <span className="snx-mono">
              {fmt(focusRow.total)} listings · {shareText(focusRow.total, assignments)}
            </span>
          </>
        ) : (
          'Hover or select a program for its full name, theme and share.'
        )}
      </p>

      <ul className="snx-themes">
        {themes.map((t) => (
          <li key={t.key}>
            <i style={{ background: (THEMES[t.key] || THEMES.other).color }} aria-hidden="true" />
            <span>{(THEMES[t.key] || THEMES.other).label}</span>
            <span className="snx-mono">{fmt(t.total)}</span>
          </li>
        ))}
      </ul>
      <p className="snx-fine">
        {fmt(assignments)} program assignments across {fmt(programs.length)} programs. A listing can
        sit under several programs, so a program&apos;s count is listings, and its share is of
        assignments, not of listings. Theme totals count each listing once per theme.
      </p>
    </section>
  );
}
