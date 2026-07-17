/**
 * BrokerageLogos — "Connect your brokerage account" section.
 * Single-row marquee of uniform logo tiles.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BrandMark } from '@/components/home/brokerage-brand-marks';
import { BrokerageTradeInfo } from '@/components/landing/BrokerageTradeInfo';
import './brokerage-logos.css';

const BROKERAGE_LOGOS = [
  { name: 'Alpaca', src: '/brokerage-logos/alpaca.png', width: 80, height: 80 },
  { name: 'Binance', brandKey: 'BINANCE' },
  { name: 'Coinbase', src: '/brokerage-logos/coinbase.png', width: 200, height: 56 },
  // Robinhood / eToro / Wealthsimple / Betterment / TIAA render as inline SVG brand
  // marks (see brokerage-brand-marks.jsx) — theme-independent, crisp at any tile
  // size, and never a broken-image state. TD Ameritrade / US Bank use the inline
  // marks too (their wordmark PNGs were baked for a dark background).
  { name: 'Robinhood', brandKey: 'ROBINHOOD' },
  { name: 'eToro', brandKey: 'ETORO' },
  { name: 'TD Ameritrade', brandKey: 'TD_AMERITRADE' },
  { name: 'Wealthsimple', brandKey: 'WEALTHSIMPLE' },
  {
    name: 'Interactive Brokers',
    src: '/brokerage-logos/interactive-brokers.png',
    width: 200,
    height: 56,
  },
  { name: 'E*TRADE', src: '/brokerage-logos/etrade.png', width: 160, height: 56 },
  {
    name: 'Vanguard',
    src: '/brokerage-logos/vanguard.png',
    width: 200,
    height: 56,
    hideLabel: true,
  },
  { name: 'US Bank', brandKey: 'US_BANK' },
  { name: 'Charles Schwab', src: '/brokerage-logos/charles-schwab.png', width: 80, height: 80 },
  { name: 'Betterment', brandKey: 'BETTERMENT' },
  { name: 'TIAA', brandKey: 'TIAA' },
];

function LogoTile({ logo }) {
  const [failed, setFailed] = useState(false);
  const showPng = logo.src && !failed;

  return (
    <div className="bl-logo-item" title={logo.name}>
      <div className="bl-logo-slot">
        {showPng ? (
          <Image
            src={logo.src}
            alt=""
            width={logo.width}
            height={logo.height}
            className="bl-logo-img"
            style={{ objectFit: 'contain' }}
            onError={() => setFailed(true)}
            loading="lazy"
          />
        ) : logo.brandKey ? (
          <BrandMark id={logo.brandKey} size={26} />
        ) : null}
      </div>
      {!logo.hideLabel && <span className="bl-logo-label">{logo.name}</span>}
    </div>
  );
}

export function BrokerageLogos() {
  const doubled = [...BROKERAGE_LOGOS, ...BROKERAGE_LOGOS];

  return (
    <section className="bl-section" aria-labelledby="bl-heading">
      <p className="bl-eyebrow lf-mono">Connect your accounts</p>
      <h2 id="bl-heading" className="bl-heading">
        Connect your brokerage account
      </h2>
      <p className="bl-subheading">
        Securely link 1,000+ brokerages and crypto exchanges via SnapTrade &amp; Plaid. Read
        holdings or place trades from supported brokers — without leaving Ezana.
      </p>
      <p className="bl-subheading bl-partners">
        SnapTrade and Plaid are our trusted data partners.
        <BrokerageTradeInfo />
      </p>

      <div className="bl-carousel-mask">
        <div className="bl-carousel-track">
          {doubled.map((logo, i) => (
            <LogoTile key={`${logo.name}-${i}`} logo={logo} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default BrokerageLogos;
