'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { deriveChecklist } from '@/lib/onboarding/checklistConfig';
import { CHECKLIST_EVENT } from '@/lib/onboarding/markView';

/**
 * Loads the signed-in user's completed checklist task ids from
 * /api/onboarding/checklist and derives the view model.
 * Refetches when the panel opens and when the window regains focus,
 * so tasks completed on other pages show up without a reload.
 */
export function useChecklistProgress({ refetchKey } = {}) {
  const [completedIds, setCompletedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/checklist', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (res.status === 401) {
        setCompletedIds([]);
        return;
      }
      if (!res.ok) throw new Error(`Checklist request failed (${res.status})`);
      const json = await res.json();
      setCompletedIds(Array.isArray(json.completed) ? json.completed : []);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refetchKey]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    window.addEventListener(CHECKLIST_EVENT, onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(CHECKLIST_EVENT, onFocus);
    };
  }, [load]);

  const view = useMemo(() => deriveChecklist(completedIds), [completedIds]);

  return { ...view, completedIds, loading, error, reload: load };
}
