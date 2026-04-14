'use client';

/**
 * CourseVisual — single dispatcher component for all course visual types.
 * Renders an SVG or styled-HTML visualization based on the `type` prop.
 * Each visual type has its own data schema in the `data` prop.
 *
 * Supported types:
 *   - 'compound-growth'    — bar chart showing $X growing over Y years
 *   - 'diversification'    — pie/wheel showing portfolio allocation
 *   - 'risk-return'        — scatter plot of asset classes on risk/return axes
 *   - 'bar-chart'          — generic horizontal bar chart for comparisons
 *   - 'timeline'           — horizontal timeline with labeled events
 *   - 'comparison-table'   — styled side-by-side comparison (HTML, not SVG)
 */

import CompoundGrowthVisual from './CompoundGrowthVisual';
import DiversificationVisual from './DiversificationVisual';
import RiskReturnVisual from './RiskReturnVisual';
import BarChartVisual from './BarChartVisual';
import TimelineVisual from './TimelineVisual';
import ComparisonTableVisual from './ComparisonTableVisual';

export default function CourseVisual({ type, data, caption }) {
  if (!type || !data) return null;

  let rendered = null;
  switch (type) {
    case 'compound-growth':
      rendered = <CompoundGrowthVisual {...data} />;
      break;
    case 'diversification':
      rendered = <DiversificationVisual {...data} />;
      break;
    case 'risk-return':
      rendered = <RiskReturnVisual {...data} />;
      break;
    case 'bar-chart':
      rendered = <BarChartVisual {...data} />;
      break;
    case 'timeline':
      rendered = <TimelineVisual {...data} />;
      break;
    case 'comparison-table':
      rendered = <ComparisonTableVisual {...data} />;
      break;
    default:
      return null;
  }

  return (
    <figure className="course-visual">
      {rendered}
      {caption && <figcaption className="course-visual-caption">{caption}</figcaption>}
    </figure>
  );
}
