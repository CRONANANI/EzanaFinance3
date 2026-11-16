'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applySampleAction, meetingBody } from '@/lib/org-meetings-model';

/**
 * Data for Meetings.
 *
 * The library arrives with the page (`initialData`) when the server could
 * load it, so the first paint has data. Every read and write goes through
 * routes that already exist, as the signed-in member; the server decides
 * what each member may read and do.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, the library and every meeting are answered from
 * the bundle, each action is applied to the bundle on the page by the page
 * model (the same rules as the server), and nothing is sent anywhere.
 */
const LIST_URL = '/api/org/meetings';
const SAMPLE_URL = '/api/org/meetings/sample';
const REFRESH_EVENT = 'ezana:org-nav-counts-refresh';

const EMPTY_LIST = {
  meetings: [],
  eligible_voters: 0,
  sessions: [],
  pitches: [],
  recordersConnected: false,
  viewer: { canManage: false, canCreateEvents: false, canRecordDocuments: false },
};

async function readJson(res) {
  return res.json().catch(() => ({}));
}

/* One request per action. Returns { ok, error, id }. */
async function sendLive(action) {
  const send = (method, url, body) =>
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const one = `${LIST_URL}/${encodeURIComponent(action.id || '')}`;
  let res;
  switch (action.type) {
    case 'create':
      res = await send('POST', LIST_URL, meetingBody(action.form));
      break;
    case 'update':
      res = await send('PATCH', one, { action: 'update', ...meetingBody(action.form) });
      break;
    case 'agenda':
      res = await send('PATCH', one, { action: 'set_agenda', agenda: action.agenda });
      break;
    case 'complete':
      res = await send('PATCH', one, { action: 'complete' });
      break;
    case 'recording':
      res = await send('PATCH', one, {
        action: 'set_recording',
        recording_url: action.url,
        recording_source: 'upload',
      });
      break;
    case 'rsvp':
      res = await send('PATCH', `${one}/attendees`, { rsvp: action.rsvp });
      break;
    case 'addAttendee':
      res = await send('POST', `${one}/attendees`, { member_ids: [action.memberId] });
      break;
    case 'attended':
      res = await send('PATCH', `${one}/attendees`, {
        member_id: action.memberId,
        attended: action.attended,
      });
      break;
    case 'vote':
      res = await send('POST', `${one}/votes`, { vote: action.vote });
      break;
    case 'addDocument':
      res = await send('POST', `${one}/deliverables`, { kind: action.kind, label: action.label });
      break;
    case 'removeDocument':
      res = await send(
        'DELETE',
        `${one}/deliverables?deliverable_id=${encodeURIComponent(action.docId)}`,
      );
      break;
    default:
      return { ok: false, error: 'Unknown action' };
  }
  const data = await readJson(res);
  if (!res.ok) return { ok: false, error: data?.error || null, status: res.status };
  return { ok: true, id: data?.meeting?.id || action.id || null };
}

/**
 * @param {{ enabled: boolean, initialData: object|null, sampleViewer: boolean }} opts
 */
export function useMeetingsData({ enabled, initialData, sampleViewer }) {
  const [live, setLive] = useState(() =>
    initialData
      ? { status: 'ready', data: { ...EMPTY_LIST, ...initialData } }
      : { status: 'loading', data: null },
  );
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', bundle: null } : { status: 'ready', bundle: null },
  );
  const [showSample, setShowSample] = useState(true);
  const [details, setDetails] = useState({}); // live only: { id: { status, data } }
  const alive = useRef(true);
  const sampleRef = useRef(sample);
  sampleRef.current = sample;
  const hadInitial = useRef(Boolean(initialData));

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadList = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLive((s) => ({ status: 'loading', data: s.data }));
    let next;
    try {
      const res = await fetch(LIST_URL, { cache: 'no-store' });
      if (res.status === 403) next = { status: 'forbidden', data: null };
      else if (!res.ok) next = { status: 'error', data: null };
      else next = { status: 'ready', data: { ...EMPTY_LIST, ...(await res.json()) } };
    } catch {
      next = { status: 'error', data: null };
    }
    if (!alive.current) return;
    /* A quiet refresh that fails keeps the rows already on the page. */
    setLive((s) => (quiet && next.status !== 'ready' && s.data ? s : next));
  }, []);

  const loadDetail = useCallback(async (id, { quiet = false } = {}) => {
    if (!id) return;
    if (!quiet) setDetails((d) => ({ ...d, [id]: { status: 'loading', data: d[id]?.data } }));
    let next;
    try {
      const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (res.status === 404) next = { status: 'missing', data: null };
      else if (!res.ok) next = { status: 'error', data: null };
      else next = { status: 'ready', data: await res.json() };
    } catch {
      next = { status: 'error', data: null };
    }
    if (!alive.current) return;
    setDetails((d) => (quiet && next.status !== 'ready' && d[id]?.data ? d : { ...d, [id]: next }));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!hadInitial.current) loadList();
    if (!sampleViewer) return;
    (async () => {
      let bundle = null;
      try {
        const res = await fetch(SAMPLE_URL, { cache: 'no-store' });
        if (res.ok) bundle = (await res.json())?.sample || null;
      } catch {
        bundle = null;
      }
      if (alive.current) setSample({ status: 'ready', bundle });
    })();
  }, [enabled, sampleViewer, loadList]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;
  const sampleLoading = sampleViewer && sample.status === 'loading';

  const list = sampleActive
    ? { status: 'ready', data: sample.bundle.list }
    : sampleLoading && live.status === 'ready' && !live.data?.meetings?.length
      ? { status: 'loading', data: live.data }
      : live;

  /** Detail state for one meeting. */
  const detailOf = useCallback(
    (id) => {
      if (!id) return { status: 'idle', data: null };
      if (sampleActive) {
        const d = sample.bundle.details[id];
        return d ? { status: 'ready', data: d } : { status: 'missing', data: null };
      }
      return details[id] || { status: 'loading', data: null };
    },
    [sampleActive, sample.bundle, details],
  );

  const act = useCallback(
    async (action) => {
      if (sampleRef.current.bundle && showSample) {
        const res = applySampleAction(sampleRef.current.bundle, action);
        if (res.ok) setSample({ status: 'ready', bundle: res.bundle });
        return { ok: res.ok, error: res.error || null, id: res.id || null, sample: true };
      }
      let res;
      try {
        res = await sendLive(action);
      } catch {
        res = { ok: false, error: null };
      }
      if (res.ok) {
        await Promise.all([
          loadList({ quiet: true }),
          res.id ? loadDetail(res.id, { quiet: true }) : null,
        ]);
        if (['create', 'complete'].includes(action.type) && typeof window !== 'undefined') {
          window.dispatchEvent(new Event(REFRESH_EVENT));
        }
      }
      return res;
    },
    [showSample, loadList, loadDetail],
  );

  return {
    list,
    detailOf,
    loadDetail,
    act,
    retry: () => loadList(),
    sampleActive,
    sampleAvailable,
    setShowSample,
  };
}
