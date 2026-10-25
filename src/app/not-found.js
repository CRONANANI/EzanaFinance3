import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import './not-found.css';

/* 404: "Wandered off" (design C), light mode. Full-bleed, no top nav:
   not-found.css hides the global nav and the phone sign-up bar while this page
   is mounted. .force-light-theme (theme-variables.css) pins the light token
   palette, so the page is light for every visitor, including dark-theme users. */

export const metadata = {
  title: 'Page not found | Ezana',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="ez-404 force-light-theme">
      <header className="ez-404__header">
        <Link href="/" className="ez-404__home-mark" aria-label="Ezana Finance home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ezana-logo.svg" alt="" width={48} height={48} />
        </Link>
      </header>

      <main id="main-content" className="ez-404__main">
        <div className="ez-404__content">
          <p className="ez-404__code" role="img" aria-label="Error 404">
            <span className="ez-404__digit" aria-hidden="true">
              4
            </span>
            <span className="ez-404__zero" aria-hidden="true">
              <span className="ez-404__orbit" />
              <span className="ez-404__disc" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ez-404__mark" src="/ezana-logo.svg" alt="" width={104} height={104} />
            </span>
            <span className="ez-404__digit" aria-hidden="true">
              4
            </span>
          </p>

          <h1 className="ez-404__title">
            This page <em>wandered off</em> the map.
          </h1>
          <p className="ez-404__lead">
            Even our best signals couldn’t track it down. Let’s get you back to familiar ground.
          </p>

          <div className="ez-404__actions">
            <Link href="/" className="ez-404__btn ez-404__btn--primary">
              <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
              Back to home
            </Link>
            <Link href="/help-center" className="ez-404__btn ez-404__btn--ghost">
              Visit Help Center
            </Link>
          </div>
        </div>
      </main>

      <footer className="ez-404__footer">ERROR 404 · EZANA.WORLD</footer>
    </div>
  );
}
