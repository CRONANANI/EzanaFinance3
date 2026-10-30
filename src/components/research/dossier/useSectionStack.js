'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  initStack,
  selectSection,
  togglePin,
  visibleSections,
  DEFAULT_SECTION,
} from '@/lib/research/sectionStack';

const STORAGE_KEY = 'ezana.research.pinnedSections.v1';

function readPins() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePins(pins) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {
    /* storage unavailable: pins last for this visit only */
  }
}

/**
 * Section tab state for /company-research: the active tab (mirrored to
 * ?section=, Overview omitted) and the pinned sections (localStorage, shared
 * across tickers). ?view= and every other param are left alone.
 */
export function useSectionStack() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState(() =>
    initStack({ active: searchParams.get('section') ?? DEFAULT_SECTION }),
  );
  const [announcement, setAnnouncement] = useState('');
  const hydrated = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* Pins come from storage after mount so the server and first client render match. */
  useEffect(() => {
    setState((s) => initStack({ active: s.active, pinned: readPins() }));
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (hydrated.current) writePins(state.pinned);
  }, [state.pinned]);

  /* Mirror the active tab into ?section=. */
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    if (state.active === DEFAULT_SECTION) sp.delete('section');
    else sp.set('section', state.active);
    const next = sp.toString();
    if (next !== searchParams.toString()) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [state.active]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = useCallback((id, label) => {
    if (stateRef.current.active === id) return;
    setState((s) => selectSection(s, id));
    if (label) setAnnouncement(`${label} opened`);
  }, []);

  const pin = useCallback((id, label) => {
    const willPin = !stateRef.current.pinned.includes(id);
    setState((s) => togglePin(s, id));
    if (label) setAnnouncement(`${label} ${willPin ? 'pinned' : 'unpinned'}`);
  }, []);

  const order = useMemo(() => visibleSections(state), [state]);

  return { state, order, open, pin, announcement };
}
