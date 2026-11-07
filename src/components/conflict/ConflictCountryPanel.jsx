'use client';

/**
 * One country's organized violence picture (UCDP GED), shared by the Armed Conflict Tracker's
 * country panel and Sonar's country answers: KPI tiles, the monthly chart by type, the
 * deadliest conflicts, the most active parties and the latest events. Every figure comes from
 * the ucdp_country read (src/lib/ucdp/view.js shapes it). Findings only.
 *
 *   data       the ucdp_country payload
 *   compact    Sonar: fewer rows, no latest-events list
 *   href       optional link to the full tracker for this country
 *   onClose    optional close button (the tracker)
 */
import Link from 'next/link';
import ConflictMonthlyChart from './ConflictMonthlyChart';
import {
  ATTRIBUTION,
  TYPE_BY_ID,
  countryKpis,
  dayLabel,
  fmt,
  preliminaryFrom,
  monthLabel,
} from '@/lib/ucdp/view';
import './conflict.css';

export default function ConflictCountryPanel({
  data,
  compact = false,
  href = null,
  onClose = null,
  headingId,
}) {
  if (!data?.kpis) return null;
  const kpis = countryKpis(data);
  const prelim = preliminaryFrom(data.monthly);
  const conflicts = (data.conflicts || []).slice(0, compact ? 4 : 8);
  const actors = (data.actors || []).slice(0, compact ? 4 : 8);
  return (
    <div className="cfc-panel">
      <div className="cfc-head">
        <div>
          <h3 className="cfc-title" id={headingId}>
            {data.country || data.iso3}: organized violence
          </h3>
          <p className="cfc-sub">
            12 months to {dayLabel(data.window?.to)}
            {data.region ? ` · ${data.region}` : ''}
            {prelim ? ` · preliminary from ${monthLabel(prelim, true)}` : ''}
          </p>
        </div>
        {onClose ? (
          <button type="button" className="cfc-close" onClick={onClose} aria-label="Close country">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <ul className="cfc-kpis">
        {kpis.map((k) => (
          <li key={k.id} className="cfc-kpi">
            <span className="cfc-kpi-label">{k.label}</span>
            <span className="cfc-kpi-value">{k.value}</span>
            {k.delta ? (
              <span className={`cfc-delta ${k.delta.up ? 'is-up' : 'is-down'}`}>
                {k.delta.text}
              </span>
            ) : null}
            {k.sub ? <span className="cfc-kpi-sub">{k.sub}</span> : null}
          </li>
        ))}
      </ul>

      <ConflictMonthlyChart
        monthly={data.monthly}
        months={compact ? 24 : 36}
        height={compact ? 160 : 200}
        label={`${data.country || data.iso3}: monthly deaths in organized violence by type`}
      />

      <div className={`cfc-lists${compact ? ' is-compact' : ''}`}>
        <section>
          <h4 className="cfc-h">Deadliest conflicts</h4>
          <ol className="cfc-rows">
            {conflicts.map((c) => (
              <li key={c.id}>
                <span className="cfc-row-name">
                  {c.name}
                  <small className={`cfc-type is-${TYPE_BY_ID[c.type]?.tone}`}>
                    {TYPE_BY_ID[c.type]?.label}
                  </small>
                </span>
                <span className="cfc-mono">{fmt(c.best)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h4 className="cfc-h">Most active parties</h4>
          <ol className="cfc-rows">
            {actors.map((a) => (
              <li key={a.actor}>
                <span className="cfc-row-name">{a.actor}</span>
                <span className="cfc-mono">{fmt(a.best)}</span>
              </li>
            ))}
          </ol>
        </section>
        {!compact && data.latest?.length ? (
          <section className="cfc-latest">
            <h4 className="cfc-h">Latest recorded events</h4>
            <ol className="cfc-events">
              {data.latest.slice(0, 10).map((e, i) => (
                <li key={`${e.date_end}-${i}`}>
                  <span className="cfc-mono cfc-ev-date">{dayLabel(e.date_end)}</span>
                  <span className="cfc-ev-body">
                    <b>{e.where_description || e.adm_1 || 'Location not given'}</b>
                    <small>
                      {e.dyad_name} · {TYPE_BY_ID[e.type]?.label}
                      {e.preliminary ? ' · preliminary' : ''}
                    </small>
                  </span>
                  <span className="cfc-mono">{fmt(e.best)}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <p className="cfc-foot">
        Deaths are UCDP best estimates; the range is UCDP&apos;s low to high estimate. {ATTRIBUTION}
        {href ? (
          <>
            {' '}
            <Link href={href} className="cfc-link">
              Open in the Armed Conflict Tracker
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
