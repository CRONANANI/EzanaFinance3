'use client';

/**
 * The member route rendered as a full page.
 *
 * Same component and same data as the panel; only the mode differs. This is
 * what makes the panel's URL real rather than decorative: pasting it, or
 * loading it cold, gives the profile rather than a redirect back to the list.
 */
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import MemberProfile from './MemberProfile';
import { memberFromTrades, memberSlug } from './DisclosuresPage';
import { FIXTURE_TRADES } from './fixture';
import './disclosures.css';

export default function MemberRoute({ config, slug, trades = FIXTURE_TRADES, sample = true }) {
  /* The chrome is mounted by the layout; this page publishes no ticker of its
     own, which clears whatever the list page left behind. */
  usePublishTicker({});

  const name = trades.map((t) => t.member).find((m) => memberSlug(m) === slug);
  const member = name ? memberFromTrades(name, trades, config) : null;

  return (
    <div className="dsc">
      <header className="dsc-head">
        <p className="dsc-eyebrow">
          {config.eyebrow}
          {sample ? <span className="dsc-sample">SAMPLE DATA</span> : null}
        </p>
        <h1 className="dsc-title">{config.title}</h1>
      </header>

      {member ? (
        <MemberProfile member={member} config={config} mode="page" />
      ) : (
        /* Honest about what is missing rather than a generic not-found: the
           slug may simply have no filings in the current data. */
        <div className="dsc-profile-page">
          <p className="dsc-note">
            No filings found for this member. They may not have filed in the years loaded so far.
          </p>
          <p>
            <a className="dsc-btn dsc-btn--ghost" href={config.routes.page}>
              Back to {config.title.toLowerCase()}
            </a>
          </p>
        </div>
      )}

      <div className="dsc-body">
        <div />
        <p className="dsc-compliance">{config.compliance}</p>
      </div>
    </div>
  );
}
