/**
 * BrokerageLogos — "Connect your brokerage account" section.
 * Five static logo tiles; one tile at a time flips on its Y axis into a logo
 * that is not currently on screen, roughly every 2.4s.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
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

const VISIBLE_SLOTS = 5;
const FLIP_EVERY_MS = 2400;
const FLIP_HALF_MS = 300;

// Repo convention: no Math.random(). Advancing an integer counter through a
// seeded-sin hash gives a stable, well-scattered pseudo-random sequence and
// keeps SSR output deterministic (first paint is always the first 5 logos).
const seededRand = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function BrokerageLogos() {
  const [slots, setSlots] = useState([0, 1, 2, 3, 4]);
  const [flippingSlot, setFlippingSlot] = useState(null);
  const counterRef = useRef(0);
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);

  // Flip only while the section is on screen (same IntersectionObserver
  // pattern as WhyEzanaSection).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver((es) => setInView(es.some((e) => e.isIntersecting)), {
      rootMargin: '100px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const timeouts = [];
    const id = setInterval(() => {
      const c = (counterRef.current += 1);
      const slot = Math.floor(seededRand(c) * VISIBLE_SLOTS);

      const swap = () =>
        setSlots((prev) => {
          const pool = BROKERAGE_LOGOS.map((_, i) => i).filter((i) => !prev.includes(i));
          if (pool.length === 0) return prev;
          const next = pool[Math.floor(seededRand(c * 2 + 1) * pool.length)];
          const copy = [...prev];
          copy[slot] = next;
          return copy;
        });

      if (reduced) {
        // Reduced motion: the logo still rotates through, but with a plain
        // swap and no 3D flip animation.
        swap();
        return;
      }
      setFlippingSlot(slot);
      timeouts.push(window.setTimeout(swap, FLIP_HALF_MS));
      timeouts.push(window.setTimeout(() => setFlippingSlot(null), FLIP_HALF_MS * 2));
    }, FLIP_EVERY_MS);

    return () => {
      clearInterval(id);
      timeouts.forEach(clearTimeout);
    };
  }, [inView]);

  return (
    <section className="bl-section" aria-labelledby="bl-heading" ref={sectionRef}>
      <p className="bl-eyebrow lf-mono">Integrations</p>
      <h2 id="bl-heading" className="bl-heading">
        Every account, one command center
      </h2>
      <p className="bl-subheading">
        Securely link 1,000+ brokerages and crypto exchanges. Read holdings or place trades from
        supported brokers — without leaving Ezana.
        <BrokerageTradeInfo />
      </p>

      <div className="bl-flip-row">
        {slots.map((logoIdx, slot) => (
          <div key={slot} className={`bl-flip-slot${flippingSlot === slot ? ' is-flipping' : ''}`}>
            {/* Keyed by logo, not by slot: LogoTile carries its own `failed`
                state, and a slot that reuses the instance would keep a previous
                logo's broken-image verdict after the flip. */}
            <LogoTile key={BROKERAGE_LOGOS[logoIdx].name} logo={BROKERAGE_LOGOS[logoIdx]} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default BrokerageLogos;
