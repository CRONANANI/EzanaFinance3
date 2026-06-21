'use client';

import { useRef } from 'react';

export function SentimentSlider({ sentiment, onSentimentChange, isVoted, hint, disabled }) {
  const inputRef = useRef(null);

  return (
    <div className="echo-slider-container">
      <div className="echo-slider-track">
        <div className="echo-slider-ticks">
          {Array.from({ length: 21 }, (_, i) => (
            <div key={i} className="echo-slider-tick" />
          ))}
        </div>
      </div>
      <input
        ref={inputRef}
        type="range"
        min={0}
        max={100}
        value={sentiment}
        onChange={(e) => {
          if (disabled) return;
          onSentimentChange(Number(e.target.value));
        }}
        className="echo-slider-input"
        aria-label="Your sentiment, noise to signal"
        disabled={disabled}
      />
      <div
        className={`echo-slider-thumb${hint ? ' echo-slider-thumb--hint' : ''}`}
        style={{ left: `${sentiment}%` }}
        aria-hidden
      />
    </div>
  );
}
