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

const lsKey = (uid) => `ezana_beginner_seen_${uid}`;

function readLocalSeen(uid) {
  try {
    return new Set(JSON.parse(localStorage.getItem(lsKey(uid)) || '[]'));
  } catch {
    return new Set();
  }
}

function writeLocalSeen(uid, set) {
  try {
    localStorage.setItem(lsKey(uid), JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
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
  const seenRef = useRef(new Set());
  const userIdRef = useRef(null);
  const prevBandRef = useRef(null);
  const inFlight = useRef(false);

  useEffect(() => {
    seenRef.current = seen;
  }, [seen]);

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
        seenRef.current = new Set();
        userIdRef.current = null;
        return;
      }

      userIdRef.current = user.id;

      const data = await loadBeginnerInputs(user.id);
      setInputs(data);

      const merged = new Set([
        ...(data.seenKeys || []),
        ...readLocalSeen(user.id),
        ...seenRef.current,
      ]);
      seenRef.current = merged;
      setSeen(merged);
      writeLocalSeen(user.id, merged);
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
        const uid = userIdRef.current;
        if (!uid || seenRef.current.has('graduation:toast')) return;

        const next = new Set(seenRef.current);
        next.add('graduation:toast');
        seenRef.current = next;
        setSeen(next);
        writeLocalSeen(uid, next);

        try {
          await supabase
            .from('profiles')
            .update({
              beginner_seen: [...next],
              updated_at: new Date().toISOString(),
            })
            .eq('id', uid);
        } catch (e) {
          console.error('graduation toast markSeen failed (non-fatal):', e);
        }
      })();
    }
    prevBandRef.current = band;
  }, [band, loading, inputs, seen, toast]);

  const markSeen = useCallback(async (key) => {
    if (seenRef.current.has(key)) return;
    const next = new Set(seenRef.current);
    next.add(key);
    seenRef.current = next;
    setSeen(next);

    const uid = userIdRef.current;
    if (uid) {
      writeLocalSeen(uid, next);
      try {
        await supabase
          .from('profiles')
          .update({ beginner_seen: [...next], updated_at: new Date().toISOString() })
          .eq('id', uid);
      } catch (e) {
        console.error('markSeen DB write failed (non-fatal, LS holds):', e);
      }
    }
  }, []);

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

    const uid = userIdRef.current || user.id;
    seenRef.current = new Set();
    setSeen(new Set());
    writeLocalSeen(uid, new Set());

    const { error } = await supabase
      .from('profiles')
      .update({ beginner_seen: [], updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!error) {
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
