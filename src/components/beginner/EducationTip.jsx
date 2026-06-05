'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DIVERSIFICATION_DISCLAIMER,
  DIVERSIFICATION_LESSON_PATH,
  getDiversificationPoint,
} from '@/lib/education/diversification';
import { useBeginnerLevelOptional } from '@/contexts/BeginnerLevelContext';
import './beginner.css';

const TOPIC_POINT = {
  diversification: 'index-spread',
};

export function EducationTip({ topic = 'diversification' }) {
  const beginner = useBeginnerLevelOptional();
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const seenKey = `edu-tip:${topic}`;

  if (!beginner || beginner.band !== 'beginner' || !beginner.showTips) return null;
  if (sessionDismissed || beginner.seen.has(seenKey)) return null;

  const point = getDiversificationPoint(TOPIC_POINT[topic] || 'index-spread');

  const dismiss = () => {
    setSessionDismissed(true);
    beginner.markSeen(seenKey);
  };

  return (
    <div className="beginner-edu-card" role="note" aria-label="Educational tip">
      <div className="beginner-edu-card__eyebrow">Did you know? · Education</div>
      <p className="beginner-edu-card__body">{point.plainExplanation}</p>
      <p className="beginner-edu-card__tradeoff">
        <strong>Tradeoff:</strong> {point.tradeoff}
      </p>
      <p className="beginner-edu-card__disclaimer">{DIVERSIFICATION_DISCLAIMER}</p>
      <div className="beginner-edu-card__actions">
        <Link href={DIVERSIFICATION_LESSON_PATH} className="beginner-edu-card__link">
          Learn more
        </Link>
        <button type="button" className="beginner-edu-card__dismiss" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
