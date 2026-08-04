'use client';

/**
 * Aggregates strip — a dotted-outline band, visually distinct from the cards,
 * carrying the three OECD aggregate figures (OECD total · Euro Area 17 · World)
 * for the currently selected indicator. This is the ONLY place aggregates may
 * appear; they are excluded from every ranked or tabular country list. When an
 * indicator has no value for an aggregate, the figure reads em-dash.
 */
import { OECD_AGGREGATE_STRIP, OECD_SERIES_BY_SLUG } from '@/lib/oecd-curated';
import { formatValue, isProjected } from '@/lib/oecd-scales';
import { aggregate } from './oecd-explorer-model';
import OecdProjBadge from './OecdProjBadge';

const LABELS = { OECD: 'OECD total', EA17: 'Euro area 17', W: 'World' };

export default function OecdAggregates({ model, slug }) {
  const series = OECD_SERIES_BY_SLUG[slug];

  return (
    <div className="oecd-aggs" role="group" aria-label="OECD aggregate figures">
      <span className="oecd-aggs-label">AGGREGATES</span>
      <div className="oecd-aggs-figs">
        {OECD_AGGREGATE_STRIP.map((area) => {
          const cell = aggregate(model, slug, area);
          return (
            <div className="oecd-agg" key={area}>
              <span className="oecd-agg-name">{LABELS[area] || area}</span>
              <span className="oecd-agg-val oecd-num">
                {cell ? formatValue(cell.value, series) : '—'}
                {cell && isProjected(cell.year) ? (
                  <OecdProjBadge year={cell.year} className="oecd-proj-badge--sm" />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      {series?.unitLabel ? <span className="oecd-aggs-unit">{series.unitLabel}</span> : null}
    </div>
  );
}
