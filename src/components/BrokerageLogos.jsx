/**
 * BrokerageLogos — "Connect your brokerage account" section.
 * Single-row marquee of uniform logo tiles.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BrandMark } from '@/components/home/brokerage-brand-marks';
import './brokerage-logos.css';

const BROKERAGE_LOGOS = [
  { name: 'Alpaca', src: '/brokerage-logos/alpaca.png', width: 80, height: 80 },
  { name: 'Binance', src: '/brokerage-logos/binance.png', width: 200, height: 40, hideLabel: true },
  { name: 'Coinbase', src: '/brokerage-logos/coinbase.png', width: 200, height: 56 },
  {
    name: 'Robinhood',
    src: '/brokerage-logos/robinhood.png',
    width: 200,
    height: 56,
    hideLabel: true,
  },
  { name: 'eToro', src: '/brokerage-logos/etoro.png', width: 200, height: 56, hideLabel: true },
  { name: 'Questrade', src: '/brokerage-logos/questrade.png', width: 180, height: 56 },
  { name: 'Tradier', src: '/brokerage-logos/tradier.png', width: 160, height: 50 },
  {
    name: 'TD Ameritrade',
    src: '/brokerage-logos/td-ameritrade.png',
    width: 200,
    height: 56,
    hideLabel: true,
  },
  {
    name: 'Wealthsimple',
    src: '/brokerage-logos/wealthsimple.png',
    width: 200,
    height: 40,
    hideLabel: true,
  },
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
  { name: 'US Bank', src: '/brokerage-logos/us-bank.png', width: 200, height: 56, hideLabel: true },
  { name: 'Trading 212', src: '/brokerage-logos/trading212.png', width: 200, height: 56 },
  { name: 'Charles Schwab', src: '/brokerage-logos/charles-schwab.png', width: 80, height: 80 },
  { name: 'Merrill Lynch', brandKey: 'MERRILL' },
  { name: 'Public', brandKey: 'PUBLIC' },
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
      <p className="bl-status-pill lf-mono">
        <span className="bl-status-dot" aria-hidden="true" />
        <span>
          <span className="bl-status-count">1,000+</span> brokerages &amp; exchanges supported
        </span>
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
