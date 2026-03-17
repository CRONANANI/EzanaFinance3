/**
 * TrustedLogos — "Trusted by Industry Leaders" section
 *
 * Replaces the old placeholder rectangle cards with real
 * publication logos in a smooth infinite-scroll carousel.
 *
 * Logos: Financial Times, Reuters, Washington Post,
 *        Wall Street Journal, Fox Business
 *
 * Drop the logo PNGs into /public/logos/
 */

'use client';

import Image from 'next/image';
import './trusted-logos.css';

const LOGOS = [
  { name: 'Financial Times', src: '/logos/financial-times.png', width: 120, height: 60 },
  { name: 'Reuters', src: '/logos/reuters.png', width: 160, height: 45 },
  { name: 'The Washington Post', src: '/logos/washington-post.png', width: 200, height: 30 },
  { name: 'The Wall Street Journal', src: '/logos/wall-street-journal.png', width: 140, height: 55 },
  { name: 'Fox Business', src: '/logos/fox-business.png', width: 130, height: 55 },
];

export function TrustedLogos() {
  // Double the array for seamless infinite scroll
  const doubled = [...LOGOS, ...LOGOS];

  return (
    <section className="tl-section">
      <h2 className="tl-heading">Trusted by Industry Leaders</h2>
      <p className="tl-subheading">Featured in the world&apos;s most respected financial publications</p>

      <div className="tl-carousel-mask">
        <div className="tl-carousel-track">
          {doubled.map((logo, i) => (
            <div key={`${logo.name}-${i}`} className="tl-logo-item">
              <Image
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className="tl-logo-img"
                style={{ objectFit: 'contain' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustedLogos;
