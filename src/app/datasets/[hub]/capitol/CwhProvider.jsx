'use client';

/**
 * Capitol Watch hub: what the page's modules share on the client.
 *   member drawer   openMember(bioguideId): ?member= in the URL, one history
 *                   entry per drawer, swapping members replaces it
 *   company card    openCompany({ ticker, name })
 *   EzanaQL         requestQuery(query): fills the bar and runs (Query this)
 *   account gate    gate(action): the centred account prompt
 *   My signals      the reader's saved rules and the events each matches
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/components/AuthProvider';
import CompanyCard from '@/components/ezanaql/CompanyCard';
import { GateModal, useHubQuery } from '@/components/datasets/hub/HubClient';
import MemberDrawer from './MemberDrawer';

const Cwh = createContext(null);

/** The ruleEvents key for an unsaved rule's preview. */
export const PREVIEW_ID = '__preview';

export function useCwh() {
  return useContext(Cwh);
}

const readMember = () => {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('member');
  return v && /^[A-Za-z]\d{6}$/.test(v) ? v.toUpperCase() : null;
};

/** Replace one query parameter without a navigation. */
export function setParam(key, value, { push = false } = {}) {
  const url = new URL(window.location.href);
  if (value == null || value === '') url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (push) window.history.pushState(window.history.state, '', next);
  else window.history.replaceState(window.history.state, '', next);
}

async function previewRule(rule) {
  const res = await fetch('/api/datasets/capitol/rules/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...rule, full: true }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.ok) throw new Error(d.error || 'preview failed');
  return d;
}

export default function CwhProvider({ children }) {
  const { isAuthenticated, loading } = useAuth() || {};
  const [member, setMember] = useState(null);
  const [company, setCompany] = useState(null);
  const [gateAction, setGateAction] = useState(null);
  const [rules, setRules] = useState(null); // null until loaded (or signed out)
  const [ruleEvents, setRuleEvents] = useState({}); // ruleId -> events
  const pushed = useRef(false);
  const memberRef = useRef(null);
  useEffect(() => {
    memberRef.current = member;
  }, [member]);
  const opener = useRef(null);

  /* ?member= on first paint and on back / forward. */
  useEffect(() => {
    setMember(readMember());
    const onPop = () => {
      pushed.current = false;
      setMember(readMember());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openMember = useCallback((bioguideId) => {
    const id = String(bioguideId || '').toUpperCase();
    if (!/^[A-Z]\d{6}$/.test(id)) return;
    const cur = memberRef.current;
    if (!cur) opener.current = document.activeElement;
    setParam('member', id, { push: !cur });
    if (!cur) pushed.current = true;
    memberRef.current = id;
    setMember(id);
  }, []);

  const closeMember = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      setParam('member', null);
    }
    memberRef.current = null;
    setMember(null);
    const el = opener.current;
    opener.current = null;
    window.setTimeout(() => el?.focus?.(), 0);
  }, []);

  const openCompany = useCallback((c) => {
    if (!c?.ticker) return;
    setCompany({
      ticker: String(c.ticker).toUpperCase(),
      name: c.name || null,
      since: c.since || null,
    });
  }, []);

  /* Query this: the hub's shared channel, so row actions reach this bar. */
  const { runRequest, requestRun } = useHubQuery();
  const requestQuery = useCallback((query) => query && requestRun(query), [requestRun]);

  const gate = useCallback((action) => setGateAction(action), []);

  /* My signals: the reader's rules, then each rule's matches. */
  const loadRuleEvents = useCallback(async (list) => {
    const pairs = await Promise.all(
      list.map((r) =>
        previewRule(r)
          .then((d) => [r.id, d.events || []])
          .catch(() => [r.id, []]),
      ),
    );
    setRuleEvents(Object.fromEntries(pairs));
  }, []);

  const refreshRules = useCallback(async () => {
    try {
      const res = await fetch('/api/datasets/capitol/rules');
      if (res.status === 401) {
        setRules(null);
        return;
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error('load failed');
      setRules(d.rules || []);
      loadRuleEvents(d.rules || []);
    } catch {
      setRules((cur) => cur || []);
    }
  }, [loadRuleEvents]);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) refreshRules();
    else {
      setRules(null);
      setRuleEvents({});
    }
  }, [loading, isAuthenticated, refreshRules]);

  const saveRule = useCallback(async (rule) => {
    const res = await fetch('/api/datasets/capitol/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    if (res.status === 401) return { auth: true };
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) return { error: d.error || 'That signal could not be saved.' };
    setRules((cur) => [...(cur || []), d.rule]);
    previewRule(d.rule)
      .then((p) => setRuleEvents((m) => ({ ...m, [d.rule.id]: p.events || [] })))
      .catch(() => {});
    return { rule: d.rule };
  }, []);

  const updateRule = useCallback(async (id, patch) => {
    const res = await fetch(`/api/datasets/capitol/rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) return { error: d.error || 'That signal could not be updated.' };
    setRules((cur) => (cur || []).map((r) => (r.id === id ? d.rule : r)));
    return { rule: d.rule };
  }, []);

  const deleteRule = useCallback(async (id) => {
    const res = await fetch(`/api/datasets/capitol/rules/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) return { error: 'That signal could not be deleted.' };
    setRules((cur) => (cur || []).filter((r) => r.id !== id));
    setRuleEvents((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    return { ok: true };
  }, []);

  /* An unsaved rule's matches, shown under My signals from the builder. */
  const showPreviewEvents = useCallback((events) => {
    setRuleEvents((m) => ({ ...m, [PREVIEW_ID]: events || [] }));
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(isAuthenticated),
      authLoading: Boolean(loading),
      openMember,
      openCompany,
      requestQuery,
      runRequest,
      gate,
      rules,
      ruleEvents,
      saveRule,
      updateRule,
      deleteRule,
      showPreviewEvents,
    }),
    [
      isAuthenticated,
      loading,
      openMember,
      openCompany,
      requestQuery,
      runRequest,
      gate,
      rules,
      ruleEvents,
      saveRule,
      updateRule,
      deleteRule,
      showPreviewEvents,
    ],
  );

  return (
    <Cwh.Provider value={value}>
      {children}
      {member ? <MemberDrawer bioguideId={member} onClose={closeMember} /> : null}
      {company ? (
        <CompanyCard
          ticker={company.ticker}
          name={company.name}
          since={company.since}
          onClose={() => setCompany(null)}
        />
      ) : null}
      {gateAction ? <GateModal action={gateAction} onClose={() => setGateAction(null)} /> : null}
    </Cwh.Provider>
  );
}
