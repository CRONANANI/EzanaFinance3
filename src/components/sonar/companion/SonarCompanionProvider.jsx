'use client';

/**
 * SonarCompanionProvider (Nov 28 2026): the one Sonar Companion for the authenticated app,
 * mounted once in the dashboard shell (app/(dashboard)/layout.js), so it stays mounted across
 * client-side navigation in both the personal and the organization workspace.
 *
 * Sonar Companion is another way into the existing Sonar, not a second engine:
 *   - a question runs through useResearchStream and POST /api/sonar/research, with the
 *     reader's plan, quotas and model routing unchanged (never deep research);
 *   - a council suggestion runs through POST /api/org/sonar/intelligence (deterministic, no
 *     model call), with the organization resolved on the server;
 *   - the full workspace is the existing Sonar page for the stored run (/sonar/history/[id]).
 *
 * UI state (open, mode, width, side, docked) is separate from research state. Only
 * non-sensitive preferences and run ids go to browser storage; answers stay in memory and
 * are reopened from the authorized backend. Opening, minimizing, resizing, expanding, docking
 * and navigating never send a request.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CompanionCtx,
  PageCtx,
  useSonarCompanion,
  useSonarPageContext,
} from './SonarCompanionContext';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useResearchStream } from '@/components/sonar/research/useResearchStream';
import { useOrg } from '@/contexts/OrgContext';
import { loadPrefs, savePrefs, sanitizePrefs, canDock } from '@/lib/sonar/companion/prefs';
import {
  contextFromRoute,
  mergeContext,
  composeQuestion,
  FULL_SONAR,
} from '@/lib/sonar/companion/page-context';
import {
  scopeOf,
  entriesIn,
  addEntry,
  updateEntry,
  persistable,
  restorePlan,
  revokeScope,
  sameRunLock,
  releaseLock,
  SESSION_KEY,
} from '@/lib/sonar/companion/session';
import { viewFromResearch, viewFromCouncil, fullScreenHref } from '@/lib/sonar/companion/view';
import { stateFromRunRow } from '@/lib/sonar/saved';
import { SonarCompanionLauncher } from './SonarCompanionLauncher';
import './sonar-companion.css';

const SonarCompanionWindow = dynamic(
  () => import('./SonarCompanionWindow').then((m) => m.SonarCompanionWindow),
  {
    ssr: false,
    loading: () => null,
  },
);

const newId = () =>
  `c${Date.now().toString(36)}${Math.floor(performance.now() * 1000).toString(36)}`;

function readSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null') || null;
  } catch {
    return null;
  }
}

export { useSonarCompanion, useSonarPageContext };

export function SonarCompanionProvider({ children, enabled = true }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const org = useOrg();
  const { state: stream, run, cancel } = useResearchStream();

  const [prefs, setPrefsState] = useState(() => ({ ...sanitizePrefs({}) }));
  const [ui, setUi] = useState({
    open: false,
    mode: 'compact',
    prevMode: null,
    fullscreen: false,
    prefsOpen: false,
  });
  const [pageCtx, setPageCtx] = useState(null);
  const [search, setSearch] = useState({});
  const [removed, setRemoved] = useState([]);
  const [entries, setEntries] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [notice, setNotice] = useState(null);
  /* Answers, in memory only: { [entryId]: view }. */
  const results = useRef(new Map());
  const [, bump] = useState(0);
  const streamEntry = useRef(null);
  const lockKey = useRef(null);
  const tab = useRef(null);
  const ready = useRef(false);

  const currentOrg = (org?.memberships || []).find((m) => m.current) || null;
  const orgMember = Boolean(org?.isOrgUser && currentOrg?.orgId);

  /* Route context: read the query string after navigation, never through a model. */
  useEffect(() => {
    try {
      setSearch(Object.fromEntries(new URLSearchParams(window.location.search)));
    } catch {
      setSearch({});
    }
    setRemoved([]);
  }, [pathname]);

  const ctx = useMemo(
    () =>
      mergeContext(
        contextFromRoute(pathname, search, { org: orgMember ? { orgId: currentOrg.orgId } : null }),
        pageCtx,
      ),
    [pathname, search, orgMember, currentOrg?.orgId, pageCtx],
  );
  const scope = scopeOf(ctx);

  /* Restore: preferences from localStorage, conversation ids from this tab's session. */
  useEffect(() => {
    tab.current = newId();
    const p = loadPrefs(window.localStorage);
    setPrefsState(p);
    const saved = readSession();
    if (saved && p.restoreLast) {
      setEntries((saved.entries || []).map((e) => ({ ...e, status: e.status })));
      setActiveId(saved.activeId || null);
      setUi((u) => ({
        ...u,
        open: Boolean(saved.open) && !p.startMinimized,
        mode: saved.mode || p.openMode,
        prevMode: saved.prevMode || null,
        fullscreen: Boolean(saved.fullscreen),
      }));
    } else setUi((u) => ({ ...u, mode: p.openMode }));
    ready.current = true;
  }, []);

  /* Persist ids and UI only. */
  useEffect(() => {
    if (!ready.current) return;
    try {
      window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          entries: persistable(entries),
          activeId,
          open: ui.open,
          mode: ui.mode,
          prevMode: ui.prevMode,
          fullscreen: ui.fullscreen,
        }),
      );
    } catch {
      /* storage unavailable */
    }
  }, [entries, activeId, ui.open, ui.mode, ui.prevMode, ui.fullscreen]);

  /* Workspace or organization switch: forget answers from other scopes in memory, and drop
     the scope of an organization the reader no longer belongs to. */
  const prevScope = useRef(scope);
  useEffect(() => {
    if (prevScope.current === scope) return;
    for (const e of entries) if (e.scope !== scope) results.current.delete(e.id);
    if (activeId && !entries.some((e) => e.id === activeId && e.scope === scope)) setActiveId(null);
    prevScope.current = scope;
    bump((n) => n + 1);
  }, [scope, entries, activeId]);
  useEffect(() => {
    if (org?.isLoading) return;
    const live = new Set((org?.memberships || []).map((m) => m.orgId));
    const gone = [
      ...new Set(entries.filter((e) => e.scope.startsWith('org:')).map((e) => e.scope.slice(4))),
    ].filter((id) => !live.has(id));
    if (gone.length) setEntries((list) => gone.reduce((acc, id) => revokeScope(acc, id), list));
  }, [org?.memberships, org?.isLoading, entries]);

  /* Fold the live stream into its conversation entry. The run keeps going while the window
     is minimized or the reader navigates; the provider stays mounted. */
  useEffect(() => {
    const id = streamEntry.current;
    if (!id) return;
    const view = viewFromResearch(stream);
    results.current.set(id, view);
    if (stream.status === 'running') {
      if (stream.runId) setEntries((l) => updateEntry(l, id, { runId: stream.runId }));
      bump((n) => n + 1);
      return;
    }
    setEntries((l) => updateEntry(l, id, { status: stream.status, runId: stream.runId || null }));
    if (['done', 'error', 'gated', 'quota'].includes(stream.status)) {
      setNotice(
        stream.status === 'done'
          ? 'Sonar finished the research.'
          : view.error || 'The research did not complete.',
      );
      streamEntry.current = null;
      releaseLock(window.localStorage, lockKey.current);
      lockKey.current = null;
    }
    bump((n) => n + 1);
  }, [stream]);

  /* Docked sidebar: shift the page only when it keeps enough room; otherwise overlay. */
  const docked =
    ui.open &&
    ui.mode === 'sidebar' &&
    prefs.docked &&
    typeof window !== 'undefined' &&
    canDock(window.innerWidth, prefs.width);
  useEffect(() => {
    const b = document.body;
    b.classList.toggle('scc-docked', Boolean(docked));
    b.classList.toggle('scc-docked-left', Boolean(docked && prefs.side === 'left'));
    document.documentElement.style.setProperty('--scc-dock-w', `${prefs.width}px`);
    return () => {
      b.classList.remove('scc-docked', 'scc-docked-left');
    };
  }, [docked, prefs.side, prefs.width]);

  /* Back from the full workspace: reopen the Companion where the reader left it. */
  useEffect(() => {
    if (ui.fullscreen && !FULL_SONAR.test(pathname))
      setUi((u) => ({ ...u, fullscreen: false, open: true, mode: u.prevMode || u.mode }));
  }, [pathname, ui.fullscreen]);

  const setPrefs = useCallback((patch) => {
    setPrefsState((p) => {
      const next = sanitizePrefs({ ...p, ...patch });
      savePrefs(window.localStorage, next);
      return next;
    });
  }, []);

  /** Load a stored run from history (an authorized read, no model call). */
  const openEntry = useCallback(
    async (id) => {
      setActiveId(id);
      const e = entries.find((x) => x.id === id);
      if (!e || results.current.get(id) || !e.runId || e.status === 'interrupted') return;
      try {
        const r = await fetch(`/api/sonar/history?id=${encodeURIComponent(e.runId)}`, {
          credentials: 'include',
        });
        const j = await r.json().catch(() => ({}));
        const st = r.ok && j.run ? stateFromRunRow(j.run) : null;
        if (st) {
          results.current.set(id, viewFromResearch({ ...st, runId: e.runId }));
          setEntries((l) =>
            updateEntry(l, id, { status: 'done', question: j.run.question || null }),
          );
        } else setEntries((l) => updateEntry(l, id, { status: 'unavailable' }));
      } catch {
        setEntries((l) => updateEntry(l, id, { status: 'unavailable' }));
      }
      bump((n) => n + 1);
    },
    [entries],
  );

  /* After a restore, the active conversation reopens from history once the window opens. */
  useEffect(() => {
    if (!ui.open || !activeId) return;
    const e = entries.find((x) => x.id === activeId);
    if (
      e &&
      e.runId &&
      !results.current.get(e.id) &&
      e.status !== 'interrupted' &&
      e.status !== 'unavailable'
    )
      openEntry(activeId);
  }, [ui.open, activeId, entries, openEntry]);

  /** An explicit question: the only thing that starts research. */
  const ask = useCallback(
    (text) => {
      const q = composeQuestion(text, ctx, removed);
      if (!q) return { ok: false };
      if (streamEntry.current) {
        setNotice('A research run is already in progress. It continues while you browse.');
        return { ok: false };
      }
      const lock = sameRunLock(window.localStorage, scope, q, tab.current);
      if (!lock.ok) {
        setNotice(
          'This question is already running in another tab. Its result will be in Research history.',
        );
        return { ok: false };
      }
      lockKey.current = lock.key;
      const id = newId();
      setEntries((l) =>
        addEntry(l, { id, scope, kind: 'research', question: q, status: 'running', runId: null }),
      );
      setActiveId(id);
      streamEntry.current = id;
      /* Standard research at most from the Companion; the server applies plan and quota. */
      run(q);
      return { ok: true };
    },
    [ctx, removed, scope, run],
  );

  /** A council capability (deterministic; organization resolved on the server). */
  const askCouncil = useCallback(
    async (capability, params = {}, label = '') => {
      if (ctx.workspace !== 'organization' || !orgMember) return;
      const id = newId();
      setEntries((l) =>
        addEntry(l, { id, scope, kind: 'council', capability, question: label, status: 'running' }),
      );
      setActiveId(id);
      try {
        const res = await fetch('/api/org/sonar/intelligence', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capability,
            params,
            question: label,
            removed: removed.includes('object') ? ['pitch'] : [],
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Council research is not available.');
        /* The answer belongs to the scope it was asked in; a switch since then discards it. */
        if (scopeOf(ctx) !== scope) return;
        results.current.set(id, viewFromCouncil(data));
        setEntries((l) => updateEntry(l, id, { status: 'done' }));
      } catch (e) {
        results.current.set(id, {
          kind: 'council',
          status: 'error',
          error: e.message,
          findings: [],
          metrics: [],
          visuals: [],
          citations: [],
        });
        setEntries((l) => updateEntry(l, id, { status: 'error' }));
      }
      bump((n) => n + 1);
    },
    [ctx, orgMember, scope, removed],
  );

  const view = activeId ? results.current.get(activeId) || null : null;
  const visibleEntries = entriesIn(entries, scope);

  const api = useMemo(
    () => ({
      ctx,
      scope,
      prefs,
      setPrefs,
      ui,
      open: (mode) => setUi((u) => ({ ...u, open: true, mode: mode || u.mode })),
      minimize: () => setUi((u) => ({ ...u, open: false })),
      setMode: (mode) => setUi((u) => ({ ...u, mode })),
      togglePrefs: () => setUi((u) => ({ ...u, prefsOpen: !u.prefsOpen })),
      goFull: () => {
        const href = fullScreenHref(view);
        setUi((u) => ({ ...u, fullscreen: true, prevMode: u.mode, open: false }));
        router.push(href);
      },
      newConversation: () => setActiveId(null),
      entries: visibleEntries,
      activeId,
      openEntry,
      view,
      streaming: Boolean(streamEntry.current) && stream.status === 'running',
      stream,
      cancel,
      ask,
      askCouncil,
      orgMember,
      permissions: org?.permissions || [],
      removed,
      removeContext: (k) => setRemoved((r) => [...new Set([...r, k])]),
      restoreContext: () => setRemoved([]),
      notice,
      clearNotice: () => setNotice(null),
      docked,
      restoredPlan: restorePlan(persistable(entries), scope),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      ctx,
      scope,
      prefs,
      ui,
      visibleEntries,
      activeId,
      view,
      stream,
      ask,
      askCouncil,
      orgMember,
      removed,
      notice,
      docked,
      openEntry,
    ],
  );

  /* Alt+S opens or minimizes the Companion (never sends a request). */
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e) => {
      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.key === 's' || e.key === 'S' || e.code === 'KeyS')
      ) {
        e.preventDefault();
        setUi((u) => ({ ...u, open: !u.open }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  const hidden = !enabled || FULL_SONAR.test(pathname);
  return (
    <PageCtx.Provider value={setPageCtx}>
      <CompanionCtx.Provider value={api}>
        {children}
        {!hidden ? (
          <>
            <SonarCompanionLauncher />
            {ui.open ? <SonarCompanionWindow /> : null}
          </>
        ) : null}
      </CompanionCtx.Provider>
    </PageCtx.Provider>
  );
}

export default SonarCompanionProvider;
