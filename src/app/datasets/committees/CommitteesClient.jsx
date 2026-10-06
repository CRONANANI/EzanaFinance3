'use client';

/**
 * Committee Assignments (Capitol Watch). Two views on one page:
 *   By committee: House / Senate / Joint tabs, one card per committee with its
 *     leaders, seat split, mapped sectors, and an expander for members and
 *     subcommittees (?committee=<thomasId> opens one).
 *   By member: search the members who hold a seat, then their committees and
 *     their disclosed trades in sectors those committees oversee
 *     (?member=<bioguideId> opens one).
 *
 * Reads /api/committees*. No mock data: an unsynced table shows an honest
 * empty state. Sector links are editorial and always carry their note.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import EzanaQLBar from '@/components/ezanaql/EzanaQLBar';
import { seedForDataset } from '@/lib/ezanaql/seeds';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import './committees.css';

const CHAMBERS = [
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
  { id: 'joint', label: 'Joint' },
];
const CHAMBER_WORD = { house: 'House', senate: 'Senate', joint: 'Joint' };
const PARTY_WORD = { D: 'Democrat', R: 'Republican', I: 'Independent' };
const SOURCE_LINE =
  'Source: congress-legislators project (public domain), compiled from House Clerk and Senate records. Trades: House Clerk and Senate disclosures.';

function fmtShortUSD(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}
function fmtRange(min, max) {
  const a = fmtShortUSD(min);
  const b = fmtShortUSD(max);
  if (a && b) return `${a} to ${b}`;
  return a ? `${a}+` : b || 'Undisclosed';
}
function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
}
function fmtType(t) {
  const s = String(t || '').toLowerCase();
  if (s.startsWith('p')) return 'Buy';
  if (s.startsWith('s')) return 'Sell';
  if (s.startsWith('e')) return 'Exchange';
  return t || 'Other';
}
const seatLabel = (m) =>
  m?.chamber === 'Senate'
    ? `Sen. ${m.state || ''}`.trim()
    : m?.state
      ? `Rep. ${m.state}${m.district != null ? `-${m.district === 0 ? 'AL' : m.district}` : ''}`
      : null;

function useJson(url) {
  const [state, setState] = useState({ status: url ? 'loading' : 'idle', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!url) {
      setState({ status: 'idle', data: null });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ status: 'loading', data: s.data }));
    fetch(url)
      .then((r) => r.json().then((j) => ({ ok: r.ok && j?.ok !== false, j })))
      .then(({ ok, j }) => alive && setState({ status: ok ? 'ready' : 'error', data: j }))
      .catch(() => alive && setState({ status: 'error', data: null }));
    return () => {
      alive = false;
    };
  }, [url, nonce]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

function PartyTag({ party }) {
  if (!party) return null;
  return (
    <span className={`cmx-party cmx-party--${party}`} title={PARTY_WORD[party] || party}>
      {party}
    </span>
  );
}

function Headshot({ src, name }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  if (!src || failed) {
    return (
      <span className="cmx-face cmx-face--blank" aria-hidden="true">
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="cmx-face" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  );
}

function SectorChips({ sectors }) {
  if (!sectors?.length) return null;
  return (
    <div className="cmx-chips" aria-label="Sectors this committee oversees">
      {sectors.map((s) => (
        <span key={s.key} className="cmx-chip">
          {s.label}
        </span>
      ))}
    </div>
  );
}

function SplitBar({ majority, minority }) {
  const total = majority + minority;
  if (!total) return null;
  const pct = Math.round((majority / total) * 100);
  return (
    <div className="cmx-split">
      <div
        className="cmx-split-bar"
        role="img"
        aria-label={`${majority} majority seats, ${minority} minority seats`}
      >
        <span className="cmx-split-maj" style={{ width: `${pct}%` }} />
      </div>
      <div className="cmx-split-legend cmx-mono">
        <span>
          <i className="cmx-dot cmx-dot--maj" aria-hidden="true" />
          {majority} majority
        </span>
        <span>
          <i className="cmx-dot cmx-dot--min" aria-hidden="true" />
          {minority} minority
        </span>
      </div>
    </div>
  );
}

function Leader({ label, who }) {
  return (
    <div className="cmx-leader">
      <span className="cmx-leader-label">{label}</span>
      {who ? (
        <span className="cmx-leader-name">
          {who.name || who.bioguideId} <PartyTag party={who.party} />
        </span>
      ) : (
        <span className="cmx-leader-name cmx-muted">Not listed</span>
      )}
    </div>
  );
}

/* ── By committee ───────────────────────────────────────────────────── */

function CommitteeDetail({ thomasId }) {
  const { status, data, retry } = useJson(`/api/committees/${thomasId}`);
  const c = data?.committee;
  if (status === 'loading' && !c) {
    return (
      <div className="cmx-detail" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="cmx-skel cmx-skel--row" />
        ))}
      </div>
    );
  }
  if (status === 'error' || !c) {
    return (
      <div className="cmx-detail cmx-empty">
        Could not load this committee.{' '}
        <button type="button" className="cmx-link-btn" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className="cmx-detail">
      {c.members.length ? (
        <ul className="cmx-members">
          {c.members.map((m) => (
            <li key={m.bioguideId} className="cmx-member">
              <Headshot src={m.headshot} name={m.name} />
              <span className="cmx-member-main">
                <span className="cmx-member-name">
                  {m.name} <PartyTag party={m.party} />
                </span>
                <span className="cmx-member-meta">
                  {m.title ||
                    (m.side === 'majority'
                      ? 'Majority'
                      : m.side === 'minority'
                        ? 'Minority'
                        : 'Member')}
                  {m.rank ? <span className="cmx-mono"> · #{m.rank}</span> : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cmx-empty">No members listed for this committee.</p>
      )}
      {c.subcommittees.length > 0 && (
        <div className="cmx-subs">
          <h4 className="cmx-subs-title">
            Subcommittees <span className="cmx-mono cmx-muted">{c.subcommittees.length}</span>
          </h4>
          <ul className="cmx-sub-list">
            {c.subcommittees.map((s) => (
              <li key={s.thomasId} className="cmx-sub">
                <span className="cmx-sub-name">{s.name}</span>
                <span className="cmx-sub-meta">
                  {s.chair ? <>Chair {s.chair.name}</> : null}
                  <span className="cmx-mono"> · {s.seats} seats</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CommitteeCard({ c, open, onToggle, cardRef }) {
  const panelId = `cmx-panel-${c.thomasId}`;
  return (
    <article
      className={`cmx-card${open ? ' is-open' : ''}`}
      ref={cardRef}
      id={`committee-${c.thomasId}`}
    >
      <header className="cmx-card-head">
        <h3 className="cmx-card-title">{c.name}</h3>
        <span className="cmx-card-meta cmx-mono">
          {c.seats} seats
          {c.subcommittees.length ? ` · ${c.subcommittees.length} subcommittees` : ''}
        </span>
      </header>
      <div className="cmx-leaders">
        <Leader label="Chair" who={c.chair} />
        <Leader label="Ranking member" who={c.ranking} />
      </div>
      <SplitBar majority={c.majority} minority={c.minority} />
      <SectorChips sectors={c.sectors} />
      <button
        type="button"
        className="cmx-expand"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
        {open ? 'Hide members' : 'Members and subcommittees'}
      </button>
      {open && (
        <div id={panelId}>
          <CommitteeDetail thomasId={c.thomasId} />
        </div>
      )}
    </article>
  );
}

function ByCommittee({ committees, initialCommittee, onOpenCommittee }) {
  const initialChamber =
    committees.find((c) => c.thomasId === initialCommittee)?.chamber || 'house';
  const [chamber, setChamber] = useState(initialChamber);
  const [open, setOpen] = useState(() => new Set(initialCommittee ? [initialCommittee] : []));
  const refs = useRef({});

  useEffect(() => {
    if (!initialCommittee) return;
    const el = refs.current[initialCommittee];
    if (el) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }
  }, [initialCommittee]);

  const list = committees.filter((c) => c.chamber === chamber);
  const toggle = (id) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    onOpenCommittee(id);
  };

  return (
    <>
      <div className="cmx-tabs" role="tablist" aria-label="Chamber">
        {CHAMBERS.map((ch) => {
          const n = committees.filter((c) => c.chamber === ch.id).length;
          return (
            <button
              key={ch.id}
              type="button"
              role="tab"
              aria-selected={chamber === ch.id}
              className={`cmx-tab${chamber === ch.id ? ' is-active' : ''}`}
              onClick={() => setChamber(ch.id)}
            >
              {ch.label} <span className="cmx-mono cmx-muted">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="cmx-grid" role="tabpanel">
        {list.map((c) => (
          <CommitteeCard
            key={c.thomasId}
            c={c}
            open={open.has(c.thomasId)}
            onToggle={() => toggle(c.thomasId)}
            cardRef={(el) => {
              refs.current[c.thomasId] = el;
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ── By member ──────────────────────────────────────────────────────── */

function MemberResult({ bioguideId, note }) {
  const { status, data, retry } = useJson(`/api/committees/member/${bioguideId}`);
  if (status === 'loading' && !data) {
    return (
      <div className="cmx-member-view" aria-busy="true">
        <div className="cmx-skel cmx-skel--title" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="cmx-skel cmx-skel--row" />
        ))}
      </div>
    );
  }
  if (status === 'error' || !data) {
    return (
      <div className="cmx-member-view cmx-empty">
        Could not load this member.{' '}
        <button type="button" className="cmx-link-btn" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }
  const { member, committees, trades, counts } = data;
  return (
    <div className="cmx-member-view">
      <div className="cmx-mv-head">
        <div>
          <h3 className="cmx-mv-name">
            {member.name || member.bioguideId} <PartyTag party={member.party} />
          </h3>
          <p className="cmx-mv-sub cmx-mono">{seatLabel(member)}</p>
        </div>
        <Link
          className="cmx-mv-link"
          href={`/datasets/politician-tracker?member=${encodeURIComponent(member.bioguideId)}`}
        >
          <i className="bi bi-person-lines-fill" aria-hidden="true" />
          Politician Tracker profile
        </Link>
      </div>

      {committees.length ? (
        <ul className="cmx-mv-committees">
          {committees.map((c) => (
            <li key={c.thomasId} className="cmx-mv-committee">
              <div className="cmx-mv-c-head">
                <Link
                  className="cmx-mv-c-name"
                  href={`/datasets/committees?committee=${c.thomasId}`}
                >
                  {c.name}
                </Link>
                {c.title ? <span className="cmx-title-pill">{c.title}</span> : null}
              </div>
              {c.subcommittees.length > 0 && (
                <ul className="cmx-mv-subs">
                  {c.subcommittees.map((s) => (
                    <li key={s.thomasId}>
                      {s.name}
                      {s.title ? <span className="cmx-title-pill">{s.title}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
              <SectorChips sectors={c.sectors} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="cmx-empty">No committee assignments on record for this member.</p>
      )}

      <section className="cmx-trades" aria-labelledby="cmx-trades-title">
        <h4 id="cmx-trades-title" className="cmx-section-title">
          Disclosed trades in sectors their committees oversee
        </h4>
        <p className="cmx-note">
          {note} Last 24 months.{' '}
          <span className="cmx-mono">
            {counts.overseen} of {counts.trades}
          </span>{' '}
          ticker trades fall in an overseen sector;{' '}
          <span className="cmx-mono">{counts.unmapped}</span> have tickers the sector map does not
          cover.
        </p>
        {trades.length ? (
          <div className="cmx-table-wrap">
            <table className="cmx-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Ticker</th>
                  <th scope="col">Type</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Committee</th>
                  <th scope="col">Sector</th>
                  <th scope="col">
                    <span className="cmx-sr">Filing</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={`${t.transaction_date}-${t.ticker}-${i}`}>
                    <td className="cmx-mono">{fmtDate(t.transaction_date)}</td>
                    <td className="cmx-mono cmx-strong">{t.ticker}</td>
                    <td>{fmtType(t.type)}</td>
                    <td className="cmx-mono">{fmtRange(t.amount_min, t.amount_max)}</td>
                    <td>{t.committee.shortName}</td>
                    <td>{t.sector.label}</td>
                    <td>
                      {t.source_url ? (
                        <a
                          className="cmx-icon-link"
                          href={t.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open the ${t.ticker} filing`}
                        >
                          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="cmx-empty">
            No disclosed trades in the sectors this member&apos;s committees oversee.
          </p>
        )}
      </section>
    </div>
  );
}

function ByMember({ members, initialMember, onSelect, note }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(initialMember || null);
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return members
      .filter((m) => m.name.toLowerCase().includes(q) || (m.state || '').toLowerCase() === q)
      .slice(0, 12);
  }, [members, q]);

  const pick = (id) => {
    setSelected(id);
    setQuery('');
    onSelect(id);
  };

  return (
    <div className="cmx-by-member">
      <div className="cmx-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          className="cmx-search-input"
          placeholder="Search a member by name or state"
          aria-label="Search members of Congress"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {q && (
        <ul className="cmx-results" aria-label="Matching members">
          {matches.length ? (
            matches.map((m) => (
              <li key={m.bioguideId}>
                <button type="button" className="cmx-result" onClick={() => pick(m.bioguideId)}>
                  <span>
                    {m.name} <PartyTag party={m.party} />
                  </span>
                  <span className="cmx-mono cmx-muted">{seatLabel(m)}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="cmx-empty">No member with a committee seat matches.</li>
          )}
        </ul>
      )}
      {selected ? (
        <MemberResult key={selected} bioguideId={selected} note={note} />
      ) : (
        !q && (
          <p className="cmx-empty">
            Pick a member to see their committees and the trades they disclosed in the sectors those
            committees oversee.
          </p>
        )
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function CommitteesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialCommittee = (searchParams.get('committee') || '').toUpperCase() || null;
  const initialMember = (searchParams.get('member') || '').toUpperCase() || null;
  const [view, setView] = useState(initialMember ? 'member' : 'committee');
  const { status, data, retry } = useJson('/api/committees');

  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams();
      if (value) next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const belt = data?.belt;
  const tickerItems = useMemo(
    () =>
      (belt || []).map((t, i) => ({
        id: `${t.bioguideId}-${t.transaction_date}-${t.ticker}-${i}`,
        lead: `${CHAMBER_WORD[t.committee.chamber] || ''} ${t.committee.shortName}`.trim(),
        main: t.member || t.bioguideId,
        value: `${t.ticker} ${fmtRange(t.amount_min, t.amount_max)}`,
        _member: t.bioguideId,
      })),
    [belt],
  );
  const onTickerSelect = useCallback(
    (it) => {
      setView('member');
      setParam('member', it._member);
    },
    [setParam],
  );
  usePublishTicker({
    items: tickerItems,
    onSelect: onTickerSelect,
    ariaLabel: 'Recent trades in sectors the trader’s committees oversee',
  });

  const counts = data?.counts;
  const committees = data?.committees || [];
  const note = data?.note || '';
  const synced = data?.syncedAt ? fmtDate(data.syncedAt) : null;

  return (
    <div className="cmx-page">
      <header className="cmx-header">
        <p className="cmx-eyebrow">DATASETS · CAPITOL WATCH</p>
        <h1 className="cmx-title">Committee Assignments</h1>
        <p className="cmx-sub">
          Who sits on every House, Senate and joint committee, who leads it, and what its members
          trade in the sectors it oversees.
        </p>
        <dl className="cmx-stats">
          <div className="cmx-stat">
            <dt>Committees</dt>
            <dd className="cmx-mono">{counts ? counts.committees : '–'}</dd>
          </div>
          <div className="cmx-stat">
            <dt>Subcommittees</dt>
            <dd className="cmx-mono">{counts ? counts.subcommittees : '–'}</dd>
          </div>
          <div className="cmx-stat">
            <dt>Seats filled</dt>
            <dd className="cmx-mono">{counts ? counts.seats.toLocaleString('en-US') : '–'}</dd>
          </div>
          <div className="cmx-stat">
            <dt>Last synced</dt>
            <dd className="cmx-mono">{synced || '–'}</dd>
          </div>
        </dl>
      </header>

      <EzanaQLBar datasetScope={null} seedQuery={seedForDataset(null)} />

      <div className="cmx-seg" role="group" aria-label="View">
        <button
          type="button"
          className={`cmx-seg-btn${view === 'committee' ? ' is-active' : ''}`}
          aria-pressed={view === 'committee'}
          onClick={() => {
            setView('committee');
            setParam('committee', null);
          }}
        >
          <i className="bi bi-diagram-3" aria-hidden="true" /> By committee
        </button>
        <button
          type="button"
          className={`cmx-seg-btn${view === 'member' ? ' is-active' : ''}`}
          aria-pressed={view === 'member'}
          onClick={() => {
            setView('member');
            setParam('member', null);
          }}
        >
          <i className="bi bi-person" aria-hidden="true" /> By member
        </button>
      </div>

      {status === 'loading' && !data ? (
        <div className="cmx-grid" aria-busy="true" aria-label="Loading committees">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="cmx-card cmx-card--skel">
              <div className="cmx-skel cmx-skel--title" />
              <div className="cmx-skel cmx-skel--row" />
              <div className="cmx-skel cmx-skel--row" />
            </div>
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="cmx-empty cmx-empty--block">
          Committee data could not be loaded.{' '}
          <button type="button" className="cmx-link-btn" onClick={retry}>
            Try again
          </button>
        </div>
      ) : !committees.length ? (
        <div className="cmx-empty cmx-empty--block">
          Committee assignments have not been synced yet. They refresh daily from the public record.
        </div>
      ) : view === 'committee' ? (
        <ByCommittee
          committees={committees}
          initialCommittee={initialCommittee}
          onOpenCommittee={(id) => setParam('committee', id)}
        />
      ) : (
        <ByMember
          members={data.members || []}
          initialMember={initialMember}
          onSelect={(id) => setParam('member', id)}
          note={note}
        />
      )}

      <footer className="cmx-foot">
        {note ? <p>{note}</p> : null}
        <p>{SOURCE_LINE}</p>
      </footer>
    </div>
  );
}
