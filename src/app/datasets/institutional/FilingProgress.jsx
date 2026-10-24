'use client';

/**
 * The 13F filing-season indicator: filed vs expected filers for the current
 * period, a dashed marker at last quarter's pace on the same day, the
 * effective (business-day) deadline, and the freshness of the ingest. Every
 * figure comes resolved from the server (filing-progress-model.js); this
 * component only lays it out. After the deadline it reads "Season closed".
 */
import { int, pct, quarterShort } from '@/lib/titans/format';

const monthDay = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : '·';
const timeET = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })} ET`;
};

const PACE_WORD = { ahead: 'ahead of pace', on_pace: 'on pace', behind: 'behind pace' };
const TIP =
  'Most managers file in the final days before the 45-day deadline, so this bar climbs steeply near the deadline.';

export default function FilingProgress({ progress }) {
  if (!progress || progress.pct == null) return null;
  const q = quarterShort(progress.period);
  const pctLabel = pct(progress.pct * 100, 1);
  const over = progress.pct > 1;
  const rolled = progress.deadline !== progress.deadlineNominal;

  return (
    <section className="inst-fp" aria-labelledby="inst-fp-h">
      <p className="inst-fp-top">
        <span id="inst-fp-h" className="inst-fp-title">
          {q} 13F season
        </span>
        <span className="inst-mono inst-muted">
          {progress.closed
            ? `closed ${monthDay(progress.deadline)}`
            : `deadline ${monthDay(progress.deadline)} · ${int(progress.daysLeft)} days left`}
        </span>
      </p>

      <div
        className="inst-fp-bar"
        role="img"
        title={over ? `${TIP} Raw value ${pctLabel}.` : TIP}
        aria-label={`${pctLabel} of the filers expected for ${q} have filed${
          progress.pacingPct != null
            ? `; last quarter at this point ${pct(progress.pacingPct * 100, 1)}`
            : ''
        }. ${TIP}`}
      >
        <span className="inst-fp-fill" style={{ width: `${progress.barPct * 100}%` }} />
        {progress.pacingPct != null ? (
          <span
            className="inst-fp-pace"
            style={{ left: `${Math.min(1, progress.pacingPct) * 100}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>

      <p className="inst-fp-line">
        {progress.closed ? (
          <>
            Season closed · <strong className="inst-mono">{pctLabel}</strong> of last quarter&apos;s
            filers reported
          </>
        ) : (
          <>
            <strong className="inst-mono">{pctLabel}</strong>
            <span className="inst-muted"> · </span>
            <span className="inst-mono">
              {int(progress.filed)} of {int(progress.expected)}
            </span>{' '}
            filers filed*
          </>
        )}
      </p>

      {!progress.closed ? (
        <p className="inst-fp-line inst-muted">
          {progress.pacingPct != null ? (
            <>
              Last quarter at this point:{' '}
              <span className="inst-mono">{pct(progress.pacingPct * 100, 1)}</span>
              {progress.pacing ? <> · {PACE_WORD[progress.pacing]}</> : null}
            </>
          ) : (
            <>
              Last quarter at this point: not on record
              {progress.priorCoverageStart
                ? ` (our ${quarterShort(progress.prior)} records start ${monthDay(progress.priorCoverageStart)})`
                : ''}
            </>
          )}
        </p>
      ) : null}

      <p className="inst-fp-foot">
        {timeET(progress.lastIngestedAt) ? `Updated ${timeET(progress.lastIngestedAt)} · ` : ''}
        *expected = filers last quarter
        {rolled
          ? ` · day 45 (${monthDay(progress.deadlineNominal)}) is not a business day, so filings are due ${monthDay(progress.deadline)}`
          : ''}
        {progress.stale ? <span className="inst-fp-stale"> · data may be delayed</span> : null}
      </p>
    </section>
  );
}
