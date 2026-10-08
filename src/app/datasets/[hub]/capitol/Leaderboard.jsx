'use client';

/**
 * Who reads contract awards best: every trader with a trade within 30 days
 * of a federal award to the same company, by type, with the insight score
 * where 30-day returns can be measured (AwardReaders, shared with tab B).
 * Quick Step badges sit next to qualifying traders; the locked badge is the
 * legend; the gold explainer says how it is earned.
 */
import QuickStepBadge from '@/components/datasets/hub/QuickStepBadge';
import AwardReaders from './AwardReaders';
import { SourceFoot } from './bits';

export default function Leaderboard({ readers, companies = [] }) {
  return (
    <section className="cwh-card cwh-lead" aria-labelledby="cwh-lead-h">
      <div className="cwh-mod-head">
        <div>
          <h2 className="cwh-h4" id="cwh-lead-h">
            Who reads contract awards best
          </h2>
          <p className="cwh-caption">
            Insight score = average 30-day return × hit rate, scaled down for small samples. Ahead
            counts trades made before the award.
          </p>
        </div>
        <QuickStepBadge kind="actor" earned={false} compact />
      </div>
      <AwardReaders readers={readers} companies={companies} compact idPrefix="cwh-lead-ar" />
      <div className="cwh-gold-note">
        <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
        <p>
          <b>Quick Step</b> is earned with 3 or more measured trades near awards, 60% or more ahead
          30 days later, averaging +5% or better. Linked brokerage accounts can track their own
          progress.
        </p>
      </div>
      <SourceFoot
        window="Trades within 30 days of an award, last 2 years"
        sources="House Clerk, Senate eFD, SEC Forms 4, 13F and 13D/G, USAspending.gov"
      />
    </section>
  );
}
