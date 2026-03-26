'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const TUTORIAL_STEPS = [
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
    description: 'Complete 18 tasks across the platform to unlock trading. Click this icon to see your progress.',
    target: '[data-tutorial="checklist-icon"]',
  },
  {
    title: 'Pin Cards to Home',
    description: 'Hover over any card and click the pin icon to add it to your Home page. Try it out!',
    target: null,
  },
];

export function TutorialWalkthrough() {
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const checkIfShouldShow = useCallback(async () => {
    // Never show on onboarding, settings, auth, or plan selection pages
    if (pathname?.includes('/onboarding') || 
        pathname?.includes('/settings') || 
        pathname?.includes('/auth') ||
        pathname?.includes('/select-plan')) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('has_seen_tutorial, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    // Only show tutorial if:
    // 1. Onboarding is completed
    // 2. User hasn't seen the tutorial yet
    if (profile && profile.onboarding_completed === true && profile.has_seen_tutorial !== true) {
      // Small delay to let the home page render first
      setTimeout(() => setVisible(true), 1000);
    }
  }, [pathname]);

  useEffect(() => {
    checkIfShouldShow();
  }, [checkIfShouldShow]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = async () => {
    setVisible(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ has_seen_tutorial: true })
        .eq('id', user.id);
    }
  };

  if (!visible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <>
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 9998,
        }}
        aria-hidden
      />

      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#111',
        border: '1px solid #222',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '440px',
        width: '90%',
        zIndex: 9999,
        textAlign: 'center',
      }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '1.5rem' }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: i === currentStep ? '#10b981' : '#333',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <h2 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '0.75rem' }}>
          {step.title}
        </h2>
        <p style={{ color: '#999', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          {step.description}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'none', border: '1px solid #333', borderRadius: '8px',
              padding: '10px 20px', color: '#888', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={handleNext}
            style={{
              background: '#10b981', border: 'none', borderRadius: '8px',
              padding: '10px 24px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
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
