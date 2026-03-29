'use client';

import { useEffect } from 'react';
import { AnimatedWaitlistForm } from '@/components/landing/AnimatedWaitlistForm';
import { GlobeWithNotificationCards } from '@/components/landing/GlobeWithNotificationCards';
import { AnimatedWords } from '@/components/ui/animated-words';
import CybercoreBackground from '@/components/ui/cybercore-section-hero';
import '@/components/ui/cybercore-hero.css';

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
    <div className="hero-cybercore-root">
      <div className="hero-cybercore-bg" aria-hidden>
        <CybercoreBackground beamCount={56} />
      </div>
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
          <div className="hero-waitlist animate-in" data-delay="1750">
            <AnimatedWaitlistForm alignLeft />
          </div>
        </div>
        <div className="card-preview globe-preview animate-in" data-delay="450">
          <GlobeWithNotificationCards size={460} />
        </div>
      </div>
    </div>
  );
}
