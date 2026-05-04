'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════
   Question Banks — shared base + role-specific extensions
   ═══════════════════════════════════════════════════════════ */

const SHARED_BASE = [
  {
    id: 'exp',
    category: 'Experience',
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
    id: 'assets',
    category: 'Knowledge',
    multi: true,
    question: 'Which asset classes have you personally traded or analyzed?',
    options: [
      { label: 'Equities / ETFs', value: 'stocks', score: 1 },
      { label: 'Fixed Income / Bonds', value: 'bonds', score: 1 },
      { label: 'Options / Futures / Derivatives', value: 'derivatives', score: 2 },
      { label: 'Crypto / Digital Assets', value: 'crypto', score: 1 },
      { label: 'Commodities / FX', value: 'commodities', score: 2 },
      { label: 'Private Equity / Venture', value: 'pe_vc', score: 2 },
    ],
  },
  {
    id: 'risk',
    category: 'Risk Tolerance',
    question: 'Your portfolio drops 20% in a single week. What do you do?',
    options: [
      { label: 'Sell everything — protect capital', value: 'very_low', score: 0 },
      { label: 'Trim positions to reduce exposure', value: 'low', score: 1 },
      { label: 'Hold steady and wait for recovery', value: 'moderate', score: 2 },
      { label: "Buy more — it's on sale", value: 'high', score: 3 },
    ],
  },
  {
    id: 'goal',
    category: 'Goals',
    question: "What's your primary investment objective?",
    options: [
      { label: 'Capital preservation — minimize drawdowns', value: 'preservation', score: 0 },
      { label: 'Steady income (dividends, yield)', value: 'income', score: 1 },
      { label: 'Long-term growth over 5+ years', value: 'growth', score: 2 },
      { label: 'Aggressive alpha generation', value: 'aggressive', score: 3 },
    ],
  },
];

const EXEC_QUESTIONS = [
  {
    id: 'exec_org_goal',
    category: 'Organization Goals',
    question: 'What is your primary goal for this investment council?',
    options: [
      { label: 'Build real-world portfolio management skills for members', value: 'skill_building', score: 0 },
      { label: 'Compete in investment competitions and case challenges', value: 'competitions', score: 0 },
      { label: 'Generate alpha in a real or simulated portfolio', value: 'alpha', score: 0 },
      { label: 'Create a professional network of future finance leaders', value: 'networking', score: 0 },
    ],
  },
  {
    id: 'exec_mgmt_style',
    category: 'Management Style',
    question: 'How do you prefer to run your team?',
    options: [
      { label: 'Top-down: I set the thesis, PMs execute', value: 'top_down', score: 0 },
      { label: 'Collaborative: PMs propose, I approve and guide', value: 'collaborative', score: 0 },
      { label: 'Autonomous: PMs and analysts operate independently, I oversee risk', value: 'autonomous', score: 0 },
      { label: 'Rotational: everyone cycles through roles to build breadth', value: 'rotational', score: 0 },
    ],
  },
  {
    id: 'exec_risk_oversight',
    category: 'Risk Oversight',
    question: 'How do you want to handle risk across the portfolio?',
    options: [
      { label: 'I review and approve every position before it opens', value: 'strict', score: 0 },
      { label: 'PMs can open positions within pre-set limits, I flag exceptions', value: 'limits', score: 0 },
      { label: 'PMs have full discretion, I monitor aggregate risk weekly', value: 'aggregate', score: 0 },
      { label: 'I only intervene when drawdowns breach a threshold', value: 'threshold', score: 0 },
    ],
  },
  {
    id: 'exec_eval',
    category: 'Performance Evaluation',
    question: 'How do you evaluate your PMs and analysts?',
    options: [
      { label: 'Raw returns — whoever generates the most alpha wins', value: 'returns', score: 0 },
      { label: 'Risk-adjusted returns (Sharpe, Sortino, information ratio)', value: 'risk_adjusted', score: 0 },
      { label: 'Process quality — did they follow their thesis and size correctly?', value: 'process', score: 0 },
      { label: 'Research quality — depth of analysis regardless of outcomes', value: 'research', score: 0 },
    ],
  },
  {
    id: 'exec_interests',
    category: 'Interests',
    multi: true,
    question: 'Which Ezana features does your organization need most?',
    options: [
      { label: 'Mock trading with position tracking', value: 'trading', score: 0 },
      { label: 'AI-powered stock analysis models', value: 'analysis', score: 0 },
      { label: 'Team collaboration and file sharing', value: 'collaboration', score: 0 },
      { label: 'Market news and intelligence feeds', value: 'news', score: 0 },
      { label: 'Prediction markets and event trading', value: 'prediction', score: 0 },
      { label: 'Learning center and educational content', value: 'education', score: 0 },
    ],
  },
];

const PM_QUESTIONS = [
  {
    id: 'pm_strategy',
    category: 'Strategy Approach',
    question: 'What best describes your investment strategy approach?',
    options: [
      { label: 'Fundamental — deep-dive financials, DCF, comps', value: 'fundamental', score: 0 },
      { label: 'Technical — charts, momentum, price action', value: 'technical', score: 0 },
      { label: 'Quantitative — statistical models, factor investing', value: 'quant', score: 0 },
      { label: 'Macro / thematic — top-down sector and geo allocation', value: 'macro', score: 0 },
      { label: 'Blended — multiple approaches depending on the setup', value: 'blended', score: 0 },
    ],
  },
  {
    id: 'pm_team_style',
    category: 'Team Management',
    question: 'How do you work with your analysts?',
    options: [
      { label: 'I assign specific tickers and review their write-ups', value: 'assigned', score: 0 },
      { label: 'Analysts pitch ideas, I decide which to pursue', value: 'pitch', score: 0 },
      { label: 'We collaborate on every thesis from the start', value: 'collaborative', score: 0 },
      { label: 'Analysts work independently, I synthesize their output', value: 'independent', score: 0 },
    ],
  },
  {
    id: 'pm_coaching',
    category: 'Development',
    question: 'What matters most when developing your analysts?',
    options: [
      { label: 'Teaching them to build financial models (DCF, LBO, comps)', value: 'modeling', score: 0 },
      { label: 'Developing their thesis-writing and presentation skills', value: 'communication', score: 0 },
      { label: 'Building their market intuition through live trading', value: 'intuition', score: 0 },
      { label: 'Exposing them to multiple sectors and asset classes', value: 'breadth', score: 0 },
    ],
  },
  {
    id: 'pm_interests',
    category: 'Interests',
    multi: true,
    question: 'Which Ezana tools will your team use most?',
    options: [
      { label: 'Stock analysis models (DCF, comps, GRPV)', value: 'analysis', score: 0 },
      { label: 'Mock trading and position tracking', value: 'trading', score: 0 },
      { label: 'Market intelligence (ISR, Chain View)', value: 'intelligence', score: 0 },
      { label: 'File portal and team collaboration', value: 'collaboration', score: 0 },
      { label: 'Strategy builder and backtesting', value: 'quants', score: 0 },
    ],
  },
];

const ANALYST_EXTRAS = [
  {
    id: 'analyst_literacy',
    category: 'Knowledge',
    question: "How confident are you reading a company's financial statements?",
    options: [
      { label: "I don't know what those are", value: 'none', score: 0 },
      { label: "I've heard of them but can't interpret them", value: 'aware', score: 1 },
      { label: 'I can understand the basics (revenue, net income, cash flow)', value: 'basic', score: 2 },
      { label: 'I analyze them regularly before investing', value: 'proficient', score: 3 },
    ],
  },
  {
    id: 'analyst_allocation',
    category: 'Risk Tolerance',
    question: 'What percentage of a mock portfolio would you put into a single high-conviction position?',
    options: [
      { label: 'Under 5% — diversification first', value: 'minimal', score: 0 },
      { label: '5–10% — moderate concentration', value: 'moderate', score: 1 },
      { label: '10–20% — concentrated bets', value: 'concentrated', score: 2 },
      { label: '20%+ — go big or go home', value: 'yolo', score: 3 },
    ],
  },
  {
    id: 'analyst_interests',
    category: 'Interests',
    multi: true,
    question: 'Which areas of Ezana interest you most?',
    options: [
      { label: 'Global market news and analysis', value: 'news', score: 0 },
      { label: 'Stock valuation models (DCF, comps)', value: 'models', score: 0 },
      { label: 'Prediction markets and event trading', value: 'prediction', score: 0 },
      { label: 'Learning center and courses', value: 'education', score: 0 },
      { label: 'AI signals and trade ideas', value: 'signals', score: 0 },
    ],
  },
];

const META_ROLE_KEY = 'org_questionnaire_role';

function getQuestionsForRole(role) {
  if (role === 'executive') return [...SHARED_BASE, ...EXEC_QUESTIONS];
  if (role === 'portfolio_manager') return [...SHARED_BASE, ...PM_QUESTIONS];
  return [...SHARED_BASE, ...ANALYST_EXTRAS];
}

function getRoleLabel(role) {
  if (role === 'executive') return 'Executive';
  if (role === 'portfolio_manager') return 'Portfolio Manager';
  return 'Analyst';
}

function computeOrgProfile(answers, role) {
  const base = SHARED_BASE;
  let totalScore = 0;
  let maxScore = 0;

  base.forEach((q) => {
    const maxOpt = Math.max(...q.options.map((o) => o.score));
    if (q.multi) {
      const selected = answers[q.id] || [];
      if (Array.isArray(selected)) {
        selected.forEach((v) => {
          const opt = q.options.find((o) => o.value === v);
          if (opt) totalScore += opt.score;
        });
      }
      maxScore += maxOpt * Math.max(q.options.length - 1, 1);
    } else {
      const opt = q.options.find((o) => o.value === answers[q.id]);
      if (opt) totalScore += opt.score;
      maxScore += maxOpt;
    }
  });

  const pct = maxScore > 0 ? totalScore / maxScore : 0;

  const mgmt = {};
  if (role === 'executive') {
    mgmt.org_goal = answers.exec_org_goal;
    mgmt.management_style = answers.exec_mgmt_style;
    mgmt.risk_oversight = answers.exec_risk_oversight;
    mgmt.evaluation_method = answers.exec_eval;
    mgmt.org_interests = answers.exec_interests;
  }
  if (role === 'portfolio_manager') {
    mgmt.strategy_approach = answers.pm_strategy;
    mgmt.team_style = answers.pm_team_style;
    mgmt.coaching_focus = answers.pm_coaching;
    mgmt.team_interests = answers.pm_interests;
  }

  const interestsKey = role === 'executive'
    ? 'exec_interests'
    : role === 'portfolio_manager'
      ? 'pm_interests'
      : 'analyst_interests';
  const interests = Array.isArray(answers[interestsKey]) ? answers[interestsKey] : [];

  let level;
  let risk;
  if (pct < 0.25) {
    level = 'Beginner';
    risk = 'Conservative';
  } else if (pct < 0.5) {
    level = 'Intermediate';
    risk = 'Moderate';
  } else if (pct < 0.75) {
    level = 'Advanced';
    risk = 'Growth-Oriented';
  } else {
    level = 'Expert';
    risk = 'Aggressive';
  }

  return { level, risk, interests, pct, role, management: mgmt };
}

const PROFILE_CONFIGS = {
  Beginner: { icon: '🌱', desc: 'Starting your journey.' },
  Intermediate: { icon: '📊', desc: 'Building solid foundations.' },
  Advanced: { icon: '🚀', desc: 'Strong analytical skills.' },
  Expert: { icon: '⚡', desc: 'Seasoned market veteran.' },
};

export function OrgQuestionnaire({ userId, role, onComplete }) {
  const normalizedRole = role === 'executive' || role === 'portfolio_manager' ? role : 'analyst';
  const questions = useMemo(() => getQuestionsForRole(normalizedRole), [normalizedRole]);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [multiSelections, setMultiSelections] = useState({});
  const [done, setDone] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [saving, setSaving] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finalizeProfile = useCallback(
    async (finalAnswers) => {
      if (!userId) return;
      const clean = { ...finalAnswers };
      delete clean[META_ROLE_KEY];
      const profile = computeOrgProfile(clean, normalizedRole);
      const riskScore = Math.round(profile.pct * 100);
      const riskCategory = profile.risk.replace('-Oriented', '');
      const stored = { ...clean, [META_ROLE_KEY]: normalizedRole };
      try {
        await supabase
          .from('profiles')
          .update({
            investor_questionnaire: stored,
            investor_questionnaire_completed: true,
            investor_profile: profile,
            risk_score: riskScore,
            risk_category: riskCategory,
          })
          .eq('id', userId);
      } catch {
        /* best-effort */
      }
      setDone(true);
    },
    [userId, normalizedRole],
  );

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

      const savedRaw = data?.investor_questionnaire || {};
      const savedRole = savedRaw[META_ROLE_KEY];
      const saved = { ...savedRaw };
      delete saved[META_ROLE_KEY];

      if (
        typeof saved === 'object'
        && Object.keys(saved).length > 0
        && savedRole === normalizedRole
      ) {
        setAnswers(saved);
        const answeredIds = Object.keys(saved);
        const firstUnanswered = questions.findIndex((q) => !answeredIds.includes(q.id));
        if (firstUnanswered >= 0) {
          setCurrentQ(firstUnanswered);
        } else {
          await finalizeProfile({ ...saved, [META_ROLE_KEY]: normalizedRole });
        }

        const multiState = {};
        for (const q of questions.filter((x) => x.multi)) {
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
  }, [userId, normalizedRole, questions, finalizeProfile]);

  const saveProgress = useCallback(
    async (updatedAnswers) => {
      if (!userId) return;
      setSaving(true);
      try {
        const payload = { ...updatedAnswers, [META_ROLE_KEY]: normalizedRole };
        await supabase.from('profiles').update({ investor_questionnaire: payload }).eq('id', userId);
      } catch {
        /* best-effort */
      } finally {
        setSaving(false);
      }
    },
    [userId, normalizedRole],
  );

  const advance = useCallback(
    (newAnswers) => {
      setAnimating(true);
      setTimeout(() => {
        if (currentQ < questions.length - 1) {
          setCurrentQ((p) => p + 1);
        } else {
          finalizeProfile(newAnswers);
        }
        setAnimating(false);
      }, 300);
    },
    [currentQ, questions.length, finalizeProfile],
  );

  const handleSelect = (value, q) => {
    if (q.multi) {
      setMultiSelections((prev) => {
        const current = prev[q.id] || [];
        return {
          ...prev,
          [q.id]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
        };
      });
    } else {
      const newAnswers = { ...answers, [q.id]: value };
      setAnswers(newAnswers);
      saveProgress(newAnswers);
      advance(newAnswers);
    }
  };

  const confirmMulti = (q) => {
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

  const q = questions[currentQ];
  const progress = questions.length ? (currentQ / questions.length) * 100 : 0;

  if (done) {
    const profile = computeOrgProfile(answers, normalizedRole);
    const cfg = PROFILE_CONFIGS[profile.level];
    return (
      <div className="iq-container">
        <div className="iq-card">
          <div className="iq-result-badge">
            <span style={{ fontSize: 48 }}>{cfg.icon}</span>
          </div>
          <h1 className="iq-result-title">Your {getRoleLabel(normalizedRole)} Profile</h1>
          <div className="iq-result-grid">
            <div className="iq-result-stat">
              <span className="iq-result-label">Skill Level</span>
              <span className="iq-result-value">{profile.level}</span>
            </div>
            <div className="iq-result-stat">
              <span className="iq-result-label">Risk Profile</span>
              <span className="iq-result-value">{profile.risk}</span>
            </div>
            {normalizedRole === 'executive' && profile.management.management_style && (
              <div className="iq-result-stat">
                <span className="iq-result-label">Management Style</span>
                <span className="iq-result-value" style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>
                  {String(profile.management.management_style).replace(/_/g, ' ')}
                </span>
              </div>
            )}
            {normalizedRole === 'portfolio_manager' && profile.management.strategy_approach && (
              <div className="iq-result-stat">
                <span className="iq-result-label">Strategy Approach</span>
                <span className="iq-result-value" style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>
                  {profile.management.strategy_approach}
                </span>
              </div>
            )}
          </div>
          <p className="iq-result-desc">
            {cfg.desc} Ezana will tailor your {getRoleLabel(normalizedRole).toLowerCase()} experience accordingly.
          </p>
          <button type="button" className="iq-cta-btn" onClick={() => onCompleteRef.current?.()}>
            Continue to Ezana →
          </button>
          <p className="iq-footnote">Update your profile anytime in Settings.</p>
        </div>
      </div>
    );
  }

  if (!q) return null;

  const currentMulti = multiSelections[q.id] || [];

  return (
    <div className="iq-container">
      <div className="iq-card">
        <div className="iq-header">
          <div className="iq-logo-row">
            <span className="iq-logo">EZANA</span>
            <span className="iq-logo-sub">{getRoleLabel(normalizedRole).toUpperCase()}</span>
          </div>
          <span className="iq-step-counter">
            {currentQ + 1} / {questions.length}
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
                  onClick={() => handleSelect(opt.value, q)}
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
            <button type="button" className="iq-confirm-btn" onClick={() => confirmMulti(q)}>
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
