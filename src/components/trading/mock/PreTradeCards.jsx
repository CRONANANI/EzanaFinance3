'use client';

/**
 * Pre-trade cards (Mock Trading, Nov 14 2026): What-if impact, Risk snapshot
 * and Thesis alignment, three across under the performance chart. All three
 * read the same inputs (the ticket's order, the position rows, the summary
 * and the active thesis), and every number comes from the pure helpers in
 * src/lib/trading/mock-thesis.js and mock-risk.js. Nothing is computed here.
 * Styles: mock-trading.css (mock-pre-).
 */
import { Alert, Tooltip } from '@/components/ds';
import { fmtPct, fmtSignedPct, fmtUSD } from '@/lib/trading/mock-ticket';

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

function NotEnough() {
  return (
    <Tooltip label="Needs about a month of history.">
      {/* Focusable so the explanation reaches keyboard users too. */}
      <span className="mock-na" tabIndex={0}>
        N/A
      </span>
    </Tooltip>
  );
}

function RiskRow({ label, children }) {
  return (
    <div className="mock-pre-row">
      <dt>{label}</dt>
      <dd className="mock-num">{children}</dd>
    </div>
  );
}

/**
 * risk      riskSnapshot() output, or null while the 3M series loads
 * capAlert  { symbol, cap } when the ticket's order would take the ticker
 *           past the active thesis cap, else null
 */
export function RiskSnapshotCard({ risk, capAlert = null }) {
  return (
    <section className="mock-card mock-pre" aria-labelledby="mock-pre-risk-h">
      <header className="mock-card-header">
        <i className="bi bi-shield-check mock-card-icon" aria-hidden="true" />
        <h2 id="mock-pre-risk-h" className="mock-card-title">
          Risk snapshot
        </h2>
      </header>
      {!risk ? (
        <div className="mock-skel-stack" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="mock-skel mock-skel--line" />
          ))}
        </div>
      ) : (
        <dl className="mock-pre-list">
          <RiskRow label="Single-name concentration">
            {risk.concentration ? (
              <>
                <span className="mock-strong">{risk.concentration.symbol}</span>{' '}
                {fmtPct(risk.concentration.weight)}
              </>
            ) : (
              'N/A'
            )}
          </RiskRow>
          <RiskRow label="Max drawdown (3M)">
            {risk.maxDrawdownPct == null ? (
              <NotEnough />
            ) : (
              <span className={risk.maxDrawdownPct < 0 ? 'mock-drawdown' : undefined}>
                {fmtSignedPct(risk.maxDrawdownPct)}
              </span>
            )}
          </RiskRow>
          <RiskRow label="Volatility (ann.)">
            {risk.volatilityPct == null ? <NotEnough /> : fmtPct(risk.volatilityPct)}
          </RiskRow>
          <RiskRow label="Beta (vs. S&P 500)">
            {risk.beta == null ? <NotEnough /> : risk.beta.toFixed(2)}
          </RiskRow>
        </dl>
      )}
      {capAlert ? (
        <Alert tone="warning" className="mock-pre-alert">
          This order would take {capAlert.symbol} past your {capAlert.cap}% thesis cap.
        </Alert>
      ) : null}
    </section>
  );
}

/** The three cards, three across; wraps to one column in a narrow column. */
export function PreTradeCards({ projection, risk, capAlert = null, children = null }) {
  return (
    <div className="mock-pre-grid">
      <WhatIfCard projection={projection} />
      <RiskSnapshotCard risk={risk} capAlert={capAlert} />
      {children}
    </div>
  );
}

export default PreTradeCards;
