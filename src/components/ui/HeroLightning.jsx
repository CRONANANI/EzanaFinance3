'use client';

import { useEffect, useRef, useState } from 'react';
import Lightning from './Lightning';

const CARD_TRANSITION_SELECTOR = '.card-preview.globe-preview .globe-notification-cards';

/**
 * Periodic lightning. Drives `--lightning-flash`, `--globe-pulse` (globe only),
 * and `--card-pulse` (columns: fade in with bolt ~300ms, fade out 1400ms from bolt end).
 */

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function nextStrikeParams() {
  return {
    xOffset: randomBetween(-0.6, 0.6),
    hue: randomBetween(140, 170),
    intensity: randomBetween(1.0, 1.6),
    size: randomBetween(0.6, 0.9),
    rotation: randomBetween(-15, 15),
    speed: randomBetween(0.7, 1.0),
  };
}

export default function HeroLightning({ intervalMs = 3000, onStrike }) {
  const containerRef = useRef(null);
  const [strikeActive, setStrikeActive] = useState(false);
  const [strikeKey, setStrikeKey] = useState(0);
  const [strikeParams, setStrikeParams] = useState(nextStrikeParams);

  useEffect(() => {
    let mountedTimer;
    let interval;
    let flashOnTimer;
    let flashOffTimer;
    let globeRampUpTimer;
    let unmountTimer;
    let globeRampDownTimer;
    let cardFadeOutTimer;

    const clearStrikeTimers = () => {
      clearTimeout(flashOnTimer);
      clearTimeout(flashOffTimer);
      clearTimeout(globeRampUpTimer);
      clearTimeout(unmountTimer);
      clearTimeout(globeRampDownTimer);
      clearTimeout(cardFadeOutTimer);
    };

    const triggerStrike = () => {
      clearStrikeTimers();
      setStrikeParams(nextStrikeParams());
      setStrikeActive(true);
      setStrikeKey((k) => k + 1);

      const strikeSide = Math.random() < 0.5 ? 'left' : 'right';
      if (onStrike) {
        onStrike(strikeSide);
      }

      const root = containerRef.current?.closest('.hero-cybercore-root');
      if (!root) return;

      const globeContainer = root.querySelector('.card-preview.globe-preview .globe-container');
      const cardElements = root.querySelectorAll(CARD_TRANSITION_SELECTOR);

      // t=0 — globe ramps up 40% → 100% over 300ms
      globeRampUpTimer = setTimeout(() => {
        if (globeContainer) globeContainer.style.transitionDuration = '300ms';
        root.style.setProperty('--globe-pulse', '1');
      }, 0);

      // t=80ms — bolt on; card fades in over 300ms (synced with globe ramp-up end ~380ms)
      flashOnTimer = setTimeout(() => {
        root.style.setProperty('--lightning-flash', '1');
        cardElements.forEach((el) => {
          el.style.transitionDuration = '300ms';
          el.style.transitionTimingFunction = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        });
        root.style.setProperty('--card-pulse', '1');
      }, 80);

      flashOffTimer = setTimeout(() => {
        root.style.setProperty('--lightning-flash', '0.4');
      }, 240);

      unmountTimer = setTimeout(() => {
        root.style.setProperty('--lightning-flash', '0');
        setStrikeActive(false);
      }, 400);

      const rampDownMs = `${intervalMs / 2}ms`;
      globeRampDownTimer = setTimeout(() => {
        if (globeContainer) globeContainer.style.transitionDuration = rampDownMs;
        root.style.setProperty('--globe-pulse', '0.4');
      }, 700);

      // t=400ms — bolt gone; fade card out over 1400ms (invisible by t=1800ms, 1.2s gap to next strike)
      cardFadeOutTimer = setTimeout(() => {
        cardElements.forEach((el) => {
          el.style.transitionDuration = '1400ms';
          el.style.transitionTimingFunction = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        });
        root.style.setProperty('--card-pulse', '0');
      }, 400);
    };

    mountedTimer = setTimeout(triggerStrike, 800);
    interval = setInterval(triggerStrike, intervalMs);

    return () => {
      clearTimeout(mountedTimer);
      clearInterval(interval);
      clearTimeout(flashOnTimer);
      clearTimeout(flashOffTimer);
      clearTimeout(globeRampUpTimer);
      clearTimeout(unmountTimer);
      clearTimeout(globeRampDownTimer);
      clearTimeout(cardFadeOutTimer);
      const root = containerRef.current?.closest('.hero-cybercore-root');
      const globeContainer = root?.querySelector('.card-preview.globe-preview .globe-container');
      if (globeContainer) {
        globeContainer.style.removeProperty('transition-duration');
      }
      if (root) {
        root.querySelectorAll(CARD_TRANSITION_SELECTOR).forEach((el) => {
          el.style.removeProperty('transition-duration');
          el.style.removeProperty('transition-timing-function');
        });
        root.style.setProperty('--lightning-flash', '0');
        root.style.setProperty('--globe-pulse', '0.4');
        root.style.setProperty('--card-pulse', '0');
      }
    };
  }, [intervalMs, onStrike]);

  return (
    <div ref={containerRef} className="hero-lightning-strike" aria-hidden="true">
      {strikeActive && (
        <div
          key={strikeKey}
          className="hero-lightning-canvas"
          style={{
            transform: `rotate(${strikeParams.rotation}deg)`,
          }}
        >
          <Lightning
            hue={strikeParams.hue}
            xOffset={strikeParams.xOffset}
            speed={strikeParams.speed}
            intensity={strikeParams.intensity}
            size={strikeParams.size}
          />
        </div>
      )}
    </div>
  );
}
