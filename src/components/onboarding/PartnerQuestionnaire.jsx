'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-browser';

/**
 * Partner onboarding questionnaire — shown to partners on first login.
 *
 * Deliberately gathers ONLY investing interests + content direction. Identity,
 * eligibility, payout/banking and terms are already collected during the
 * partner application, so they are never re-asked here.
 *
 * Mechanics (progress, Continue, Back, progressive persistence, completion
 * flag) mirror InvestorQuestionnaire; styling is the partner gold/champagne
 * accent via the `.iq-container--partner` scope.
 */
const QUESTIONS = [
  {
    id: 1,
    category: 'Investing focus',
    multi: true,
    question: "What's your investing focus?",
    options: [
      { label: 'US equities', value: 'us_equities' },
      { label: 'Canadian & international', value: 'intl' },
      { label: 'Options & derivatives', value: 'options' },
      { label: 'Crypto & digital assets', value: 'crypto' },
      { label: 'ETFs & index funds', value: 'etfs' },
      { label: 'Alternative data & congressional trades', value: 'alt_data' },
      { label: 'Macro & geopolitics', value: 'macro' },
      { label: 'Value / fundamental', value: 'value' },
      { label: 'Technical / quantitative', value: 'technical' },
    ],
  },
  {
    id: 2,
    category: 'Content',
    multi: true,
    question: 'What kind of content do you want to create on Ezana?',
    options: [
      { label: 'Written research & theses', value: 'written' },
      { label: 'Market commentary & takes', value: 'commentary' },
      { label: 'Educational explainers', value: 'educational' },
      { label: 'Portfolio breakdowns & trade ideas', value: 'portfolio' },
      { label: 'Data-driven / quant analysis', value: 'quant' },
      { label: 'Video or audio', value: 'video_audio' },
      { label: 'Congressional-trade tracking', value: 'congress' },
    ],
  },
  {
    id: 3,
    category: 'Experience',
    question: 'How would you describe your investing experience?',
    options: [
      { label: 'Newer & still learning', value: 'newer' },
      { label: 'A few years in', value: 'few_years' },
      { label: 'Seasoned / advanced', value: 'seasoned' },
      { label: 'I work in finance professionally', value: 'professional' },
    ],
  },
  {
    id: 4,
    category: 'Goals',
    question: "What's your primary goal as an Ezana partner?",
    options: [
      { label: 'Build an audience', value: 'audience' },
      { label: 'Monetize my analysis', value: 'monetize' },
      { label: 'Establish credibility & track record', value: 'credibility' },
      { label: 'Teach & grow a community', value: 'community' },
      { label: 'Share alongside my own investing', value: 'share' },
    ],
  },
  {
    id: 5,
    category: 'Cadence',
    question: 'How often do you expect to publish?',
    options: [
      { label: 'Daily', value: 'daily' },
      { label: 'A few times a week', value: 'few_week' },
      { label: 'Weekly', value: 'weekly' },
      { label: 'A few times a month', value: 'few_month' },
      { label: 'When inspiration strikes', value: 'inspiration' },
    ],
  },
];

export function PartnerQuestionnaire({ userId, onComplete }) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [multiSelections, setMultiSelections] = useState({});
  const [done, setDone] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [saving, setSaving] = useState(false);

  const finalize = useCallback(
    async (finalAnswers) => {
      if (userId) {
        try {
          // partner_questionnaire stores the answers; the shared
          // investor_questionnaire_completed + onboarding_completed flags mark
          // onboarding done so this never shows again (same gate the rest of
          // the flow checks). Written defensively: a failure here is logged but
          // never blocks the partner from continuing.
          const { error } = await supabase
            .from('profiles')
            .update({
              partner_questionnaire: finalAnswers,
              investor_questionnaire_completed: true,
              onboarding_completed: true,
              onboarding_step: 99,
            })
            .eq('id', userId);
          if (error) console.error('[PartnerQuestionnaire] finalize', error);
        } catch (e) {
          console.error('[PartnerQuestionnaire] finalize', e);
        }
      }
      setDone(true);
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('partner_questionnaire, investor_questionnaire_completed')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (data?.investor_questionnaire_completed) {
        onCompleteRef.current?.();
        return;
      }

      const saved = data?.partner_questionnaire || {};
      if (typeof saved === 'object' && Object.keys(saved).length > 0) {
        setAnswers(saved);
        const answeredIds = Object.keys(saved).map(Number);
        const firstUnanswered = QUESTIONS.findIndex((q) => !answeredIds.includes(q.id));
        if (firstUnanswered >= 0) {
          setCurrentQ(firstUnanswered);
        }
        const multiState = {};
        for (const q of QUESTIONS.filter((x) => x.multi)) {
          if (Array.isArray(saved[q.id])) multiState[q.id] = saved[q.id];
        }
        setMultiSelections(multiState);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveProgress = useCallback(
    async (updatedAnswers) => {
      if (!userId) return;
      setSaving(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ partner_questionnaire: updatedAnswers })
          .eq('id', userId);
        if (error) console.error('[PartnerQuestionnaire] save', error);
      } finally {
        setSaving(false);
      }
    },
    [userId],
  );

  const q = QUESTIONS[currentQ];
  const progress = (currentQ / QUESTIONS.length) * 100;

  const advance = useCallback(
    (newAnswers) => {
      setAnimating(true);
      setTimeout(() => {
        if (currentQ < QUESTIONS.length - 1) {
          setCurrentQ((p) => p + 1);
        } else {
          finalize(newAnswers);
        }
        setAnimating(false);
      }, 300);
    },
    [currentQ, finalize],
  );

  const handleSelect = (value) => {
    if (q.multi) {
      setMultiSelections((prev) => {
        const current = prev[q.id] || [];
        return {
          ...prev,
          [q.id]: current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value],
        };
      });
    } else {
      const newAnswers = { ...answers, [q.id]: value };
      setAnswers(newAnswers);
      saveProgress(newAnswers);
      advance(newAnswers);
    }
  };

  const confirmMulti = () => {
    const newAnswers = { ...answers, [q.id]: multiSelections[q.id] || [] };
    setAnswers(newAnswers);
    saveProgress(newAnswers);
    advance(newAnswers);
  };

  const goBack = () => {
    if (currentQ > 0) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentQ((p) => p - 1);
        setAnimating(false);
      }, 200);
    }
  };

  if (done) {
    return (
      <div className="iq-container iq-container--partner">
        <div className="iq-card">
          <div className="iq-result-level-label">Welcome, Partner</div>
          <h1 className="iq-result-title">You&apos;re all set</h1>
          <p className="iq-result-desc">
            Thanks — we&apos;ll use this to tailor your partner tools and surface the right audience
            for the content you want to create.
          </p>
          <button type="button" className="iq-cta-btn" onClick={() => onCompleteRef.current?.()}>
            Continue to your partner hub
          </button>
          <p className="iq-footnote">You can update these preferences anytime in Settings.</p>
        </div>
      </div>
    );
  }

  const currentMulti = multiSelections[q.id] || [];

  return (
    <div className="iq-container iq-container--partner">
      <div className="iq-card">
        <div className="iq-header">
          <div className="iq-logo-row">
            <span className="iq-logo">EZANA</span>
            <span className="iq-logo-sub">PARTNERS</span>
          </div>
          <span className="iq-step-counter">
            {currentQ + 1} / {QUESTIONS.length}
          </span>
        </div>

        <div className="iq-progress-track">
          <div className="iq-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="iq-category-pill">{q.category}</div>

        <div
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(12px)' : 'translateY(0)',
            transition: 'all 0.3s ease',
          }}
        >
          <h2 className="iq-question">{q.question}</h2>

          {q.multi && <p className="iq-multi-hint">Select all that apply</p>}

          <div className="iq-options-list">
            {q.options.map((opt) => {
              const isSelected = q.multi
                ? currentMulti.includes(opt.value)
                : answers[q.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`iq-option-btn ${isSelected ? 'is-selected' : ''}`}
                >
                  <span
                    className={`iq-option-radio ${isSelected ? 'is-selected' : ''}`}
                    style={{ borderRadius: q.multi ? 4 : 20 }}
                  >
                    {isSelected && q.multi ? '✓' : ''}
                  </span>
                  <span className="iq-option-label">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {q.multi && currentMulti.length > 0 && (
            <button type="button" className="iq-confirm-btn" onClick={confirmMulti}>
              Continue →
            </button>
          )}
        </div>

        <div className="iq-footer">
          {currentQ > 0 && (
            <button type="button" className="iq-back-btn" onClick={goBack}>
              ← Back
            </button>
          )}
          {saving && <span className="iq-saving-indicator">Saving…</span>}
        </div>
      </div>
    </div>
  );
}
