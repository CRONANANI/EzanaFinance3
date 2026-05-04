'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const QUESTIONS = [
  {
    id: 1, category: 'Experience',
    question: 'How long have you been actively investing?',
    options: [
      { label: "I'm brand new — haven't started yet", value: 'none', score: 0 },
      { label: 'Less than 1 year', value: 'beginner', score: 1 },
      { label: '1–3 years', value: 'intermediate', score: 2 },
      { label: '3–10 years', value: 'advanced', score: 3 },
      { label: '10+ years', value: 'expert', score: 4 },
    ],
  },
  {
    id: 2, category: 'Knowledge', multi: true,
    question: 'Which of these have you personally traded or held?',
    options: [
      { label: 'Stocks / ETFs', value: 'stocks', score: 1 },
      { label: 'Bonds / Fixed Income', value: 'bonds', score: 1 },
      { label: 'Options or Futures', value: 'derivatives', score: 2 },
      { label: 'Crypto / Digital Assets', value: 'crypto', score: 1 },
      { label: 'Prediction Markets (e.g. Polymarket)', value: 'prediction', score: 2 },
      { label: 'None of the above', value: 'none', score: 0 },
    ],
  },
  {
    id: 3, category: 'Risk Tolerance',
    question: 'Your portfolio drops 20% in a single week. What do you do?',
    options: [
      { label: "Sell everything — I can't handle that stress", value: 'very_low', score: 0 },
      { label: 'Sell some positions to reduce exposure', value: 'low', score: 1 },
      { label: 'Hold steady and wait for recovery', value: 'moderate', score: 2 },
      { label: "Buy more — it's on sale", value: 'high', score: 3 },
    ],
  },
  {
    id: 4, category: 'Goals',
    question: "What's your primary investment goal?",
    options: [
      { label: "Preserve my capital — don't lose what I have", value: 'preservation', score: 0 },
      { label: 'Steady income (dividends, interest)', value: 'income', score: 1 },
      { label: 'Long-term growth over 5+ years', value: 'growth', score: 2 },
      { label: 'Aggressive growth — maximize returns', value: 'aggressive', score: 3 },
      { label: 'Speculation / short-term trades', value: 'speculation', score: 4 },
    ],
  },
  {
    id: 5, category: 'Knowledge',
    question: "How confident are you reading a company's financial statements?",
    options: [
      { label: "I don't know what those are", value: 'none', score: 0 },
      { label: "I've heard of them but can't interpret them", value: 'aware', score: 1 },
      { label: 'I can understand the basics', value: 'basic', score: 2 },
      { label: 'I analyze them regularly before investing', value: 'proficient', score: 3 },
    ],
  },
  {
    id: 6, category: 'Risk Tolerance',
    question: 'What percentage of your total savings are you comfortable putting into investments?',
    options: [
      { label: 'Less than 10%', value: 'minimal', score: 0 },
      { label: '10–30%', value: 'conservative', score: 1 },
      { label: '30–60%', value: 'moderate', score: 2 },
      { label: '60–90%', value: 'aggressive', score: 3 },
      { label: "90%+ — I'm all in", value: 'yolo', score: 4 },
    ],
  },
  {
    id: 7, category: 'Interests', multi: true,
    question: 'Which areas of Ezana Finance interest you most?',
    options: [
      { label: 'Global market news & analysis', value: 'news', score: 0 },
      { label: 'Prediction markets & event trading', value: 'prediction', score: 0 },
      { label: 'Portfolio tracking & analytics', value: 'portfolio', score: 0 },
      { label: 'AI-powered trade signals', value: 'signals', score: 0 },
      { label: 'Learning & education', value: 'education', score: 0 },
    ],
  },
];

function computeProfile(answers) {
  let totalScore = 0;
  let maxScore = 0;

  QUESTIONS.forEach((q) => {
    const maxOption = Math.max(...q.options.map((o) => o.score));
    if (q.multi) {
      const selected = answers[q.id] || [];
      if (Array.isArray(selected)) {
        selected.forEach((v) => {
          const opt = q.options.find((o) => o.value === v);
          if (opt) totalScore += opt.score;
        });
      }
      maxScore += maxOption * (q.options.length - 1);
    } else {
      const opt = q.options.find((o) => o.value === answers[q.id]);
      if (opt) totalScore += opt.score;
      maxScore += maxOption;
    }
  });

  const pct = maxScore > 0 ? totalScore / maxScore : 0;
  const interests = Array.isArray(answers[7]) ? answers[7] : [];

  if (pct < 0.25) return { level: 'Beginner', risk: 'Conservative', interests, pct };
  if (pct < 0.5) return { level: 'Intermediate', risk: 'Moderate', interests, pct };
  if (pct < 0.75) return { level: 'Advanced', risk: 'Growth-Oriented', interests, pct };
  return { level: 'Expert', risk: 'Aggressive', interests, pct };
}

const PROFILE_CONFIGS = {
  Beginner: { icon: '🌱', desc: "You're just getting started. We'll surface educational content, low-risk insights, and beginner-friendly analysis." },
  Intermediate: { icon: '📊', desc: "You have solid foundations. We'll show deeper market analysis, prediction markets, and balanced risk insights." },
  Advanced: { icon: '🚀', desc: "You know your way around markets. We'll prioritize advanced analytics and sophisticated setups." },
  Expert: { icon: '⚡', desc: "You're a seasoned investor. We'll give you the full firehose — real-time signals, complex markets, institutional-grade analysis." },
};

export function InvestorQuestionnaire({ userId, onComplete }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [multiSelections, setMultiSelections] = useState({});
  const [done, setDone] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [saving, setSaving] = useState(false);

  const finalizeProfile = useCallback(async (finalAnswers) => {
    if (!userId) return;
    const profile = computeProfile(finalAnswers);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          investor_questionnaire: finalAnswers,
          investor_questionnaire_completed: true,
          investor_profile: profile,
        })
        .eq('id', userId);
      if (error) console.error('[InvestorQuestionnaire]', error);
    } catch (e) {
      console.error('[InvestorQuestionnaire]', e);
    }
    setDone(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('investor_questionnaire, investor_questionnaire_completed')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (data?.investor_questionnaire_completed) {
        onCompleteRef.current?.();
        return;
      }

      const saved = data?.investor_questionnaire || {};
      if (typeof saved === 'object' && Object.keys(saved).length > 0) {
        setAnswers(saved);
        const answeredIds = Object.keys(saved).map(Number);
        const firstUnanswered = QUESTIONS.findIndex((q) => !answeredIds.includes(q.id));
        if (firstUnanswered >= 0) {
          setCurrentQ(firstUnanswered);
        } else {
          await finalizeProfile(saved);
        }

        const multiState = {};
        for (const q of QUESTIONS.filter((x) => x.multi)) {
          if (Array.isArray(saved[q.id])) {
            multiState[q.id] = saved[q.id];
          }
        }
        setMultiSelections(multiState);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, finalizeProfile, onComplete]);

  const saveProgress = useCallback(async (updatedAnswers) => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ investor_questionnaire: updatedAnswers })
        .eq('id', userId);
      if (error) console.error('[InvestorQuestionnaire] save', error);
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const q = QUESTIONS[currentQ];
  const progress = (currentQ / QUESTIONS.length) * 100;

  const advance = useCallback(
    (newAnswers) => {
      setAnimating(true);
      setTimeout(() => {
        if (currentQ < QUESTIONS.length - 1) {
          setCurrentQ((p) => p + 1);
        } else {
          finalizeProfile(newAnswers);
        }
        setAnimating(false);
      }, 300);
    },
    [currentQ, finalizeProfile],
  );

  const handleSelect = (value) => {
    if (q.multi) {
      setMultiSelections((prev) => {
        const current = prev[q.id] || [];
        if (value === 'none') return { ...prev, [q.id]: ['none'] };
        const filtered = current.filter((v) => v !== 'none');
        return {
          ...prev,
          [q.id]: filtered.includes(value)
            ? filtered.filter((v) => v !== value)
            : [...filtered, value],
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
    const profile = computeProfile(answers);
    const cfg = PROFILE_CONFIGS[profile.level];
    return (
      <div className="iq-container">
        <div className="iq-card">
          <div className="iq-result-badge">
            <span style={{ fontSize: 48 }}>{cfg.icon}</span>
          </div>
          <h1 className="iq-result-title">Your Investor Profile</h1>
          <div className="iq-result-grid">
            <div className="iq-result-stat">
              <span className="iq-result-label">Skill Level</span>
              <span className="iq-result-value">{profile.level}</span>
            </div>
            <div className="iq-result-stat">
              <span className="iq-result-label">Risk Profile</span>
              <span className="iq-result-value">{profile.risk}</span>
            </div>
          </div>
          <p className="iq-result-desc">{cfg.desc}</p>
          <button type="button" className="iq-cta-btn" onClick={() => onCompleteRef.current?.()}>
            Continue to Ezana →
          </button>
          <p className="iq-footnote">Your profile shapes what you see. Update it anytime in Settings.</p>
        </div>
      </div>
    );
  }

  const currentMulti = multiSelections[q.id] || [];

  return (
    <div className="iq-container">
      <div className="iq-card">
        <div className="iq-header">
          <div className="iq-logo-row">
            <span className="iq-logo">EZANA</span>
            <span className="iq-logo-sub">FINANCE</span>
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
