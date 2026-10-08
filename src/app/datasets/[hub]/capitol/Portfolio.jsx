'use client';

/**
 * Congress's portfolio: the 16 stocks the most members hold (inferred open
 * positions) with the estimated value range across them. Party and chamber
 * filters refetch; rows open the company card.
 */
import { useEffect, useRef, useState } from 'react';
import { useCwh } from './CwhProvider';
import { SourceFoot } from './bits';
import { money } from './cwh-format';

const PARTIES = [
  { id: null, label: 'All' },
  { id: 'D', label: 'Democrats' },
  { id: 'R', label: 'Republicans' },
];
const CHAMBERS = [
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
];

function Column({ rows, max }) {
  const { openCompany } = useCwh();
  return (
    <div className="cwh-port-col">
      <div className="cwh-port-row cwh-port-row--head" aria-hidden="true">
        <span>#</span>
        <span>TICKER</span>
        <span>MEMBERS HOLDING</span>
        <span />
        <span className="is-num">EST. VALUE</span>
      </div>
      {rows.map((r) => (
        <button
          key={r.ticker}
          type="button"
          className="cwh-port-row"
          onClick={() => openCompany({ ticker: r.ticker })}
          aria-label={`${r.ticker}: ${r.members} members, estimated ${money(r.estLow)} to ${money(r.estHigh)}`}
        >
          <span className="cwh-mono cwh-faint">{String(r.rank).padStart(2, '0')}</span>
          <span className="cwh-mono cwh-strong">{r.ticker}</span>
          <span className="cwh-port-bar" aria-hidden="true">
            <i style={{ width: `${max ? (r.members / max) * 100 : 0}%` }} />
          </span>
          <span className="cwh-mono cwh-port-n">
            <b>{r.members}</b> <span className="cwh-faint">members</span>
          </span>
          <span className="cwh-mono cwh-mute is-num">
            {money(r.estLow)} to {money(r.estHigh)}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Portfolio({ initial }) {
  const [party, setParty] = useState(null);
  const [chamber, setChamber] = useState(null);
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    let live = true;
    setBusy(true);
    const qs = new URLSearchParams();
    if (party) qs.set('party', party);
    if (chamber) qs.set('chamber', chamber);
    fetch(`/api/datasets/capitol/portfolio?${qs}`)
      .then((r) => r.json())
      .then((d) => live && setData(d.ok ? d : { error: true }))
      .catch(() => live && setData({ error: true }))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [party, chamber]);

  const rows = data?.rows || [];
  const max = data?.maxMembers || 0;

  return (
    <section
      className="cwh-section cwh-card cwh-port"
      aria-labelledby="cwh-port-h"
      aria-busy={busy}
    >
      <div className="cwh-mod-head">
        <div>
          <h2 className="cwh-h3" id="cwh-port-h">
            Congress&apos;s portfolio
          </h2>
          <p className="cwh-caption">
            The stocks most widely held across Congress, from inferred open positions, with the
            estimated value range across members.
          </p>
        </div>
        <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Filter the portfolio">
          {PARTIES.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`cwh-pill${party === p.id ? ' is-active' : ''}`}
              aria-pressed={party === p.id}
              onClick={() => setParty(p.id)}
            >
              {p.label}
            </button>
          ))}
          <span className="cwh-vdiv" aria-hidden="true" />
          {CHAMBERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cwh-pill${chamber === c.id ? ' is-active' : ''}`}
              aria-pressed={chamber === c.id}
              onClick={() => setChamber(chamber === c.id ? null : c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {data?.error ? (
        <p className="cwh-empty">
          This signal could not be loaded just now. It refreshes on its own; reload in a minute.
        </p>
      ) : !rows.length ? (
        <p className="cwh-empty">No inferred open positions match these filters.</p>
      ) : (
        <div className={`cwh-port-cols${busy ? ' is-busy' : ''}`}>
          <Column rows={rows.slice(0, 8)} max={max} />
          {rows.length > 8 ? <Column rows={rows.slice(8, 16)} max={max} /> : null}
        </div>
      )}
      <SourceFoot
        note="Positions are inferred from disclosures. Value ranges are the sum of each holder's disclosed purchase ranges, so they are estimates, not exact values."
        window="Open positions today"
        sources="House Clerk, Senate eFD"
      />
    </section>
  );
}
