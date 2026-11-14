'use client';

/**
 * Pre-trade cards (Mock Trading, Nov 14 2026): What-if impact, Risk snapshot
 * and Thesis alignment, three across under the performance chart. All three
 * read the same inputs (the ticket's order, the position rows, the summary
 * and the active thesis), and every number comes from the pure helpers in
 * src/lib/trading/mock-thesis.js and mock-risk.js. Nothing is computed here.
 * Styles: mock-trading.css (mock-pre-).
 */
import { fmtPct, fmtUSD } from '@/lib/trading/mock-ticket';

function BeforeAfter({ label, before, after }) {
  return (
    <div className="mock-pre-row">
      <dt>{label}</dt>
      <dd className="mock-num">
        <span className="mock-soft">{before}</span>
        <i className="bi bi-arrow-right mock-pre-arrow" aria-hidden="true" />
        <span className="mock-sr"> to </span>
        <span className="mock-strong">{after}</span>
      </dd>
    </div>
  );
}

/**
 * projection  whatIf() output for the ticket's order, or null with no order
 */
export function WhatIfCard({ projection }) {
  const p = projection;
  return (
    <section className="mock-card mock-pre" aria-labelledby="mock-pre-whatif-h">
      <header className="mock-card-header">
        <i className="bi bi-calculator mock-card-icon" aria-hidden="true" />
        <h2 id="mock-pre-whatif-h" className="mock-card-title">
          What-if impact
        </h2>
      </header>
      {p ? (
        <>
          <p className="mock-pre-lead">
            Proposed trade: {p.side === 'sell' ? 'Sell' : 'Buy'}{' '}
            <span className="mock-num mock-strong">{fmtUSD(p.amount)}</span> of{' '}
            <span className="mock-num mock-strong">{p.symbol}</span>
          </p>
          <dl className="mock-pre-list">
            <BeforeAfter
              label={`${p.symbol} weight (proj.)`}
              before={fmtPct(p.weight.before)}
              after={fmtPct(p.weight.after)}
            />
            <BeforeAfter
              label="Cash after trade"
              before={fmtUSD(p.cash.before)}
              after={fmtUSD(p.cash.after)}
            />
            <BeforeAfter
              label="Total exposure"
              before={fmtPct(p.exposure.before)}
              after={fmtPct(p.exposure.after)}
            />
          </dl>
        </>
      ) : (
        <p className="mock-empty mock-pre-empty">Enter an order in the ticket to see its effect.</p>
      )}
    </section>
  );
}

/** The three cards, three across; wraps to one column in a narrow column. */
export function PreTradeCards({ projection, children = null }) {
  return (
    <div className="mock-pre-grid">
      <WhatIfCard projection={projection} />
      {children}
    </div>
  );
}

export default PreTradeCards;
