'use client';

/**
 * Politician tracker, Brazil: every elected President, Governor, Senator and
 * federal, state and district deputy, ranked by the assets they declared to
 * the Superior Electoral Court (TSE) when they registered as candidates, with
 * the change since the same person's previous filing. Selecting a row opens
 * the filing: totals by kind of asset and every item as declared.
 *
 * Data: /api/politicians/brazil and /api/politicians/brazil/:sq, loaded from
 * TSE open data by scripts/ingest-tse-assets.mjs. Values are as declared, in
 * reais; nothing is converted or estimated.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BR_OFFICES,
  BR_UF,
  DIACRITICS,
  TSE_DATASET_URL,
  assetGroup,
  brSeat,
  brlFull,
  brlShort,
  titleName,
} from '@/lib/politicians/brazil';
import Segmented from './Segmented';
import '@/components/datasets/disclosures/disclosures.css';
import './politician-tracker.css';
import './brazil-tracker.css';

const NONE = '·';
const STEP = 100;

const OFFICE_OPTIONS = [
  { value: null, label: 'All' },
  ...Object.entries(BR_OFFICES)
    .filter(([k]) => k !== 'PRESIDENTE' && k !== 'DEPUTADO DISTRITAL')
    .sort((a, b) => a[1].order - b[1].order)
    .map(([value, o]) => ({ value, label: o.short })),
];
const SORTS = [
  { value: 'total', label: 'Declared assets' },
  { value: 'change', label: 'Change' },
  { value: 'name', label: 'Name' },
];

const pct = (v) => (v == null ? NONE : `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const displayName = (r) => titleName(r.ballotName || r.name);
/* Lower case with accents stripped, for accent-insensitive search. */
const fold = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase();

function readUrl() {
  if (typeof window === 'undefined') return {};
  const p = new URL(window.location.href).searchParams;
  return { year: Number(p.get('year')) || null, filing: p.get('filing') };
}
function writeUrl({ year, filing }, push = false) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set('year', year);
  set('filing', filing);
  window.history[push ? 'pushState' : 'replaceState'](window.history.state, '', url);
}

function Stat({ label, value }) {
  return (
    <div className="dsc-p-stat">
      <span className="dsc-label">{label}</span>
      <p className="dsc-p-fig dsc-mn">{value}</p>
    </div>
  );
}

/* ── one filing ─────────────────────────────────────────────────────── */
function FilingPanel({ row, year, onClose }) {
  const ref = useRef(null);
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, row.sq]);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading', data: null });
    fetch(`/api/politicians/brazil/${encodeURIComponent(row.sq)}?year=${year}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setState({ status: d.ok ? 'ready' : 'error', data: d }))
      .catch((e) => e.name !== 'AbortError' && setState({ status: 'error', data: null }));
    return () => ctrl.abort();
  }, [row.sq, year]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const a of state.data?.assets || []) {
      const g = assetGroup(a.type);
      const cur = m.get(g) || { group: g, total: 0, n: 0 };
      cur.total += a.value || 0;
      cur.n += 1;
      m.set(g, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [state.data]);
  const top = groups[0]?.total || 0;
  const c = state.data?.candidate;

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      className="dsc-panel ptk-panel ptb-panel"
      role="dialog"
      aria-label={`${displayName(row)}, declared assets`}
    >
      <div className="dsc-p-head">
        <span className="dsc-p-route dsc-mn">POLITICIAN TRACKER / BRAZIL / {year}</span>
        <button type="button" className="dsc-p-x" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      <div className="dsc-p-body">
        <div className="dsc-p-id ptb-id">
          <span className="ptb-mono-avatar" aria-hidden="true">
            {displayName(row).charAt(0)}
          </span>
          <div>
            <h2 className="dsc-p-name">{displayName(row)}</h2>
            <p className="dsc-p-meta">
              <span className="ptb-party dsc-mn">{row.party || NONE}</span>
              <span className="dsc-mn">{brSeat({ cargo: row.office, sg_uf: row.uf })}</span>
            </p>
            {row.ballotName && row.name ? (
              <p className="ptb-fullname">{titleName(row.name)}</p>
            ) : null}
          </div>
        </div>

        <div className="dsc-p-stats">
          <Stat label="Declared assets" value={brlShort(row.total) ?? NONE} />
          <Stat label="Items" value={row.count} />
          <Stat
            label={row.prevYear ? `In ${row.prevYear}` : 'Previous filing'}
            value={row.prevTotal == null ? NONE : brlShort(row.prevTotal)}
          />
          <Stat label="Change" value={pct(row.changePct)} />
        </div>

        {state.status === 'loading' ? (
          <p className="dsc-note">Loading the filing</p>
        ) : state.status === 'error' ? (
          <p className="dsc-note">This filing could not be loaded just now. Try again shortly.</p>
        ) : (
          <>
            <section className="dsc-p-block">
              <div className="dsc-p-block-head">
                <span className="dsc-label">By kind of asset</span>
              </div>
              {groups.length ? (
                <ul className="ptb-groups">
                  {groups.map((g) => (
                    <li key={g.group} className="ptb-group">
                      <span className="ptb-group-name">
                        {g.group} <span className="ptb-faint">({g.n})</span>
                      </span>
                      <span className="ptb-bar" aria-hidden="true">
                        <i style={{ width: `${top > 0 ? (g.total / top) * 100 : 0}%` }} />
                      </span>
                      <span className="dsc-mn ptb-group-val">{brlShort(g.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dsc-note">No assets declared.</p>
              )}
            </section>

            {state.data.assets.length ? (
              <section className="dsc-p-block">
                <div className="dsc-p-block-head">
                  <span className="dsc-label">Every item, as declared</span>
                </div>
                <ol className="ptb-items">
                  {state.data.assets.map((a) => (
                    <li key={a.order} className="ptb-item">
                      <span className="ptb-item-text">
                        <span className="ptb-item-desc">{a.description || a.type || NONE}</span>
                        <span className="ptb-item-type">
                          {assetGroup(a.type)}
                          {a.type ? ` · ${a.type}` : ''}
                        </span>
                      </span>
                      <span className="dsc-mn ptb-item-val">{brlFull(a.value) ?? NONE}</span>
                    </li>
                  ))}
                </ol>
                <p className="ptb-faint ptb-note">
                  Descriptions and kinds are as filed, in Portuguese. Values are as declared, often
                  at purchase cost rather than market value.
                </p>
              </section>
            ) : null}

            {state.data.history.length > 1 ? (
              <section className="dsc-p-block">
                <div className="dsc-p-block-head">
                  <span className="dsc-label">Filings by election</span>
                </div>
                <ul className="ptb-history">
                  {state.data.history.map((h) => (
                    <li key={h.year} className="ptb-history-row">
                      <span className="dsc-mn">{h.year}</span>
                      <span>
                        {brSeat({ cargo: h.office, sg_uf: h.uf })}
                        {h.elected ? '' : ', not elected'}
                      </span>
                      <span className="dsc-mn">{brlShort(h.total)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {c ? (
              <p className="ptb-faint ptb-note">
                Source: Superior Electoral Court (TSE), ballot number {c.nr_candidato || NONE},{' '}
                <a href={TSE_DATASET_URL(year)} target="_blank" rel="noopener noreferrer">
                  open data for {year}
                </a>
                .
              </p>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

/* ── the ranking ────────────────────────────────────────────────────── */
export default function BrazilTracker({ countryControl = null }) {
  const [data, setData] = useState({ status: 'loading', year: null, years: [], rows: [] });
  const [year, setYear] = useState(() => readUrl().year);
  const [office, setOffice] = useState(null);
  const [uf, setUf] = useState('');
  const [party, setParty] = useState('');
  const [sort, setSort] = useState('total');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(STEP);
  const [openSq, setOpenSq] = useState(() => readUrl().filing);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setQuery(queryInput), 200);
    return () => clearTimeout(id);
  }, [queryInput]);

  useEffect(() => {
    const ctrl = new AbortController();
    setData((d) => ({ ...d, status: 'loading' }));
    fetch(`/api/politicians/brazil${year ? `?year=${year}` : ''}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) =>
        setData({
          status: d.ok ? (d.rows.length ? 'ready' : 'empty') : 'error',
          year: d.year,
          years: d.years || [],
          rows: d.rows || [],
        }),
      )
      .catch((e) => e.name !== 'AbortError' && setData((d) => ({ ...d, status: 'error' })));
    return () => ctrl.abort();
  }, [year, reload]);

  const activeYear = data.year;
  useEffect(() => {
    if (activeYear) writeUrl({ year: activeYear, filing: openSq });
  }, [activeYear, openSq]);

  const parties = useMemo(
    () => [...new Set(data.rows.map((r) => r.party).filter(Boolean))].sort(),
    [data.rows],
  );
  const ufs = useMemo(
    () => [...new Set(data.rows.map((r) => r.uf).filter((u) => u && u !== 'BR'))].sort(),
    [data.rows],
  );

  const filtered = useMemo(() => {
    const q = fold(query).trim();
    const out = data.rows.filter(
      (r) =>
        (!office || r.office === office) &&
        (!uf || r.uf === uf) &&
        (!party || r.party === party) &&
        (!q || fold(r.name).includes(q) || fold(r.ballotName).includes(q)),
    );
    const by = {
      total: (a, b) => b.total - a.total,
      change: (a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity),
      name: (a, b) => displayName(a).localeCompare(displayName(b)),
    }[sort];
    return out.sort((a, b) => by(a, b) || a.sq.localeCompare(b.sq));
  }, [data.rows, office, uf, party, query, sort]);

  useEffect(() => setShown(STEP), [office, uf, party, query, sort, activeYear]);

  const stats = useMemo(() => {
    const totals = filtered.map((r) => r.total);
    return {
      n: filtered.length,
      sum: totals.reduce((s, v) => s + v, 0),
      median: median(totals),
      top: filtered.reduce((m, r) => (!m || r.total > m.total ? r : m), null),
    };
  }, [filtered]);

  const byOffice = useMemo(() => {
    const m = new Map();
    for (const r of data.rows) {
      if (!m.has(r.office)) m.set(r.office, []);
      m.get(r.office).push(r.total);
    }
    return [...m.entries()]
      .map(([o, xs]) => ({ office: o, n: xs.length, median: median(xs) }))
      .sort((a, b) => (BR_OFFICES[a.office]?.order ?? 9) - (BR_OFFICES[b.office]?.order ?? 9));
  }, [data.rows]);
  const officeTop = Math.max(0, ...byOffice.map((o) => o.median || 0));

  const maxTotal = filtered[0] && sort === 'total' ? filtered[0].total : stats.top?.total || 0;
  const openRow = openSq ? data.rows.find((r) => r.sq === openSq) : null;
  const open = useCallback((sq) => {
    setOpenSq(sq);
  }, []);
  const close = useCallback(() => setOpenSq(null), []);
  const loaded = data.status === 'ready';
  const fig = (v) => (loaded && v != null ? v : NONE);

  return (
    <div className="dsc ptk ptb">
      <header className="dsc-head">
        <p className="dsc-eyebrow">DATASETS · BRAZIL</p>
        <h1 className="dsc-title">Politician tracker</h1>
        <p className="ptk-sub">
          Brazil&apos;s elected officeholders, ranked by the assets they declared to the Superior
          Electoral Court when they ran.
        </p>
        {countryControl ? <div className="ptk-country">{countryControl}</div> : null}
      </header>

      <div className="ptk-body">
        <div className="ptb-toolbar" role="search" aria-label="Filter Brazilian officeholders">
          <label className="ptk-search">
            <i className="bi bi-search" aria-hidden="true" />
            <span className="ptk-sr">Search an officeholder</span>
            <input
              className="dsc-input"
              placeholder="Search an officeholder"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
            />
          </label>
          <Segmented label="Office" value={office} options={OFFICE_OPTIONS} onChange={setOffice} />
          <label className="ptb-select">
            <span className="ptk-sr">State</span>
            <select className="dsc-select" value={uf} onChange={(e) => setUf(e.target.value)}>
              <option value="">All states</option>
              {ufs.map((u) => (
                <option key={u} value={u}>
                  {BR_UF[u] || u}
                </option>
              ))}
            </select>
          </label>
          <label className="ptb-select">
            <span className="ptk-sr">Party</span>
            <select className="dsc-select" value={party} onChange={(e) => setParty(e.target.value)}>
              <option value="">All parties</option>
              {parties.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          {data.years.length > 1 ? (
            <Segmented
              label="Election"
              value={activeYear}
              options={data.years.map((y) => ({ value: y, label: String(y) }))}
              onChange={(y) => {
                setOpenSq(null);
                setYear(y);
              }}
              mono
            />
          ) : null}
          <Segmented label="Sort by" value={sort} options={SORTS} onChange={setSort} />
        </div>

        {data.status === 'error' ? (
          <div className="ptk-unavailable" role="status">
            <p className="dsc-note">Brazilian filings are temporarily unavailable.</p>
            <button
              type="button"
              className="dsc-btn dsc-btn--ghost"
              onClick={() => setReload((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        ) : data.status === 'empty' ? (
          <p className="dsc-note" role="status">
            No Brazilian filings are loaded yet.
          </p>
        ) : null}

        <div className="ptb-grid">
          <dl className="ptb-stats">
            <div>
              <dt className="dsc-label">Officeholders</dt>
              <dd className="dsc-mn">{fig(stats.n)}</dd>
            </div>
            <div>
              <dt className="dsc-label">Declared, combined</dt>
              <dd className="dsc-mn">{fig(brlShort(stats.sum))}</dd>
            </div>
            <div>
              <dt className="dsc-label">Median filing</dt>
              <dd className="dsc-mn">{fig(brlShort(stats.median))}</dd>
            </div>
            <div>
              <dt className="dsc-label">Largest filing</dt>
              <dd className="dsc-mn">
                {loaded && stats.top ? (
                  <button type="button" className="ptb-link" onClick={() => open(stats.top.sq)}>
                    {brlShort(stats.top.total)}{' '}
                    <span className="ptb-faint">{displayName(stats.top)}</span>
                  </button>
                ) : (
                  NONE
                )}
              </dd>
            </div>
          </dl>

          <aside className="ptb-offices" aria-label="Median declared assets by office">
            <p className="dsc-label">Median declared, by office</p>
            <ul>
              {byOffice.map((o) => (
                <li key={o.office} className="ptb-group">
                  <span className="ptb-group-name">
                    {BR_OFFICES[o.office]?.short || o.office}{' '}
                    <span className="ptb-faint">({o.n})</span>
                  </span>
                  <span className="ptb-bar" aria-hidden="true">
                    <i
                      style={{ width: `${officeTop ? ((o.median || 0) / officeTop) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="dsc-mn ptb-group-val">{brlShort(o.median)}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <section className="ptk-list" aria-label="Every officeholder, ranked">
          <div className="ptk-list-scroll">
            <table className="ptk-table ptb-table">
              <thead>
                <tr>
                  <th className="dsc-mn">#</th>
                  <th className="dsc-mn">OFFICEHOLDER</th>
                  <th className="dsc-mn">PARTY</th>
                  <th className="dsc-mn">DECLARED ASSETS</th>
                  <th className="dsc-mn ptk-th--c">CHANGE</th>
                  <th className="dsc-mn ptk-th--c ptb-col-items">ITEMS</th>
                </tr>
              </thead>
              <tbody>
                {!loaded
                  ? Array.from({ length: 8 }, (_, i) => (
                      <tr key={i} className="ptk-row ptk-row--skel" aria-hidden="true">
                        <td colSpan={6}>
                          <span className="ptb-skel" />
                        </td>
                      </tr>
                    ))
                  : filtered.slice(0, shown).map((r, i) => (
                      <tr
                        key={r.sq}
                        tabIndex={0}
                        className={`ptk-row${openSq === r.sq ? ' ptk-row--selected' : ''}`}
                        aria-selected={openSq === r.sq}
                        onClick={() => open(r.sq)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            open(r.sq);
                          }
                        }}
                      >
                        <td className="dsc-mn ptk-td-rank">{String(i + 1).padStart(2, '0')}</td>
                        <td>
                          <span className="ptk-who-text">
                            <span className="ptk-name">{displayName(r)}</span>
                            <span className="ptk-seat">
                              <span className="dsc-mn">
                                {brSeat({ cargo: r.office, sg_uf: r.uf })}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="dsc-mn">{r.party || NONE}</td>
                        <td>
                          <span className="ptk-vol">
                            <span className="dsc-mn ptk-vol-fig">{brlShort(r.total)}</span>
                            {r.total > 0 && maxTotal > 0 ? (
                              <span className="ptk-track ptk-col-volbar" aria-hidden="true">
                                <i
                                  style={{ width: `${Math.min(100, (r.total / maxTotal) * 100)}%` }}
                                />
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td
                          className={`dsc-mn ptk-td--c ${
                            r.changePct == null
                              ? 'ptk-td-mute'
                              : r.changePct >= 0
                                ? 'ptb-up'
                                : 'ptb-down'
                          }`}
                          title={
                            r.prevYear
                              ? `${brlShort(r.prevTotal)} declared in ${r.prevYear}`
                              : 'No earlier filing on record'
                          }
                        >
                          {pct(r.changePct)}
                        </td>
                        <td className="dsc-mn ptk-td--c ptb-col-items">{r.count}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {loaded && filtered.length > shown ? (
            <button
              type="button"
              className="dsc-btn dsc-btn--ghost ptb-more"
              onClick={() => setShown((n) => n + STEP)}
            >
              Show {Math.min(STEP, filtered.length - shown)} more of {filtered.length - shown}
            </button>
          ) : null}
          {loaded && !filtered.length ? (
            <p className="dsc-note">No officeholder matches these filters.</p>
          ) : null}
        </section>

        <p className="dsc-compliance">
          Declarations are public records published by Brazil&apos;s Superior Electoral Court (TSE).
          Values are in reais as each candidate declared them, often at purchase cost rather than
          market value. Change compares the same person&apos;s filing in the previous general
          election. Nothing here is investment advice.
        </p>
      </div>

      {openRow ? (
        <>
          <button type="button" className="dsc-scrim" aria-label="Close filing" onClick={close} />
          <FilingPanel row={openRow} year={activeYear} onClose={close} />
        </>
      ) : null}
    </div>
  );
}
