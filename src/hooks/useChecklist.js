'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TOTAL_TASKS } from '@/config/checklist';

export function useChecklist() {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProgress({});
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('checklist_progress, checklist_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.checklist_progress && typeof profile.checklist_progress === 'object') {
        setProgress(profile.checklist_progress);
      } else {
        setProgress({});
      }
    } catch (error) {
      console.error('Failed to load checklist:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProgress();
    });
    return () => subscription.unsubscribe();
  }, [loadProgress]);

  useEffect(() => {
    const onSync = () => loadProgress();
    window.addEventListener('checklist-updated', onSync);
    return () => window.removeEventListener('checklist-updated', onSync);
  }, [loadProgress]);

  const completeTask = useCallback(async (taskId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setProgress((prev) => {
        if (prev[taskId]) return prev;
        const updated = { ...prev, [taskId]: true };
        const completedCount = Object.values(updated).filter(Boolean).length;
        const allDone = completedCount >= TOTAL_TASKS;
        void supabase
          .from('profiles')
          .update({
            checklist_progress: updated,
            checklist_completed: allDone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .then(() => {
            window.dispatchEvent(new Event('checklist-updated'));
          });
        return updated;
      });
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  }, []);

  const completedCount = Object.values(progress).filter(Boolean).length;
  const isComplete = completedCount >= TOTAL_TASKS;

  return {
    progress,
    completedCount,
    totalTasks: TOTAL_TASKS,
    isComplete,
    completeTask,
    isTaskComplete: (taskId) => !!progress[taskId],
    loading,
    refresh: loadProgress,
  };
}
