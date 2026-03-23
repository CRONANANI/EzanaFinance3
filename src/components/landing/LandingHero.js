'use client';

import { useEffect } from 'react';
import { AnimatedWaitlistForm } from '@/components/landing/AnimatedWaitlistForm';
import { GlobeWithNotificationCards } from '@/components/landing/GlobeWithNotificationCards';
import { AnimatedWords } from '@/components/ui/animated-words';

export function LandingHero() {
  useEffect(() => {
    const timeouts = [];
    const runAnimations = () => {
      const elements = document.querySelectorAll('.word-animate, .animate-in');
      elements.forEach((el) => {
        const delay = parseInt(el.getAttribute('data-delay'), 10) || 0;
        const t = setTimeout(() => {
          if (el) el.style.animation = 'word-appear 0.4s ease-out forwards';
        }, delay);
        timeouts.push(t);
      });
    };
    timeouts.push(setTimeout(runAnimations, 250));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="content-container hero-container">
      <div className="hero-content">
        <h1 className="hero-tagline">Your network is your net worth</h1>
        <p className="hero-subtitle">
          <AnimatedWords
            text="The best investors don't beat the market by luck—they just have better information. Ezana gives you retail institutional-grade data: legendary investor portfolios, real-time congressional trades, hedge fund 13F filings, and advanced market analytics. Connect your brokerage accounts to our platform and receive the same insights that drive billions in Wall Street decisions. This isn't retail investing. This is how the professionals play."
            baseDelay={300}
            staggerMs={20}
          />
        </p>
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <p
            className="animate-in"
            data-delay="1750"
            style={{
              textAlign: 'center',
              width: '100%',
              display: 'block',
              marginLeft: 'auto',
              marginRight: 'auto',
              marginTop: '0.9rem',
              marginBottom: '1.5rem',
              paddingLeft: 0,
              paddingRight: 0,
              maxWidth: '100%',
              boxSizing: 'border-box',
              color: '#10b981',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              lineHeight: 1.6,
              fontWeight: 400,
              whiteSpace: 'normal',
            }}
          >
            <AnimatedWords
              text="Sign up for early access to Ezana Finance. The first 1,000 users receive lifetime Personal Advanced access — no subscription, no limits."
              baseDelay={1800}
              staggerMs={25}
            />
          </p>
        </div>
        <div className="hero-waitlist animate-in" data-delay="2050">
          <AnimatedWaitlistForm />
        </div>
      </div>
      <div className="card-preview globe-preview animate-in" data-delay="450">
        <GlobeWithNotificationCards size={460} />
      </div>
    </div>
  );
}
