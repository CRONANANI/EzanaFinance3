'use client';

/**
 * The four headline cards, each answering a different question:
 *   01 Coverage       how big is the list, and how fresh
 *   02 Recency        how much OFAC listed lately (OFAC's own dates)
 *   03 Geography      how many countries, and how much has no country
 *   04 Concentration  how much of the program assignments one program holds
 * A card whose data is not loaded says so instead of showing a zero.
 */
import { concentration, pctChange } from '@/lib/sanctions/insights';
import { programMeta } from '@/lib/sanctions/programs';
import { TYPES, TypeStrip, fmt, pctOf, stampLabel } from './ui';

function Card({ step, label, value, accent, children, foot }) {
  return (
    <div className="snx-kpi" style={accent ? { '--snx-accent': accent } : undefined}>
      <span className="snx-kpi-step">
        {step} / {label}
      </span>
      <span className="snx-kpi-value">{value}</span>
      <div className="snx-kpi-body">{children}</div>
      {foot ? <span className="snx-kpi-foot">{foot}</span> : null}
    </div>
  );
}

export default function KpiCards({ summary, kpis, syncedAt }) {
  const conc = concentration(summary);
  const dated = kpis && kpis.active_dated > 0;
  const change = dated ? pctChange(kpis.listed_30, kpis.listed_prev_30) : null;
  const withCountry = summary.active - summary.noCountry;
  const largest = conc.largestProgram;

  return (
    <div className="snx-kpis">
      <Card
        step="01"
        label="Coverage"
        value={fmt(summary.active)}
        foot={
          syncedAt ? `Active OFAC records · synced ${stampLabel(syncedAt)}` : 'Active OFAC records'
        }
      >
        <TypeStrip
          counts={summary.byType}
          total={summary.active}
          label={TYPES.map((t) => `${t.long} ${pctOf(summary.byType[t.key], summary.active)}`).join(
            ', ',
          )}
        />
        <span className="snx-strip-legend">
          {TYPES.map((t) => (
            <span key={t.key}>
              <i style={{ background: t.color }} aria-hidden="true" />
              {t.label} {fmt(summary.byType[t.key])}
            </span>
          ))}
        </span>
      </Card>

      <Card
        step="02"
        label="Recency"
        accent="var(--info)"
        value={dated ? `+${fmt(kpis.listed_30)}` : 'n/a'}
        foot={dated ? 'Listed by OFAC in the last 30 days' : 'OFAC listing dates not loaded yet'}
      >
        {dated ? (
          <span className="snx-kpi-line">
            {kpis.listed_prev_30 > 0 ? (
              <>
                vs {fmt(kpis.listed_prev_30)} the 30 days before
                <em className={change >= 0 ? 'is-up' : 'is-down'}>
                  {change >= 0 ? '+' : ''}
                  {change}%
                </em>
              </>
            ) : (
              <>vs {fmt(kpis.listed_prev_30)} the 30 days before (no comparison)</>
            )}
          </span>
        ) : (
          <span className="snx-kpi-line">
            Recency uses OFAC publication dates, not our load date.
          </span>
        )}
        {dated ? (
          <span className="snx-kpi-line snx-muted">
            {fmt(kpis.listed_90)} in 90 days · {fmt(kpis.listed_365)} in 365 days
          </span>
        ) : null}
      </Card>

      <Card
        step="03"
        label="Geography"
        accent="var(--purple)"
        value={fmt(summary.countries.length)}
        foot="Address countries on active records"
      >
        <span className="snx-kpi-line">
          {pctOf(withCountry, summary.active)} of records name a country
        </span>
        <span className="snx-kpi-line snx-muted">
          {fmt(summary.noCountry)} records ({pctOf(summary.noCountry, summary.active)}) have none
        </span>
      </Card>

      <Card
        step="04"
        label="Concentration"
        accent="var(--warning)"
        value={largest?.share != null ? `${largest.share}%` : 'n/a'}
        foot="Of program assignments, largest program"
      >
        {largest ? (
          <span className="snx-kpi-line" title={programMeta(largest.code).label}>
            <b className="snx-mono">{largest.code}</b> · {fmt(largest.total)} of{' '}
            {fmt(conc.programAssignments)}
          </span>
        ) : null}
        <span className="snx-kpi-line snx-muted">
          Records average {conc.multiProgramRatio ?? 'n/a'} programs, so shares overlap
        </span>
      </Card>
    </div>
  );
}
