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
        <div className="hero-subtitle hero-subtitle--lead">
          <AnimatedWords
            text="Better data, Better decisions, Better Returns."
            baseDelay={300}
            staggerMs={20}
          />
        </div>
        <p className="hero-subtitle hero-subtitle--secondary">
          <AnimatedWords
            text="Ezana brings Wall Street intelligence to your portfolio."
            baseDelay={520}
            staggerMs={22}
          />
        </p>
        <p className="hero-waitlist-intro animate-in" data-delay="1750">
          <AnimatedWords
            text="Sign up for early access to Ezana Finance. The first 1,000 users receive lifetime Personal Advanced access — no subscription, no limits."
            baseDelay={1800}
            staggerMs={25}
          />
        </p>
        <div className="hero-waitlist animate-in" data-delay="2050">
          <AnimatedWaitlistForm alignLeft />
        </div>
      </div>
      <div className="card-preview globe-preview animate-in" data-delay="450">
        <GlobeWithNotificationCards size={460} />
      </div>
    </div>
  );
}
