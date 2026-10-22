'use client';

/**
 * Committee Assignments (Oct 2026 redesign): ten cards under one sticky
 * control bar. Design: docs/design/committees-handoff. One page; the view
 * switch reorders it (Members moves Member Lookup under the controls) and
 * every card stays live in both views.
 *
 * State lives in the URL: filter changes use router.replace; committee and
 * member selections push one entry so Back returns. ?committee= and
 * ?member= deep links keep working and scroll their card into view.
 * Components render; the maths lives in committees-page-model.js.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { mappingNote } from '@/lib/congress/committees-page-model';
import Controls from './Controls';
import GlanceCard from './GlanceCard';
import AtlasCard from './AtlasCard';
import GavelsCard from './GavelsCard';
import ProfileCard from './ProfileCard';
import OversightCard from './OversightCard';
import SeatLoadCard from './SeatLoadCard';
import TradesCard from './TradesCard';
import MatrixCard from './MatrixCard';
import HearingsCard from './HearingsCard';
import LookupCard from './LookupCard';
import { CHAMBER_WORD, fmtDate, fmtRange, useJson } from './ui';
import './committees.css';

const DEFAULT_COMMITTEE = 'HSIF';
const SOURCE_LINE =
  'Source: House Clerk and Senate records via the congress-legislators project; Periodic Transaction Reports. For educational purposes only. Not financial advice.';
const LEAD =
  'Who sits on each committee in Congress, who holds the gavel, which markets each committee oversees, and where members trade in the sectors they oversee.';

const DEFAULTS = { view: 'committees', chamber: 'all', party: 'all', sector: 'all', q: '' };

function parseUrl(sp) {
  const view = sp.get('view') === 'members' ? 'members' : 'committees';
  const chamber = ['house', 'senate', 'joint'].includes(sp.get('chamber'))
    ? sp.get('chamber')
    : 'all';
  const party = ['D', 'R', 'I'].includes(sp.get('party')) ? sp.get('party') : 'all';
  const sector = sp.get('sector') || 'all';
  const q = sp.get('q') || '';
  const committee = (sp.get('committee') || '').toUpperCase() || null;
  const member = (sp.get('member') || '').toUpperCase() || null;
  return { view, chamber, party, sector, q, committee, member };
}

function toQuery(state) {
  const p = new URLSearchParams();
  if (state.view !== 'committees') p.set('view', state.view);
  if (state.chamber !== 'all') p.set('chamber', state.chamber);
  if (state.party !== 'all') p.set('party', state.party);
  if (state.sector !== 'all') p.set('sector', state.sector);
  if (state.q) p.set('q', state.q);
  if (state.committee) p.set('committee', state.committee);
  if (state.member) p.set('member', state.member);
  return p.toString();
}

const scrollToCard = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
};

export default function CommitteesClient() {
  const router = useRouter();
  const pathname = usePathname() || '/datasets/committees';
  const sp = useSearchParams();
  const url = parseUrl(sp);
  const { isAuthenticated } = useAuth() || {};

  const index = useJson('/api/committees');
  const committees = useMemo(() => index.data?.committees || [], [index.data]);
  const allMembers = useMemo(() => index.data?.members || [], [index.data]);
  const selectedCommittee = url.committee || (committees.length ? DEFAULT_COMMITTEE : null);
  const selectedMember = url.member;

  /* ── URL writes: replace for filters, push for selections ───────────── */
  const navigate = useCallback(
    (patch, { push = false } = {}) => {
      const next = { ...parseUrl(sp), ...patch };
      const qs = toQuery(next);
      const target = qs ? `${pathname}?${qs}` : pathname;
      if (push) router.push(target, { scroll: false });
      else router.replace(target, { scroll: false });
    },
    [sp, pathname, router],
  );
  const setFilters = useCallback((patch) => navigate(patch), [navigate]);
  const resetFilters = useCallback(() => navigate({ ...DEFAULTS }), [navigate]);
  const openCommittee = useCallback(
    (thomasId) => {
      if (!thomasId) return;
      navigate({ committee: thomasId }, { push: true });
      scrollToCard('cmx-profile');
    },
    [navigate],
  );
  const openMember = useCallback(
    (bioguideId) => {
      if (!bioguideId) return;
      navigate({ member: bioguideId }, { push: true });
      scrollToCard('cmx-lookup');
    },
    [navigate],
  );

  /* deep links scroll their card into view once the data is up */
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || index.status !== 'ready') return;
    landed.current = true;
    if (url.member) scrollToCard('cmx-lookup');
    else if (url.committee) scrollToCard('cmx-profile');
  }, [index.status, url.member, url.committee]);

  const activeCount =
    (url.chamber !== 'all') + (url.party !== 'all') + (url.sector !== 'all') + (url.q ? 1 : 0);

  /* ── filtered views of the index (controls_apply_to) ─────────────────── */
  const sectors = useMemo(() => {
    const by = new Map();
    for (const c of committees) for (const s of c.sectors) by.set(s.key, s);
    return [...by.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [committees]);
  const sectorLabel =
    url.sector !== 'all' ? sectors.find((s) => s.key === url.sector)?.label : null;

  const byChamberSector = useCallback(
    (chamber, sector) =>
      committees.filter(
        (c) =>
          (chamber === 'all' || c.chamber === chamber) &&
          (sector === 'all' || c.sectors.some((s) => s.key === sector)),
      ),
    [committees],
  );
  const glanceList = useMemo(
    () => byChamberSector(url.chamber, url.sector),
    [byChamberSector, url.chamber, url.sector],
  );
  const atlasList = useMemo(() => {
    const t = url.q.trim().toLowerCase();
    return glanceList.filter(
      (c) =>
        !t ||
        c.shortName.toLowerCase().includes(t) ||
        c.name.toLowerCase().includes(t) ||
        c.thomasId.toLowerCase().includes(t),
    );
  }, [glanceList, url.q]);
  const oversightList = useMemo(
    () => byChamberSector(url.chamber, 'all'),
    [byChamberSector, url.chamber],
  );

  const glanceStats = useMemo(() => {
    if (!committees.length) return null;
    const ids = new Set(glanceList.map((c) => c.thomasId));
    let seatRows = 0;
    let majority = 0;
    let minority = 0;
    let subs = 0;
    for (const c of glanceList) {
      subs += c.subcommittees.length;
      for (const unit of [c, ...c.subcommittees]) {
        seatRows += unit.seats;
        majority += unit.majority;
        minority += unit.minority;
      }
    }
    const members = allMembers.filter((m) => m.committeeIds?.some((id) => ids.has(id))).length;
    return {
      committees: glanceList.length,
      subcommittees: subs,
      seats: seatRows,
      majority,
      minority,
      members,
    };
  }, [committees.length, glanceList, allMembers]);

  const seatLoadMembers = useMemo(() => {
    const ids = new Set(glanceList.map((c) => c.thomasId));
    return allMembers.filter(
      (m) =>
        (url.party === 'all' || m.party === url.party) && m.committeeIds?.some((id) => ids.has(id)),
    );
  }, [allMembers, glanceList, url.party]);

  /* ── per-card scope subtitles and empty copy ─────────────────────────── */
  const scopeParts = (keys) => {
    const parts = [];
    if (keys.includes('chamber'))
      parts.push(url.chamber === 'all' ? 'ALL CHAMBERS' : CHAMBER_WORD[url.chamber].toUpperCase());
    if (keys.includes('party') && url.party !== 'all') parts.push(`PARTY ${url.party}`);
    if (keys.includes('sector'))
      parts.push(url.sector === 'all' ? 'ALL SECTORS' : (sectorLabel || url.sector).toUpperCase());
    return parts.join(' · ');
  };
  const emptyMsg = (what, keys) => {
    const live = [];
    if (keys.includes('chamber') && url.chamber !== 'all') live.push(CHAMBER_WORD[url.chamber]);
    if (keys.includes('party') && url.party !== 'all') live.push(`party ${url.party}`);
    if (keys.includes('sector') && url.sector !== 'all') live.push(sectorLabel || url.sector);
    if (keys.includes('q') && url.q) live.push(`"${url.q.trim()}"`);
    return live.length
      ? `No ${what} match ${live.join(', ')}. Reset the filters to see everything.`
      : `No ${what} are on record yet. They refresh daily from the public record.`;
  };

  /* ── Card 7 feed and the profile strip ───────────────────────────────── */
  const [tradeSide, setTradeSide] = useState('all');
  const [tradeCommittee, setTradeCommittee] = useState(null);
  const [tradePage, setTradePage] = useState(1);
  const tradeParams = (extra) => {
    const p = new URLSearchParams();
    if (url.chamber !== 'all') p.set('chamber', url.chamber);
    if (url.party !== 'all') p.set('party', url.party);
    if (url.sector !== 'all') p.set('sector', url.sector);
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    return p.toString();
  };
  const trades = useJson(
    `/api/committees/trades?${tradeParams({
      side: tradeSide === 'all' ? null : tradeSide,
      committee: tradeCommittee,
      page: tradePage > 1 ? String(tradePage) : null,
    })}`,
  );
  const setTradeSideAnd = (v) => {
    setTradeSide(v);
    setTradePage(1);
  };
  const setTradeCommitteeAnd = (v) => {
    setTradeCommittee(v);
    setTradePage(1);
  };
  const profileStrip = useJson(
    selectedCommittee ? `/api/committees/trades?committee=${selectedCommittee}` : null,
  );
  const matrix = useJson('/api/committees/matrix');

  /* ── ticker belt: MEMBER (P-ST) · SIDE · TICKER · $RANGE · COMMITTEE ─── */
  const belt = index.data?.belt;
  const tickerItems = useMemo(
    () =>
      (belt || []).map((t, i) => {
        const kind = String(t.type || '').toLowerCase();
        const side = kind.startsWith('p') ? 'BUY' : kind.startsWith('s') ? 'SELL' : 'TRADE';
        const dir = allMembers.find((m) => m.bioguideId === t.bioguideId);
        const seat = dir?.party && dir?.state ? ` (${dir.party}-${dir.state})` : '';
        return {
          id: `${t.bioguideId}-${t.transaction_date}-${t.ticker}-${i}`,
          lead: `${t.member || t.bioguideId}${seat}`,
          main: `${side} · ${t.ticker}`,
          value: `${fmtRange(t.amount_min, t.amount_max)} · ${t.committee.shortName}`,
          _member: t.bioguideId,
        };
      }),
    [belt, allMembers],
  );
  const onTickerSelect = useCallback((it) => openMember(it._member), [openMember]);
  usePublishTicker({
    items: tickerItems,
    onSelect: onTickerSelect,
    ariaLabel: 'Recent trades in sectors the trading member’s committees oversee',
  });

  const synced = index.data?.syncedAt ? fmtDate(index.data.syncedAt) : null;
  const filters = {
    view: url.view,
    chamber: url.chamber,
    party: url.party,
    sector: url.sector,
    q: url.q,
  };

  const lookupCard = (
    <LookupCard bioguideId={selectedMember} members={allMembers} onMember={openMember} />
  );

  return (
    <div className="cmx-page">
      <header className="cmx-header">
        <div className="cmx-header-main">
          <p className="cmx-eyebrow">DATASETS · COMMITTEE ASSIGNMENTS</p>
          <h1 className="cmx-pagetitle">Committee assignments</h1>
          <p className="cmx-lead">{LEAD}</p>
        </div>
        {synced ? <p className="cmx-asof cmx-mono">Rosters as of {synced}</p> : null}
      </header>

      <HubQueryLink dimension="capitol" />

      <Controls
        filters={filters}
        set={setFilters}
        reset={resetFilters}
        activeCount={activeCount}
        sectors={sectors}
        committees={committees}
        members={allMembers}
        onCommittee={openCommittee}
        onMember={openMember}
      />

      <div className="cmx-cards">
        {url.view === 'members' ? lookupCard : null}

        <GlanceCard
          status={index.status}
          retry={index.retry}
          sub={scopeParts(['chamber', 'sector'])}
          empty={
            index.status === 'ready' && !glanceList.length
              ? emptyMsg('committees', ['chamber', 'sector'])
              : null
          }
          stats={glanceStats}
        />

        <div className="cmx-pair cmx-pair--8-4">
          <AtlasCard
            committees={atlasList}
            status={index.status}
            retry={index.retry}
            sub={scopeParts(['chamber', 'sector'])}
            empty={emptyMsg('committees', ['chamber', 'sector', 'q'])}
            selected={selectedCommittee}
            onSelect={openCommittee}
          />
          <GavelsCard
            committees={glanceList}
            status={index.status}
            retry={index.retry}
            sub={scopeParts(['chamber', 'party', 'sector'])}
            empty={emptyMsg('leaders', ['chamber', 'party', 'sector'])}
            party={url.party}
            onMember={openMember}
            onCommittee={openCommittee}
          />
        </div>

        <ProfileCard
          thomasId={selectedCommittee}
          tradesCount={profileStrip.data?.summary?.trades ?? null}
          tradesWindow={profileStrip.data?.window?.months ?? null}
          onMember={openMember}
          onTrades={() => {
            setTradeCommitteeAnd(selectedCommittee);
            scrollToCard('cmx-trades');
          }}
        />

        <div className="cmx-pair cmx-pair--7-5">
          <OversightCard
            committees={oversightList}
            status={index.status}
            retry={index.retry}
            sub={scopeParts(['chamber'])}
            empty={emptyMsg('mapped committees', ['chamber'])}
            onSector={(key) => setFilters({ sector: key })}
            onCommittee={openCommittee}
          />
          <SeatLoadCard
            members={seatLoadMembers}
            status={index.status}
            retry={index.retry}
            sub={scopeParts(['chamber', 'party', 'sector'])}
            empty={emptyMsg('members', ['chamber', 'party', 'sector'])}
            onMember={openMember}
          />
        </div>

        <TradesCard
          view={trades}
          side={tradeSide}
          setSide={setTradeSideAnd}
          committee={tradeCommittee}
          setCommittee={setTradeCommitteeAnd}
          committees={committees.filter((c) => c.sectors.length)}
          page={tradePage}
          setPage={setTradePage}
          sub={scopeParts(['chamber', 'party', 'sector'])}
          empty={emptyMsg('overseen-sector trades', ['chamber', 'party', 'sector'])}
          onMember={openMember}
          onCommittee={openCommittee}
        />

        <div className="cmx-pair cmx-pair--7-5">
          <MatrixCard
            view={matrix}
            chamber={url.chamber}
            sector={url.sector}
            sub={scopeParts(['chamber', 'sector'])}
            empty={emptyMsg('held tickers', ['chamber', 'sector'])}
            onCommittee={openCommittee}
          />
          <HearingsCard onProfile={() => scrollToCard('cmx-profile')} />
        </div>

        {url.view !== 'members' ? lookupCard : null}

        {!isAuthenticated ? (
          <section className="cmx-band" aria-labelledby="cmx-band-title">
            <div>
              <p className="cmx-kicker">Free account</p>
              <h2 id="cmx-band-title" className="cmx-band-title">
                Follow the committees that move your sectors
              </h2>
              <p className="cmx-band-line">
                Create a free account to keep exploring Ezana&apos;s congressional datasets.
              </p>
            </div>
            <div className="cmx-band-actions">
              <a className="cmx-btn" href="/auth/signup?redirect=/datasets/committees">
                Create free account
              </a>
              <a
                className="cmx-btn cmx-btn--ghost"
                href="/auth/login?redirect=/datasets/committees"
              >
                Sign in
              </a>
            </div>
          </section>
        ) : null}
      </div>

      <footer className="cmx-legal">
        <p>{SOURCE_LINE}</p>
        <p>{mappingNote()}</p>
      </footer>
    </div>
  );
}
