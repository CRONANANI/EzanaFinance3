'use client';

import { useState, useEffect } from 'react';
import { TaskGuide } from '@/components/TaskGuide';
import { useBeginnerLevelOptional } from '@/contexts/BeginnerLevelContext';

/**
 * First-visit spotlight tour — 2–3 steps per page, reuses TaskGuide highlight + bubble.
 */
export function BeginnerSpotlight({ pageKey, steps = [] }) {
  const beginner = useBeginnerLevelOptional();
  const [stepIdx, setStepIdx] = useState(0);

  const spotlightKey = `spotlight:${pageKey}`;
  const showTips = beginner?.showTips ?? false;
  const seen = beginner?.seen ?? new Set();
  const markSeen = beginner?.markSeen;
  const active = showTips && !seen.has(spotlightKey) && steps.length > 0;

  useEffect(() => {
    if (!active) setStepIdx(0);
  }, [active, pageKey]);

  if (!active || !beginner) return null;

  const step = steps[stepIdx];
  if (!step) return null;

  const handleDismiss = () => {
    if (stepIdx < steps.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      markSeen?.(spotlightKey);
    }
  };

  return (
    <TaskGuide
      visible
      targetSelector={step.targetSelector}
      message={step.message}
      position={step.position || 'bottom'}
      onDismiss={handleDismiss}
    />
  );
}
