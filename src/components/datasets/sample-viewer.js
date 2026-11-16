'use client';

import { useEffect, useState } from 'react';

/* One request per page load, shared by every dataset component that asks. */
let pending = null;

/** Resolves to true only for master admin and demo accounts. Never throws. */
export function getDatasetSampleViewer() {
  if (!pending) {
    pending = fetch('/api/datasets/sample-viewer', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { sample: false }))
      .then((d) => d?.sample === true)
      .catch(() => false);
  }
  return pending;
}

/**
 * 'loading' until the server answers, then true (admin or demo account: may see
 * labelled sample content) or false (everyone else: honest empty state).
 */
export function useDatasetSampleViewer(enabled = true) {
  const [state, setState] = useState(enabled ? 'loading' : false);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    getDatasetSampleViewer().then((ok) => {
      if (alive) setState(ok);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return state;
}
