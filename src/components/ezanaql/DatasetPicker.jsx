'use client';

/**
 * The Datasets affordance beside the builder's prompt field.
 *
 * This is the honesty surface. Before this, the only way to learn that a
 * dataset was not queryable was to write a query and have it refused. The
 * popover states it up front, per dataset, and says which ones are live
 * TODAY rather than which ones exist in the catalog.
 *
 * Reads GET /api/ezanaql/catalog, which is public and cached, so the list can
 * never drift from what the executor will actually accept: both read the same
 * catalog.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import './dataset-picker.css';

/* The prefix of a dataset name is its dimension. Labels for the ones we have;
   anything else falls back to the prefix itself rather than being hidden. */
const GROUP_LABELS = {
  gov: 'Government',
  capitol: 'Capitol Watch',
  house: 'House disclosures',
  senate: 'Senate disclosures',
  market: 'Markets',
  commodities: 'Commodities',
  institutions: 'Institutions',
  insider: 'Insider activity',
  prediction: 'Prediction markets',
  portfolio: 'Your portfolio',
};

export default function DatasetPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle', datasets: [] });
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  /* Fetched once, on first open. The guard is a ref rather than the status in
     state: depending on the status made the effect re-run the moment it was
     set to loading, and that re-run's cleanup cancelled the request that had
     just been sent, so the list stayed empty forever. */
  const fetched = useRef(false);
  useEffect(() => {
    if (!open || fetched.current) return undefined;
    fetched.current = true;
    let alive = true;
    setState({ status: 'loading', datasets: [] });
    fetch('/api/ezanaql/catalog')
      .then((r) => r.json())
      .then((d) => {
        if (alive) setState({ status: 'ready', datasets: d?.datasets || [] });
      })
      .catch(() => {
        if (alive) {
          fetched.current = false; // let a later open retry
          setState({ status: 'error', datasets: [] });
        }
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, close]);

  const groups = state.datasets.reduce((acc, d) => {
    (acc[d.group] = acc[d.group] || []).push(d);
    return acc;
  }, {});

  const liveCount = state.datasets.filter((d) => d.available).length;

  return (
    <span className="eqp" ref={wrapRef}>
      <button
        type="button"
        ref={btnRef}
        className="eqp-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bi bi-database" aria-hidden="true" />
        Datasets
      </button>

      {open ? (
        <div className="eqp-pop" role="dialog" aria-label="Queryable datasets">
          <div className="eqp-head">
            <span className="eqp-title">What you can query</span>
            {state.status === 'ready' ? (
              <span className="eqp-count">
                {liveCount} of {state.datasets.length} live
              </span>
            ) : null}
          </div>

          {state.status === 'loading' ? <p className="eqp-msg">Loading.</p> : null}
          {state.status === 'error' ? (
            <p className="eqp-msg">The dataset list could not be loaded.</p>
          ) : null}

          <div className="eqp-body">
            {Object.entries(groups).map(([g, list]) => (
              <div className="eqp-group" key={g}>
                <p className="eqp-group-head">{GROUP_LABELS[g] || g}</p>
                {list.map((d) => (
                  <button
                    type="button"
                    key={d.name}
                    className={`eqp-row${d.available ? '' : ' is-off'}`}
                    disabled={!d.available}
                    onClick={() => {
                      onPick?.(d.name);
                      close();
                    }}
                  >
                    <span className={`eqp-dot${d.available ? '' : ' is-off'}`} aria-hidden="true" />
                    <span className="eqp-name">{d.name}</span>
                    <span className="eqp-label">{d.label}</span>
                    <span className="eqp-state">{d.available ? 'live' : 'not yet'}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <p className="eqp-foot">Queries can span any live dataset, not just this page&apos;s.</p>
        </div>
      ) : null}
    </span>
  );
}
