'use client';

/**
 * Data integrity & coverage. Only verifiable, system-derived measures:
 *   Sources   per source, the latest attempt and the latest SUCCESS from the
 *             run log the jobs write themselves, judged by fixed rules
 *             (insights.sourceState): a timestamp alone is never "ok".
 *   Coverage  explicit numerator / denominator meters over active records.
 *             "n/a" means not measurable yet, which is not the same as 0%.
 *   Dates     what each date on the page means.
 * Public source names and official links only; no infrastructure names.
 */
import { SOURCES, meter, sourceState } from '@/lib/sanctions/insights';
import { StateNote, fmt, shortDate, stampLabel } from './ui';

const STATE = {
  ok: { label: 'Current', icon: 'bi-check-circle' },
  stale: { label: 'Stale', icon: 'bi-clock-history' },
  failed: { label: 'Last run failed', icon: 'bi-exclamation-triangle' },
  never: { label: 'Not run yet', icon: 'bi-hourglass-split' },
  unavailable: { label: 'Unknown', icon: 'bi-question-circle' },
};

function Meter({ label, m, hint }) {
  return (
    <li className="snx-meter">
      <span className="snx-meter-label">
        {label}
        {hint ? <span className="snx-muted"> · {hint}</span> : null}
      </span>
      <span className="snx-meter-track" aria-hidden="true">
        <span style={{ width: `${m.pct ?? 0}%` }} />
      </span>
      <span className="snx-meter-val snx-mono">
        {m.pct == null ? 'n/a' : `${m.pct}%`}
        <span className="snx-muted">
          {m.n != null && m.d != null ? ` ${fmt(m.n)} / ${fmt(m.d)}` : ''}
        </span>
      </span>
    </li>
  );
}

export default function DataIntegrity({ status, coverage, summary, programsMapped, nowIso }) {
  const now = Date.parse(nowIso) || 0;
  const active = coverage?.active ?? summary.active;
  const c = coverage || {};
  const parsedKnown = coverage && coverage.parsed > 0;

  return (
    <section className="snx-card snx-dq" aria-labelledby="snx-dq-title">
      <div className="snx-card-head">
        <div>
          <h2 id="snx-dq-title" className="snx-card-title">
            Data integrity &amp; coverage
          </h2>
          <p className="snx-card-sub">
            How current and complete this page is, from the import jobs&apos; own records. Measures,
            not scores.
          </p>
        </div>
      </div>

      <div className="snx-dq-grid">
        <div>
          <h3 className="snx-dq-h">Sources</h3>
          {status === null ? (
            <StateNote kind="unavailable">
              Import history is not available, so freshness cannot be shown.
            </StateNote>
          ) : null}
          <ul className="snx-dq-sources">
            {SOURCES.map((s) => {
              const row = status ? status[s.id] || { last_attempt_at: null } : null;
              const st = sourceState(row, s, now);
              const def = STATE[st.state];
              return (
                <li key={s.id} className={`snx-dq-src is-${st.state}`}>
                  <i className={`bi ${def.icon}`} aria-hidden="true" />
                  <span className="snx-dq-src-main">
                    <span className="snx-dq-src-name">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.label}
                        </a>
                      ) : (
                        s.label
                      )}
                      <span className="snx-muted">
                        {' '}
                        · {s.files} · {s.cadence}
                      </span>
                    </span>
                    <span className="snx-dq-src-line">
                      <b>{def.label}.</b>{' '}
                      {row?.last_ok_at
                        ? `Last successful load ${stampLabel(row.last_ok_at)}${
                            row.last_ok_rows != null ? ` (${fmt(row.last_ok_rows)} rows)` : ''
                          }.`
                        : 'No successful load recorded.'}{' '}
                      {st.reason && st.state !== 'never' ? st.reason : ''}
                      {st.state === 'failed' && row?.last_note ? ` ${row.last_note}` : ''}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="snx-dq-h">Coverage of {fmt(active)} active records</h3>
          <ul className="snx-meters">
            <Meter label="Address country stated" m={meter(active - summary.noCountry, active)} />
            <Meter
              label="OFAC listing date matched"
              m={coverage ? meter(c.with_listing_date, active) : meter(null, active)}
            />
            <Meter
              label="Program codes with a curated description"
              m={meter(programsMapped.mapped, programsMapped.total)}
              hint="codes, not records"
            />
            <Meter
              label="Remarks parsed"
              m={coverage ? meter(c.parsed, active) : meter(null, active)}
            />
            <Meter
              label="At least one extracted identifier"
              m={parsedKnown ? meter(c.with_identifier, active) : meter(null, active)}
            />
            <Meter
              label="Truncated remarks restored"
              m={coverage ? meter(c.truncated_restored, c.truncated_remarks) : meter(null, null)}
              hint={coverage ? `${fmt(c.truncated_remarks)} cut at 1,000 characters` : null}
            />
          </ul>
          <p className="snx-fine">
            {coverage?.earliest_listed
              ? `Listing history runs from ${shortDate(coverage.earliest_listed)} to ${shortDate(coverage.latest_listed)}. `
              : 'Listing history is not loaded yet. '}
            Tracking began{' '}
            {shortDate(coverage?.baseline || summary.baseline) || 'with the first load'}; listings
            OFAC removed before then are not in its current files.
            {parsedKnown && c.with_unparsed
              ? ` ${fmt(c.with_unparsed)} records keep some remarks text that is shown verbatim rather than structured.`
              : ''}
          </p>
        </div>
      </div>

      <details className="snx-dq-dates">
        <summary>What the dates mean</summary>
        <dl>
          <div>
            <dt>Listed</dt>
            <dd>OFAC&apos;s own publication date for the entry, from its advanced data file.</dd>
          </div>
          <div>
            <dt>First seen</dt>
            <dd>
              The day our daily import first found the entry. Never used as a designation date.
            </dd>
          </div>
          <div>
            <dt>Removed</dt>
            <dd>
              The first daily import in which the entry was absent from OFAC&apos;s file: an
              observed removal, not OFAC&apos;s own delisting date. Check OFAC Recent Actions for
              the official notice.
            </dd>
          </div>
          <div>
            <dt>Windows</dt>
            <dd>&quot;Last 30 days&quot; means calendar days ending today (UTC).</dd>
          </div>
        </dl>
      </details>

      <p className="snx-fine">
        Source: US Treasury Office of Foreign Assets Control (OFAC), Specially Designated Nationals
        list, public domain. Identifiers, aliases from remarks, linked parties and
        secondary-sanctions notes are machine-extracted from OFAC&apos;s text and not independently
        verified; the original remarks are shown on every record. Findings only, never advice.
      </p>
    </section>
  );
}
