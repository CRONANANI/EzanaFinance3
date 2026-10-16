'use client';

/**
 * The four headline measures, folded into the Sanctions landscape card as one
 * compact strip (they were four separate cards above the page until Oct 15):
 *   Listings       active OFAC records, entry-type mix, last sync
 *   Last 30 days   listed by OFAC (OFAC's own dates) against the 30 before
 *   Countries      address countries, and how many records name none
 *   Largest program  its share of program assignments (shares overlap)
 * A measure whose data is not loaded says so instead of showing a zero.
 */
import { concentration, pctChange } from '@/lib/sanctions/insights';
import { programMeta } from '@/lib/sanctions/programs';
import { TYPES, TypeStrip, fmt, pctOf, stampLabel } from './ui';

function Stat({ label, value, children }) {
  return (
    <div className="snx-lstat">
      <dt className="snx-lstat-label">{label}</dt>
      <dd className="snx-lstat-value">{value}</dd>
      <dd className="snx-lstat-body">{children}</dd>
    </div>
  );
}

export default function LandscapeStats({ summary, kpis, syncedAt }) {
  const conc = concentration(summary);
  const dated = kpis && kpis.active_dated > 0;
  const change = dated ? pctChange(kpis.listed_30, kpis.listed_prev_30) : null;
  const withCountry = summary.active - summary.noCountry;
  const largest = conc.largestProgram;

  return (
    <dl className="snx-lstats">
      <Stat label="Active listings" value={fmt(summary.active)}>
        <TypeStrip
          counts={summary.byType}
          total={summary.active}
          label={TYPES.map((t) => `${t.long} ${pctOf(summary.byType[t.key], summary.active)}`).join(
            ', ',
          )}
        />
        <span className="snx-lstat-line">
          {TYPES.map((t) => `${fmt(summary.byType[t.key])} ${t.label.toLowerCase()}`).join(' · ')}
        </span>
        {syncedAt ? (
          <span className="snx-lstat-line snx-muted">Synced {stampLabel(syncedAt)}</span>
        ) : null}
      </Stat>

      <Stat label="Listed, last 30 days" value={dated ? `+${fmt(kpis.listed_30)}` : 'n/a'}>
        {dated ? (
          <span className="snx-lstat-line">
            vs {fmt(kpis.listed_prev_30)} the 30 days before
            {change != null ? (
              <em className={change >= 0 ? 'is-up' : 'is-down'}>
                {change >= 0 ? '+' : ''}
                {change}%
              </em>
            ) : null}
          </span>
        ) : (
          <span className="snx-lstat-line">OFAC listing dates are not loaded yet.</span>
        )}
        {dated ? (
          <span className="snx-lstat-line snx-muted">
            {fmt(kpis.listed_90)} in 90 days · {fmt(kpis.listed_365)} in 365
          </span>
        ) : null}
      </Stat>

      <Stat label="Countries" value={fmt(summary.countries.length)}>
        <span className="snx-lstat-line">
          {pctOf(withCountry, summary.active)} of records name one
        </span>
        <span className="snx-lstat-line snx-muted">{fmt(summary.noCountry)} records name none</span>
      </Stat>

      <Stat label="Largest program" value={largest?.share != null ? `${largest.share}%` : 'n/a'}>
        {largest ? (
          <span className="snx-lstat-line" title={programMeta(largest.code).label}>
            <b className="snx-mono">{largest.code}</b> of {fmt(conc.programAssignments)} assignments
          </span>
        ) : null}
        <span className="snx-lstat-line snx-muted">A record can sit under several programs</span>
      </Stat>
    </dl>
  );
}
