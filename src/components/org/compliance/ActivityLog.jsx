'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Skel, SectionError } from '@/components/org/command-center/parts';
import { NA, actionName, detailText, fmtStamp, targetText } from '@/lib/org-compliance-model';

const URL_ = '/api/org/audit-log';
const PAGE = 50;

function Rows({ entries }) {
  return (
    <div
      className="cmp-table cmp-table--log"
      role="table"
      aria-label="Council activity, newest first"
    >
      <div className="cmp-table__head" role="row">
        <span role="columnheader">When</span>
        <span role="columnheader">Actor</span>
        <span role="columnheader">Action</span>
        <span role="columnheader">Target</span>
        <span role="columnheader">Detail</span>
      </div>
      {entries.map((e) => (
        <div className="cmp-table__row" role="row" key={e.id}>
          <span role="cell" className="tcc-mono cmp-log__when">
            {fmtStamp(e.created_at)}
          </span>
          <span role="cell" className="cmp-cell">
            {e.actor_name || NA}
          </span>
          <span role="cell" className="cmp-cell cmp-strong">
            {actionName(e.action)}
          </span>
          <span role="cell" className="cmp-cell">
            {targetText(e)}
          </span>
          <span role="cell" className={`cmp-cell${detailText(e.detail) === NA ? ' tcc-na' : ''}`}>
            {detailText(e.detail)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SkelRows() {
  return (
    <div className="cmp-skel" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skel key={i} w={`${96 - i * 8}%`} h={14} />
      ))}
    </div>
  );
}

/**
 * Council activity log (executives; the route checks again). Plain action
 * names and targets; structured detail is drawn as text. With sample content
 * showing, the sample entries are filtered on the page and nothing is
 * fetched.
 */
export function ActivityLog({ sampleEntries = null, reloadKey = 0 }) {
  const [action, setAction] = useState('');
  const [state, setState] = useState({
    status: 'loading',
    entries: [],
    types: [],
    hasMore: false,
    offset: 0,
  });
  const [more, setMore] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async (offset, act) => {
    if (offset === 0) setState((s) => ({ ...s, status: 'loading' }));
    else setMore(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
      if (act) params.set('action', act);
      const res = await fetch(`${URL_}?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!alive.current) return;
      if (res.status === 403) {
        setState({ status: 'forbidden', entries: [], types: [], hasMore: false, offset: 0 });
        return;
      }
      if (!res.ok) {
        if (offset === 0) setState((s) => ({ ...s, status: 'error' }));
        return;
      }
      setState((s) => ({
        status: 'ready',
        entries: offset === 0 ? data.entries || [] : [...s.entries, ...(data.entries || [])],
        types: data.actionTypes || s.types,
        hasMore: Boolean(data.hasMore),
        offset,
      }));
    } catch {
      if (alive.current && offset === 0) setState((s) => ({ ...s, status: 'error' }));
    } finally {
      if (alive.current) setMore(false);
    }
  }, []);

  useEffect(() => {
    if (sampleEntries) return;
    load(0, action);
    // reloadKey is a deliberate dependency: Refresh and every change reload the log.
  }, [sampleEntries, load, action, reloadKey]);

  const sampleTypes = useMemo(
    () => (sampleEntries ? [...new Set(sampleEntries.map((e) => e.action))].sort() : []),
    [sampleEntries],
  );
  const types = sampleEntries ? sampleTypes : state.types;
  const entries = sampleEntries
    ? sampleEntries.filter((e) => !action || e.action === action)
    : state.entries;
  const status = sampleEntries ? 'ready' : state.status;

  if (status === 'forbidden') {
    return <p className="tcc-state">The council activity log is visible to executives only.</p>;
  }

  return (
    <>
      <div className="cmp-log__bar">
        <label className="cmp-select">
          <span className="cmp-select__label">Action</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            disabled={status === 'loading' && !entries.length}
          >
            <option value="">All actions</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {actionName(t)}
              </option>
            ))}
          </select>
          <i className="bi bi-chevron-down" aria-hidden="true" />
        </label>
      </div>
      {status === 'loading' ? (
        <SkelRows />
      ) : status === 'error' ? (
        <SectionError message="Could not load the activity log." onRetry={() => load(0, action)} />
      ) : entries.length === 0 ? (
        <p className="tcc-state">
          {action ? 'No entries for this action.' : 'No activity recorded yet.'}
        </p>
      ) : (
        <>
          <Rows entries={entries} />
          {!sampleEntries && state.hasMore && (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent cmp-more"
              onClick={() => load(state.offset + PAGE, action)}
              disabled={more}
            >
              {more ? 'Loading' : 'Load more'}
            </button>
          )}
        </>
      )}
    </>
  );
}
