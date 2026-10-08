'use client';

/**
 * Congress's portfolio: the 16 stocks the most members hold (inferred open
 * positions) with the estimated value range across them. Party and chamber
 * filters refetch; rows open the company card.
 *
 * Compare (null | 'party' | 'chamber') swaps the list for a Venn of the
 * tickers each side holds. While comparing by party the party pills are
 * locked and the chamber pills narrow both sides, and the other way round.
 */
import { useEffect, useRef, useState } from 'react';
import { useCwh } from './CwhProvider';
import { SourceFoot } from './bits';
import { money } from './cwh-format';
import PortfolioVenn from './PortfolioVenn';

const PARTIES = [
  { id: null, label: 'All' },
  { id: 'D', label: 'Democrats' },
  { id: 'R', label: 'Republicans' },
];
const CHAMBERS = [
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
];
const COMPARES = [
  { id: 'party', label: 'Democrats vs Republicans' },
  { id: 'chamber', label: 'House vs Senate' },
];
const SIDES = {
  party: {
    a: { key: 'dem', label: 'Democrats', short: 'D' },
    b: { key: 'rep', label: 'Republicans', short: 'R' },
  },
  chamber: {
    a: { key: 'house', label: 'the House', short: 'House' },
    b: { key: 'senate', label: 'the Senate', short: 'Senate' },
  },
};

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
  const [compare, setCompare] = useState(null);
  const [region, setRegion] = useState('both');
  const [data, setData] = useState(initial);
  const [cmp, setCmp] = useState(null);
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
    if (compare) qs.set('compare', compare);
    if (party && compare !== 'party') qs.set('party', party);
    if (chamber && compare !== 'chamber') qs.set('chamber', chamber);
    fetch(`/api/datasets/capitol/portfolio?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        const out = d.ok ? d : { error: true };
        if (compare) setCmp(out);
        else setData(out);
      })
      .catch(() => live && (compare ? setCmp({ error: true }) : setData({ error: true })))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [party, chamber, compare]);

  const toggleCompare = () => {
    setCmp(null);
    setRegion('both');
    setCompare((c) => (c ? null : 'party'));
  };
  const lockParty = compare === 'party';
  const lockChamber = compare === 'chamber';
  const sides = compare ? SIDES[compare] : null;

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
        <div className="cwh-port-controls">
          <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Filter the portfolio">
            {PARTIES.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`cwh-pill${!lockParty && party === p.id ? ' is-active' : ''}`}
                aria-pressed={!lockParty && party === p.id}
                disabled={lockParty}
                title={lockParty ? 'Comparing Democrats with Republicans' : undefined}
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
                className={`cwh-pill${!lockChamber && chamber === c.id ? ' is-active' : ''}`}
                aria-pressed={!lockChamber && chamber === c.id}
                disabled={lockChamber}
                title={lockChamber ? 'Comparing the House with the Senate' : undefined}
                onClick={() => setChamber(chamber === c.id ? null : c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Compare">
            <button
              type="button"
              className={`cwh-pill${compare ? ' is-active' : ''}`}
              aria-pressed={Boolean(compare)}
              onClick={toggleCompare}
            >
              <i className="bi bi-intersect" aria-hidden="true" /> Compare
            </button>
            {compare
              ? COMPARES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`cwh-pill${compare === c.id ? ' is-active' : ''}`}
                    aria-pressed={compare === c.id}
                    onClick={() => {
                      if (compare === c.id) return;
                      setCmp(null);
                      setRegion('both');
                      setCompare(c.id);
                    }}
                  >
                    {c.label}
                  </button>
                ))
              : null}
          </div>
        </div>
      </div>
      {compare ? (
        cmp?.error ? (
          <p className="cwh-empty">
            This comparison could not be loaded just now. It refreshes on its own; try again in a
            minute.
          </p>
        ) : !cmp ? (
          <div aria-busy="true" aria-label="Comparison loading">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="cwh-skel" />
            ))}
          </div>
        ) : cmp.empty ? (
          <p className="cwh-empty">No inferred open positions match these filters.</p>
        ) : (
          <div className={busy ? 'is-busy' : undefined}>
            <PortfolioVenn data={cmp} sides={sides} region={region} onRegion={setRegion} />
            {compare === 'chamber' ? (
              <p className="cwh-caption cwh-venn-note">
                Senate coverage is thin: far fewer senators than representatives have positions on
                file, so the Senate circle is small by nature, not because senators hold less.
              </p>
            ) : null}
          </div>
        )
      ) : null}
      {compare ? null : data?.error ? (
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
        note={
          compare
            ? 'Positions are inferred from disclosures: a purchase not followed by a full sale. A ticker counts for a side when at least one of its members holds it; funds and ETFs are left out.'
            : "Positions are inferred from disclosures. Value ranges are the sum of each holder's disclosed purchase ranges, so they are estimates, not exact values."
        }
        window="Open positions today"
        sources="House Clerk, Senate eFD"
      />
    </section>
  );
}
