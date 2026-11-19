'use client';

/**
 * API pricing on /pricing: one CalculatorWidget with an Individual /
 * Enterprise switch. Rates come from src/config/api-pricing.js.
 *
 * Billable requests = max(0, requests per day x 30 - included), split into
 * standard and premium by the premium share. Enterprise adds its platform fee.
 */

import { useMemo, useState } from 'react';
import { CalculatorWidget, formatNumber } from '@/components/ui/calculator-widget';
import { API_DAYS_PER_MONTH as DAYS, API_PRICING } from '@/config/api-pricing';
import './api-pricing.css';

const usd = (v) => formatNumber(v, 'currency');
const int = (v) => formatNumber(v, 'integer');

function spec(kind) {
  const r = API_PRICING[kind];
  const isEnt = kind === 'enterprise';
  const fee = isEnt ? r.platformFee : 0;
  const billable = `max(0, requests * ${DAYS} - ${r.includedPerMonth})`;
  return {
    inputs: [
      {
        name: 'requests',
        label: 'Requests per day',
        min: isEnt ? 10_000 : 100,
        max: r.maxRequestsPerDay,
        step: isEnt ? 10_000 : 100,
        defaultValue: isEnt ? 150_000 : 2_000,
        format: 'integer',
      },
      {
        name: 'premium',
        label: 'Real-time and Sonar share',
        min: 0,
        max: 100,
        step: 5,
        defaultValue: isEnt ? 30 : 20,
        format: 'percent',
        hint: 'premium endpoints',
      },
    ],
    outputs: [
      {
        name: 'total',
        label: 'Per month',
        primary: true,
        format: 'currency',
        formula: `${fee} + standardCost + premiumCost`,
        hint: isEnt
          ? `$${int(fee)} platform fee, ${int(r.includedPerMonth)} requests included, then ${usd(r.standardPer1k)} standard and ${usd(r.premiumPer1k)} premium per 1,000`
          : `${int(r.includedPerMonth)} requests a month included with your plan, then ${usd(r.standardPer1k)} standard and ${usd(r.premiumPer1k)} premium per 1,000`,
      },
      {
        name: 'standardCost',
        hidden: true,
        label: 'Standard',
        format: 'currency',
        formula: `${billable} * (1 - premium / 100) / 1000 * ${r.standardPer1k}`,
      },
      {
        name: 'premiumCost',
        hidden: true,
        label: 'Premium',
        format: 'currency',
        formula: `${billable} * premium / 100 / 1000 * ${r.premiumPer1k}`,
      },
      { name: 'monthly', label: 'Requests per month', format: 'integer', formula: `requests * ${DAYS}` },
      { name: 'billable', label: 'Billable after included', format: 'integer', formula: billable },
      {
        name: 'perThousand',
        label: 'Effective per 1,000',
        format: 'currency',
        formula: `total / (requests * ${DAYS}) * 1000`,
      },
    ],
    breakdown: [
      ...(isEnt ? [{ label: 'Platform fee', formula: String(fee) }] : []),
      { label: 'Standard endpoints', formula: 'standardCost' },
      { label: 'Real-time and Sonar', formula: 'premiumCost' },
    ],
  };
}

export default function ApiPricingCalculator() {
  const [kind, setKind] = useState('individual');
  const s = useMemo(() => spec(kind), [kind]);
  const r = API_PRICING[kind];
  const isEnt = kind === 'enterprise';

  return (
    <section className="api-pricing" aria-labelledby="api-pricing-heading">
      <div className="api-pricing-head">
        <span className="api-pricing-eyebrow">Ezana API</span>
        <h2 id="api-pricing-heading" className="api-pricing-h2">
          Pay for the data you pull.
        </h2>
        <p className="api-pricing-sub">
          Move the sliders to estimate a month of API usage on your plan.
        </p>
        <div className="api-pricing-tabs" role="tablist" aria-label="API plan">
          {Object.entries(API_PRICING).map(([key, p]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={kind === key}
              className={`api-pricing-tab${kind === key ? ' is-active' : ''}`}
              onClick={() => setKind(key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <CalculatorWidget
        key={kind}
        className="api-pricing-calc"
        title={`${r.label} API`}
        description={r.blurb}
        inputs={s.inputs}
        outputs={s.outputs}
        breakdown={s.breakdown}
        footnote={
          isEnt
            ? 'An estimate. Enterprise usage is billed on an annual commitment; sales confirms the final quote.'
            : 'An estimate. Usage is billed monthly on top of your plan; a month is 30 days.'
        }
        submitLabel={isEnt ? 'Send these numbers to sales' : 'Get API access'}
        submitIcon={isEnt ? 'bi-send' : 'bi-key'}
        onSubmit={(values, results) => {
          if (!isEnt) {
            window.location.href = '/auth/signup?plan=advanced&api=1';
            return;
          }
          const body = [
            `Requests per day: ${int(values.requests)}`,
            `Real-time and Sonar share: ${values.premium}%`,
            `Calculator estimate: ${usd(results.total)} per month`,
          ].join('\n');
          window.location.href = `mailto:enterprise@ezana.world?subject=${encodeURIComponent(
            'Enterprise API pricing',
          )}&body=${encodeURIComponent(body)}`;
        }}
      />
    </section>
  );
}
