'use client';

import { useEffect } from 'react';
import { AnimatedWaitlistForm } from '@/components/landing/AnimatedWaitlistForm';
import { GlobeWithNotificationCards } from '@/components/landing/GlobeWithNotificationCards';
import { AnimatedWords } from '@/components/ui/animated-words';
import { AuroraTextEffect } from '@/components/lightswind/aurora-text-effect';

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
        <AuroraTextEffect
          text="Your network is your net worth"
          as="h1"
          fontSize="clamp(2rem, 5vw, 4rem)"
          className="hero-tagline bg-transparent dark:bg-transparent w-full overflow-visible"
          textClassName="font-extrabold tracking-tight text-white"
          colors={{
            first: "bg-emerald-400",
            second: "bg-teal-300",
            third: "bg-green-500",
            fourth: "bg-emerald-600",
          }}
          blurAmount="blur-xl"
          animationSpeed={{
            border: 8,
            first: 6,
            second: 7,
            third: 4,
            fourth: 14,
          }}
        />
        <p className="hero-subtitle">
          <AnimatedWords
            text="The best investors don't beat the market by luck—they just have better information. Ezana gives you retail institutional-grade data: legendary investor portfolios, real-time congressional trades, hedge fund 13F filings, and advanced market analytics. Connect your brokerage accounts to our platform and receive the same insights that drive billions in Wall Street decisions. This isn't retail investing. This is how the professionals play."
            baseDelay={300}
            staggerMs={20}
          />
        </p>
        <p className="hero-waitlist-intro hero-waitlist-intro-plain animate-in" data-delay="1750">
          <AnimatedWords
            text="Sign up for early access to Ezana Finance. The first 1,000 users receive lifetime legacy access—no subscription, no limits."
            baseDelay={1800}
            staggerMs={25}
          />
        </p>
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
