'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function MarketingPageShell({ children }) {
  return (
    <div className="mkt-page">
      <header className="mkt-top">
        <Link href="/" className="mkt-back">
          <ArrowLeft size={16} aria-hidden />
          Back to home
        </Link>
        <Link href="/auth/login" className="mkt-cta-top">
          Get started
        </Link>
      </header>
      <main className="mkt-main">{children}</main>
    </div>
  );
}
