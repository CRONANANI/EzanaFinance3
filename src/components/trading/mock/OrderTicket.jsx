'use client';

/**
 * Place order card (Nov 2026 redesign): ticker typeahead, selected-asset
 * strip, Buy / Sell, amount with presets, a live summary and the submit
 * button. Validation and every number come from ticketState in
 * src/lib/trading/mock-ticket.js; the page owns the trade call.
 */
import { useId, useRef, useState } from 'react';
import {
  PRESETS,
  fmtQty,
  fmtSignedPct,
  fmtSignedUSD,
  fmtUSD,
  parseAmount,
  signOf,
  ticketState,
} from '@/lib/trading/mock-ticket';
import { LetterAvatar } from './MockSections';

function TickerSearch({ query, setQuery, results, loading, onPick, onSubmitTicker }) {
  const listId = useId();
  const [active, setActive] = useState(-1);
  const open = query.trim().length > 0 && (results.length > 0 || loading);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && results[active]) onPick(results[active]);
      else if (query.trim()) onSubmitTicker();
      setActive(-1);
    } else if (e.key === 'Escape') {
      setQuery('');
      setActive(-1);
    }
  };

  return (
    <div className="mock-search">
      <label htmlFor={`${listId}-input`} className="mock-sr">
        Search company or ticker
      </label>
      <i className="bi bi-search mock-search__icon" aria-hidden="true" />
      <input
        id={`${listId}-input`}
        type="search"
        className="mock-search__input"
        placeholder="Search company or ticker"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <ul id={listId} role="listbox" className="mock-search__list" aria-label="Matching tickers">
          {loading && results.length === 0 ? (
            <li className="mock-search__status" role="presentation">
              Searching…
            </li>
          ) : null}
          {results.map((r, i) => (
            <li
              key={r.symbol}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`mock-search__opt${i === active ? ' is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(r);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="mock-num mock-strong">{r.symbol}</span>
              <span className="mock-muted mock-ellipsis">{r.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function OrderTicket({
  search,
  symbol,
  name,
  quote,
  side,
  onSide,
  amount,
  onAmount,
  cash,
  position,
  pending,
  onSubmit,
}) {
  const reasonId = useId();
  const amountRef = useRef(null);
  const amt = parseAmount(amount);
  const price = quote?.price > 0 ? quote.price : null;
  const t = ticketState({ side, amount: amt, cash, price, symbol, position });
  const isBuy = side === 'buy';
  const presetOn = (v) => Math.abs(amt - v) < 0.005;

  return (
    <section className="mock-trade-panel mock-ticket" aria-labelledby="mock-order-h">
      <header className="mock-trade-panel-header">
        <i className="bi bi-graph-up-arrow mock-card-icon" aria-hidden="true" />
        <h2 id="mock-order-h" className="mock-card-title">
          Place order
        </h2>
      </header>

      <TickerSearch
        query={search.query}
        setQuery={search.setQuery}
        results={search.results}
        loading={search.loading}
        onPick={(r) => search.onPick(r)}
        onSubmitTicker={search.onSubmitTicker}
      />

      <div className="mock-asset" aria-live="polite">
        {symbol ? (
          <>
            <LetterAvatar symbol={symbol} />
            <div className="mock-asset__id">
              <span className="mock-num mock-strong">{symbol}</span>
              <span className="mock-muted mock-small mock-ellipsis">{name || symbol}</span>
            </div>
            <div className="mock-asset__px">
              {quote?.loading && !price ? (
                <span className="mock-skel mock-skel--val" aria-label="Loading price" />
              ) : price ? (
                <>
                  <span className="mock-num mock-strong">{fmtUSD(price)}</span>
                  <span className={`mock-num mock-small mock-tone is-${signOf(quote.change)}`}>
                    {fmtSignedUSD(quote.change)} ({fmtSignedPct(quote.changePct)})
                  </span>
                </>
              ) : (
                <span className="mock-muted mock-small">No live price</span>
              )}
            </div>
          </>
        ) : (
          <p className="mock-muted mock-small">Search above, or pick a position or a mover.</p>
        )}
      </div>

      <div className="mock-side" role="group" aria-label="Order side">
        <button
          type="button"
          className={`mock-side__btn is-buy${isBuy ? ' is-on' : ''}`}
          aria-pressed={isBuy}
          onClick={() => onSide('buy')}
        >
          Buy
        </button>
        <button
          type="button"
          className={`mock-side__btn is-sell${!isBuy ? ' is-on' : ''}`}
          aria-pressed={!isBuy}
          onClick={() => onSide('sell')}
        >
          Sell
        </button>
      </div>

      <div className="mock-field">
        <label htmlFor={`${reasonId}-amt`} className="mock-field__label">
          Amount (USD)
        </label>
        <div className="mock-amount">
          <span className="mock-amount__prefix mock-num" aria-hidden="true">
            $
          </span>
          <input
            ref={amountRef}
            id={`${reasonId}-amt`}
            className="mock-amount__input mock-num"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            aria-invalid={t.showReason || undefined}
            aria-describedby={t.showReason ? reasonId : undefined}
            onChange={(e) => onAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
          />
        </div>
        <div className="mock-presets" role="group" aria-label="Amount presets">
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              className={`mock-preset mock-num${presetOn(v) ? ' is-on' : ''}`}
              aria-pressed={presetOn(v)}
              onClick={() => onAmount(String(v))}
            >
              ${v.toLocaleString('en-US')}
            </button>
          ))}
          <button
            type="button"
            className={`mock-preset${t.max > 0 && presetOn(t.max) ? ' is-on' : ''}`}
            aria-pressed={t.max > 0 && presetOn(t.max)}
            disabled={t.max <= 0}
            title={isBuy ? 'All available cash' : 'Your full position'}
            onClick={() => onAmount(t.max.toFixed(2))}
          >
            Max
          </button>
        </div>
        {t.showReason ? (
          <p id={reasonId} className="mock-reason" role="status">
            {t.reason}
          </p>
        ) : null}
      </div>

      <dl className="mock-summary">
        <div>
          <dt>Estimated shares</dt>
          <dd className="mock-num">{price && amt > 0 ? `≈ ${fmtQty(t.shares)}` : 'N/A'}</dd>
        </div>
        <div>
          <dt>Price per share</dt>
          <dd className="mock-num">{price ? fmtUSD(price) : 'N/A'}</dd>
        </div>
        <div>
          <dt>Order total</dt>
          <dd className="mock-num mock-strong">{fmtUSD(t.total)}</dd>
        </div>
        <div>
          <dt>Cash after</dt>
          <dd className={`mock-num${t.cashAfter < 0 ? ' mock-tone is-down' : ''}`}>
            {fmtUSD(t.cashAfter)}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        className={`mock-submit ${isBuy ? 'is-buy' : 'is-sell'}`}
        data-task-target="mock-trade-submit"
        disabled={!t.canSubmit || pending}
        aria-busy={pending || undefined}
        onClick={() => onSubmit({ amount: amt })}
      >
        {pending ? 'Placing order…' : `${isBuy ? 'Buy' : 'Sell'}${symbol ? ` ${symbol}` : ''}`}
      </button>

      <p className="mock-disclaimer">
        <i className="bi bi-info-circle" aria-hidden="true" />
        <span>
          Paper trading only. No real money involved. Prices update throughout the trading day.
        </span>
      </p>
    </section>
  );
}

export default OrderTicket;
