'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cx } from './tokens';

/* Asset rows (Nov 22, 2026): the one way a list of stocks and other assets
   is drawn on the Watchlist and the Dashboard. Each asset is its own soft
   tile: the issuer's logo, ticker over name, price over day change with an
   arrow, and a Buy (or Trade) button. Adapted from the 21st.dev stock card
   at the founder's request, in Ezana tokens. */

const logoUrl = (ticker) =>
  ticker
    ? `https://financialmodelingprep.com/image-stock/${encodeURIComponent(String(ticker).toUpperCase())}.png`
    : null;

/**
 * The issuer's logo in a circle, or the ticker's first letter when there is
 * no logo (crypto, commodities, an unknown symbol, a failed load).
 *
 *   ticker   used for the default logo URL and the letter fallback
 *   src      explicit logo URL; pass null to always show the letter
 */
export function AssetLogo({ ticker, src, size = 40, className }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef(null);
  const url = src === undefined ? logoUrl(ticker) : src;
  /* An image that failed before hydration never fires onError: check it. */
  useEffect(() => {
    setFailed(false);
  }, [url]);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [url, failed]);
  const letter = (String(ticker || '?').replace(/^[^A-Z0-9]+/i, '') || '?').charAt(0).toUpperCase();
  return (
    <span
      className={cx('ds-asset-logo', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote issuer logo, sized by CSS
        <img
          ref={imgRef}
          src={url}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        letter
      )}
    </span>
  );
}

/** A list of AssetRow tiles. `columns` sets the shared grid template. */
export function AssetList({ columns, className, children, ...rest }) {
  return (
    <ul
      className={cx('ds-asset-list', className)}
      style={columns ? { '--ds-asset-cols': columns } : undefined}
      {...rest}
    >
      {children}
    </ul>
  );
}

/**
 * One asset.
 *
 *   ticker, name        identity (ticker shown as given)
 *   logo                logo URL, or null for the letter (default: issuer logo)
 *   price               formatted main figure (price, or position value)
 *   change              numeric change, sets the arrow and colour
 *   changeText          formatted change, sign included (shown beside the arrow)
 *   meta                optional middle column (e.g. "12 sh · $189.20")
 *   trend               optional middle column node (a sparkline)
 *   symExtra / nameExtra  small nodes after the ticker / name
 *   buy                 { href, label = 'Buy', ariaLabel }
 *   actions             nodes after the buy button (star, row menu)
 *   onSelect            makes the whole tile select the asset
 *   selected            the selected tile
 */
export function AssetRow({
  ticker,
  name,
  logo,
  price,
  change,
  changeText,
  meta,
  trend,
  symExtra,
  nameExtra,
  buy,
  actions,
  onSelect,
  selected = false,
  selectLabel,
  className,
}) {
  const dir = change == null || !Number.isFinite(Number(change)) ? 'flat' : change >= 0 ? 'up' : 'down';
  const arrow = dir === 'up' ? 'bi-arrow-up-right' : dir === 'down' ? 'bi-arrow-down-right' : 'bi-dash';
  return (
    <li
      className={cx('ds-asset-row', selected && 'is-selected', onSelect && 'is-selectable', className)}
      aria-current={selected || undefined}
    >
      {onSelect ? (
        <button
          type="button"
          className="ds-asset-row__hit"
          onClick={onSelect}
          aria-label={selectLabel || `Show ${ticker}${name ? `, ${name}` : ''}`}
        />
      ) : null}

      <span className="ds-asset-row__id">
        <AssetLogo ticker={ticker} src={logo} />
        <span className="ds-asset-row__names">
          <span className="ds-asset-row__sym">
            {ticker}
            {symExtra}
          </span>
          <span className="ds-asset-row__name">
            {name || 'N/A'}
            {nameExtra}
          </span>
        </span>
      </span>

      {trend !== undefined ? <span className="ds-asset-row__trend">{trend}</span> : null}
      {meta !== undefined ? <span className="ds-asset-row__meta">{meta}</span> : null}

      <span className="ds-asset-row__quote">
        <span className="ds-asset-row__px">{price}</span>
        <span className={`ds-asset-row__chg is-${dir}`}>
          <i className={`bi ${arrow}`} aria-hidden="true" />
          {changeText ?? 'N/A'}
        </span>
      </span>

      {buy || actions ? (
        <span className="ds-asset-row__end">
          {buy ? (
            <Link
              href={buy.href}
              className="ds-asset-row__buy"
              aria-label={buy.ariaLabel || `${buy.label || 'Buy'} ${ticker}`}
            >
              {buy.label || 'Buy'}
            </Link>
          ) : null}
          {actions}
        </span>
      ) : null}
    </li>
  );
}
