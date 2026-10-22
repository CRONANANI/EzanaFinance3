'use client';

/**
 * The /datasets pulse on the client (Oct 21): the live signals the top-bar
 * belt cycles through and which one, if any, is open as a brief on the page.
 *
 * The server renders the first read (readPulse with a short budget). The
 * client then refreshes from /api/datasets/pulse: once shortly after mount
 * when that first read was partial (a reader was still warming), then every
 * five minutes while the tab is visible. Items are replaced wholesale and the
 * open brief survives a refresh as long as its key is still in the feed.
 *
 * Opening a signal also selects its dimension on the shared SonarSelection, so
 * the console rail lights the same dimension, and mirrors the key into
 * ?signal= with replaceState (no history entries), like ?dimension=.
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
import { useSonarSelection, emit } from './SonarSelection';

const REFRESH_MS = 5 * 60 * 1000;
const WARM_RETRY_MS = 4000;

const PulseContext = createContext({
  items: [],
  datasets: {},
  openKey: null,
  open: () => {},
  close: () => {},
  leadFor: () => null,
});

function writeUrl(key) {
  try {
    const url = new URL(window.location.href);
    if (key) url.searchParams.set('signal', key);
    else url.searchParams.delete('signal');
    window.history.replaceState(window.history.state, '', url);
  } catch {
    /* URL sync is a convenience only. */
  }
}

export function PulseProvider({ initial, initialKey = null, children }) {
  const [pulse, setPulse] = useState(initial || { items: [], datasets: {} });
  const [openKey, setOpenKey] = useState(
    initialKey && initial?.items?.some((it) => it.key === initialKey) ? initialKey : null,
  );
  const { select } = useSonarSelection();
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/datasets/pulse', { headers: { accept: 'application/json' } });
      if (!res.ok) return null;
      const next = await res.json();
      if (alive.current && Array.isArray(next?.items) && next.items.length) setPulse(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    let timer = null;
    const schedule = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (document.visibilityState === 'visible') {
          const next = await refresh();
          schedule(next?.partial ? WARM_RETRY_MS * 4 : REFRESH_MS);
        } else {
          schedule(REFRESH_MS);
        }
      }, ms);
    };
    schedule(initial?.partial || !initial?.items?.length ? WARM_RETRY_MS : REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') schedule(0);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive.current = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    /* initial is the server render: read once. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  /* A refresh that drops the open signal closes its brief. */
  useEffect(() => {
    if (openKey && !pulse.items.some((it) => it.key === openKey)) {
      setOpenKey(null);
      writeUrl(null);
    }
  }, [pulse.items, openKey]);

  const open = useCallback(
    (key, from = 'belt') => {
      const item = pulse.items.find((it) => it.key === key);
      if (!item) return;
      setOpenKey(key);
      writeUrl(key);
      select(item.dimensionId, 'pulse');
      emit('dsx_signal_open', { key, dataset: item.datasetId, from });
    },
    [pulse.items, select],
  );

  const close = useCallback(() => {
    setOpenKey(null);
    writeUrl(null);
  }, []);

  /* The freshest signal of a dimension: the rail opens it when a strip is
     chosen while a brief is already showing. */
  const leadFor = useCallback(
    (dimensionId) => pulse.items.find((it) => it.dimensionId === dimensionId) || null,
    [pulse.items],
  );

  const value = useMemo(
    () => ({ items: pulse.items, datasets: pulse.datasets || {}, openKey, open, close, leadFor }),
    [pulse.items, pulse.datasets, openKey, open, close, leadFor],
  );

  return <PulseContext.Provider value={value}>{children}</PulseContext.Provider>;
}

export function usePulse() {
  return useContext(PulseContext);
}
