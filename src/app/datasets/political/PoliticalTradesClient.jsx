'use client';

/**
 * Congressional trading — Claude Design "Political Trade Tracker 1a".
 * Sibling of the Government Contracts 1b page: shared CategoryBar + ticker
 * pattern + 1440px margins. Presentation layer only.
 *
 * Data: binds ONLY to the live, canonical, enriched STOCK Act feed
 * (/api/politicians/trades → normalizeFmpTrade + enrichTrade). NO mock data
 * renders in production. A static sample may be injected via devSampleTrades,
 * but ONLY in local dev when NEXT_PUBLIC_ALLOW_SAMPLE_DATA==='true'; otherwise
 * the page shows honest empty/error states. Everything on the page (leaderboard,
 * stats, donut, table, modal) is aggregated from those real trade rows.
 *
 * Honest gaps (no real backing in the current public tier — rendered as "—",
 * never fabricated): per-member portfolio value, win rate, sector allocation,
 * and official BioGuideID headshots (silhouette + initials + party ring shown
 * until a BioGuideID resolves via resolveHeadshot).
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  PieChart as PieIcon,
  X,
  ArrowUpRight,
  FileDown,
  UserPlus,
  Search,
} from 'lucide-react';
import CategoryBar from '@/components/datasets/CategoryBar';
import { resolveHeadshot } from '@/lib/politicians/headshots';
import { POSITION_BASIS_NOTE, positionStatusMeta } from '@/lib/politicians/position-status';
import './pol-trades.css';

/* ── party color keys (pinned on .ptx-page; SVG uses the tokens) ── */
const PARTIES = {
  Democrat: { code: 'D', color: 'var(--info)' },
  Republican: { code: 'R', color: 'var(--negative)' },
  Independent: { code: 'I', color: 'var(--purple)' },
};
const partyMeta = (p) => PARTIES[p] || { code: '?', color: 'var(--text-faint)' };
/* canonical party code ('D'|'R'|'I'|null) → display word used internally */
const PARTY_WORD = { D: 'Democrat', R: 'Republican', I: 'Independent' };

/**
 * Adapt a canonical enriched trade (from /api/politicians/trades) into the
 * internal display shape this component aggregates on. Excess return is a
 * computed-pipeline field NOT present in the disclosure firehose → null → "—".
 */
function toDisplay(c, i) {
  return {
    id: c.id || `${c.bioguideId || c.name}-${c.ticker}-${c.tradedAt}-${i}`,
    ticker: c.ticker || '—',
    transaction: c.side === 'purchase' ? 'Purchase' : c.side === 'sale' ? 'Sale' : 'Other',
    politician: c.name,
    party: PARTY_WORD[c.party] || 'Unknown',
    chamber: c.chamber || '—',
    state: c.state || null,
    bioguideId: c.bioguideId || null,
    traded: c.tradedAt || '',
    filed: c.filedAt || '',
    amount: c.amountBand?.raw || '—',
    amountMin: c.amountBand?.min ?? 0,
    amountMid: c.amountBand?.mid ?? 0,
    excessReturn: null, // computed pipeline; unavailable in the firehose → "—"
  };
}

/* ── formatting + parsing ── */
function fmtUSD(v) {
  const n = Number(v) || 0;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function pct(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}
/** disclosed-amount band → midpoint dollars, e.g. "$100,001 – $250,000" → 175000 */
function bandMid(s) {
  const nums = (String(s).match(/[\d,]+/g) || [])
    .map((x) => Number(x.replace(/,/g, '')))
    .filter(Number.isFinite);
  if (!nums.length) return 0;
  return nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
}

/* ── aggregate trades → members (leaderboard) ── */
function aggregateMembers(trades) {
  const map = new Map();
  for (const t of trades) {
    if (!map.has(t.politician)) {
      map.set(t.politician, {
        name: t.politician,
        party: t.party,
        chamber: t.chamber,
        state: t.state || null,
        bioguideId: t.bioguideId || null,
        trades: [],
      });
    }
    map.get(t.politician).trades.push(t);
  }
  const out = [...map.values()].map((m) => {
    const ex = m.trades.map((t) => Number(t.excessReturn)).filter(Number.isFinite);
    const excess = ex.length ? ex.reduce((a, b) => a + b, 0) / ex.length : null;
    const volume = m.trades.reduce((s, t) => s + (t.amountMid || bandMid(t.amount)), 0);
    const spark = [...m.trades]
      .sort((a, b) => String(a.traded).localeCompare(String(b.traded)))
      .map((t) => Number(t.excessReturn))
      .filter(Number.isFinite);
    return { ...m, count: m.trades.length, excess, volume, spark };
  });
  // Rank by excess when the performance pipeline supplies it; otherwise by
  // disclosed volume (real, from amount-band midpoints) — never fabricated.
  const anyExcess = out.some((m) => m.excess != null);
  return out.sort((a, b) =>
    anyExcess ? (b.excess ?? -999) - (a.excess ?? -999) : b.volume - a.volume,
  );
}

export default function PoliticalTradesClient({ devSampleTrades = null }) {
  // NO MOCK DATA IN PRODUCTION: start empty (or dev-only sample), then load the
  // live canonical firehose. If it fails and no dev sample is enabled, show an
  // honest error/empty state — never sample rows.
  const [trades, setTrades] = useState(() => devSampleTrades || []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [partyFilter, setPartyFilter] = useState('all');
  const [chamberFilter, setChamberFilter] = useState('all');
  const [txnFilter, setTxnFilter] = useState('all');
  const [minValue, setMinValue] = useState(0); // in thousands
  const [period, setPeriod] = useState('all');
  const [heroView, setHeroView] = useState('leaderboard');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/politicians/trades?limit=300');
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.ok && Array.isArray(data.trades) && data.trades.length) {
          setTrades(data.trades.map(toDisplay));
          setLoadError(null);
        } else if (devSampleTrades) {
          setTrades(devSampleTrades); // local-dev only
        } else {
          setLoadError(
            data?.error ||
              'Live congressional data is temporarily unavailable — try again shortly.',
          );
        }
      } catch {
        if (!cancelled && !devSampleTrades) {
          setLoadError('Live congressional data is temporarily unavailable — try again shortly.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [devSampleTrades]);

  const latestDate = useMemo(() => {
    const ds = trades.map((t) => new Date(t.traded)).filter((d) => !Number.isNaN(d.getTime()));
    return ds.length ? new Date(Math.max(...ds.map((d) => d.getTime()))) : new Date();
  }, [trades]);

  const filtered = useMemo(() => {
    const periodCut = (() => {
      if (period === 'all') return null;
      if (period === 'ytd') return new Date(Date.UTC(latestDate.getUTCFullYear(), 0, 1));
      return new Date(latestDate.getTime() - 90 * 86400000); // 90d
    })();
    return trades.filter((t) => {
      if (partyFilter !== 'all' && partyMeta(t.party).code !== partyFilter) return false;
      if (chamberFilter !== 'all' && t.chamber !== chamberFilter) return false;
      if (
        txnFilter !== 'all' &&
        t.transaction !== (txnFilter === 'purchases' ? 'Purchase' : 'Sale')
      )
        return false;
      if ((t.amountMin ?? bandMid(t.amount)) < minValue * 1000) return false;
      if (periodCut) {
        const d = new Date(t.traded);
        if (!Number.isNaN(d.getTime()) && d < periodCut) return false;
      }
      return true;
    });
  }, [trades, partyFilter, chamberFilter, txnFilter, minValue, period, latestDate]);

  const members = useMemo(() => aggregateMembers(filtered), [filtered]);

  const partyCounts = useMemo(() => {
    const c = { all: new Set(trades.map((t) => t.politician)).size };
    for (const p of ['D', 'R', 'I']) {
      c[p] = new Set(
        trades.filter((t) => partyMeta(t.party).code === p).map((t) => t.politician),
      ).size;
    }
    return c;
  }, [trades]);

  const stats = useMemo(() => {
    const volume = filtered.reduce((s, t) => s + bandMid(t.amount), 0);
    const top = members[0];
    return {
      volume,
      trades: filtered.length,
      top: top ? { name: top.name.split(' ').slice(-1)[0], excess: top.excess } : null,
      members: new Set(filtered.map((t) => t.politician)).size,
    };
  }, [filtered, members]);

  const partyLabel = partyFilter === 'all' ? 'All parties' : partyFilter;

  const toggl_party = (code) => setPartyFilter((c) => (c === code ? 'all' : code));

  const exportData = (format) => {
    const rows = filtered.map((t) => ({
      ticker: t.ticker,
      transaction: t.transaction,
      politician: t.politician,
      party: t.party,
      chamber: t.chamber,
      filed: t.filed,
      traded: t.traded,
      amount: t.amount,
      excess_return: t.excessReturn,
    }));
    let blob;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    } else {
      const cols = Object.keys(rows[0] || { ticker: '' });
      const esc = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join(
        '\n',
      );
      blob = new Blob([csv], { type: 'text/csv' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `congressional-trades.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ptx-page">
      <CategoryBar active="congress" activeItem="Congressional trading" />

      <TradeTicker members={members} />

      <header className="ptx-header">
        <p className="ptx-eyebrow">DATASETS · HOUSE &amp; SENATE DISCLOSURES</p>
        <h1 className="ptx-title">Congressional trading data</h1>
        <p className="ptx-sub">
          Every stock transaction disclosed by members of Congress under the STOCK Act — enriched
          with party, chamber, and excess-return context.
        </p>
      </header>

      <div className="ptx-body">
        <aside className="ptx-rail">
          <div className="ptx-export">
            <button type="button" className="ptx-reportbtn" onClick={() => exportData('csv')}>
              <FileDown size={13} /> Export data
            </button>
          </div>

          <FilterGroup title="Party">
            <RailChip
              active={partyFilter === 'all'}
              onClick={() => setPartyFilter('all')}
              label="All"
              count={partyCounts.all}
            />
            {[
              ['D', 'Democrat'],
              ['R', 'Republican'],
              ['I', 'Independent'],
            ].map(([code, label]) => (
              <RailChip
                key={code}
                active={partyFilter === code}
                onClick={() => toggl_party(code)}
                label={label}
                color={PARTIES[label].color}
                count={partyCounts[code] || 0}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Chamber">
            {['all', 'House', 'Senate'].map((c) => (
              <RailChip
                key={c}
                active={chamberFilter === c}
                onClick={() => setChamberFilter(c)}
                label={c === 'all' ? 'All' : c}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Transaction">
            {[
              ['all', 'All'],
              ['purchases', 'Purchases'],
              ['sales', 'Sales'],
            ].map(([v, l]) => (
              <RailChip
                key={v}
                active={txnFilter === v}
                onClick={() => setTxnFilter(v)}
                label={l}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Min trade value">
            <input
              type="range"
              min={0}
              max={5000}
              step={50}
              value={minValue}
              onChange={(e) => setMinValue(Number(e.target.value))}
              className="ptx-slider"
              aria-label="Minimum disclosed trade value in thousands"
            />
            <div className="ptx-slider-val">
              ≥ <span className="ptx-mono">{minValue >= 5000 ? '$5M+' : `$${minValue}K`}</span>
            </div>
          </FilterGroup>

          <FilterGroup title="Period">
            {[
              ['90d', 'Last 90 days'],
              ['ytd', 'Year to date'],
              ['all', 'All time'],
            ].map(([v, l]) => (
              <RailChip key={v} active={period === v} onClick={() => setPeriod(v)} label={l} />
            ))}
          </FilterGroup>
        </aside>

        <main className="ptx-main">
          <div className="ptx-stats">
            <StatCard
              label="Disclosed volume"
              value={fmtUSD(stats.volume)}
              sub={`${partyLabel} · filtered`}
            />
            <StatCard
              label="Disclosed trades"
              value={stats.trades.toLocaleString('en-US')}
              sub="in current view"
            />
            <StatCard
              label="Top performer"
              value={stats.top ? stats.top.name : '—'}
              sub={stats.top ? `${pct(stats.top.excess)} excess` : ''}
              tone={stats.top && stats.top.excess >= 0 ? 'pos' : 'neg'}
            />
            <StatCard label="Members tracked" value={String(stats.members)} sub="in current view" />
          </div>

          <div className="ptx-legend">
            {[
              ['D', 'Democrat'],
              ['R', 'Republican'],
              ['I', 'Independent'],
            ].map(([code, label]) => (
              <button
                key={code}
                type="button"
                className={`ptx-legend-chip ${partyFilter === code ? 'is-active' : ''}`}
                onClick={() => toggl_party(code)}
                style={partyFilter === code ? { borderColor: PARTIES[label].color } : undefined}
              >
                <span className="ptx-dot" style={{ background: PARTIES[label].color }} />
                {label}
              </button>
            ))}
          </div>

          <section className="ptx-card ptx-hero">
            <div className="ptx-hero-head">
              <h2 className="ptx-hero-title">Top traders · {partyLabel}</h2>
              <div className="ptx-seg">
                <button
                  type="button"
                  className={heroView === 'leaderboard' ? 'is-active' : ''}
                  onClick={() => setHeroView('leaderboard')}
                >
                  <LayoutGrid size={13} /> Leaderboard
                </button>
                <button
                  type="button"
                  className={heroView === 'volume' ? 'is-active' : ''}
                  onClick={() => setHeroView('volume')}
                >
                  <PieIcon size={13} /> Share of volume
                </button>
              </div>
            </div>
            {loadError ? (
              <div className="ptx-empty">{loadError}</div>
            ) : loading && members.length === 0 ? (
              <div className="ptx-empty">Loading live congressional disclosures…</div>
            ) : members.length === 0 ? (
              <div className="ptx-empty">No members match the current filters.</div>
            ) : heroView === 'leaderboard' ? (
              <div className="ptx-cards">
                {members.slice(0, 8).map((m, i) => (
                  <FaceCard key={m.name} member={m} rank={i + 1} onClick={() => setSelected(m)} />
                ))}
              </div>
            ) : (
              <VolumeDonut trades={filtered} />
            )}
          </section>
        </main>
      </div>

      <TickerSearch onSelectMember={setSelected} />

      <section className="ptx-card ptx-table-card">
        <div className="ptx-table-head">
          <h2 className="ptx-hero-title">Recent trades · {partyLabel}</h2>
          <span className="ptx-table-count">{filtered.length} shown</span>
        </div>
        <div className="ptx-table-wrap">
          <table className="ptx-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th>Transaction</th>
                <th>Politician</th>
                <th>Filed</th>
                <th>Traded</th>
                <th className="r">Amount</th>
                <th className="r">Excess return</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const member = members.find((m) => m.name === t.politician);
                return (
                  <tr key={t.id} onClick={() => member && setSelected(member)}>
                    <td className="ptx-mono ptx-tk">{t.ticker}</td>
                    <td>
                      <span className={`ptx-txn ${t.transaction === 'Purchase' ? 'buy' : 'sell'}`}>
                        {t.transaction}
                      </span>
                    </td>
                    <td>
                      <span className="ptx-polcell">
                        <MiniAvatar name={t.politician} bioguideId={t.bioguideId} party={t.party} />
                        <span>
                          {t.politician}
                          <span className="ptx-polcell-sub">{t.chamber}</span>
                        </span>
                      </span>
                    </td>
                    <td className="ptx-mono ptx-muted">{t.filed}</td>
                    <td className="ptx-mono ptx-muted">{t.traded}</td>
                    <td className="ptx-mono r">{t.amount}</td>
                    <td
                      className={`ptx-mono r ${t.excessReturn == null ? 'ptx-muted' : Number(t.excessReturn) >= 0 ? 'pos' : 'neg'}`}
                    >
                      {t.excessReturn == null ? '—' : pct(Number(t.excessReturn))}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="ptx-empty" style={{ padding: '28px' }}>
                    {loadError ||
                      (loading
                        ? 'Loading live disclosures…'
                        : 'No trades match the current filters.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <MemberModal member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ────────────────────────── Trade ticker ────────────────────────── */
function TradeTicker({ members }) {
  const items = useMemo(() => {
    const list = members
      .slice(0, 16)
      .flatMap((m) =>
        m.trades.slice(0, 1).map((t) => ({
          party: partyMeta(m.party),
          name: m.name,
          ticker: t.ticker,
          excess: m.excess,
        })),
      )
      .filter((x) => x.name && x.ticker);
    return list.length ? [...list, ...list] : [];
  }, [members]);
  if (!items.length) return null;
  return (
    <div className="ptx-ticker" aria-hidden="true">
      <div className="ptx-ticker-track">
        {items.map((it, i) => (
          <div className="ptx-titem" key={i}>
            <span className="ptx-mono ptx-tp" style={{ color: it.party.color }}>
              {it.party.code}
            </span>
            <span className="ptx-tn">{it.name}</span>
            <span className="ptx-mono ptx-tk2">{it.ticker}</span>
            <span className={`ptx-mono ${it.excess >= 0 ? 'pos' : 'neg'}`}>{pct(it.excess)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── Rail bits ────────────────────────── */
function FilterGroup({ title, children }) {
  return (
    <div className="ptx-fg">
      <div className="ptx-fg-title">{title}</div>
      {children}
    </div>
  );
}
function RailChip({ active, onClick, label, count, color }) {
  return (
    <button type="button" className={`ptx-chip ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="ptx-chip-label">
        {color && <span className="ptx-dot" style={{ background: color }} />}
        {label}
      </span>
      {count != null && <span className="ptx-chip-count ptx-mono">{count}</span>}
    </button>
  );
}
function StatCard({ label, value, sub, tone }) {
  return (
    <div className="ptx-card ptx-stat">
      <div className="ptx-stat-label">{label}</div>
      <div className={`ptx-stat-value ptx-mono ${tone || ''}`}>{value}</div>
      {sub && <div className="ptx-stat-sub ptx-mono">{sub}</div>}
    </div>
  );
}

function initials(name) {
  return (name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/* ────────────────────────── Face card ────────────────────────── */
function Avatar({ member, size = 64 }) {
  const pm = partyMeta(member.party);
  const shot = resolveHeadshot({ name: member.name, bioguideId: member.bioguideId });
  const [failed, setFailed] = useState(false);
  const showImg = shot && !failed;
  return (
    <span className="ptx-avatar" style={{ width: size, height: size, borderColor: pm.color }}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot.src}
          alt={member.name}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            objectFit: 'cover',
            objectPosition: 'center top',
            width: '100%',
            height: '100%',
          }}
        />
      ) : (
        <span className="ptx-avatar-fallback">{initials(member.name)}</span>
      )}
    </span>
  );
}

/* 26px table/search avatar — same resolver + onError + party ring as <Avatar>. */
function MiniAvatar({ name, bioguideId, party }) {
  const pm = partyMeta(party);
  const shot = resolveHeadshot({ name, bioguideId });
  const [failed, setFailed] = useState(false);
  const showImg = shot && !failed;
  return (
    <span className="ptx-mini-avatar" style={{ borderColor: pm.color }}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot.src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function FaceCard({ member, rank, onClick }) {
  const pm = partyMeta(member.party);
  return (
    <button type="button" className="ptx-facecard" onClick={onClick}>
      <div className="ptx-fc-top">
        <span className="ptx-rank ptx-mono">{rank}</span>
        <span className="ptx-badge" style={{ background: pm.color }}>
          {pm.code}
        </span>
      </div>
      <Avatar member={member} />
      <div className="ptx-fc-name">{member.name}</div>
      <div className="ptx-fc-meta">
        {member.chamber} · {member.state || '—'}
      </div>
      <div className={`ptx-fc-excess ptx-mono ${member.excess >= 0 ? 'pos' : 'neg'}`}>
        {pct(member.excess)}
      </div>
      <Sparkline values={member.spark} positive={member.excess >= 0} />
      <div className="ptx-fc-pv ptx-mono">Portfolio —</div>
    </button>
  );
}

function Sparkline({ values, positive }) {
  if (!values || values.length < 2) return <div className="ptx-spark-empty" />;
  const W = 120;
  const H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${H - ((v - min) / range) * H}`).join(' ');
  const color = positive ? 'var(--positive)' : 'var(--negative)';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ptx-spark" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} />
    </svg>
  );
}

/* ────────────────────────── Volume donut ────────────────────────── */
function donutSegments(data, total) {
  const C = 2 * Math.PI * 70;
  let offset = 0;
  return data.map((d) => {
    const frac = total ? d.value / total : 0;
    const seg = { ...d, dash: frac * C, gap: C - frac * C, offset: -offset * C };
    offset += frac;
    return seg;
  });
}
function VolumeDonut({ trades }) {
  const byParty = {};
  for (const t of trades) {
    const label = t.party;
    byParty[label] = (byParty[label] || 0) + bandMid(t.amount);
  }
  const data = Object.entries(byParty).map(([party, value]) => ({ party, value }));
  const sum = data.reduce((s, d) => s + d.value, 0);
  const segs = donutSegments(data, sum);
  return (
    <div className="ptx-donut-wrap">
      <svg viewBox="0 0 180 180" className="ptx-donut">
        <circle cx={90} cy={90} r={70} fill="none" stroke="var(--bg-tertiary)" strokeWidth={30} />
        {segs.map((s) => (
          <circle
            key={s.party}
            cx={90}
            cy={90}
            r={70}
            fill="none"
            stroke={partyMeta(s.party).color}
            strokeWidth={30}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={s.offset}
            transform="rotate(-90 90 90)"
          />
        ))}
        <text x={90} y={86} className="ptx-donut-c1">
          {fmtUSD(sum)}
        </text>
        <text x={90} y={102} className="ptx-donut-c2">
          disclosed volume
        </text>
      </svg>
      <div className="ptx-donut-list">
        {data
          .sort((a, b) => b.value - a.value)
          .map((d) => (
            <div className="ptx-donut-row" key={d.party}>
              <span className="ptx-dot" style={{ background: partyMeta(d.party).color }} />
              <span className="ptx-donut-name">{d.party}</span>
              <span className="ptx-mono ptx-donut-val">{fmtUSD(d.value)}</span>
              <span className="ptx-mono ptx-donut-pct">
                {sum ? Math.round((d.value / sum) * 100) : 0}%
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ────────────────────────── Ticker search (Part B) ────────────────────────── */
function TickerSearch({ onSelectMember }) {
  const [q, setQ] = useState('');
  const [suggests, setSuggests] = useState([]);
  const [result, setResult] = useState(null); // { symbol, company, members }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  // debounced autocomplete via the existing fmp/search route
  useEffect(() => {
    if (result) return; // don't autocomplete while showing results
    const term = q.trim();
    if (term.length < 1) {
      setSuggests([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fmp/search?q=${encodeURIComponent(term)}`);
        const data = await res.json().catch(() => []);
        setSuggests(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        setSuggests([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q, result]);

  const runSearch = async (symbol, company) => {
    const sym = String(symbol || q)
      .toUpperCase()
      .trim();
    if (!/^[A-Z.\-]{1,6}$/.test(sym)) {
      setError('Enter a valid ticker (1–6 letters).');
      return;
    }
    setSuggests([]);
    setLoading(true);
    setError(null);
    setResult({ symbol: sym, company: company || '', members: null });
    try {
      const res = await fetch(`/api/politicians/ticker-activity?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setResult({ symbol: sym, company: company || '', members: data.members });
      } else {
        setResult(null);
        setError(data?.error || 'Search is temporarily unavailable — try again shortly.');
      }
    } catch {
      setResult(null);
      setError('Search is temporarily unavailable — try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResult(null);
    setQ('');
    setError(null);
    setSuggests([]);
  };

  const openMember = (g) => {
    // adapt the ticker-activity member group → the drill-down modal's shape
    onSelectMember({
      name: g.member.name,
      party: PARTY_WORD[g.member.party] || 'Unknown',
      chamber: g.member.chamber || '—',
      state: g.member.state || null,
      bioguideId: g.member.bioguideId || null,
      count: g.trades.length,
      excess: null,
      trades: g.trades.map((c) => ({
        traded: c.tradedAt,
        excessReturn: null,
        ticker: c.ticker,
        amount: c.amountBand?.raw,
      })),
    });
  };

  return (
    <section className="ptx-card ptx-search">
      {!result && !error ? (
        <div className="ptx-search-input-wrap">
          <Search size={16} className="ptx-search-icon" />
          <input
            className="ptx-search-input ptx-mono"
            value={q}
            onChange={(e) => setQ(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search a ticker — e.g. AAPL"
            aria-label="Search a stock ticker for congressional trades"
          />
          {suggests.length > 0 && (
            <div className="ptx-search-suggests">
              {suggests.map((s) => (
                <button
                  key={s.symbol}
                  type="button"
                  className="ptx-suggest"
                  onClick={() => runSearch(s.symbol, s.name)}
                >
                  <span className="ptx-mono ptx-suggest-sym">{s.symbol}</span>
                  <span className="ptx-suggest-name">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="ptx-search-results">
          <div className="ptx-search-res-head">
            <div>
              <span className="ptx-mono ptx-tk">{result?.symbol}</span>
              {result?.company && <span className="ptx-search-company"> · {result.company}</span>}
              {result?.members && (
                <span className="ptx-search-count">
                  {' '}
                  · {result.members.length} members disclosed trades
                </span>
              )}
            </div>
            <button
              type="button"
              className="ptx-search-clear"
              onClick={clear}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          </div>

          {error && <div className="ptx-empty">{error}</div>}
          {loading && !error && <div className="ptx-empty">Searching disclosures…</div>}
          {result?.members && result.members.length === 0 && (
            <div className="ptx-empty">
              No disclosed congressional trades found for {result.symbol}. STOCK Act filings can lag
              trades by up to 45 days.
            </div>
          )}

          {result?.members && result.members.length > 0 && (
            <>
              <div className="ptx-search-rows">
                {result.members.map((g) => {
                  const pm = partyMeta(PARTY_WORD[g.member.party] || 'Unknown');
                  const sm = positionStatusMeta(g.position);
                  const shown = g.trades.slice(0, 3);
                  return (
                    <button
                      key={g.member.bioguideId || g.member.name}
                      type="button"
                      className="ptx-search-row"
                      onClick={() => openMember(g)}
                    >
                      <span className="ptx-search-member">
                        <MiniAvatar
                          name={g.member.name}
                          bioguideId={g.member.bioguideId}
                          party={PARTY_WORD[g.member.party] || 'Unknown'}
                        />
                        <span>
                          {g.member.name}
                          <span className="ptx-badge-inline" style={{ color: pm.color }}>
                            {' '}
                            {pm.code}
                          </span>
                          <span className="ptx-polcell-sub">
                            {g.member.chamber || '—'} · {g.member.state || '—'}
                          </span>
                        </span>
                      </span>
                      <span className="ptx-search-trades">
                        {shown.map((t, i) => (
                          <span key={i} className="ptx-search-trade">
                            <span className={`ptx-txn ${t.side === 'purchase' ? 'buy' : 'sell'}`}>
                              {t.side === 'purchase' ? 'Buy' : t.side === 'sale' ? 'Sale' : 'Other'}
                            </span>
                            <span className="ptx-mono ptx-muted">{t.tradedAt}</span>
                            <span className="ptx-mono">{t.amountBand?.raw || '—'}</span>
                          </span>
                        ))}
                        {g.trades.length > 3 && (
                          <span className="ptx-muted">+{g.trades.length - 3} more</span>
                        )}
                      </span>
                      <span
                        className={`ptx-status ptx-status-${sm.tone}`}
                        title={POSITION_BASIS_NOTE}
                      >
                        {sm.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="ptx-search-basis">{POSITION_BASIS_NOTE}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ────────────────────────── Member modal ────────────────────────── */
function MemberModal({ member: m, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);
  const pm = partyMeta(m.party);

  // excess-over-time: this member's trades' excess, oldest→newest (real, derived)
  const series = [...m.trades]
    .sort((a, b) => String(a.traded).localeCompare(String(b.traded)))
    .map((t) => ({ label: String(t.traded).slice(5), value: Number(t.excessReturn) }))
    .filter((s) => Number.isFinite(s.value));

  return (
    <div className="ptx-modal-backdrop" onClick={onClose}>
      <div
        className="ptx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="ptx-modal-left">
          <div className="ptx-modal-portrait">
            <Avatar member={m} size={72} />
          </div>
          <h3 className="ptx-modal-name">{m.name}</h3>
          <p className="ptx-modal-sub">
            {m.party} · {m.chamber} · {m.state || '—'}
          </p>
          <div className="ptx-modal-grid">
            <MiniStat label="Portfolio value" value="—" />
            <MiniStat
              label="Excess · 90d"
              value={pct(m.excess)}
              tone={m.excess >= 0 ? 'pos' : 'neg'}
            />
            <MiniStat label="Disclosed trades" value={String(m.count)} />
            <MiniStat label="Win rate" value="—" />
          </div>
          <div className="ptx-modal-section">
            <div className="ptx-modal-h">Sector allocation</div>
            <div className="ptx-rail-note">Not available in the public disclosure tier.</div>
          </div>
          <div className="ptx-modal-section">
            <div className="ptx-modal-h">Most traded</div>
            <div className="ptx-mosttraded">
              <span className="ptx-mono ptx-tk">{mostTraded(m.trades)}</span>
              <span className="ptx-related-note">Top disclosed ticker</span>
            </div>
          </div>
        </div>

        <div className="ptx-modal-right">
          <button type="button" className="ptx-modal-x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="ptx-modal-h">Excess return over time</div>
          {series.length >= 2 ? (
            <AreaChart series={series} positive={m.excess >= 0} />
          ) : (
            <div className="ptx-empty">Not enough dated trades to chart.</div>
          )}

          <div className="ptx-modal-h" style={{ marginTop: 18 }}>
            Holdings by sector
          </div>
          <div className="ptx-rail-note">Not available in the public disclosure tier.</div>

          <div className="ptx-modal-actions">
            <button type="button" className="ptx-btn ptx-btn-primary">
              <UserPlus size={14} /> Follow member
            </button>
            <button type="button" className="ptx-btn ptx-btn-outline">
              Full dossier <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function mostTraded(trades) {
  const c = {};
  for (const t of trades) c[t.ticker] = (c[t.ticker] || 0) + 1;
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : '—';
}
function MiniStat({ label, value, tone }) {
  return (
    <div className="ptx-ministat">
      <div className="ptx-ministat-label">{label}</div>
      <div className={`ptx-ministat-value ptx-mono ${tone || ''}`}>{value}</div>
    </div>
  );
}
function AreaChart({ series, positive }) {
  const W = 460;
  const H = 150;
  const P = { t: 12, r: 12, b: 22, l: 12 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const vals = series.map((s) => s.value);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 0);
  const range = max - min || 1;
  const step = series.length > 1 ? iw / (series.length - 1) : 0;
  const pts = series.map((s, i) => ({
    x: P.l + i * step,
    y: P.t + ih - ((s.value - min) / range) * ih,
    ...s,
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${P.t + ih} L${pts[0].x},${P.t + ih} Z`;
  const color = positive ? 'var(--positive)' : 'var(--negative)';
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="ptx-area"
      role="img"
      aria-label="Excess return over time"
    >
      <defs>
        <linearGradient id="ptx-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.26} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={P.l}
          x2={W - P.r}
          y1={P.t + ih * g}
          y2={P.t + ih * g}
          className="ptx-grid"
        />
      ))}
      <path d={area} fill="url(#ptx-grad)" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} />
      {pts.map((p) => (
        <text key={p.label} x={p.x} y={H - 6} className="ptx-area-x">
          {p.label}
        </text>
      ))}
    </svg>
  );
}
