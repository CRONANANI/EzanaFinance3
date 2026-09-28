'use client';

/**
 * Politician Tracker: House and Senate financial disclosures on ONE page.
 *
 * This is only the chamber switch. Everything below it is DisclosuresPage,
 * fed the chamber's config from chamber-config.js, so the two chambers keep
 * sharing a single implementation and the page still never branches on
 * `chamber`. The page is re-keyed on the chamber so filters, tabs and
 * in-flight fetches reset cleanly rather than leaking House state into the
 * Senate view.
 *
 * The active chamber lives in `?chamber=`, which keeps each view linkable and
 * lets the old /datasets/{house,senate}/disclosures URLs redirect straight to
 * the right side of the switch. replaceState, not push: toggling is changing
 * a view, not navigating, and pushing would turn the back button into a walk
 * back through every toggle instead of a way off the page.
 */
import { useCallback, useState } from 'react';
import DisclosuresPage from './DisclosuresPage';
import { CHAMBERS, CHAMBER_ORDER, SAMPLE_CHAMBERS } from './chamber-config';

export default function PoliticianTracker({ initialChamber = 'house' }) {
  const [chamber, setChamber] = useState(
    CHAMBERS[initialChamber] ? initialChamber : CHAMBER_ORDER[0],
  );

  const select = useCallback((next) => {
    setChamber(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('chamber', next);
    /* Keep the existing history state: this is the same entry, re-labelled,
       and dropping it would strip whatever the router put there. */
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  }, []);

  /* role="group" with aria-pressed, matching the four other .dsc-seg controls
     on this page, rather than a tablist.

     A tablist is a promise: screen readers announce "tab, 1 of 2" and expect
     arrow-key roving between tabs and an aria-controls link to a tabpanel.
     None of that exists here — the switch re-keys the whole page rather than
     revealing a panel — so claiming the role would describe a pattern that
     is not implemented. A pair of toggle buttons is what this actually is,
     and it is what the rest of the sheet already uses. */
  const toggle = (
    <div className="dsc-seg dsc-chamber" role="group" aria-label="Chamber">
      {CHAMBER_ORDER.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={chamber === id}
          className={`dsc-seg-btn${chamber === id ? ' is-on' : ''}`}
          onClick={() => select(id)}
        >
          {CHAMBERS[id].label.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <DisclosuresPage
      key={chamber}
      config={CHAMBERS[chamber]}
      sample={SAMPLE_CHAMBERS.has(chamber)}
      headerAside={toggle}
    />
  );
}
