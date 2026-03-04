'use client';

import WaitlistForm from '@/components/WaitlistForm';
import { InteractiveGlobe } from '@/components/ui/interactive-globe';

export function LandingHero() {
  return (
    <div className="content-container hero-container">
      <div className="hero-content">
        <h1 className="hero-tagline">Your Network Is Your Net Worth</h1>
        <p className="hero-subtitle">
          The best investors don&apos;t beat the market by luck—they just have better information. Ezana gives you retail institutional-grade data: legendary investor portfolios, real-time congressional trades, hedge fund 13F filings, and advanced market analytics. Connect your brokerage accounts to our platform and receive the same insights that drive billions in Wall Street decisions. This isn&apos;t retail investing. This is how the professionals play.
        </p>
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          First 1,000 users · Lifetime Legacy Access
        </div>
        <p className="hero-waitlist-intro">
          Sign up for early access to Ezana Finance. The first 1,000 users receive lifetime legacy access—no subscription, no limits.
        </p>
        <div className="hero-waitlist">
          <WaitlistForm />
        </div>
      </div>
      <div className="card-preview globe-preview">
        <div className="globe-container">
          <InteractiveGlobe size={460} />
        </div>
      </div>
    </div>
  );
}
