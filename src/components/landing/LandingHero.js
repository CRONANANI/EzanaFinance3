'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatedWaitlistForm } from '@/components/landing/AnimatedWaitlistForm';
import { GlobeWithNotificationCards } from '@/components/landing/GlobeWithNotificationCards';
import { AnimatedWords } from '@/components/ui/animated-words';
import AuroraBackground from '@/components/ui/cybercore-section-hero';
import '@/components/ui/cybercore-hero.css';
import { LAND_GEOJSON_URL } from '@/components/ui/interactive-globe';

/**
 * Landing hero sequence (after navbar paints from layout):
 * 1) Headline + subtitle lines (word animation)
 * 2) Waitlist CTA
 * 3) Aurora grid + globe fade in together (globe loads in background while copy runs)
 */
const RUN_ANIM_MS = 100;
/** When CTA copy can finish animating; aurora mounts after this (no grid before CTA). */
const CTA_PHASE_MS = 2550;

export function LandingHero() {
  const [ctaPhaseDone, setCtaPhaseDone] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [beamCount, setBeamCount] = useState(52);

  const onGlobeReady = useCallback(() => {
    setGlobeReady(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = LAND_GEOJSON_URL;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, []);

  useEffect(() => {
    const updateBeams = () => {
      const w = window.innerWidth;
      if (w <= 768) setBeamCount(28);
      else if (w <= 1024) setBeamCount(40);
      else setBeamCount(52);
    };
    updateBeams();
    window.addEventListener('resize', updateBeams);
    return () => window.removeEventListener('resize', updateBeams);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setCtaPhaseDone(true);
      return;
    }
    const t = setTimeout(() => setCtaPhaseDone(true), CTA_PHASE_MS);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  const mountAurora = reduceMotion || ctaPhaseDone;
  const showHeroVisual = reduceMotion ? ctaPhaseDone : ctaPhaseDone && globeReady;

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
    timeouts.push(setTimeout(runAnimations, reduceMotion ? 0 : RUN_ANIM_MS));
    return () => timeouts.forEach(clearTimeout);
  }, [reduceMotion]);

  return (
    <div className="hero-cybercore-root">
      {mountAurora && (
        <div
          className={`hero-aurora-bg ${showHeroVisual ? 'hero-aurora-bg--visible' : ''}`}
          aria-hidden
        >
          <AuroraBackground beamCount={beamCount} />
        </div>
      )}

      <div className="content-container hero-container">
        <div className="hero-content-column">
          <div className="hero-content">
            <h1 className="hero-tagline">
              <AnimatedWords text="Your network is your net worth" baseDelay={160} staggerMs={40} />
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
        <div className={`card-preview globe-preview ${showHeroVisual ? 'globe-preview--visible' : ''}`}>
          <GlobeWithNotificationCards size={460} onGlobeReady={onGlobeReady} />
        </div>
      </div>
    </div>
  );
}
