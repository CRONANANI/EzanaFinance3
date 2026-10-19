'use client';

/**
 * Legislation markets: bills paired with the markets that name them, the
 * structural estimate of passage beside the market-implied probability.
 * Same data and compliance copy as before (/api/congress/legislation-markets,
 * LEGISLATION_EDGE_DISCLAIMER), restyled to the card system. Pairs under the
 * 1-point floor show "No gap" rather than a number.
 */
import { Card, CardHead, ConfChip, SkelRows, StateBox, EDU_LINE } from './parts';
import { pct } from './format';

function billLabel(p) {
  const t = String(p.type || '').toLowerCase();
  const map = {
    hr: 'H.R.',
    s: 'S.',
    hjres: 'H.J.Res.',
    sjres: 'S.J.Res.',
    hres: 'H.Res.',
    sres: 'S.Res.',
  };
  return `${map[t] || t.toUpperCase()} ${p.number ?? ''}`.trim();
}

function Empty() {
  return (
    <div className="pmk-leg-empty">
      <div className="pmk-leg-empty-copy">
        <span className="pmk-leg-icon" aria-hidden="true">
          <i className="bi bi-bank" />
        </span>
        <p className="pmk-state-title">No open market names a bill right now.</p>
        <p className="pmk-state-msg">
          Ezana pairs bills before Congress with markets that name them, then sets the market price
          beside our structural estimate of passage. Pairs appear here as soon as a venue lists one.
        </p>
        <p className="pmk-leg-links">
          <a className="pmk-link" href="/datasets/capitol-watch">
            Track bills in Capitol Watch
          </a>
          <a className="pmk-link" href="#pmk-method">
            How we calculate this
          </a>
        </p>
      </div>
      <div className="pmk-leg-example" aria-hidden="true">
        <p className="pmk-eyebrow">What a pair looks like</p>
        <div className="pmk-leg-row">
          <span className="pmk-num">[BILL NO.]</span>
          <span>[Market naming the bill] passes the House by Dec 31?</span>
          <span className="pmk-num">34%</span>
          <span className="pmk-num">22%</span>
          <ConfChip confidence="high" />
        </div>
      </div>
    </div>
  );
}

export function LegislationCard({ className, legislation }) {
  const pairs = legislation.data?.pairs || [];
  const state = legislation.error
    ? 'error'
    : legislation.loading && !legislation.data
      ? 'loading'
      : 'ready';
  return (
    <Card
      className={['pmk-card--leg', className].filter(Boolean).join(' ')}
      label="Legislation markets"
    >
      <CardHead
        title="Legislation markets"
        sub="Bills paired with markets · structural estimate vs market"
        right={
          <a className="pmk-link" href="#pmk-method">
            How we calculate this
          </a>
        }
      />
      {state === 'loading' ? (
        <SkelRows n={3} height={44} label="Loading legislation markets" />
      ) : state === 'error' ? (
        <StateBox kind="error" onRetry={legislation.retry} minHeight={200} />
      ) : !pairs.length ? (
        <Empty />
      ) : (
        <div className="pmk-table-wrap">
          <table className="pmk-table">
            <thead>
              <tr>
                <th scope="col">Bill</th>
                <th scope="col">Market</th>
                <th scope="col" className="num">
                  Model
                </th>
                <th scope="col" className="num">
                  Market
                </th>
                <th scope="col">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.billId}>
                  <td className="pmk-num">{billLabel(p)}</td>
                  <td>
                    <span className="pmk-leg-q">{p.market?.question}</span>
                    <span className="pmk-leg-bill">{p.billTitle}</span>
                  </td>
                  <td className="num pmk-strong">{pct(p.model)}</td>
                  <td className="num">{pct(p.implied)}</td>
                  <td>
                    <ConfChip confidence={p.confidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="pmk-foot pmk-foot--stack">
        {legislation.data?.disclaimer ? (
          <p className="pmk-legal">{legislation.data.disclaimer}</p>
        ) : null}
        <p className="pmk-legal">{EDU_LINE}</p>
      </footer>
    </Card>
  );
}
