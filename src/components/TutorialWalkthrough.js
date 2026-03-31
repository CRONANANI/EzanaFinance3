'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const REGULAR_TUTORIAL_STEPS = [
  {
    title: 'Welcome to Ezana Finance',
    description: 'Let us give you a quick tour of the platform. This will only take a minute.',
    target: null,
  },
  {
    title: 'Your Home Page',
    description: 'This is your personalized home page. Pin your favorite cards from across the platform to see them here.',
    target: '[data-tutorial="home-grid"]',
  },
  {
    title: 'Navigation',
    description: 'Use the top menu to explore different sections: Dashboard, Research, Trading, Watchlist, Community, and Learning Center.',
    target: '[data-tutorial="main-nav"]',
  },
  {
    title: 'Getting Started Checklist',
    description: 'Complete tasks across the platform to unlock more capabilities. Click this icon to see your progress.',
    target: '[data-tutorial="checklist-icon"]',
  },
  {
    title: 'Pin Cards to Home',
    description: 'Hover over any card and click the pin icon to add it to your Home page.',
    target: null,
  },
];

const EXECUTIVE_TUTORIAL_STEPS = [
  { title: 'Welcome, Executive', description: 'You have an organization-wide command view. Here is your quick orientation.', target: null },
  { title: 'Org Home Cards', description: 'Your Home includes organization and team overview cards for quick supervision.', target: '[data-tutorial="home-grid"]' },
  { title: 'Team Hub', description: 'Open Team Hub to review tasks, events, and discussions across teams.', target: null },
  { title: 'Community + Team Signal', description: 'Use Community for org announcements and to keep team collaboration active.', target: null },
];

const PM_TUTORIAL_STEPS = [
  { title: 'Welcome, Portfolio Manager', description: 'You can manage team-level portfolio workflows and analyst execution.', target: null },
  { title: 'Team Portfolio Focus', description: 'Your Home highlights team portfolio performance and task operations.', target: '[data-tutorial="home-grid"]' },
  { title: 'Task Management', description: 'Use Team Hub to assign, monitor, and review analyst tasks.', target: null },
  { title: 'Learning Assignments', description: 'Guide analyst development through assigned learning content and follow-up.', target: null },
];

const ANALYST_TUTORIAL_STEPS = [
  { title: 'Welcome, Analyst', description: 'This quick tour shows where to find your team work and learning.', target: null },
  { title: 'My Tasks + Team View', description: 'Use Home and Team Hub to track your assignments and team priorities.', target: '[data-tutorial="home-grid"]' },
  { title: 'Discussion + Events', description: 'Stay active in team discussion and monitor upcoming deadlines.', target: null },
  { title: 'Learning Center', description: 'Complete assigned learning content to level up your investing skillset.', target: null },
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
  const [userRole, setUserRole] = useState('regular');

  const tutorialSteps = useMemo(() => getRoleSteps(userRole), [userRole]);

  const checkIfShouldShow = useCallback(async () => {
    if (
      pathname?.includes('/onboarding') ||
      pathname?.includes('/settings') ||
      pathname?.includes('/auth') ||
      pathname?.includes('/select-plan')
    ) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('has_seen_tutorial, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.onboarding_completed !== true || profile.has_seen_tutorial === true) {
      return;
    }

    const { data: orgMember } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const role = orgMember?.role || 'regular';
    setUserRole(role);
    setCurrentStep(0);

    setTimeout(() => setVisible(true), 1000);
  }, [pathname]);

  useEffect(() => {
    checkIfShouldShow();
  }, [checkIfShouldShow]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = async () => {
    setVisible(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ has_seen_tutorial: true }).eq('id', user.id);
    }
  };

  if (!visible) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 9998,
        }}
        aria-hidden
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#111',
          border: '1px solid #222',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '460px',
          width: '90%',
          zIndex: 9999,
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '1.5rem' }}>
          {tutorialSteps.map((_, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: i === currentStep ? '#10b981' : '#333',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <h2 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '0.75rem' }}>{step.title}</h2>
        <p style={{ color: '#999', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>{step.description}</p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '10px 20px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={handleNext}
            style={{
              background: '#10b981',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
            }}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
