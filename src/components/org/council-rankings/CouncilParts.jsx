import { fmtSigned, tierIcon, tierLabel, toneOf } from '@/lib/council-rankings-model';

/* Small presentational parts shared by the table and the council page.
   No hooks, so the council page can render them on the server. */

/** The self-reported mark: an icon and text, never a filled chip. */
export function SelfReported({ period }) {
  return (
    <span className="crx-self" title="Typed in by the council's managers, not verified">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <span>Self-reported</span>
      {period ? <span className="crx-self__period">{period}</span> : null}
    </span>
  );
}

/** Tier as text with an icon (the icon is not the only signal). */
export function Tier({ tier }) {
  return (
    <span className={`crx-tier crx-tier--${tier}`}>
      <i className={`bi ${tierIcon(tier)}`} aria-hidden="true" />
      {tierLabel(tier)}
    </span>
  );
}

/** A signed whole number, green above zero and red below. */
export function Signed({ value }) {
  const t = toneOf(value);
  return (
    <span className={`tcc-mono${t ? ` tcc-${t}` : ''}${value == null ? ' tcc-na' : ''}`}>
      {fmtSigned(value)}
    </span>
  );
}
