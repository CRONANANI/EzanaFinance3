'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import './TrueFocus.css';

/**
 * TrueFocus — adapted from React Bits.
 *
 * Works with multi-word focus groups and supports a static connector
 * word that is never blurred.
 */
const TrueFocus = ({
  groups = [
    { words: ['Your', 'network'] },
    { words: ['is'], static: true },
    { words: ['your', 'net', 'worth'] },
  ],
  blurAmount = 5,
  borderColor = '#10b981',
  glowColor = 'rgba(16, 185, 129, 0.6)',
  animationDuration = 0.5,
  pauseBetweenAnimations = 1.5,
  manualMode = true,
}) => {
  const focusableGroups = groups.filter((g) => !g.static);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(true);
  const containerRef = useRef(null);
  const groupRefs = useRef([]);
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const focusableIndices = groups.reduce((acc, g, i) => {
    if (!g.static) acc.push(i);
    return acc;
  }, []);

  useEffect(() => {
    if (manualMode) return;
    const interval = setInterval(
      () => {
        setHasInteracted(true);
        setActiveGroupIndex((prev) => {
          if (prev === null) return 0;
          return (prev + 1) % focusableGroups.length;
        });
      },
      (animationDuration + pauseBetweenAnimations) * 1000,
    );
    return () => clearInterval(interval);
  }, [manualMode, animationDuration, pauseBetweenAnimations, focusableGroups.length]);

  const updateRect = useCallback(() => {
    if (activeGroupIndex === null || activeGroupIndex < 0) return;
    const realIndex = focusableIndices[activeGroupIndex];
    const el = groupRefs.current[realIndex];
    const container = containerRef.current;
    if (!el || !container) return;

    const parentRect = container.getBoundingClientRect();
    const activeRect = el.getBoundingClientRect();

    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height,
    });
  }, [activeGroupIndex, focusableIndices]);

  useEffect(() => {
    updateRect();
  }, [updateRect]);

  useEffect(() => {
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [updateRect]);

  const handleMouseEnter = (focusableIdx) => {
    if (!hasInteracted) setHasInteracted(true);
    setActiveGroupIndex(focusableIdx);
  };

  const handleMouseLeave = () => {
    // Keep the last hovered group focused (don't reset)
  };

  let focusableCounter = -1;

  return (
    <span className="focus-container" ref={containerRef}>
      {groups.map((group, groupIdx) => {
        if (group.static) {
          return (
            <span
              key={groupIdx}
              ref={(el) => {
                groupRefs.current[groupIdx] = el;
              }}
              className="focus-static"
            >
              {group.words.join(' ')}
            </span>
          );
        }

        focusableCounter++;
        const myFocusIdx = focusableCounter;
        const isActive = activeGroupIndex === myFocusIdx;
        const shouldBlur = hasInteracted && !isActive;

        return (
          <span
            key={groupIdx}
            ref={(el) => {
              groupRefs.current[groupIdx] = el;
            }}
            className="focus-group"
            style={{
              filter: shouldBlur ? `blur(${blurAmount}px)` : 'blur(0px)',
              transition: `filter ${animationDuration}s ease`,
            }}
            onMouseEnter={() => handleMouseEnter(myFocusIdx)}
            onMouseLeave={handleMouseLeave}
          >
            {group.words.map((word, wordIdx) => (
              <span key={wordIdx} className="focus-group-word">
                {word}
              </span>
            ))}
          </span>
        );
      })}

      <motion.div
        className="focus-frame"
        animate={{
          x: focusRect.x,
          y: focusRect.y,
          width: focusRect.width,
          height: focusRect.height,
          opacity: activeGroupIndex !== null && activeGroupIndex >= 0 ? 1 : 0,
        }}
        transition={{ duration: animationDuration, ease: 'easeInOut' }}
        style={{
          '--border-color': borderColor,
          '--glow-color': glowColor,
        }}
      >
        <span className="focus-corner top-left" />
        <span className="focus-corner top-right" />
        <span className="focus-corner bottom-left" />
        <span className="focus-corner bottom-right" />
      </motion.div>
    </span>
  );
};

export default TrueFocus;
