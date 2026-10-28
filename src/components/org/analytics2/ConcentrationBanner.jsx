'use client';

import { pct } from './format';

/**
 * Amber banner on an IPS max_sector_pct breach; a subtle "within limits"
 * confirmation when healthy. Renders nothing when there is no IPS rule
 * (`source: 'none'`) — we never invent a limit.
 */
export function ConcentrationBanner({ data }) {
  if (!data || data.source === 'none') return null;

  if (data.breach) {
    return (
      <div className="fa-cbanner flag" role="status">
        <span className="bi">
          <i className="bi bi-shield-exclamation" aria-hidden="true" />
        </span>
        <div>
          <div className="bt">Concentration breach · {data.sector}</div>
          <div className="bd">
            {pct(data.weight_pct, 1).replace('+', '')} vs {Number(data.limit_pct).toFixed(1)}% IPS
            cap
          </div>
        </div>
        <span className="bpill an4-num">{Number(data.weight_pct).toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div className="fa-cbanner ok" role="status">
      <span className="bi">
        <i className="bi bi-shield-check" aria-hidden="true" />
      </span>
      <div>
        <div className="bt">All sectors within IPS limits</div>
        <div className="bd">Max sector cap {Number(data.limit_pct).toFixed(1)}%</div>
      </div>
    </div>
  );
}
