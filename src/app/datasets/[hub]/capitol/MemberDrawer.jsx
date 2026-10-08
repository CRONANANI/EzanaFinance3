'use client';

/**
 * The member drawer: identity, committees, four stats and five tabs
 * (Signals, Trades, Holdings, Committees, Donors). A dialog: Escape and the
 * scrim close it and focus returns to the opener (CwhProvider does that).
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EVENT_KINDS } from '@/lib/datasets/capitol-hub/signals';
import { LinkedChips, PartyTag } from './bits';
import { DASH, count, longDate, money, monthDay, range } from './cwh-format';

const TABS = ['Signals', 'Trades', 'Holdings', 'Committees', 'Donors'];

function initials(name) {
  const parts = String(name || '')
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(jr|sr|ii|iii)\.?$/i.test(w));
  if (!parts.length) return '';
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}

function Place({ m }) {
  const where =
    m.district != null && m.chamber?.toLowerCase() === 'house'
      ? `${m.state}-${m.district}`
      : m.state;
  return (
    <span className="cwh-dr-place">
      <PartyTag party={m.party} /> <span className="cwh-mono">{where || DASH}</span> ·{' '}
      {m.chamber ? m.chamber[0].toUpperCase() + m.chamber.slice(1).toLowerCase() : DASH}
    </span>
  );
}

function Body({ d, tab }) {
  if (tab === 'Signals') {
    return (
      <>
        <p className="cwh-label">Signals involving this member</p>
        {d.signals?.length ? (
          <ul className="cwh-dr-signals">
            {d.signals.map((e) => (
              <li key={e.id} className="cwh-dr-signal">
                <p className="cwh-event-kind">
                  <i className="bi bi-lightning-charge-fill" aria-hidden="true" />{' '}
                  {(EVENT_KINDS[e.kind] || e.kind).toUpperCase()}
                </p>
                <p className="cwh-dr-signal-h">{e.headline}</p>
                <LinkedChips datasets={e.linkedDatasets} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="cwh-caption">No top signal involves this member this month.</p>
        )}
        <p className="cwh-label cwh-dr-gap">Recent trades</p>
        <Trades rows={(d.trades || []).slice(0, 6)} />
        {d.awarded?.length ? (
          <>
            <p className="cwh-label cwh-dr-gap">Holdings that won awards, 12 months</p>
            <Awarded rows={d.awarded} />
          </>
        ) : null}
      </>
    );
  }
  if (tab === 'Trades') return <Trades rows={d.trades || []} />;
  if (tab === 'Holdings') {
    return d.holdings?.length ? (
      <>
        <table className="cwh-table cwh-dr-table">
          <thead>
            <tr>
              <th scope="col">TICKER</th>
              <th scope="col">FIRST BUY</th>
              <th scope="col">LAST</th>
              <th scope="col" className="is-num">
                EST. VALUE
              </th>
            </tr>
          </thead>
          <tbody>
            {d.holdings.slice(0, 40).map((h) => (
              <tr key={h.ticker}>
                <td className="cwh-mono cwh-strong">{h.ticker}</td>
                <td className="cwh-mono cwh-mute">{monthDay(h.firstBuy)}</td>
                <td className="cwh-mono cwh-mute">{monthDay(h.lastDate)}</td>
                <td className="cwh-mono is-num">{money(h.estValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {d.awarded?.length ? (
          <>
            <p className="cwh-label cwh-dr-gap">Holdings that won awards, 12 months</p>
            <Awarded rows={d.awarded} />
          </>
        ) : null}
        <p className="cwh-note">
          Holdings are inferred: a disclosed purchase not followed by a full sale.
        </p>
      </>
    ) : (
      <p className="cwh-caption">No inferred open positions.</p>
    );
  }
  if (tab === 'Committees') {
    return d.committees?.length ? (
      <ul className="cwh-dr-list">
        {d.committees.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
    ) : (
      <p className="cwh-caption">No committee seats on record.</p>
    );
  }
  /* Donors */
  const f = d.finance;
  return f ? (
    <>
      <dl className="cwh-dr-fin">
        <div>
          <dt className="cwh-label">Receipts, {f.cycle}</dt>
          <dd className="cwh-mono">{money(f.receipts)}</dd>
        </div>
        <div>
          <dt className="cwh-label">Cash on hand</dt>
          <dd className="cwh-mono">{money(f.cashOnHand)}</dd>
        </div>
        <div>
          <dt className="cwh-label">Individuals</dt>
          <dd className="cwh-mono">{money(f.individual)}</dd>
        </div>
        <div>
          <dt className="cwh-label">PACs</dt>
          <dd className="cwh-mono">{money(f.pac)}</dd>
        </div>
      </dl>
      {d.donors?.employers?.length ? (
        <>
          <p className="cwh-label cwh-dr-gap">Top employers of donors</p>
          <Bars rows={d.donors.employers} />
        </>
      ) : null}
      {d.donors?.occupations?.length ? (
        <>
          <p className="cwh-label cwh-dr-gap">Top occupations</p>
          <Bars rows={d.donors.occupations} />
        </>
      ) : null}
      <p className="cwh-note">
        Itemized contributions as filed with the FEC{f.asOf ? `, through ${longDate(f.asOf)}` : ''}.
      </p>
    </>
  ) : (
    <p className="cwh-caption">No FEC filings matched to this member.</p>
  );
}

function Trades({ rows }) {
  if (!rows.length)
    return <p className="cwh-caption">No disclosed trades in the last 12 months.</p>;
  return (
    <table className="cwh-table cwh-dr-table">
      <thead>
        <tr>
          <th scope="col">TICKER</th>
          <th scope="col">SIDE</th>
          <th scope="col">TRADED</th>
          <th scope="col">AMOUNT, DISCLOSED</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.id}>
            <td className="cwh-mono cwh-strong">{t.ticker || DASH}</td>
            <td>
              <span className={`cwh-side ${t.side === 'sell' ? 'is-sell' : 'is-buy'}`}>
                {t.side === 'sell'
                  ? 'SELL'
                  : t.side === 'buy'
                    ? 'BUY'
                    : String(t.side || '').toUpperCase()}
              </span>
            </td>
            <td className="cwh-mono cwh-mute">{monthDay(t.date)}</td>
            <td className="cwh-mono">{range(t.range[0], t.range[1])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Awarded({ rows }) {
  const max = rows.reduce((m, r) => Math.max(m, r.total), 0);
  return (
    <ul className="cwh-dr-bars">
      {rows.map((r) => (
        <li key={r.ticker}>
          <span className="cwh-mono cwh-strong">{r.ticker}</span>
          <span className="cwh-port-bar" aria-hidden="true">
            <i style={{ width: `${max ? (r.total / max) * 100 : 0}%` }} />
          </span>
          <span className="cwh-mono cwh-strong">{money(r.total)}</span>
          <span className="cwh-mute cwh-dr-agency">{r.agency || DASH}</span>
        </li>
      ))}
    </ul>
  );
}

function Bars({ rows }) {
  const max = rows.reduce((m, r) => Math.max(m, r.total), 0);
  return (
    <ul className="cwh-dr-bars cwh-dr-bars--names">
      {rows.map((r) => (
        <li key={r.name}>
          <span className="cwh-dr-bar-name">{r.name}</span>
          <span className="cwh-port-bar" aria-hidden="true">
            <i style={{ width: `${max ? (r.total / max) * 100 : 0}%` }} />
          </span>
          <span className="cwh-mono">{money(r.total)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function MemberDrawer({ bioguideId, onClose }) {
  const [state, setState] = useState({ status: 'loading' });
  const [tab, setTab] = useState('Signals');
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    setTab('Signals');
    fetch(`/api/datasets/capitol/member?bioguide=${encodeURIComponent(bioguideId)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!live) return;
        if (r.status === 404) setState({ status: 'missing' });
        else if (!r.ok || !d.ok) setState({ status: 'error' });
        else setState({ status: 'ready', d });
      })
      .catch(() => live && setState({ status: 'error' }));
    return () => {
      live = false;
    };
  }, [bioguideId]);

  useEffect(() => {
    if (!mounted) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, onClose]);

  if (!mounted) return null;
  const d = state.d;
  const m = d?.member;

  return createPortal(
    <div className="cwh-tokens cwh-dr-root">
      <button
        type="button"
        className="cwh-dr-scrim"
        aria-label="Close member"
        tabIndex={-1}
        onClick={onClose}
      />
      <aside
        className="cwh-dr"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cwh-dr-name"
        ref={panelRef}
      >
        <div className="cwh-dr-top">
          <span className="cwh-label">Capitol Watch / Member</span>
          <span className="cwh-push" />
          <a
            className="cwh-link-btn"
            href={`/datasets/politician-tracker?member=${encodeURIComponent(bioguideId)}`}
          >
            Open full page
          </a>
          <button
            type="button"
            className="cwh-round"
            onClick={onClose}
            ref={closeRef}
            aria-label="Close member"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
        {state.status === 'loading' ? (
          <div className="cwh-dr-body" aria-busy="true">
            <h2 className="cwh-sr" id="cwh-dr-name">
              Loading member
            </h2>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="cwh-skel" />
            ))}
          </div>
        ) : state.status !== 'ready' ? (
          <div className="cwh-dr-body">
            <h2 className="cwh-h3" id="cwh-dr-name">
              {state.status === 'missing' ? 'Member not found' : 'Member unavailable'}
            </h2>
            <p className="cwh-empty">
              {state.status === 'missing'
                ? 'No member of Congress matches this link.'
                : 'This member could not be loaded just now. Try again in a minute.'}
            </p>
          </div>
        ) : (
          <div className="cwh-dr-body">
            <div className="cwh-dr-id">
              <span className="cwh-dr-avatar" aria-hidden="true">
                {initials(m.name)}
              </span>
              <div>
                <h2 className="cwh-dr-name" id="cwh-dr-name">
                  {m.name}
                </h2>
                <Place m={m} />
                {d.committees?.length ? (
                  <p className="cwh-dr-cmtes">
                    {d.committees.slice(0, 3).map((c) => (
                      <span key={c.id} className="cwh-chip cwh-chip--name">
                        {c.name}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            </div>
            <dl className="cwh-dr-stats">
              <div>
                <dt className="cwh-label">Trades 12M</dt>
                <dd className="cwh-mono">{count(d.stats.trades12m)}</dd>
              </div>
              <div>
                <dt className="cwh-label">Holds</dt>
                <dd className="cwh-mono">{count(d.stats.holdings)}</dd>
              </div>
              <div>
                <dt className="cwh-label">Raised</dt>
                <dd className="cwh-mono">{money(d.stats.raised)}</dd>
              </div>
              <div>
                <dt className="cwh-label">Median lag</dt>
                <dd className="cwh-mono">
                  {d.stats.medianLag == null ? DASH : `${Math.round(d.stats.medianLag)}D`}
                </dd>
              </div>
            </dl>
            <div className="cwh-dr-tabs" role="tablist" aria-label="Member">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={`cwh-dr-tab${tab === t ? ' is-active' : ''}`}
                  onClick={() => setTab(t)}
                  onKeyDown={(e) => {
                    const i = TABS.indexOf(t);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const next =
                        TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
                      setTab(next);
                      e.currentTarget.parentElement
                        ?.querySelectorAll('[role="tab"]')
                        [TABS.indexOf(next)]?.focus();
                    }
                  }}
                  tabIndex={tab === t ? 0 : -1}
                >
                  {t}
                </button>
              ))}
            </div>
            <div role="tabpanel" aria-label={tab} className="cwh-dr-panel">
              <Body d={d} tab={tab} />
            </div>
            <p className="cwh-note cwh-dr-src">
              Amounts are disclosed ranges; holdings are inferred. Sources: House Clerk, Senate eFD,
              FEC, USAspending.gov, congress-legislators.
            </p>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
