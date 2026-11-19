import Link from 'next/link';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import './auth-shell.css';

/* The landing hero's dotted continents, as the same cacheable static asset
   (HeroDottedMap.jsx), without the hero's route lines or pulsing dots. */
const MAP_SRC = '/images/landing/hero-dotted-map-sparse.svg';

/**
 * The frame every sign-in page shares (Nov 2026): a quiet ground with the
 * landing page's dotted world map, faded so the card stays the focus, the
 * Ezana mark centred at the top, and the page's card centred beneath it.
 * Auth pages render light whatever the visitor's theme, so the palette is
 * set here and not read from the theme tokens that flip.
 */
export default function AuthShell({ children }) {
  return (
    <div className="signin-dark-lock as-scope as-shell">
      <div className="as-vignette" aria-hidden="true" />
      <div className="as-map" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MAP_SRC} alt="" width={337} height={170} draggable={false} decoding="async" />
      </div>

      <header className="as-header">
        <Link href="/" className="as-brand" aria-label="Ezana Finance home">
          <EzanaNavLogo width={40} height={46} className="as-brand-mark" />
        </Link>
      </header>

      <main className="as-main">{children}</main>
    </div>
  );
}
