'use client';

import { useEffect, useRef, useState } from 'react';
import Lightning from './Lightning';

const CARD_TRANSITION_SELECTOR = '.card-preview.globe-preview .globe-notification-cards';

/**
 * Periodic lightning. Drives `--lightning-flash` and `--globe-pulse` (globe + cards).
 * Globe/cards: 40% baseline → ramp to 100% over 300ms, hold through lightning (~400ms),
 * then ramp down to 40% over intervalMs/2.
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

    const clearStrikeTimers = () => {
      clearTimeout(flashOnTimer);
      clearTimeout(flashOffTimer);
      clearTimeout(globeRampUpTimer);
      clearTimeout(unmountTimer);
      clearTimeout(globeRampDownTimer);
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

      flashOnTimer = setTimeout(() => {
        root.style.setProperty('--lightning-flash', '1');
      }, 80);

      flashOffTimer = setTimeout(() => {
        root.style.setProperty('--lightning-flash', '0.4');
      }, 240);

      globeRampUpTimer = setTimeout(() => {
        const cardElements = root.querySelectorAll('.card-preview.globe-preview .globe-notification-cards');
        if (globeContainer) {
          globeContainer.style.transitionDuration = '300ms';
        }
        cardElements.forEach((el) => {
          el.style.transitionDuration = '300ms';
        });
        root.style.setProperty('--globe-pulse', '1');
      }, 0);

      unmountTimer = setTimeout(() => {
        root.style.setProperty('--lightning-flash', '0');
        setStrikeActive(false);
      }, 400);

      const rampDownMs = `${intervalMs / 2}ms`;
      globeRampDownTimer = setTimeout(() => {
        const cardElements = root.querySelectorAll('.card-preview.globe-preview .globe-notification-cards');
        if (globeContainer) {
          globeContainer.style.transitionDuration = rampDownMs;
        }
        cardElements.forEach((el) => {
          el.style.transitionDuration = rampDownMs;
        });
        root.style.setProperty('--globe-pulse', '0.4');
      }, 700);
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
      const root = containerRef.current?.closest('.hero-cybercore-root');
      const globeContainer = root?.querySelector('.card-preview.globe-preview .globe-container');
      if (globeContainer) {
        globeContainer.style.removeProperty('transition-duration');
      }
      if (root) {
        root
          .querySelectorAll(CARD_TRANSITION_SELECTOR)
          .forEach((el) => el.style.removeProperty('transition-duration'));
        root.style.setProperty('--lightning-flash', '0');
        root.style.setProperty('--globe-pulse', '0.4');
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
