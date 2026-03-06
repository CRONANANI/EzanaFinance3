'use client';

/**
 * Renders text with word-by-word animation (DigitalSerenity-style).
 * Each word fades in with translateY, scale, and blur.
 * Parent must run animateWords() on mount (see LandingHero).
 */
export function AnimatedWords({ text, className = '', baseDelay = 0, staggerMs = 50 }) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <>
      {words.map((word, i) => (
        <span
          key={i}
          className={`word-animate ${className}`.trim()}
          data-delay={500 + baseDelay + i * staggerMs}
        >
          {word}
          {i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </>
  );
}
