'use client';

import { useEffect, useState } from 'react';
import { AnimatedWaitlistForm } from '@/components/landing/AnimatedWaitlistForm';
import { AnimatedWords } from '@/components/ui/animated-words';
import { FallingPattern } from '@/components/ui/falling-pattern';
import AuroraShaderLayer from '@/components/ui/AuroraShaderLayer';
import { HeroVerticalDataFlow } from './HeroVerticalDataFlow';
import { HeroDeviceMockups } from './HeroDeviceMockups';

const CTA_PHASE_MS = 2550;

export function LandingHero() {
  const [ctaPhaseDone, setCtaPhaseDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setCtaPhaseDone(true);
      return;
    }
    const t = setTimeout(() => setCtaPhaseDone(true), CTA_PHASE_MS);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  const mountHeroBg = reduceMotion || ctaPhaseDone;

  useEffect(() => {
    const timeouts = [];
    timeouts.push(
      setTimeout(
        () => {
          document.querySelectorAll('.word-animate, .animate-in').forEach((el) => {
            const delay = parseInt(el.getAttribute('data-delay'), 10) || 0;
            const t = setTimeout(() => {
              if (el) el.style.animation = 'word-appear 0.4s ease-out forwards';
            }, delay);
            timeouts.push(t);
          });
        },
        reduceMotion ? 0 : 100,
      ),
    );
    return () => timeouts.forEach(clearTimeout);
  }, [reduceMotion]);

  return (
    <div className="hero-cybercore-root hero-cybercore-root--split" data-hero-dark>
      <div className="lightning-flash-overlay" aria-hidden />

      {mountHeroBg && (
        <div className="hero-aurora-bg hero-aurora-bg--visible" aria-hidden>
          <FallingPattern
            color="#059669"
            streakColor="rgba(5, 150, 105, 0.49)"
            sparkleColor="rgba(5, 150, 105, 0.7)"
            backgroundColor="#0a0e13"
            duration={120}
            blurIntensity="0em"
            density={1.25}
            className="h-full w-full"
          />
          <AuroraShaderLayer
            className="hero-aurora-shader-back"
            opacity={0.35}
            speed={0.7}
            tint="green"
          />
        </div>
      )}

      <div className="content-container hero-container hero-container--split">
        <div className="hero-split-toprow">
          <div className="hero-split-text">
            <div className="hero-content">
              <h1 className="hero-tagline">
                <AnimatedWords
                  text="Your network is your net worth"
                  baseDelay={160}
                  staggerMs={40}
                />
              </h1>
              <div className="hero-subtitle hero-subtitle--lead">
                <AnimatedWords
                  text="Better data, Better decisions, Better Returns."
                  baseDelay={480}
                  staggerMs={20}
                />
              </div>
              <p className="hero-subtitle hero-subtitle--secondary">
                <AnimatedWords
                  text="Ezana brings Wall Street intelligence to your portfolio."
                  baseDelay={720}
                  staggerMs={22}
                />
              </p>
              <div className="hero-waitlist animate-in" data-delay="1880">
                <AnimatedWaitlistForm />
              </div>
            </div>
          </div>

          <div className="hero-split-devices animate-in" data-delay="2400">
            <HeroDeviceMockups />
          </div>
        </div>

        <div className="hero-split-dataflow animate-in" data-delay="2600">
          <HeroVerticalDataFlow />
        </div>
      </div>
    </div>
  );
}
