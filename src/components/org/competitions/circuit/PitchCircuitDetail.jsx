import Link from 'next/link';
import { Badge } from '@/components/ds';
import {
  VERIFIED_ON,
  REGION_LABEL,
  MODE_LABEL,
  KIND_LABEL,
  circuitStatus,
  statusMeta,
  fmtDate,
  fmtRange,
  daysBetween,
} from '@/lib/competitions/pitch-circuit';
import './pitch-circuit.css';

const NP = 'Not published';

function Fact({ icon, label, value, wide }) {
  return (
    <div className={`pcc-card pcc-dfact${wide ? ' pcc-dfact--wide' : ''}`}>
      <span className="pcc-kicker">
        <i className={`bi ${icon}`} aria-hidden="true" /> {label}
      </span>
      <p className={`pcc-dfact-value${value ? '' : ' is-empty'}`}>{value || NP}</p>
    </div>
  );
}

/** Server-rendered detail page for one Pitch Circuit entry. */
export function PitchCircuitDetail({ entry, todayIso }) {
  const status = circuitStatus(entry, todayIso);
  const meta = statusMeta(entry, status);
  const isTba = status.state === 'tba';

  return (
    <div className="pcc-page">
      <Link href="/org-competitions/circuit" className="pcc-back">
        <i className="bi bi-arrow-left" aria-hidden="true" /> Pitch Circuit
      </Link>

      <header className="pcc-card pcc-hero">
        <div className="pcc-hero-main">
          <p className="pcc-eyebrow">
            <i className="bi bi-signpost-split" aria-hidden="true" /> {KIND_LABEL[entry.kind]}
          </p>
          <h1 className="pcc-h1">{entry.name}</h1>
          {entry.alsoKnownAs ? <p className="pcc-aka">Also known as {entry.alsoKnownAs}</p> : null}
          <p className="pcc-lead">{entry.summary}</p>
          <div className="pcc-hero-badges">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Badge tone="neutral" icon="bi-geo-alt">
              {REGION_LABEL[entry.region]}
            </Badge>
            {entry.finalsMode ? (
              <Badge
                tone="neutral"
                icon={entry.finalsMode === 'virtual' ? 'bi-camera-video' : 'bi-building'}
              >
                {MODE_LABEL[entry.finalsMode]}
              </Badge>
            ) : null}
          </div>
        </div>
        <aside className="pcc-hero-side" aria-label="At a glance">
          <dl className="pcc-glance">
            <div>
              <dt>Host</dt>
              <dd>{entry.host}</dd>
            </div>
            <div>
              <dt>Partner</dt>
              <dd>{entry.partner || NP}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>{entry.location}</dd>
            </div>
            {status.next ? (
              <div>
                <dt>Next</dt>
                <dd>
                  {status.next.label},{' '}
                  <span className="pcc-mono">
                    {fmtRange(status.next.date, status.next.endDate)}
                  </span>
                  <span className="pcc-glance-count">
                    {Math.max(daysBetween(todayIso, status.next.date), 0)} days away
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
          <a
            className="ds-btn ds-btn--primary ds-btn--block"
            href={entry.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-box-arrow-up-right" aria-hidden="true" /> Official site
          </a>
          {entry.kind === 'competition' ? (
            <Link href="/org-team-hub/pitches" className="ds-btn ds-btn--secondary ds-btn--block">
              <i className="bi bi-lightbulb" aria-hidden="true" /> Draft a pitch in Pitch Pipeline
            </Link>
          ) : null}
        </aside>
      </header>

      <div className="pcc-dfacts">
        <Fact icon="bi-person-check" label="Eligibility" value={entry.eligibility} wide />
        <Fact icon="bi-people" label="Team size" value={entry.teamSize} />
        <Fact
          icon="bi-cash-coin"
          label="Entry fee"
          value={entry.entryFee || (entry.kind === 'award' ? 'None' : null)}
        />
        <Fact
          icon="bi-funnel"
          label={entry.kind === 'award' ? 'Application' : 'Idea rules'}
          value={entry.ideaRules}
          wide
        />
        <Fact icon="bi-award" label="Prizes" value={entry.prizes} wide />
      </div>

      <div className="pcc-detail-cols">
        <section className="pcc-card" aria-labelledby="pcc-timeline-title">
          <header className="pcc-card-head">
            <div>
              <p className="pcc-kicker">{entry.edition}</p>
              <h2 id="pcc-timeline-title" className="pcc-card-title">
                {isTba ? 'Last published timeline' : 'Timeline'}
              </h2>
            </div>
          </header>
          {isTba ? (
            <p className="pcc-callout">
              <i className="bi bi-calendar-x" aria-hidden="true" /> The organizer has not published
              the next edition yet. These dates show when the last one ran, which is a reliable
              guide to the season.
            </p>
          ) : null}
          <ol className="pcc-timeline">
            {entry.keyDates.map((d) => {
              const done = (d.endDate || d.date) < todayIso;
              const isNext = status.next && status.next === d;
              return (
                <li
                  key={d.label}
                  className={`pcc-tl-item${done ? ' is-done' : ''}${isNext ? ' is-next' : ''}`}
                >
                  <span className="pcc-tl-dot" aria-hidden="true" />
                  <span className="pcc-tl-date">{fmtRange(d.date, d.endDate)}</span>
                  <span className="pcc-tl-label">
                    {d.label}
                    {isNext ? <span className="pcc-sr"> (next)</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="pcc-card" aria-labelledby="pcc-rounds-title">
          <header className="pcc-card-head">
            <div>
              <p className="pcc-kicker">Format</p>
              <h2 id="pcc-rounds-title" className="pcc-card-title">
                {entry.kind === 'award' ? 'How it is judged' : 'How the rounds work'}
              </h2>
            </div>
          </header>
          {entry.rounds.length ? (
            <ol className="pcc-rounds">
              {entry.rounds.map((r, i) => (
                <li key={r.name} className="pcc-round">
                  <span className="pcc-round-n">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="pcc-round-name">{r.name}</p>
                    <p className="pcc-round-detail">{r.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="pcc-empty">
              The organizer has not published round details. Check the official site for the current
              rules.
            </p>
          )}
        </section>
      </div>

      <section className="pcc-card pcc-sources" aria-labelledby="pcc-sources-title">
        <h2 id="pcc-sources-title" className="pcc-kicker">
          Sources, verified {fmtDate(VERIFIED_ON)}
        </h2>
        <ul>
          {entry.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label} <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
