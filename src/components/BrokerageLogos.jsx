/**
 * BrokerageLogos — "Connect Your Brokerage Account" section.
 *
 * Mirrors TrustedLogos carousel scaffolding but scrolls the opposite direction.
 * Logo files live in /public/brokerage-logos/.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import './brokerage-logos.css';

const BROKERAGE_LOGOS = [
  { name: 'Alpaca', src: '/brokerage-logos/alpaca.png', width: 80, height: 80 },
  { name: 'Binance', src: '/brokerage-logos/binance.png', width: 200, height: 40 },
  { name: 'Coinbase', src: '/brokerage-logos/coinbase.png', width: 80, height: 80 },
  { name: 'Robinhood', src: '/brokerage-logos/robinhood.png', width: 200, height: 56 },
  { name: 'eToro', src: '/brokerage-logos/etoro.png', width: 200, height: 56 },
  { name: 'Questrade', src: '/brokerage-logos/questrade.png', width: 180, height: 56 },
  { name: 'Tradier', src: '/brokerage-logos/tradier.png', width: 160, height: 50 },
  { name: 'TD Ameritrade', src: '/brokerage-logos/td-ameritrade.png', width: 200, height: 56 },
  { name: 'Wealthsimple', src: '/brokerage-logos/wealthsimple.png', width: 200, height: 40 },
  {
    name: 'Interactive Brokers',
    src: '/brokerage-logos/interactive-brokers.png',
    width: 200,
    height: 56,
  },
  { name: 'E*TRADE', src: '/brokerage-logos/etrade.png', width: 160, height: 56 },
  { name: 'Vanguard', src: '/brokerage-logos/vanguard.png', width: 200, height: 56 },
  { name: 'US Bank', src: '/brokerage-logos/us-bank.png', width: 200, height: 56 },
  { name: 'Trading 212', src: '/brokerage-logos/trading212.png', width: 200, height: 56 },
];

function LogoTile({ logo }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="bl-logo-item" title={logo.name}>
      <Image
        src={logo.src}
        alt={logo.name}
        width={logo.width}
        height={logo.height}
        className="bl-logo-img"
        style={{ objectFit: 'contain' }}
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}

export function BrokerageLogos() {
  const doubled = [...BROKERAGE_LOGOS, ...BROKERAGE_LOGOS];

  return (
    <section className="bl-section">
      <h2 className="bl-heading">Connect Your Brokerage Account</h2>
      <p className="bl-subheading">
        Securely link 80+ brokerages and crypto exchanges via SnapTrade — read holdings or place
        trades from Ezana
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
