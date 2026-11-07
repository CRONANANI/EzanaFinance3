'use client';

/**
 * Smaller cards for the Armed Conflict Tracker: fastest-rising countries, the deadliest
 * conflicts, deaths by region, and About this data (definitions, releases, attribution).
 */
import {
  ATTRIBUTION,
  TYPE_BY_ID,
  TYPE_DEFINITIONS,
  TYPES,
  changeText,
  dayLabel,
  fmt,
  pctChange,
} from '@/lib/ucdp/view';

export function RisingCard({ rows, selected, onPick }) {
  return (
    <section className="cfx-card cfx-rising" aria-labelledby="cfx-rising-h">
      <div className="cfx-card-head">
        <h2 className="cfx-card-title" id="cfx-rising-h">
          Fastest rising
        </h2>
      </div>
      <p className="cfx-note">
        Deaths over the last 12 months against the 12 before, countries with 100 or more.
      </p>
      {rows.length ? (
        <ol className="cfx-rise-list">
          {rows.map((r) => (
            <li key={r.iso3}>
              <button
                type="button"
                className={`cfx-rise-row${selected === r.iso3 ? ' is-on' : ''}`}
                aria-pressed={selected === r.iso3}
                onClick={() => onPick(r.iso3)}
              >
                <span className="cfx-rise-name">
                  <b>{r.country}</b>
                  <small>
                    {fmt(r.prior)} to {fmt(r.best)}
                  </small>
                </span>
                <span className="cfx-mono is-worse">{changeText(r.change)}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cfx-note">No country with 100 or more deaths rose against the prior year.</p>
      )}
    </section>
  );
}

export function ConflictsCard({ conflicts = [] }) {
  return (
    <section className="cfx-card" aria-labelledby="cfx-conf-h">
      <div className="cfx-card-head">
        <h2 className="cfx-card-title" id="cfx-conf-h">
          Deadliest conflicts, last 12 months
        </h2>
      </div>
      <ol className="cfx-conf-list">
        {conflicts.slice(0, 10).map((c) => {
          const ch = pctChange(c.best, c.prior);
          return (
            <li key={c.id} className="cfx-conf">
              <span className="cfx-conf-main">
                <b>{c.name}</b>
                <small>
                  <span className={`cfx-type is-${TYPE_BY_ID[c.type]?.tone}`}>
                    {TYPE_BY_ID[c.type]?.label}
                  </span>
                  {` · ${(c.countries || []).filter(Boolean).join(', ')} · ${fmt(c.dyads)} pairing${c.dyads === 1 ? '' : 's'} · last event ${dayLabel(c.last_event)}`}
                </small>
              </span>
              <span className="cfx-conf-num">
                <span className="cfx-mono">{fmt(c.best)}</span>
                <small className="cfx-mono">
                  {fmt(c.low)} to {fmt(c.high)}
                </small>
                <small
                  className={`cfx-mono ${ch == null ? '' : ch >= 0 ? 'is-worse' : 'is-better'}`}
                >
                  {changeText(ch)}
                </small>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function RegionsCard({ regions = [] }) {
  const max = Math.max(1, ...regions.map((r) => Math.max(r.best, r.prior)));
  return (
    <section className="cfx-card" aria-labelledby="cfx-reg-h">
      <div className="cfx-card-head">
        <h2 className="cfx-card-title" id="cfx-reg-h">
          Deaths by region
        </h2>
        <span className="cfx-chip">Last 12 months vs prior</span>
      </div>
      <ul className="cfx-reg-list">
        {regions.map((r) => (
          <li key={r.region}>
            <span className="cfx-reg-name">{r.region}</span>
            <span
              className="cfx-reg-bars"
              aria-label={`${r.region}: ${fmt(r.best)} deaths, ${fmt(r.prior)} the year before`}
            >
              <span className="cfx-reg-bar is-cur" style={{ width: `${(r.best / max) * 100}%` }} />
              <span
                className="cfx-reg-bar is-prior"
                style={{ width: `${(r.prior / max) * 100}%` }}
              />
            </span>
            <span className="cfx-mono">{fmt(r.best)}</span>
          </li>
        ))}
      </ul>
      <div className="cfx-legend">
        <span className="cfx-key is-cur">Last 12 months</span>
        <span className="cfx-key is-prior">Prior 12 months</span>
      </div>
    </section>
  );
}

export function AboutCard({ overview }) {
  const versions = overview.versions || [];
  return (
    <section className="cfx-card cfx-about" aria-labelledby="cfx-about-h">
      <div className="cfx-card-head">
        <h2 className="cfx-card-title" id="cfx-about-h">
          About this data
        </h2>
      </div>
      <div className="cfx-about-grid">
        <div>
          <h3 className="cfx-h">What is counted</h3>
          <ul className="cfx-defs">
            {TYPES.map((t) => (
              <li key={t.id}>
                <span className={`cfx-key is-${t.tone}`}>{t.long}</span>
                <span>{TYPE_DEFINITIONS[t.id]}</span>
              </li>
            ))}
          </ul>
          <p className="cfx-note">
            Deaths are UCDP&apos;s best estimates, with its low and high estimates as the range. An
            active conflict is one with at least 25 battle-related deaths in the last 12 months; war
            level is 1,000 or more. Events are dated by when they ended.
          </p>
        </div>
        <div>
          <h3 className="cfx-h">Releases in use</h3>
          <ul className="cfx-releases">
            {versions.map((v) => (
              <li key={v.version}>
                <span className="cfx-mono">{v.version}</span>
                <span>
                  {v.preliminary
                    ? 'Monthly release (preliminary, revised later)'
                    : 'Annual release'}
                  : {dayLabel(v.first_date)} to {dayLabel(v.last_date)}, {fmt(v.events)} events
                </span>
              </li>
            ))}
          </ul>
          <p className="cfx-note">
            Refreshed weekly. The most recent months come from UCDP&apos;s monthly release and are
            revised when the annual release replaces them; they are hatched on the charts.
          </p>
          <p className="cfx-note">
            Source: {ATTRIBUTION} Sundberg and Melander (2013), Journal of Peace Research.
          </p>
        </div>
      </div>
    </section>
  );
}
