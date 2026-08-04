'use client';

/**
 * Aggregates strip — a single-row dotted band, visually distinct from the cards,
 * carrying the three OECD aggregate figures (OECD total · Euro Area 17 · World)
 * for the currently selected indicator. This is the ONLY place aggregates may
 * appear; they are excluded from every ranked or tabular country list. When an
 * indicator has no value for an aggregate, the figure reads em-dash. Each figure
 * raises a tooltip with the aggregate's full name, unit and year.
 */
import { useRef, useState } from 'react';
import { OECD_AGGREGATE_STRIP, OECD_SERIES_BY_SLUG } from '@/lib/oecd-curated';
import { formatValue, isProjected } from '@/lib/oecd-scales';
import { aggregate } from './oecd-explorer-model';
import OecdProjBadge from './OecdProjBadge';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

const LABELS = { OECD: 'OECD total', EA17: 'Euro area 17', W: 'World' };
const FULL = { OECD: 'OECD area total', EA17: 'Euro area (17 countries)', W: 'World' };

export default function OecdAggregates({ model, slug }) {
  const series = OECD_SERIES_BY_SLUG[slug];
  const ref = useRef(null);
  const [tip, setTip] = useState(null);

  const payloadFor = (area, cell) => ({
    title: FULL[area] || area,
    lines: [
      { label: series?.label, value: cell ? formatValue(cell.value, series) : '—' },
      { label: 'Unit', value: series?.unitLabel },
      {
        label: 'Year',
        value: cell ? `${cell.year}${isProjected(cell.year) ? ' · PROJ' : ''}` : '—',
      },
    ],
  });

  return (
    <div className="oecd-aggs" role="group" aria-label="OECD aggregate figures" ref={ref}>
      <span className="oecd-aggs-label">AGGREGATES</span>
      <div className="oecd-aggs-figs">
        {OECD_AGGREGATE_STRIP.map((area) => {
          const cell = aggregate(model, slug, area);
          return (
            <button
              type="button"
              className="oecd-agg"
              key={area}
              onMouseEnter={(e) => setTip(tipFromEvent(e, ref.current, payloadFor(area, cell)))}
              onMouseMove={(e) => setTip(tipFromEvent(e, ref.current, payloadFor(area, cell)))}
              onMouseLeave={() => setTip(null)}
              onFocus={(e) =>
                setTip(tipFromElement(e.currentTarget, ref.current, payloadFor(area, cell)))
              }
              onBlur={() => setTip(null)}
            >
              <span className="oecd-agg-name">{LABELS[area] || area}</span>
              <span className="oecd-agg-val oecd-num">
                {cell ? formatValue(cell.value, series) : '—'}
                {cell && isProjected(cell.year) ? (
                  <OecdProjBadge year={cell.year} className="oecd-proj-badge--sm" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {series?.unitLabel ? <span className="oecd-aggs-unit">{series.unitLabel}</span> : null}
      <OecdTip tip={tip} />
    </div>
  );
}
