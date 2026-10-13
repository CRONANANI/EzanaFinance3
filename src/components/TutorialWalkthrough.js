'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

const REGULAR_TUTORIAL_STEPS = [
  {
    title: 'Welcome to Ezana Finance',
    description: 'Let us give you a quick tour of the platform. This will only take a minute.',
    target: null,
    icon: '👋',
  },
  {
    title: 'Your Home Dashboard',
    description:
      'This is your personalized home page. Everything you need — market data, portfolio, news — all in one place. Pin your favorite cards to customize the layout.',
    target: '[data-tutorial="home-grid"]',
    icon: '🏠',
  },
  {
    title: 'Navigation',
    description:
      'Use the top menu to explore: Research for company analysis, Trading for your portfolio, Watchlist to track stocks, Community for discussions, and Learning Center for courses.',
    target: '[data-tutorial="main-nav"]',
    icon: '🧭',
  },
  {
    title: 'Your Getting Started Checklist',
    description:
      'This checklist guides you through the platform step by step. Complete tasks to unlock features and earn XP. Click the icon anytime to see your progress — each task links directly to the right page.',
    target: '[data-tutorial="checklist-icon"]',
    icon: '✅',
  },
  {
    title: 'Company Research',
    description:
      'Search any public company to see financials, AI analysis models (DCF, 3-Statement, Comps), earnings transcripts, and analyst ratings — all powered by real-time data.',
    target: null,
    icon: '🔬',
  },
  {
    title: 'Pin Cards to Home',
    description:
      'See a card you like on any page? Hover over it and click the pin icon to add it to your Home dashboard. Your Home is fully customizable.',
    target: null,
    icon: '📌',
  },
  {
    title: "You're all set!",
    description:
      "Start by completing your first checklist task — it'll guide you through the key features. You can always replay this tour from Settings. Happy investing!",
    target: null,
    icon: '🚀',
  },
];

const EXECUTIVE_TUTORIAL_STEPS = [
  {
    title: 'Welcome, Executive',
    description: 'You have an organization-wide command view. Here is your quick orientation.',
    target: null,
    icon: '👔',
  },
  {
    title: 'Org Dashboard',
    description: 'Your Home includes organization and team overview cards for quick supervision.',
    target: '[data-tutorial="home-grid"]',
    icon: '📊',
  },
  {
    title: 'Team Hub',
    description: 'Open Team Hub to review tasks, events, and discussions across teams.',
    target: null,
    icon: '👥',
  },
  {
    title: 'Your Checklist',
    description:
      'Complete tasks to set up your organization workspace. Click this icon anytime to track progress.',
    target: '[data-tutorial="checklist-icon"]',
    icon: '✅',
  },
  {
    title: 'Community + Team Signal',
    description: 'Use Community for org announcements and to keep team collaboration active.',
    target: null,
    icon: '📡',
  },
];

const PM_TUTORIAL_STEPS = [
  {
    title: 'Welcome, Portfolio Manager',
    description: 'You can manage team-level portfolio workflows and analyst execution.',
    target: null,
    icon: '💼',
  },
  {
    title: 'Team Portfolio',
    description: 'Your Home highlights team portfolio performance and task operations.',
    target: '[data-tutorial="home-grid"]',
    icon: '📈',
  },
  {
    title: 'Task Management',
    description: 'Use Team Hub to assign, monitor, and review analyst tasks.',
    target: null,
    icon: '📋',
  },
  {
    title: 'Your Checklist',
    description: 'Track your onboarding progress here. Each task links to the right page.',
    target: '[data-tutorial="checklist-icon"]',
    icon: '✅',
  },
  {
    title: 'Learning Assignments',
    description: 'Guide analyst development through assigned learning content and follow-up.',
    target: null,
    icon: '🎓',
  },
];

const ANALYST_TUTORIAL_STEPS = [
  {
    title: 'Welcome, Analyst',
    description: 'This quick tour shows where to find your team work and learning.',
    target: null,
    icon: '🔍',
  },
  {
    title: 'My Tasks',
    description: 'Use Home and Team Hub to track your assignments and team priorities.',
    target: '[data-tutorial="home-grid"]',
    icon: '📝',
  },
  {
    title: 'Your Checklist',
    description: 'Complete tasks to unlock more features. Click this icon anytime.',
    target: '[data-tutorial="checklist-icon"]',
    icon: '✅',
  },
  {
    title: 'Learning Center',
    description: 'Complete assigned learning content to level up your investing skillset.',
    target: null,
    icon: '📚',
  },
];

function getRoleSteps(role) {
  if (role === 'executive') return EXECUTIVE_TUTORIAL_STEPS;
  if (role === 'portfolio_manager') return PM_TUTORIAL_STEPS;
  if (role === 'analyst') return ANALYST_TUTORIAL_STEPS;
  return REGULAR_TUTORIAL_STEPS;
}

export function TutorialWalkthrough() {
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState('next');
  const [userRole, setUserRole] = useState('regular');
  const [spotlightRect, setSpotlightRect] = useState(null);
  const timeoutRef = useRef(null);

  const tutorialSteps = useMemo(() => getRoleSteps(userRole), [userRole]);

  const updateSpotlight = useCallback((step) => {
    if (!step?.target) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });
    } else {
      setSpotlightRect(null);
    }
  }, []);

  const checkIfShouldShow = useCallback(async () => {
    if (
      pathname?.includes('/onboarding') ||
      pathname?.includes('/settings') ||
      pathname?.includes('/auth') ||
      pathname?.includes('/select-plan')
    )
      return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_seen_tutorial, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || profile.onboarding_completed !== true || profile.has_seen_tutorial === true)
      return;
    const { data: orgMember } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    const role = orgMember?.role || 'regular';
    setUserRole(role);
    setCurrentStep(0);
    setTimeout(() => {
      setVisible(true);
      updateSpotlight(getRoleSteps(role)[0]);
    }, 800);
  }, [pathname, updateSpotlight]);

  useEffect(() => {
    checkIfShouldShow();
  }, [checkIfShouldShow]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const goToStep = (nextIdx, dir) => {
    setAnimating(true);
    setDirection(dir);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCurrentStep(nextIdx);
      updateSpotlight(tutorialSteps[nextIdx]);
      setAnimating(false);
    }, 250);
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) goToStep(currentStep + 1, 'next');
    else handleDismiss();
  };

  const handleBack = () => {
    if (currentStep > 0) goToStep(currentStep - 1, 'back');
  };

  const handleDismiss = async () => {
    setVisible(false);
    setSpotlightRect(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ has_seen_tutorial: true }).eq('id', user.id);
  };

  if (!visible) return null;

  const step = tutorialSteps[currentStep];
  const isLast = currentStep === tutorialSteps.length - 1;
  const isFirst = currentStep === 0;
  const pct = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: spotlightRect
            ? `radial-gradient(ellipse ${spotlightRect.width + 40}px ${spotlightRect.height + 40}px at ${spotlightRect.left + spotlightRect.width / 2}px ${spotlightRect.top + spotlightRect.height / 2}px, transparent 0%, rgba(0,0,0,0.8) 100%)`
            : 'rgba(0,0,0,0.75)',
          transition: 'background 0.4s ease',
        }}
        onClick={handleDismiss}
        aria-hidden
      />

      {spotlightRect && (
        <div
          style={{
            position: 'fixed',
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            border: '2px solid rgba(16, 185, 129, 0.6)',
            borderRadius: 12,
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'spotlightPulse 2s ease-in-out infinite',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
          }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          bottom: 40,
          left: '50%',
          transform: `translateX(-50%) translateY(${animating ? (direction === 'next' ? '10px' : '-10px') : '0'})`,
          opacity: animating ? 0 : 1,
          transition: 'all 0.25s ease',
          background: 'rgba(13, 17, 23, 0.97)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 16,
          padding: '1.5rem 2rem',
          maxWidth: 480,
          width: '92%',
          zIndex: 10000,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16, 185, 129, 0.05)',
        }}
      >
        <div
          style={{
            height: 3,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 2,
            marginBottom: '1.25rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #10b981, #34d399)',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              color: '#6b7280',
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            STEP {currentStep + 1} OF {tutorialSteps.length}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {tutorialSteps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentStep ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === currentStep
                      ? '#10b981'
                      : i < currentStep
                        ? 'rgba(16,185,129,0.4)'
                        : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}
        >
          <span style={{ fontSize: '1.75rem' }}>{step.icon}</span>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            {step.title}
          </h2>
        </div>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '0.875rem',
            lineHeight: 1.65,
            margin: '0 0 1.25rem',
            paddingLeft: '2.5rem',
          }}
        >
          {step.description}
        </p>

        <div
          style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingLeft: '2.5rem' }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Skip tour
          </button>
          {!isFirst && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '8px 16px',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 24px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}
          >
            {isLast ? '🚀 Get Started' : 'Next →'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spotlightPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.3); }
          50% { box-shadow: 0 0 35px rgba(16,185,129,0.5), 0 0 60px rgba(16,185,129,0.15); }
        }
      `}</style>
    </>
  );
}
