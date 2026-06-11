'use client';

import './academic.css';

/**
 * Inline banner surfacing IPS check results. Pass the response from
 * /api/org/ips/check as `result`. Renders nothing when there's no result or
 * the proposal is clean.
 */
export function IPSCheckBanner({ result }) {
  if (!result) return null;
  const violations = result.violations || [];
  if (violations.length === 0) return null;

  const blocked = result.blocked || violations.some((v) => v.severity === 'block');
  const cls = blocked ? 'ac3-ips-banner--block' : 'ac3-ips-banner--warn';

  return (
    <div className={`ac3-ips-banner ${cls} ac3-root`} role="alert">
      <strong>
        <i className={`bi ${blocked ? 'bi-shield-exclamation' : 'bi-exclamation-triangle'}`} aria-hidden />{' '}
        {blocked
          ? 'IPS violation — this would breach a hard policy limit and is blocked.'
          : 'IPS warning — allowed, but flagged against policy.'}
      </strong>
      <ul>
        {violations.map((v, i) => (
          <li key={`${v.rule_type}-${i}`}>{v.detail}</li>
        ))}
      </ul>
    </div>
  );
}
