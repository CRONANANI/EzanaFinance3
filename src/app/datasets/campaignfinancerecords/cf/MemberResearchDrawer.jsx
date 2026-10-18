'use client';

/**
 * MemberResearchDrawer: the right-hand research panel for one member.
 * 720px on desktop, a full-screen sheet under 768px. Focus is trapped, Esc
 * closes, and the URL carries ?member=<bioguide_id> so a profile can be
 * shared. Previous / next follow the leaderboard's current order.
 */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SIZE_BUCKETS } from '@/lib/campaign-finance/aggregate';
import { CHAMBERS, longDate, money, partyOf, pct, seatLong, share } from './format';
import { Avatar } from './ui';
import { useMemberDetail } from './useMember';

const RAIL = [
  { id: 'pos', n: '01', label: 'Financial position' },
  { id: 'fund', n: '02', label: 'Funding and sizes' },
  { id: 'geo', n: '03', label: 'Geography and industry' },
  { id: 'out', n: '04', label: 'Outside spending' },
  { id: 'lobby', n: '05', label: 'Lobbyist contributions' },
  { id: 'ads', n: '06', label: 'Advertising' },
  { id: 'ideo', n: '07', label: 'Ideology and committees' },
  { id: 'elect', n: '08', label: 'Elections and district' },
  { id: 'wealth', n: '09', label: 'Personal disclosures' },
  { id: 'files', n: '10', label: 'Filing history' },
];

const MEASURES = [
  { key: 'raised', label: 'Raised' },
  { key: 'spent', label: 'Spent' },
  { key: 'cash', label: 'Cash on hand' },
  { key: 'debt', label: 'Debt' },
];

const SEG = ['is-s1', 'is-s2', 'is-s3', 'is-s4', 'is-s5'];

function SizeStack({ sizes }) {
  if (!sizes?.dollars) return <span className="cfi-muted">Not available yet</span>;
  const total = sizes.dollars.reduce((s, v) => s + v, 0);
  return (
    <span className="cfi-stack cfi-stack--thin" aria-hidden="true">
      {sizes.dollars.map((v, i) => (
        <span
          key={SIZE_BUCKETS[i].key}
          className={`cfi-stack-seg ${SEG[i]}`}
          style={{ width: `${(share(v, total) || 0) * 100}%` }}
        />
      ))}
    </span>
  );
}

function MedianDot({ value, median }) {
  if (value == null || median == null) return <span className="cfi-muted">Not available yet</span>;
  const max = Math.max(value, median, 1) * 1.15;
  return (
    <span
      className="cfi-dotplot"
      role="img"
      aria-label={`${money(value)} against a median of ${money(median)}`}
    >
      <span className="cfi-dotplot-median" style={{ left: `${(median / max) * 100}%` }} />
      <span className="cfi-dotplot-dot" style={{ left: `${(value / max) * 100}%` }} />
    </span>
  );
}

function Collapsible({ id, n, label, stat, children }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="cfi-dr-sec cfi-dr-sec--row" id={`cfi-dr-${id}`} data-rail={id}>
      <button
        type="button"
        className="cfi-dr-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cfi-mono cfi-accent">{n}</span>
        <b>{label}</b>
        <span className="cfi-mono cfi-muted">{stat}</span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
      </button>
      {open ? <div className="cfi-dr-sec-body">{children}</div> : null}
    </section>
  );
}

export function MemberResearchDrawer({ memberId, data, cycle, order, onNavigate, onClose }) {
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const [rail, setRail] = useState('pos');
  const members = data?.members || [];
  const m = members.find((x) => x.id === memberId) || null;
  const detail = useMemberDetail(memberId, cycle);
  const d = detail.member;

  const idx = order.indexOf(memberId);
  const prevId = idx > 0 ? order[idx - 1] : null;
  const nextId = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;

  /* Focus trap, Esc, scroll lock. */
  useEffect(() => {
    const prevFocus = document.activeElement;
    const panel = panelRef.current;
    panel?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const f = panel.querySelectorAll(
        'a[href],button:not([disabled]),input,select,[tabindex]:not([tabindex="-1"])',
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, [onClose]);

  /* Scroll spy for the rail. */
  useEffect(() => {
    const root = bodyRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting);
        if (vis.length) setRail(vis[0].target.getAttribute('data-rail'));
      },
      { root, rootMargin: '0px 0px -70% 0px' },
    );
    root.querySelectorAll('[data-rail]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [memberId]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [memberId]);

  const groupKey = m ? `${m.party}${m.chamber}` : null;
  const peer = (groupKey && data?.byPartyChamber?.[groupKey]) || null;
  const peerLabel = m ? `${CHAMBERS[m.chamber] || ''} ${partyOf(m.party).person}`.trim() : 'peer';
  const chamberSizes = m ? data?.sizes?.[m.chamber] : null;
  const p = partyOf(m?.party);
  const through = longDate(d?.periodEnd || m?.periodEnd);
  const mix = (m?.itemized || 0) + (m?.pac || 0);
  const other = m?.raised != null ? Math.max(0, m.raised - (m.itemized || 0) - (m.pac || 0)) : null;

  const jump = (id) => {
    const el = bodyRef.current?.querySelector(`#cfi-dr-${id}`);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setRail(id);
  };

  const groups = useMemo(() => (d?.groups || []).slice(0, 12), [d]);

  return (
    <div className="cfi-drawer-root">
      <button
        type="button"
        className="cfi-scrim"
        aria-label="Close member research"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="cfi-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={m ? `Member research: ${m.name}` : 'Member research'}
        tabIndex={-1}
      >
        <header className="cfi-dr-top">
          <span className="cfi-eyebrow">Member research</span>
          <div className="cfi-dr-links">
            <Link href={`/datasets/politician-tracker?member=${encodeURIComponent(memberId)}`}>
              Politician Tracker
            </Link>
            <button type="button" className="cfi-link-btn" disabled title="Not available yet">
              Full profile
            </button>
            <button type="button" className="cfi-link-btn" disabled title="Not available yet">
              Set an alert
            </button>
            <button
              type="button"
              className="cfi-icon-btn"
              aria-label="Previous member"
              disabled={!prevId}
              onClick={() => prevId && onNavigate(prevId)}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="cfi-icon-btn"
              aria-label="Next member"
              disabled={!nextId}
              onClick={() => nextId && onNavigate(nextId)}
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
            <button type="button" className="cfi-icon-btn" aria-label="Close" onClick={onClose}>
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </header>

        {!m ? (
          <p className="cfi-state-note cfi-dr-missing">No records for this selection</p>
        ) : (
          <>
            <div className="cfi-dr-id">
              <Avatar member={m} size={56} />
              <div>
                <h2 className="cfi-dr-name">{m.name}</h2>
                <p className="cfi-dr-meta">
                  <span className={`cfi-party ${p.cls}`}>
                    <i className="cfi-dot" aria-hidden="true" />
                    {p.person}
                  </span>
                  <span> · {seatLong(m)}</span>
                  {m.chamber === 'H' ? (
                    <span className="cfi-mono cfi-muted"> · next up 2026</span>
                  ) : null}
                </p>
              </div>
              <div className="cfi-chips cfi-dr-ranks">
                <div>
                  <span className="cfi-eyebrow">Rank, raised</span>
                  <b className="cfi-mono">{m.rankRaised ? `#${m.rankRaised}` : 'n/a'}</b>
                </div>
                <div>
                  <span className="cfi-eyebrow">Rank, cash</span>
                  <b className="cfi-mono">{m.rankCash ? `#${m.rankCash}` : 'n/a'}</b>
                </div>
              </div>
            </div>

            <div className="cfi-dr-main">
              <nav className="cfi-dr-rail" aria-label="Profile sections">
                {RAIL.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={rail === r.id ? 'is-on' : undefined}
                    aria-current={rail === r.id ? 'true' : undefined}
                    onClick={() => jump(r.id)}
                  >
                    <span className="cfi-mono">{r.n}</span>
                    {r.label}
                  </button>
                ))}
              </nav>

              <div className="cfi-dr-body" ref={bodyRef}>
                <section className="cfi-dr-sec" id="cfi-dr-pos" data-rail="pos">
                  <h3 className="cfi-dr-h">
                    <span className="cfi-mono cfi-accent">01</span> Campaign financial position
                    {through ? (
                      <span className="cfi-muted cfi-small">Through {through}</span>
                    ) : null}
                  </h3>
                  <div className="cfi-kpis cfi-kpis--4">
                    {MEASURES.map((x) => (
                      <div key={x.key} className="cfi-kpi">
                        <span className="cfi-eyebrow">{x.label}</span>
                        <span
                          className={`cfi-kpi-value cfi-mono${x.key === 'debt' && m.debt ? ' is-amber' : ''}`}
                        >
                          {money(m[x.key]) ?? <span className="cfi-na">Not available yet</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="cfi-eyebrow cfi-rule">Against the {peerLabel} median</p>
                  <ul className="cfi-dotplots">
                    {MEASURES.map((x) => (
                      <li key={x.key}>
                        <span>{x.label}</span>
                        <MedianDot value={m[x.key]} median={peer?.[x.key]?.median ?? null} />
                        <span className="cfi-mono cfi-muted r">
                          {peer?.[x.key]?.median != null
                            ? `median ${money(peer[x.key].median)}`
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="cfi-dr-sec" id="cfi-dr-fund" data-rail="fund">
                  <h3 className="cfi-dr-h">
                    <span className="cfi-mono cfi-accent">02</span> Funding composition and
                    contribution sizes
                  </h3>
                  {mix || other ? (
                    <ul className="cfi-mini-list">
                      <li>
                        <span>Itemized individual</span>
                        <span className="cfi-mono">
                          {money(m.itemized) ?? 'n/a'}{' '}
                          <span className="cfi-muted">{pct(m.itemized, m.raised)}</span>
                        </span>
                      </li>
                      <li>
                        <span>PAC</span>
                        <span className="cfi-mono">
                          {money(m.pac) ?? 'n/a'}{' '}
                          <span className="cfi-muted">{pct(m.pac, m.raised)}</span>
                        </span>
                      </li>
                      <li>
                        <span>All other receipts</span>
                        <span className="cfi-mono">
                          {money(other) ?? 'n/a'}{' '}
                          <span className="cfi-muted">{pct(other, m.raised)}</span>
                        </span>
                      </li>
                    </ul>
                  ) : (
                    <p className="cfi-muted">Not available yet</p>
                  )}
                  <ul className="cfi-sizes cfi-sizes--dr">
                    <li className="cfi-size-row">
                      <span className="cfi-strong">This member</span>
                      <SizeStack sizes={m.sizes} />
                      <span className="cfi-mono r cfi-accent">
                        {m.sizes
                          ? pct(
                              m.sizes.dollars[0],
                              m.sizes.dollars.reduce((s, v) => s + v, 0),
                            )
                          : ''}
                      </span>
                    </li>
                    <li className="cfi-size-row">
                      <span>{CHAMBERS[m.chamber] || 'Chamber'}</span>
                      <SizeStack sizes={chamberSizes} />
                      <span className="cfi-mono r cfi-muted">
                        {chamberSizes?.dollars
                          ? pct(
                              chamberSizes.dollars[0],
                              chamberSizes.dollars.reduce((s, v) => s + v, 0),
                            )
                          : ''}
                      </span>
                    </li>
                  </ul>
                  <p className="cfi-note">
                    Under $200 share on the right. Buckets: under $200, $200 to $499, $500 to $999,
                    $1,000 to $1,999, $2,000 and above.
                  </p>
                </section>

                <section className="cfi-dr-sec" id="cfi-dr-geo" data-rail="geo">
                  <h3 className="cfi-dr-h">
                    <span className="cfi-mono cfi-accent">03</span> Donor geography and industries
                  </h3>
                  <div className="cfi-geo-cols">
                    <div>
                      <p className="cfi-eyebrow cfi-rule">Top donor states</p>
                      {detail.status === 'loading' ? (
                        <p className="cfi-muted">Loading</p>
                      ) : d?.states?.length ? (
                        <ul className="cfi-mini-list">
                          {d.states.map((s) => (
                            <li key={s.state}>
                              <span>{s.name}</span>
                              <span className="cfi-mono">{money(s.total)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="cfi-muted">Not available yet</p>
                      )}
                    </div>
                    <div>
                      <p className="cfi-eyebrow cfi-rule">Top sectors</p>
                      <p className="cfi-muted">Not available yet</p>
                    </div>
                  </div>
                </section>

                <section className="cfi-dr-sec" id="cfi-dr-out" data-rail="out">
                  <h3 className="cfi-dr-h">
                    <span className="cfi-mono cfi-accent">04</span> Outside spending
                    {m.support || m.oppose ? (
                      <span className="cfi-small cfi-mono">
                        <span className="is-pos">+{money(m.support || 0)}</span> supporting ·{' '}
                        <span className="is-neg">{money(m.oppose || 0)}</span> opposing
                      </span>
                    ) : null}
                  </h3>
                  {detail.status === 'loading' ? (
                    <p className="cfi-muted">Loading</p>
                  ) : groups.length ? (
                    <ul className="cfi-mini-list">
                      {groups.map((g) => (
                        <li key={`${g.name}-${g.side}`}>
                          <span>{g.name}</span>
                          <span className={`cfi-side is-${g.side === 'O' ? 'oppose' : 'support'}`}>
                            {g.side === 'O' ? 'Oppose' : 'Support'}
                          </span>
                          <span className="cfi-mono">{money(g.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="cfi-muted">
                      {m.support || m.oppose
                        ? 'Not available yet'
                        : 'No records for this selection'}
                    </p>
                  )}
                </section>

                <Collapsible
                  id="lobby"
                  n="05"
                  label="Lobbyist contributions"
                  stat="Not available yet"
                >
                  <p className="cfi-state-note">Not available yet</p>
                </Collapsible>
                <Collapsible id="ads" n="06" label="Advertising" stat="Not available yet">
                  <p className="cfi-state-note">Not available yet</p>
                </Collapsible>
                <Collapsible
                  id="ideo"
                  n="07"
                  label="Ideology and committees"
                  stat="Not available yet"
                >
                  <p className="cfi-state-note">Not available yet</p>
                </Collapsible>
                <Collapsible
                  id="elect"
                  n="08"
                  label="Elections and district"
                  stat="Not available yet"
                >
                  <p className="cfi-state-note">Not available yet</p>
                </Collapsible>
                <Collapsible
                  id="wealth"
                  n="09"
                  label="Personal disclosures"
                  stat="Not available yet"
                >
                  <p className="cfi-state-note">Not available yet</p>
                </Collapsible>
                <Collapsible
                  id="files"
                  n="10"
                  label="Filing history"
                  stat={through ? `Through ${through}` : 'Not available yet'}
                >
                  <p className="cfi-state-note">Not available yet</p>
                </Collapsible>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
