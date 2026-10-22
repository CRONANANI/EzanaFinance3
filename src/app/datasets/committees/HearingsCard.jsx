'use client';

/**
 * Card 9, Hearings. The shipped default IS the not-yet-available state:
 * dates and committees are still being ingested, so no rows render and the
 * populated layout stays unreachable while hearingsAvailable is false. The
 * component takes no rows on purpose; wire /api/congress/meetings here only
 * once the ingest carries dates and committees.
 */
import { hearingsAvailable } from '@/lib/congress/committees-page-model';

const GHOST_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export default function HearingsCard({ onProfile }) {
  // No fetch: today's rows carry no date or committee (see 07-DATA-INVENTORY).
  const available = hearingsAvailable([]);
  if (available) return null; // the populated layout lands with the ingest fix
  return (
    <section id="cmx-hearings" className="cmx-card cmx-card--fill">
      <header className="cmx-head">
        <div className="cmx-head-main">
          <h2 className="cmx-title">Hearings</h2>
          <p className="cmx-sub cmx-mono">NEXT 14 DAYS</p>
        </div>
      </header>
      <div className="cmx-body cmx-hearings">
        <div className="cmx-hearings-msg" role="status">
          <i className="bi bi-calendar3" aria-hidden="true" />
          <p className="cmx-hearings-head">Hearing schedules are not available yet.</p>
          <p className="cmx-hearings-detail">
            Dates and committees are still being ingested. Until then, each committee profile links
            to its official site for its calendar.
          </p>
          <button type="button" className="cmx-link" onClick={onProfile}>
            Open the committee profile
          </button>
        </div>
        <div className="cmx-hearings-ghost" aria-hidden="true">
          {GHOST_DAYS.map((d) => (
            <div key={d} className="cmx-ghost-row">
              <span className="cmx-mono">{d}</span>
              <span className="cmx-ghost-slot" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
