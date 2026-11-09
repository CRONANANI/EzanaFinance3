'use client';

/**
 * [K] DCF valuation, [L] Reverse DCF, [M] Peer multiples and [N] Model
 * findings for the Company view (Nov 2026 redesign). All four read one
 * model result (useDcfWorkbench) plus the page snapshot's price and peer
 * table, and the summary and findings text comes from buildModelNarrative,
 * so every number quoted matches the panel that shows it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { DCF_ASSUMPTIONS } from '@/components/research/dcf/dcf-assumptions';
import DCFInfoModal from '@/components/research/dcf/DCFInfoModal';
import { useDcfWorkbench } from '@/hooks/useDcfWorkbench';
import {
  RATING_LABELS,
  buildModelNarrative,
  fmtGap,
  fmtMoney,
  fmtMultiple,
  fmtPct,
  isNum,
  peerRating,
  signOf,
} from '@/lib/research/company-research';

const byId = Object.fromEntries(DCF_ASSUMPTIONS.map((a) => [a.id, a]));

/* The four headline inputs, in percent units. WACC is derived by the DCF
   route from the costs of capital; editing it shifts those (see shiftWacc). */
const INPUTS = [
  {
    key: 'revenueGrowthPct',
    label: 'Revenue growth (5Y)',
    min: -20,
    max: 80,
    step: 0.5,
    info: byId.revenueGrowthPct,
  },
  {
    key: 'ebitPct',
    label: 'Operating margin (LT)',
    min: 0,
    max: 80,
    step: 0.5,
    info: byId.ebitPct,
  },
  {
    key: 'wacc',
    label: 'WACC',
    min: 3,
    max: 20,
    step: 0.25,
    info: {
      label: 'WACC',
      info: {
        title: 'Weighted average cost of capital',
        variable: 'wacc',
        meaning:
          'The blended return equity and debt holders require. Set here, it moves the cost of equity and the cost of debt together so the blended rate lands on your value.',
        typicalRange: '7% – 12%',
        example: '9% for a large, profitable company',
        formula: 'E/V × Re + D/V × Rd × (1 − tax)',
      },
    },
  },
  {
    key: 'longTermGrowthRate',
    label: 'Terminal growth',
    min: 0,
    max: 5,
    step: 0.25,
    info: byId.longTermGrowthRate,
  },
];

function AssumptionInput({ spec, value, editable, onCommit }) {
  const [draft, setDraft] = useState(isNum(value) ? value.toFixed(1) : '');
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(isNum(value) ? value.toFixed(spec.step < 0.5 ? 2 : 1) : '');
  }, [value, spec.step]);
  const id = `rc-dcf-${spec.key}`;
  return (
    <span className="rc-stepper">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className="rc-stepper__input rc-num"
        value={draft}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        readOnly={!editable}
        aria-readonly={!editable}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          setDraft(isNum(value) ? value.toFixed(spec.step < 0.5 ? 2 : 1) : '');
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(n)) {
            onCommit(Math.min(spec.max, Math.max(spec.min, n)));
          }
        }}
      />
      <span className="rc-stepper__suffix" aria-hidden="true">
        %
      </span>
    </span>
  );
}

function PeerTable({ peers, ticker }) {
  const showPeg = peers.rows.some((r) => isNum(r.peg5y));
  return (
    <div className="rc-peers">
      <table className="rc-table">
        <caption className="rc-sr">Peer valuation multiples for {ticker}</caption>
        <thead>
          <tr>
            <th scope="col" className="rc-th--left">
              Company
            </th>
            <th scope="col">P/E (TTM)</th>
            <th scope="col">EV/EBITDA</th>
            {showPeg ? (
              <th scope="col" className="rc-col-peg">
                PEG (5Y)
              </th>
            ) : null}
            <th scope="col">Rating</th>
          </tr>
        </thead>
        <tbody>
          {peers.rows.map((r) => {
            const rating = peerRating(r.pe, peers.medianPe);
            return (
              <tr key={r.ticker} className={r.isSelf ? 'is-self' : undefined}>
                <th scope="row" className="rc-th--left rc-num" title={r.name}>
                  {r.ticker}
                </th>
                <td className="rc-num">{fmtMultiple(r.pe)}</td>
                <td className="rc-num">{fmtMultiple(r.evEbitda)}</td>
                {showPeg ? <td className="rc-num rc-col-peg">{fmtMultiple(r.peg5y)}</td> : null}
                <td>
                  {rating ? (
                    <span className={`rc-rating rc-rating--${rating}`}>
                      {RATING_LABELS[rating]}
                    </span>
                  ) : (
                    <span className="rc-muted">N/A</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isNum(peers.medianPe) ? (
        <p className="rc-foot rc-num">Peer median P/E {fmtMultiple(peers.medianPe)}</p>
      ) : null}
    </div>
  );
}

export function DcfWorkbench({ symbol, price, peers }) {
  const dcf = useDcfWorkbench(symbol, price);
  const [editing, setEditing] = useState(false);
  const [info, setInfo] = useState(null);

  const self = peers.rows.find((r) => r.isSelf) || null;
  const narrative = useMemo(
    () =>
      buildModelNarrative({
        ticker: symbol,
        fairValue: dcf.fairValue,
        price,
        impliedGrowthPct: dcf.impliedGrowthPct,
        baseGrowthPct: dcf.inputs.revenueGrowthPct,
        pe: self?.pe ?? null,
        peerMedianPe: peers.medianPe,
      }),
    [
      symbol,
      dcf.fairValue,
      price,
      dcf.impliedGrowthPct,
      dcf.inputs.revenueGrowthPct,
      self?.pe,
      peers.medianPe,
    ],
  );
  const gapDir = signOf(narrative.gapPct);
  const busy = dcf.status === 'loading';

  /* Bound hits from the solver: the market prices growth outside the search range. */
  const impliedLabel =
    dcf.reverseVerdict === 'unjustifiable'
      ? `> ${fmtPct(dcf.impliedGrowthPct)}`
      : dcf.reverseVerdict === 'undervalued'
        ? `< ${fmtPct(dcf.impliedGrowthPct)}`
        : fmtPct(dcf.impliedGrowthPct);

  return (
    <div className="rc-dcf">
      {/* K · DCF valuation */}
      <section className="rc-card rc-k" aria-labelledby="rc-k-title" aria-busy={busy}>
        <div className="rc-k__main">
          <header className="rc-card__head">
            <i className="bi bi-cash-stack rc-card__icon" aria-hidden="true" />
            <h3 id="rc-k-title" className="rc-card__title">
              DCF valuation
            </h3>
            <span className="rc-badge rc-badge--premium">
              <i className="bi bi-star-fill" aria-hidden="true" /> Premium
            </span>
          </header>

          {dcf.status === 'error' ? (
            <div className="rc-state rc-state--error" role="alert">
              <p>DCF unavailable for {symbol}.</p>
              <button type="button" className="rc-btn" onClick={dcf.retry}>
                Retry
              </button>
            </div>
          ) : (
            <>
              <p className="rc-summary">
                <strong>Model summary:</strong>{' '}
                {narrative.summary ||
                  (busy ? 'Running the model…' : 'Fair value unavailable at these inputs.')}
              </p>
              <div className="rc-k__stats">
                <div className="rc-stat">
                  <span className="rc-stat__label">Fair value</span>
                  <span className="rc-stat__value rc-num">
                    {busy && !isNum(dcf.fairValue) ? (
                      <span className="rc-skel rc-skel--val" aria-hidden="true" />
                    ) : (
                      fmtMoney(dcf.fairValue)
                    )}
                  </span>
                </div>
                <div className="rc-stat">
                  <span className="rc-stat__label">Current price</span>
                  <span className="rc-stat__value rc-num">{fmtMoney(price)}</span>
                </div>
                <div className="rc-stat rc-stat--gap">
                  <span className="rc-stat__label">Valuation gap</span>
                  <span className={`rc-chip rc-chip--lg rc-chip--${gapDir} rc-num`}>
                    {fmtGap(narrative.gapPct)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rc-k__side">
          <div className="rc-k__side-head">
            {editing ? (
              <button type="button" className="rc-link-btn" onClick={dcf.reset}>
                Reset
              </button>
            ) : null}
            <button
              type="button"
              className="rc-btn rc-btn--sm"
              aria-pressed={editing}
              onClick={() => setEditing((e) => !e)}
            >
              <i className={`bi ${editing ? 'bi-check2' : 'bi-sliders'}`} aria-hidden="true" />
              {editing ? 'Done' : 'Edit assumptions'}
            </button>
          </div>
          <div className="rc-assumptions" role="group" aria-label="DCF assumptions">
            {INPUTS.map((spec) => (
              <div key={spec.key} className="rc-assumptions__row">
                <label htmlFor={`rc-dcf-${spec.key}`} className="rc-assumptions__label">
                  {spec.label}
                </label>
                <button
                  type="button"
                  className="rc-icon-btn"
                  aria-label={`About ${spec.label}`}
                  onClick={() => setInfo(spec.info)}
                >
                  <i className="bi bi-info-circle" aria-hidden="true" />
                </button>
                <AssumptionInput
                  spec={spec}
                  value={dcf.inputs[spec.key]}
                  editable={editing && dcf.status !== 'error'}
                  onCommit={(v) => dcf.setInput(spec.key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="rc-row">
        {/* L · Reverse DCF */}
        <section className="rc-card rc-l" aria-labelledby="rc-l-title">
          <header className="rc-card__head">
            <h3 id="rc-l-title" className="rc-card__title">
              Reverse DCF
            </h3>
          </header>
          <p className="rc-body">
            {narrative.reverse ||
              (dcf.reverseStatus === 'loading' || busy
                ? 'Solving for the growth the current price implies…'
                : 'Implied growth unavailable at these inputs.')}
          </p>
          <div className="rc-highlight">
            <span className="rc-stat__label">Implied growth (5Y)</span>
            <span className="rc-highlight__value rc-num">
              {dcf.reverseStatus === 'loading' ? (
                <span className="rc-skel rc-skel--val" aria-hidden="true" />
              ) : (
                impliedLabel
              )}
            </span>
          </div>
        </section>

        {/* M · Peer multiples */}
        <section className="rc-card rc-m" aria-labelledby="rc-m-title">
          <header className="rc-card__head">
            <h3 id="rc-m-title" className="rc-card__title">
              Peer multiples
            </h3>
          </header>
          {peers.status === 'loading' ? (
            <div className="rc-skel rc-skel--table" aria-hidden="true" />
          ) : peers.status === 'error' ? (
            <div className="rc-state rc-state--error" role="alert">
              <p>Peer multiples unavailable.</p>
              <button type="button" className="rc-btn" onClick={peers.retry}>
                Retry
              </button>
            </div>
          ) : peers.rows.length ? (
            <PeerTable peers={peers} ticker={symbol} />
          ) : (
            <p className="rc-state">No peers found for {symbol}.</p>
          )}
        </section>

        {/* N · Model findings */}
        <section className="rc-card rc-n" aria-labelledby="rc-n-title">
          <header className="rc-card__head">
            <h3 id="rc-n-title" className="rc-card__title">
              Model findings
            </h3>
            <span className="rc-badge rc-badge--model">Model</span>
          </header>
          {narrative.findings.length ? (
            <ol className="rc-findings">
              {narrative.findings.map((f, i) => (
                <li key={f} className="rc-findings__item">
                  <span className="rc-findings__n rc-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rc-state">
              {busy ? 'Waiting for the model…' : 'No findings at these inputs.'}
            </p>
          )}
        </section>
      </div>

      {info ? <DCFInfoModal assumption={info} onClose={() => setInfo(null)} /> : null}
    </div>
  );
}

export default DcfWorkbench;
