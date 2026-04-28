'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatedWaitlistForm } from '@/components/landing/AnimatedWaitlistForm';
import { GlobeWithNotificationCards } from '@/components/landing/GlobeWithNotificationCards';
import { AnimatedWords } from '@/components/ui/animated-words';
import { FallingPattern } from '@/components/ui/falling-pattern';
import HeroLightning from '@/components/ui/HeroLightning';
import { LAND_GEOJSON_URL } from '@/components/ui/interactive-globe';

/**
 * Landing hero sequence (after navbar paints from layout):
 * 1) Headline + subtitle lines (word animation)
 * 2) Waitlist CTA
 * 3) Falling pattern + globe fade in together (globe loads in background while copy runs)
 */
const RUN_ANIM_MS = 100;
/** When CTA copy can finish animating; hero background mounts after this (no pattern before CTA). */
const CTA_PHASE_MS = 2550;

/** Canvas size (square) for InteractiveGlobe — must match .globe-container CSS to avoid mobile crop/clipping. */
function useHeroGlobeSize() {
  const [size, setSize] = useState(400);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;

      // Tiny phones (<360px): JioPhone, Lumia 520, very small Androids
      if (w < 360) {
        setSize(180);
        return;
      }

      // Small phones (360-479px): most common Android phones
      if (w < 480) {
        setSize(220);
        return;
      }

      // Phablets / large phones (480-639px)
      if (w < 640) {
        setSize(260);
        return;
      }

      // Small tablets / phablets in landscape (640-767px)
      if (w < 768) {
        setSize(320);
        return;
      }

      // Tablets portrait / Surface near-min (768-1023px)
      if (w < 1024) {
        setSize(380);
        return;
      }

      // Desktops + Surface Pro landscape (1024px+) — existing logic
      const horizontalPad = 48;
      setSize(Math.min(460, Math.max(280, w - horizontalPad)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);
  return size;
}

export function LandingHero() {
  const heroRootRef = useRef(null);
  const [ctaPhaseDone, setCtaPhaseDone] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const globeSize = useHeroGlobeSize();

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
    if (reduceMotion) {
      setCtaPhaseDone(true);
      return;
    }
    const t = setTimeout(() => setCtaPhaseDone(true), CTA_PHASE_MS);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  const mountHeroBg = reduceMotion || ctaPhaseDone;
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

  useEffect(() => {
    const root = heroRootRef.current;
    if (!root) return;

    const handleMove = (e) => {
      const rect = root.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;

      const dx = x - 50;
      const dy = y - 60;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const reveal = Math.max(0, Math.min(1, 1 - distance / 28));

      root.style.setProperty('--cursor-x', `${x}%`);
      root.style.setProperty('--cursor-y', `${y}%`);
      root.style.setProperty('--globe-reveal', String(reveal));
    };

    const handleLeave = () => {
      root.style.setProperty('--globe-reveal', '0');
    };

    root.addEventListener('pointermove', handleMove, { passive: true });
    root.addEventListener('pointerleave', handleLeave, { passive: true });

    return () => {
      root.removeEventListener('pointermove', handleMove);
      root.removeEventListener('pointerleave', handleLeave);
    };
  }, []);

  return (
    <div className="hero-cybercore-root" data-hero-dark ref={heroRootRef}>
      {mountHeroBg && (
        <div
          className={`hero-aurora-bg ${showHeroVisual ? 'hero-aurora-bg--visible' : ''}`}
          aria-hidden
        >
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
          <div className="globe-aurora-glow" aria-hidden="true" />
          <GlobeWithNotificationCards size={globeSize} onGlobeReady={onGlobeReady} />
        </div>

        <div className="hero-cloud-field" aria-hidden="true">
          <div className="hero-cloud hero-cloud--1" />
          <div className="hero-cloud hero-cloud--2" />
          <div className="hero-cloud hero-cloud--3" />
          <div className="hero-cloud hero-cloud--4" />
          <div className="hero-cloud hero-cloud--5" />
          <div className="hero-cloud hero-cloud--6" />
          <div className="hero-cloud hero-cloud--7" />
        </div>
        <HeroLightning intervalMs={3000} />
      </div>
    </div>
  );
}
