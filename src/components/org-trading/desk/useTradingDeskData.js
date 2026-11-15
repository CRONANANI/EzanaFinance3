'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FLAG_TAB_QUERY, flagsForTab } from '@/lib/org-trading-desk';

/**
 * Data for the Trading Desk. Each resource loads on its own and owns its
 * state ({ status: 'loading' | 'ready' | 'error', data }), so a failed
 * request shows as a failure with Retry in the section that needs it, never
 * as an empty fund.
 *
 * Every read goes through the routes the desk has always used, as the
 * signed-in member. The server decides what each member may read and do.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, every resource is answered from the bundle and
 * nothing the member does is sent anywhere: a flag raised, an answer, a
 * comment, a like, an added or a removed position all stay on the page.
 */
const FLAGS = '/api/org-trading/flags';
const LIVE = {
  summary: '/api/org/team-hub/summary',
  book: '/api/org/positions?include=coverage',
  roster: '/api/org/members',
  dossier: '/api/org-trading/positions',
  openFlags: `${FLAGS}?status=open&limit=100`,
  inbox: `${FLAGS}?${FLAG_TAB_QUERY.inbox}`,
  sent: `${FLAGS}?${FLAG_TAB_QUERY.sent}`,
  resolved: `${FLAGS}?${FLAG_TAB_QUERY.resolved}`,
};
const SAMPLE_URL = '/api/org-trading/sample';
const LOADING = { status: 'loading', data: null };
const FLAG_KEYS = ['openFlags', 'inbox', 'sent', 'resolved'];
/* The thumbs-up reaction the discussion counts, as the reactions route stores it. */
const LIKE = '\u{1F44D}';

const cents = (v) => Math.round(v * 100) / 100;

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * @param {{ enabled: boolean, member: object|null, role: string|null,
 *           canFlag: boolean, accuracyScope: 'council'|'self' }} opts
 */
export function useTradingDeskData({ enabled, member, role, canFlag, accuracyScope }) {
  const [live, setLive] = useState({});
  const [sample, setSample] = useState({ status: 'loading', bundle: null });
  const [showSample, setShowSample] = useState(true);
  /* The parts of the sample bundle a member can change on the page. */
  const [local, setLocal] = useState(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const memberId = member?.id || null;
  const accuracyUrl =
    accuracyScope === 'self' && memberId
      ? `${FLAGS}/accuracy?memberId=${encodeURIComponent(memberId)}`
      : `${FLAGS}/accuracy`;

  const load = useCallback(
    async (key) => {
      const url = key === 'accuracy' ? accuracyUrl : LIVE[key];
      if (!url) return;
      setLive((s) => ({ ...s, [key]: { status: 'loading', data: s[key]?.data ?? null } }));
      let next;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        next = res.ok
          ? { status: 'ready', data: await res.json() }
          : { status: 'error', data: null };
      } catch {
        next = { status: 'error', data: null };
      }
      if (alive.current) setLive((s) => ({ ...s, [key]: next }));
    },
    [accuracyUrl],
  );

  useEffect(() => {
    if (!enabled) return;
    ['summary', 'book', 'roster', ...FLAG_KEYS, 'accuracy'].forEach(load);
    (async () => {
      let bundle = null;
      try {
        const res = await fetch(SAMPLE_URL, { cache: 'no-store' });
        if (res.ok) bundle = (await res.json())?.sample || null;
      } catch {
        bundle = null;
      }
      if (!alive.current) return;
      setSample({ status: 'ready', bundle });
      setLocal(
        bundle
          ? { flags: bundle.flags, positions: bundle.book.positions, threads: bundle.threads }
          : null,
      );
    })();
  }, [enabled, load]);

  /* The accountability payload is only served to members who can flag. */
  useEffect(() => {
    if (enabled && canFlag) load('dossier');
  }, [enabled, canFlag, load]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample && Boolean(local);

  const viewer = useMemo(() => {
    if (sampleActive) return sample.bundle.viewer;
    return {
      memberId,
      userId: member?.user_id || null,
      role,
      teamId: member?.team_id || null,
    };
  }, [sampleActive, sample.bundle, memberId, member?.user_id, member?.team_id, role]);

  const sampleData = useMemo(() => {
    if (!sampleActive) return null;
    const b = sample.bundle;
    const me = b.viewer.memberId;
    const total = cents(local.positions.reduce((s, p) => s + p.value, 0));
    const live_ = new Set(local.positions.map((p) => `${p.ticker}_${p.team_id || 'na'}`));
    return {
      summary: b.summary,
      book: { positions: local.positions, coverage: b.book.coverage },
      roster: b.roster,
      dossier: {
        ...b.dossier,
        total_value: total,
        positions: b.dossier.positions.filter((d) =>
          live_.has(`${d.ticker}_${d.teamDbId || 'na'}`),
        ),
      },
      openFlags: { flags: local.flags.filter((f) => f.status === 'open') },
      inbox: { flags: flagsForTab(local.flags, 'inbox', me) },
      sent: { flags: flagsForTab(local.flags, 'sent', me) },
      resolved: { flags: flagsForTab(local.flags, 'resolved', me) },
      accuracy:
        accuracyScope === 'self'
          ? { members: b.accuracy.members.filter((m) => m.member_id === me) }
          : b.accuracy,
    };
  }, [sampleActive, sample.bundle, local, accuracyScope]);

  const resource = useCallback(
    (key) => {
      if (!enabled || sample.status === 'loading') return LOADING;
      if (sampleData) return { status: 'ready', data: sampleData[key] };
      if (key === 'dossier' && !canFlag) return { status: 'ready', data: null };
      return live[key] || LOADING;
    },
    [enabled, sample.status, sampleData, live, canFlag],
  );

  const retry = useCallback(
    (...keys) => {
      if (sampleActive) return;
      keys.forEach(load);
    },
    [sampleActive, load],
  );
  const refreshFlags = useCallback(() => retry(...FLAG_KEYS, 'accuracy'), [retry]);
  const refreshBook = useCallback(() => retry('summary', 'book', 'dossier'), [retry]);

  /* ── One flag, in full ── */
  const fetchFlag = useCallback(
    async (flagId) => {
      if (sampleActive) {
        const flag = local.flags.find((f) => f.id === flagId) || null;
        return flag ? { ok: true, flag } : { ok: false };
      }
      try {
        const res = await fetch(`${FLAGS}/${encodeURIComponent(flagId)}`, { cache: 'no-store' });
        if (!res.ok) return { ok: false, missing: res.status === 404 };
        const d = await res.json();
        return d?.flag ? { ok: true, flag: d.flag } : { ok: false };
      } catch {
        return { ok: false };
      }
    },
    [sampleActive, local],
  );

  /** Accept, acknowledge, reject (rebuttal required) or escalate. */
  const answerFlag = useCallback(
    async (flagId, response, rebuttal = '') => {
      const text = String(rebuttal || '').trim();
      if (response === 'rejected' && !text) {
        return { ok: false, error: 'A written rebuttal is required to reject a flag.' };
      }
      if (sampleActive) {
        const me = sample.bundle.viewer.memberId;
        setLocal((s) => ({
          ...s,
          flags: s.flags.map((f) =>
            f.id === flagId
              ? {
                  ...f,
                  status: response,
                  resolved_at: new Date().toISOString(),
                  resolved_by: me,
                  resolution_note: text || null,
                  escalated_to_ic: response === 'escalated' ? true : f.escalated_to_ic,
                }
              : f,
          ),
        }));
        return { ok: true, sample: true };
      }
      try {
        const res = await fetch(`${FLAGS}/${encodeURIComponent(flagId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response, rebuttal_text: text || null }),
        });
        if (res.status === 403) {
          return { ok: false, error: 'Only the members this flag is routed to can answer it.' };
        }
        if (!res.ok) {
          const d = await readJson(res);
          return {
            ok: false,
            error: res.status === 400 && d.error ? d.error : 'Could not record the answer.',
          };
        }
        FLAG_KEYS.forEach(load);
        load('accuracy');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Could not record the answer.' };
      }
    },
    [sampleActive, sample.bundle, load],
  );

  const commentOnFlag = useCallback(
    async (flagId, body) => {
      const text = String(body || '').trim();
      if (!text) return { ok: false, error: 'Write a comment first.' };
      if (sampleActive) {
        const me = sample.bundle.roster.members[0];
        setLocal((s) => ({
          ...s,
          flags: s.flags.map((f) =>
            f.id === flagId
              ? {
                  ...f,
                  messages: [
                    ...(f.messages || []),
                    {
                      id: `sample-msg-${Date.now()}`,
                      body: text,
                      created_at: new Date().toISOString(),
                      author: { display_name: me.display_name, role: me.role },
                      is_demo: true,
                    },
                  ],
                }
              : f,
          ),
        }));
        return { ok: true, sample: true };
      }
      try {
        const res = await fetch(`${FLAGS}/${encodeURIComponent(flagId)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        });
        return res.ok ? { ok: true } : { ok: false, error: 'Could not post the comment.' };
      } catch {
        return { ok: false, error: 'Could not post the comment.' };
      }
    },
    [sampleActive, sample.bundle],
  );

  /**
   * Sample only: add a flag to the page from what the composer would send.
   * Routing mirrors the real rule (covering analyst, else sector head, and a
   * covering analyst flagging their own name files a thesis update to the
   * sector head). Nothing is sent.
   */
  const raiseSampleFlag = useCallback(
    (payload) => {
      if (!sampleActive) return;
      const b = sample.bundle;
      const me = b.roster.members[0];
      const d = b.dossier.positions.find(
        (p) => p.ticker === payload.ticker && (p.teamDbId || null) === (payload.team_id || null),
      );
      const name = (id) => b.roster.members.find((m) => m.id === id) || null;
      const brief = (m) =>
        m ? { display_name: m.display_name, role: m.role, sub_role: m.sub_role || null } : null;
      const analystId = d?.analyst_member_id || null;
      const headId = d?.sector_head_member_id || null;
      const recipientId = (analystId && analystId !== me.id ? analystId : headId) || me.id;
      const hours = Number(payload.response_hours) > 0 ? Number(payload.response_hours) : 72;
      const flagId = `sample-flag-new-${Date.now()}`;
      const row = {
        id: flagId,
        org_id: 'sample',
        team_id: payload.team_id || null,
        ticker: payload.ticker,
        flag_color: payload.flag_color,
        subject: payload.subject,
        body: payload.body,
        reason: payload.reason,
        conviction: payload.conviction,
        suggested_action: payload.suggested_action,
        escalated_to_ic: Boolean(payload.escalate_to_ic),
        conflict_disclosed: Boolean(payload.conflict_disclosed),
        response_due_at: new Date(Date.now() + hours * 3600000).toISOString(),
        thesis_snapshot: d?.thesis || null,
        benchmark_symbol: null,
        status: 'open',
        created_at: new Date().toISOString(),
        resolved_at: null,
        resolution_note: null,
        raiser_member_id: me.id,
        recipient_member_id: recipientId,
        sector_head_member_id: headId,
        raiser: brief(me),
        recipient: brief(name(recipientId)),
        sector_head: brief(name(headId)),
        attachments: [],
        evidence: (payload.evidence || []).map((e, i) => ({ id: `${flagId}-e${i}`, ...e })),
        responses: [],
        messages: [],
        outcome: null,
        is_demo: true,
      };
      setLocal((s) => ({ ...s, flags: [row, ...s.flags] }));
    },
    [sampleActive, sample.bundle],
  );

  /* ── Positions ── */
  const removePosition = useCallback(
    async (row) => {
      if (sampleActive) {
        setLocal((s) => ({ ...s, positions: s.positions.filter((p) => p.id !== row.id) }));
        return { ok: true, sample: true };
      }
      try {
        const res = await fetch(`/api/org/positions?id=${encodeURIComponent(row.id)}`, {
          method: 'DELETE',
        });
        if (res.status === 403) {
          return { ok: false, error: 'You do not have the right to remove positions.' };
        }
        if (!res.ok) return { ok: false, error: 'Could not remove the position. Try again.' };
        ['summary', 'book', 'dossier'].forEach((k) => (k !== 'dossier' || canFlag) && load(k));
        return { ok: true };
      } catch {
        return { ok: false, error: 'Could not remove the position. Try again.' };
      }
    },
    [sampleActive, load, canFlag],
  );

  /** Sample only: a hand-entered position, carried at cost until priced. */
  const addSamplePosition = useCallback(
    (input) => {
      if (!sampleActive) return null;
      const shares = Number(input.shares);
      const avg = Number(input.avg_cost);
      const cost = cents(shares * avg);
      const row = {
        id: `sample-position-new-${Date.now()}`,
        org_id: 'sample',
        team_id: input.team_id || null,
        ticker: String(input.ticker || '')
          .toUpperCase()
          .trim(),
        name: input.name || null,
        shares,
        avg_cost: avg,
        current_price: null,
        sector: input.sector || null,
        source: 'manual',
        priced: false,
        value: cost,
        cost,
        pl: 0,
        current_value: cost,
        added_at: new Date().toISOString(),
        last_priced_at: null,
        is_demo: true,
      };
      row.ticker_symbol = row.ticker;
      setLocal((s) => ({ ...s, positions: [row, ...s.positions] }));
      return row;
    },
    [sampleActive],
  );

  /* ── Position discussion ── */
  const fetchThread = useCallback(
    async (ticker) => {
      if (sampleActive) {
        return {
          ok: true,
          comments: local.threads[ticker] || [],
          members: sample.bundle.mentionable,
        };
      }
      try {
        const res = await fetch(`/api/org/positions/${encodeURIComponent(ticker)}/thread`, {
          cache: 'no-store',
        });
        if (!res.ok) return { ok: false };
        const d = await res.json();
        return { ok: true, comments: d.comments || [], members: d.members || [] };
      } catch {
        return { ok: false };
      }
    },
    [sampleActive, local, sample.bundle],
  );

  const postComment = useCallback(
    async (ticker, { body, parentId = null, mentionIds = [] }) => {
      const text = String(body || '').trim();
      if (!text) return { ok: false, error: 'Write a comment first.' };
      if (sampleActive) {
        const me = sample.bundle.roster.members[0];
        const row = {
          id: `sample-comment-new-${Date.now()}`,
          ticker,
          author_id: me.user_id,
          author_name: me.display_name,
          author_role: me.role,
          body: text,
          parent_id: parentId,
          created_at: new Date().toISOString(),
          likes: 0,
          liked: false,
          is_demo: true,
        };
        setLocal((s) => ({
          ...s,
          threads: { ...s.threads, [ticker]: [...(s.threads[ticker] || []), row] },
        }));
        return { ok: true, sample: true };
      }
      try {
        const res = await fetch(`/api/org/positions/${encodeURIComponent(ticker)}/thread`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text, parent_id: parentId, mention_user_ids: mentionIds }),
        });
        return res.ok ? { ok: true } : { ok: false, error: 'Could not post the comment.' };
      } catch {
        return { ok: false, error: 'Could not post the comment.' };
      }
    },
    [sampleActive, sample.bundle],
  );

  /** Likes on a comment: { count, mine }. Null when they cannot be read. */
  const fetchLikes = useCallback(
    async (comment) => {
      if (sampleActive || comment.is_demo) {
        return { count: comment.likes || 0, mine: Boolean(comment.liked) };
      }
      try {
        const res = await fetch(
          `/api/org/reactions?target_type=thread&target_id=${encodeURIComponent(comment.id)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return null;
        const d = await res.json();
        return { count: d.counts?.[LIKE] || 0, mine: (d.mine || []).includes(LIKE) };
      } catch {
        return null;
      }
    },
    [sampleActive],
  );

  const toggleLike = useCallback(
    async (comment) => {
      if (sampleActive || comment.is_demo) {
        const current = (local?.threads?.[comment.ticker] || []).find((c) => c.id === comment.id);
        if (!current) return null;
        const liked = !current.liked;
        const next = { count: Math.max(0, (current.likes || 0) + (liked ? 1 : -1)), mine: liked };
        setLocal((s) => ({
          ...s,
          threads: {
            ...s.threads,
            [comment.ticker]: (s.threads[comment.ticker] || []).map((c) =>
              c.id === comment.id ? { ...c, liked, likes: next.count } : c,
            ),
          },
        }));
        return next;
      }
      try {
        const res = await fetch('/api/org/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: 'thread', target_id: comment.id, emoji: LIKE }),
        });
        if (!res.ok) return null;
        const d = await res.json();
        return { count: d.counts?.[LIKE] || 0, mine: (d.mine || []).includes(LIKE) };
      } catch {
        return null;
      }
    },
    [sampleActive, local],
  );

  /* What the flag composer needs to stay off the network in sample mode. */
  const composerSample = useMemo(
    () =>
      sampleData
        ? {
            book: sampleData.dossier.positions,
            totalValue: sampleData.dossier.total_value,
            onRaise: raiseSampleFlag,
          }
        : null,
    [sampleData, raiseSampleFlag],
  );

  return {
    resource,
    retry,
    refreshFlags,
    refreshBook,
    viewer,
    sampleActive,
    sampleAvailable,
    setShowSample,
    /* A token that changes whenever sample rows change, so views that fetch
       through the functions below know to read again. */
    sampleRevision: sampleActive ? local : null,
    /* Holdings whose sample thread has comments, so the sample opens on one. */
    sampleThreadTickers: sampleActive ? Object.keys(local.threads) : [],
    fetchFlag,
    answerFlag,
    commentOnFlag,
    removePosition,
    addSamplePosition,
    fetchThread,
    postComment,
    fetchLikes,
    toggleLike,
    composerSample,
  };
}
