'use client';

import { useState, useEffect, useCallback } from 'react';

export function PptxPreviewer({ file }) {
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = Array.isArray(file.slideUrls) ? file.slideUrls : [];
  const total = slides.length;

  useEffect(() => {
    if (total <= 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setSlideIndex((i) => Math.min(total - 1, i + 1));
      if (e.key === 'ArrowLeft') setSlideIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [total]);

  const goPrev = useCallback(() => setSlideIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setSlideIndex((i) => Math.min(total - 1, i + 1)), [total]);

  if (total === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#8b949e' }}>
        <i className="bi bi-file-earmark-slides" style={{ fontSize: '3rem', color: '#ea580c', display: 'block', marginBottom: '0.75rem' }} />
        <p style={{ color: '#c9d1d9', marginBottom: '0.5rem' }}>Demo file — slides not generated</p>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', maxWidth: 360, margin: '0 auto' }}>
          Real uploads are converted to PNG slide images server-side. Each slide will render as a navigable image with
          prev/next + thumbnail strip.
        </p>
      </div>
    );
  }

  return (
    <div className="fp-pptx-wrap">
      <div className="fp-pptx-stage">
        <button
          type="button"
          className="fp-pptx-nav fp-pptx-nav-left"
          onClick={goPrev}
          disabled={slideIndex === 0}
          aria-label="Previous slide"
        >
          <i className="bi bi-chevron-left" />
        </button>
        <img
          src={slides[slideIndex]}
          alt={`Slide ${slideIndex + 1} of ${total}`}
          className="fp-pptx-slide"
        />
        <button
          type="button"
          className="fp-pptx-nav fp-pptx-nav-right"
          onClick={goNext}
          disabled={slideIndex === total - 1}
          aria-label="Next slide"
        >
          <i className="bi bi-chevron-right" />
        </button>
      </div>

      <div className="fp-pptx-toolbar">
        <span className="fp-page-counter">
          Slide {slideIndex + 1} of {total}
        </span>
      </div>

      <div className="fp-pptx-thumbs">
        {slides.map((src, i) => (
          <button
            key={i}
            type="button"
            className={`fp-pptx-thumb ${i === slideIndex ? 'is-active' : ''}`}
            onClick={() => setSlideIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
          >
            <img src={src} alt={`Slide ${i + 1}`} />
            <span>{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
