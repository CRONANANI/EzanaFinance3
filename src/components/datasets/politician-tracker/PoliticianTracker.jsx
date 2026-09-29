'use client';

/**
 * Politician Tracker: every member of Congress with disclosed trades, House
 * and Senate in ONE list. Chamber is a column, not a switch, and the page
 * opens on a House vs Senate comparison of market activity.
 *
 * Data is the live, canonical STOCK Act feed (/api/politicians/trades), which
 * merges both chambers and carries BioGuide IDs for the official portraits.
 * Contract exposure comes from /api/politicians/contractor-exposure. Nothing
 * is estimated: counts, and sums of disclosed-range midpoints, labelled so.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import EzanaQLBar from '@/components/ezanaql/EzanaQLBar';
import { seedForDataset } from '@/lib/ezanaql/seeds';
import {
  buildMembers,
  chamberStats,
  monthlyByChamber,
  usdShort,
} from '@/lib/politicians/tracker-model';
import Headshot from './Headshot';
import MemberPanel from './MemberPanel';
import '@/components/datasets/disclosures/disclosures.css';
import './politician-tracker.css';

const NONE = '·';
const PAGES = [0, 1, 2];
const SORTS = [
  { id: 'trades', label: 'Most trades' },
  { id: 'latest', label: 'Latest trade' },
  { id: 'volume', label: 'Disclosed volume' },
];
const SIDE_LABEL = { purchase: 'BUY', sale: 'SELL', exchange: 'EXCH', other: 'OTHER' };

function place(m) {
  if (!m.state) return m.party || NONE;
  const where = m.chamber === 'House' && m.district ? m.district : m.state;
  return m.party ? `${m.party}-${where}` : where;
}

function writeUrl(slug, push) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set('member', slug);
  else url.searchParams.delete('member');
  const fn = push ? 'pushState' : 'replaceState';
  window.history[fn](
    { ...(window.history.state || {}), ptkMember: slug || null },
    '',
    `${url.pathname}${url.search}`,
  );
}

export default function PoliticianTracker({ initialMember = null }) {
  const [trades, setTrades] = useState([]);
  const [status, setStatus] = useState('loading');
  const [contractors, setContractors] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('trades');
  const [openSlug, setOpenSlug] = useState(initialMember);
  const triggerRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all(
      PAGES.map((p) =>
        fetch(`/api/politicians/trades?page=${p}&limit=500`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((pages) => {
      if (!alive) return;
      const seen = new Set();
      const merged = [];
      for (const pg of pages) {
        for (const t of pg?.trades || []) {
          const id =
            t.id ||
            `${t.bioguideId || t.name}|${t.ticker}|${t.tradedAt}|${t.sideRaw}|${t.amountBand?.raw}`;
          if (seen.has(id)) continue;
          seen.add(id);
          merged.push({ ...t, id });
        }
      }
      setTrades(merged);
      setStatus(merged.length ? 'ready' : 'empty');
    });
    fetch('/api/politicians/contractor-exposure')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setContractors(d?.ok ? d : null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const members = useMemo(() => buildMembers(trades), [trades]);
  const stats = useMemo(() => chamberStats(members), [members]);
  const monthly = useMemo(() => monthlyByChamber(trades), [trades]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? members.filter((m) => m.name.toLowerCase().includes(q)) : [...members];
    if (sort === 'latest')
      list.sort((a, b) => String(b.lastTraded || '').localeCompare(String(a.lastTraded || '')));
    else if (sort === 'volume') list.sort((a, b) => b.volume - a.volume);
    return list;
  }, [members, query, sort]);

  const openMember = useMemo(
    () => (openSlug ? members.find((m) => m.slug === openSlug) || null : null),
    [members, openSlug],
  );

  const tickerItems = useMemo(
    () =>
      trades.slice(0, 12).map((t) => ({
        id: t.id,
        lead: t.ticker || NONE,
        main: t.name,
        value: SIDE_LABEL[t.side] || NONE,
      })),
    [trades],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Recent congressional disclosures' });

  const measureTop = useCallback(() => {
    const chrome = document.querySelector('.dscat-chrome');
    const bottom = chrome ? Math.max(0, chrome.getBoundingClientRect().bottom) : 0;
    document.documentElement.style.setProperty('--dsc-panel-top', `${Math.round(bottom)}px`);
  }, []);

  const open = useCallback(
    (m, el) => {
      if (el) triggerRef.current = el;
      measureTop();
      const swapping = Boolean(openSlug);
      setOpenSlug(m.slug);
      /* One history entry per panel session: swapping members replaces it, so
         back always closes the panel rather than walking through members. */
      writeUrl(m.slug, !swapping);
      if (!swapping) pushedRef.current = true;
    },
    [openSlug, measureTop],
  );

  const close = useCallback(() => {
    setOpenSlug(null);
    if (pushedRef.current) window.history.back();
    else writeUrl(null, false);
    pushedRef.current = false;
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const onPop = () => {
      const slug = new URL(window.location.href).searchParams.get('member');
      pushedRef.current = false;
      setOpenSlug(slug);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!openMember) return undefined;
    measureTop();
    window.addEventListener('scroll', measureTop, true);
    window.addEventListener('resize', measureTop);
    return () => {
      window.removeEventListener('scroll', measureTop, true);
      window.removeEventListener('resize', measureTop);
    };
  }, [openMember, measureTop]);

  const H = stats.House;
  const S = stats.Senate;
  const moreActive =
    H?.perMember != null && S?.perMember != null && H.perMember !== S.perMember
      ? H.perMember > S.perMember
        ? 'House'
        : 'Senate'
      : null;

  return (
    <div className="dsc ptk">
      <header className="dsc-head">
        <p className="dsc-eyebrow">DATASETS · CONGRESS</p>
        <h1 className="dsc-title">Politician tracker</h1>
        <p className="ptk-sub">
          Every member of the House and Senate with disclosed trades, in one list.
        </p>
      </header>

      <EzanaQLBar datasetScope={null} seedQuery={seedForDataset(null)} />

      <div className="ptk-body">
        {/* ── House vs Senate ── */}
        <section className="ptk-compare" aria-label="House and Senate market activity">
          <div className="ptk-card">
            <div className="dsc-block-head">
              <span className="ptk-card-title">Trades by month, House vs Senate</span>
              <span className="dsc-legend">
                <span>
                  <i className="dsc-swatch ptk-swatch--house" aria-hidden="true" />
                  House
                </span>
                <span>
                  <i className="dsc-swatch ptk-swatch--senate" aria-hidden="true" />
                  Senate
                </span>
              </span>
              <span className="dsc-block-cap">counts, not dollars</span>
            </div>
            <div
              className="ptk-chart"
              role="img"
              aria-label="Disclosed trades per month by chamber, in counts"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} barGap={2} margin={{ top: 4, right: 4, left: 0 }}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray={CHART.gridDash}
                    stroke={CHART.gridStroke}
                  />
                  <XAxis
                    dataKey="month"
                    tick={CHART.tick}
                    axisLine={CHART.xAxisLine}
                    tickLine={false}
                    tickFormatter={(m) => m.slice(2).replace('-', '/')}
                  />
                  <YAxis
                    tick={CHART.tick}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    allowDecimals={false}
                  />
                  <Tooltip cursor={{ fill: 'var(--emerald-bg-subtle)' }} />
                  <Bar dataKey="House" fill="var(--emerald)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Senate" fill="var(--info)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ptk-card">
            <div className="dsc-block-head">
              <span className="ptk-card-title">Who is more active</span>
            </div>
            <div className="ptk-versus">
              {[
                ['Active members', H?.members, S?.members, (v) => v],
                ['Disclosed trades', H?.trades, S?.trades, (v) => v],
                ['Trades per member', H?.perMember, S?.perMember, (v) => v.toFixed(1)],
                ['Disclosed volume', H?.volume, S?.volume, usdShort],
              ].map(([label, h, s, fmt]) => {
                const total = (h || 0) + (s || 0);
                return (
                  <div className="ptk-vs-row" key={label}>
                    <span className="dsc-label">{label}</span>
                    <span className="ptk-vs-fig dsc-mn">
                      {h != null && status === 'ready' ? fmt(h) : NONE}
                    </span>
                    <span className="ptk-vs-bar" aria-hidden="true">
                      <i
                        className="ptk-vs-house"
                        style={{ width: total ? `${((h || 0) / total) * 100}%` : '50%' }}
                      />
                      <i
                        className="ptk-vs-senate"
                        style={{ width: total ? `${((s || 0) / total) * 100}%` : '50%' }}
                      />
                    </span>
                    <span className="ptk-vs-fig ptk-vs-fig--r dsc-mn">
                      {s != null && status === 'ready' ? fmt(s) : NONE}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="ptk-note">
              {moreActive ? `The ${moreActive} trades more per member in the loaded window. ` : ''}
              Volume is the sum of the midpoints of disclosed ranges.
            </p>
          </div>
        </section>

        {/* ── the list ── */}
        <section className="ptk-list" aria-label="Politicians">
          <div className="ptk-toolbar">
            <label className="ptk-search">
              <i className="bi bi-search" aria-hidden="true" />
              <span className="ptk-sr">Search politicians</span>
              <input
                className="dsc-input"
                placeholder="Search a politician"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="ptk-sort">
              <span className="dsc-label">Sort</span>
              <select className="dsc-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ptk-scroll">
            <table className="dsc-table ptk-table">
              <thead>
                <tr>
                  <th>Politician</th>
                  <th>Chamber</th>
                  <th className="dsc-th--n">Trades</th>
                  <th className="ptk-hide-sm">Buys / sells</th>
                  <th className="dsc-th--n ptk-hide-sm">Disclosed volume</th>
                  <th className="ptk-hide-sm">Last trade</th>
                  <th className="ptk-hide-md">Top tickers</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr
                    key={m.key}
                    tabIndex={0}
                    className={`ptk-row${openMember?.key === m.key ? ' dsc-row-selected' : ''}`}
                    onClick={(e) => open(m, e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        open(m, e.currentTarget);
                      }
                    }}
                  >
                    <td>
                      <span className="ptk-who">
                        <Headshot
                          name={m.name}
                          bioguideId={m.bioguideId}
                          party={m.party}
                          size={32}
                        />
                        <span className="ptk-who-text">
                          <span className="ptk-name">{m.name}</span>
                          <span className="ptk-place dsc-mn">{place(m)}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ptk-chamber ptk-chamber--${String(m.chamber).toLowerCase()}`}
                      >
                        {m.chamber || NONE}
                      </span>
                    </td>
                    <td className="dsc-td--n dsc-mn">{m.count}</td>
                    <td className="ptk-hide-sm">
                      <span className="ptk-bs dsc-mn">
                        {m.buys} / {m.sells}
                      </span>
                    </td>
                    <td className="dsc-td--n dsc-mn ptk-hide-sm">{usdShort(m.volume)}</td>
                    <td className="dsc-mn ptk-hide-sm">{m.lastTraded || NONE}</td>
                    <td className="ptk-hide-md">
                      <span className="ptk-tks">
                        {m.tickers.slice(0, 3).map((t) => (
                          <span key={t.ticker} className="ptk-tk dsc-mn">
                            {t.ticker}
                          </span>
                        ))}
                        {!m.tickers.length ? NONE : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {status === 'loading' ? (
              <p className="dsc-note ptk-state">Loading disclosures.</p>
            ) : null}
            {status === 'empty' ? (
              <p className="dsc-note ptk-state">
                Disclosures are temporarily unavailable. Try again shortly.
              </p>
            ) : null}
          </div>
          <div className="dsc-tfoot">
            <p>
              Members with disclosed trades in the loaded window. Select a row for the full profile.
            </p>
            <span className="dsc-page dsc-mn">{shown.length} politicians</span>
          </div>
        </section>

        <p className="dsc-compliance">
          Disclosures are public records filed under the STOCK Act. Amounts are the ranges members
          disclose. Nothing here is investment advice.
        </p>
      </div>

      {openMember ? (
        <>
          <button
            type="button"
            className="dsc-scrim"
            aria-label="Close politician panel"
            onClick={close}
          />
          <MemberPanel
            member={openMember}
            members={members}
            contractors={contractors}
            onClose={close}
            onSelect={(m) => open(m)}
          />
        </>
      ) : null}
    </div>
  );
}
