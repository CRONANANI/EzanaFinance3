'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { computeBeginnerScore, scoreToBand } from '@/lib/beginner-score';
import { TOTAL_TASKS } from '@/config/checklist';
import { useToast } from '@/contexts/ToastContext';

function daysSince(iso) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

async function loadBeginnerInputs(userId) {
  const results = await Promise.allSettled([
    supabase
      .from('profiles')
      .select(
        'investor_profile, checklist_progress, created_at, beginner_tips_pref, beginner_seen, analyses_run, lessons_completed_count',
      )
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('user_rewards').select('total_xp, tier').eq('user_id', userId).maybeSingle(),
    supabase
      .from('user_course_progress')
      .select('course_id, status, quiz_passed')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .eq('quiz_passed', true),
    supabase
      .from('user_watchlist_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const val = (i) => (results[i].status === 'fulfilled' ? results[i].value : null);
  const profileRes = val(0);
  const rewardsRes = val(1);
  const lessonsRes = val(2);
  const watchlistRes = val(3);
  const postsRes = val(4);

  const profile = profileRes?.data || {};
  const completedTasks = Object.values(profile.checklist_progress || {}).filter(Boolean).length;
  const checklistPct = TOTAL_TASKS > 0 ? completedTasks / TOTAL_TASKS : 0;
  const experienceLevel = profile.investor_profile?.level || 'Beginner';
  const lessonsCompleted =
    profile.lessons_completed_count ??
    (Array.isArray(lessonsRes?.data) ? lessonsRes.data.length : 0);

  return {
    experienceLevel,
    totalXp: rewardsRes?.data?.total_xp ?? 0,
    tier: rewardsRes?.data?.tier ?? null,
    checklistPct,
    accountAgeDays: daysSince(profile.created_at),
    lessonsCompleted,
    analysesRun: profile.analyses_run ?? 0,
    hasWatchlist: (watchlistRes?.count ?? 0) > 0,
    hasPosted: (postsRes?.count ?? 0) > 0,
    tipsPref: profile.beginner_tips_pref || 'auto',
    seenKeys: Array.isArray(profile.beginner_seen) ? profile.beginner_seen : [],
    investorProfile: profile.investor_profile ?? null,
  };
}

export function useBeginnerLevel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState(null);
  const [seen, setSeen] = useState(new Set());
  const prevBandRef = useRef(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setInputs(null);
        setSeen(new Set());
        return;
      }

      const data = await loadBeginnerInputs(user.id);
      setInputs(data);
      setSeen(new Set(data.seenKeys));
    } catch (err) {
      console.error('useBeginnerLevel:', err);
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const onSync = () => refresh();
    window.addEventListener('beginner-level-updated', onSync);
    window.addEventListener('checklist-updated', onSync);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => refresh());
    return () => {
      window.removeEventListener('beginner-level-updated', onSync);
      window.removeEventListener('checklist-updated', onSync);
      subscription.unsubscribe();
    };
  }, [refresh]);

  const score = useMemo(() => {
    if (!inputs) return 100;
    return computeBeginnerScore(inputs);
  }, [inputs]);

  const band = useMemo(() => scoreToBand(score), [score]);

  const showTips = useMemo(() => {
    if (!inputs) return false;
    if (inputs.tipsPref === 'on') return true;
    if (inputs.tipsPref === 'off') return false;
    return score >= 30;
  }, [inputs, score]);

  useEffect(() => {
    if (loading || !inputs || seen.has('graduation:toast')) return;
    const prev = prevBandRef.current;
    if (
      prev &&
      prev !== band &&
      ((prev === 'beginner' && (band === 'learning' || band === 'seasoned')) ||
        (prev === 'learning' && band === 'seasoned'))
    ) {
      toast.info(
        "You've graduated from Beginner tips — they'll show less now. Re-enable anytime in Settings.",
      );
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const next = [...seen, 'graduation:toast'];
        setSeen(new Set(next));
        await supabase
          .from('profiles')
          .update({ beginner_seen: next, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      })();
    }
    prevBandRef.current = band;
  }, [band, loading, inputs, seen, toast]);

  const markSeen = useCallback(
    async (key) => {
      await markSeenInternal(key, seen, setSeen);
      window.dispatchEvent(new Event('beginner-level-updated'));
    },
    [seen],
  );

  const setTipsPref = useCallback(
    async (pref) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await supabase
        .from('profiles')
        .update({ beginner_tips_pref: pref, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (!error) await refresh();
      return !error;
    },
    [refresh],
  );

  const clearSeen = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ beginner_seen: [], updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (!error) {
      setSeen(new Set());
      await refresh();
      window.dispatchEvent(new Event('beginner-level-updated'));
    }
    return !error;
  }, [refresh]);

  return {
    score,
    band,
    showTips,
    loading,
    seen,
    markSeen,
    refresh,
    setTipsPref,
    clearSeen,
    analysesRun: inputs?.analysesRun ?? 0,
    investorProfile: inputs?.investorProfile ?? null,
    hasPosted: inputs?.hasPosted ?? false,
    tipsPref: inputs?.tipsPref ?? 'auto',
  };
}

async function markSeenInternal(key, seen, setSeen) {
  if (seen.has(key)) return;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const next = [...seen, key];
    setSeen(new Set(next));
    await supabase
      .from('profiles')
      .update({ beginner_seen: next, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  } catch (e) {
    console.error('markSeen failed (non-fatal):', e);
  }
}
