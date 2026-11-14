'use client';

/**
 * Review order (Mock Trading, Nov 14 2026): the step between the ticket's
 * Review button and the trade. Shows the order at the last price, the cash
 * after, the projected weight and the thesis check, takes an optional thesis
 * note, then Place order (the page's existing trade call, with the note) or
 * Cancel. The fill price is still quoted by the server.
 */
import { useEffect, useId, useState } from 'react';
import { Button, Modal, Textarea } from '@/components/ds';
import { THESIS_LIMITS } from '@/lib/trading/mock-thesis';
import { fmtPct, fmtQty, fmtUSD } from '@/lib/trading/mock-ticket';

/**
 * order    { side, symbol, amount, shares, cashAfter, weightAfter } or null
 * clauses  fitClauses() for the order ([] with no active thesis)
 * onPlace  async (note) => void
 */
export function ReviewOrderModal({
  open,
  order,
  clauses = [],
  thesisName = null,
  pending,
  onCancel,
  onPlace,
}) {
  const id = useId();
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) setNote('');
  }, [open]);
  const isBuy = order?.side !== 'sell';

  return (
    <Modal
      open={open && Boolean(order)}
      onClose={onCancel}
      title={order ? `Review ${isBuy ? 'buy' : 'sell'} order` : ''}
      size="480px"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => onPlace(note)} loading={pending}>
            Place order
          </Button>
        </>
      }
    >
      {order ? (
        <div className="mock-confirm">
          <dl className="mock-confirm__list">
            <div>
              <dt>Side</dt>
              <dd className={`mock-tone is-${isBuy ? 'up' : 'down'}`}>{isBuy ? 'Buy' : 'Sell'}</dd>
            </div>
            <div>
              <dt>Ticker</dt>
              <dd className="mock-num">{order.symbol}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd className="mock-num">{fmtUSD(order.amount)}</dd>
            </div>
            <div>
              <dt>Est. shares at the last price</dt>
              <dd className="mock-num">≈ {fmtQty(order.shares)}</dd>
            </div>
            <div>
              <dt>Cash after</dt>
              <dd className="mock-num">{fmtUSD(order.cashAfter)}</dd>
            </div>
            <div>
              <dt>Proj. position weight</dt>
              <dd className="mock-num">{fmtPct(order.weightAfter)}</dd>
            </div>
          </dl>
          {clauses.length ? (
            <div className="mock-review-check">
              <p className="mock-review-check__title">
                Thesis check{thesisName ? `: ${thesisName}` : ''}
              </p>
              <ul className="mock-pre-checks">
                {clauses.map((c) => (
                  <li key={c.key} className={c.ok ? 'is-ok' : 'is-warn'}>
                    <i
                      className={`bi ${c.ok ? 'bi-check-lg' : 'bi-exclamation-triangle'}`}
                      aria-hidden="true"
                    />
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Textarea
            id={`${id}-note`}
            label="Thesis note (optional)"
            rows={3}
            value={note}
            maxLength={THESIS_LIMITS.note}
            onChange={(e) => setNote(e.target.value)}
            hint={`${note.length} of ${THESIS_LIMITS.note} characters. Shows in your trade journal.`}
          />
          <p className="mock-review-fine">
            The fill uses the live price when you place the order, so the shares may differ
            slightly.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}

export default ReviewOrderModal;
