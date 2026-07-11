'use client';

import { Info, AlertTriangle } from 'lucide-react';
import { pct } from './format';

/**
 * Compose the one-line fund story. Pure + testable: given the latest perf and
 * concentration, returns { variant, text } or null when there's nothing to say.
 */
export function composeInsight(latest, concentration) {
  if (!latest && !concentration) return null;

  if (concentration?.source === 'ips' && concentration.breach) {
    const alpha = latest?.alpha_pct;
    const lead = alpha != null ? `Alpha is ${pct(alpha)} but ` : '';
    return {
      variant: 'warning',
      text: `${lead}the book leans on ${concentration.sector} at ${Number(concentration.weight_pct).toFixed(1)}% (IPS cap ${Number(concentration.limit_pct).toFixed(1)}%). Diversify before the cap review.`,
    };
  }

  if (latest?.alpha_pct != null) {
    const a = latest.alpha_pct;
    return {
      variant: 'neutral',
      text:
        a >= 0
          ? `The fund is beating its benchmark by ${pct(a)} this period${concentration?.source === 'ips' ? ', with every sector inside its IPS cap' : ''}.`
          : `The fund trails its benchmark by ${pct(a)} this period — review the detractors below.`,
    };
  }
  return null;
}

/** Reusable icon + one-sentence callout. `variant`: 'neutral' | 'warning'. */
export function InsightCallout({ variant = 'neutral', children }) {
  const Icon = variant === 'warning' ? AlertTriangle : Info;
  return (
    <div className={`fa-callout ${variant}`}>
      <Icon size={16} aria-hidden />
      <div>{children}</div>
    </div>
  );
}
