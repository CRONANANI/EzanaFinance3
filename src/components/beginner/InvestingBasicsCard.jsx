'use client';

import Link from 'next/link';
import {
  DIVERSIFICATION_DISCLAIMER,
  DIVERSIFICATION_LESSON_PATH,
} from '@/lib/education/diversification';
import { useBeginnerLevelOptional } from '@/contexts/BeginnerLevelContext';
import './beginner.css';

export function InvestingBasicsCard() {
  const beginner = useBeginnerLevelOptional();
  if (!beginner || !beginner.showTips || beginner.band === 'seasoned') return null;
  if (beginner.seen.has('edu:investing-basics-card')) return null;

  return (
    <div className="beginner-edu-card" role="region" aria-label="Investing basics education">
      <div className="beginner-edu-card__eyebrow">Investing Basics · Education</div>
      <h3 className="beginner-edu-card__title">Understanding Risk &amp; Diversification</h3>
      <p className="beginner-edu-card__body">
        Learn how spreading investments across many companies can reduce company-specific risk — and
        what tradeoffs that involves (including market risk you cannot diversify away).
      </p>
      <p className="beginner-edu-card__disclaimer">{DIVERSIFICATION_DISCLAIMER}</p>
      <div className="beginner-edu-card__actions">
        <Link href={DIVERSIFICATION_LESSON_PATH} className="beginner-edu-card__link">
          Open lesson
        </Link>
        <button
          type="button"
          className="beginner-edu-card__dismiss"
          onClick={() => beginner.markSeen('edu:investing-basics-card')}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
