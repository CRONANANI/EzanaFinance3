'use client';

/**
 * Which dimension is selected on the sonar. One piece of state shared by the
 * radar blips, the other-six cards and the server-rendered detail panels.
 *
 * The server renders every panel and the initial selection from ?dimension=,
 * so the page reads correctly before JavaScript loads. This island only
 * switches which panel is shown, keeps ?dimension= in the URL with
 * replaceState (no history entries), and below 1000px scrolls the panel into
 * view after a selection.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SelectionContext = createContext({ selected: null, select: () => {} });

/* A no-dependency hook point: anything listening for this event can forward it
   to an analytics provider. Nothing is sent anywhere by default. */
export function emit(name, detail = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('ezana:analytics', { detail: { name, ...detail } }));
  } catch {
    /* ignore */
  }
}

export function SonarSelectionProvider({ initial, ids, children }) {
  const [selected, setSelected] = useState(initial);

  const select = useCallback(
    (id, from = 'radar') => {
      if (!ids.includes(id)) return;
      setSelected(id);
      emit('dsx_blip_select', { dimension: id, from });
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('dimension', id);
        window.history.replaceState(window.history.state, '', url);
      } catch {
        /* ignore */
      }
      if (window.matchMedia?.('(max-width: 1000px)').matches) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        requestAnimationFrame(() =>
          document
            .getElementById('dso-detail')
            ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
        );
      }
    },
    [ids],
  );

  /* Links rendered on the server carry data-dso-event; one listener emits them. */
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target?.closest?.('[data-dso-event]');
      if (!el) return;
      emit(el.getAttribute('data-dso-event'), {
        dimension: selected,
        href: el.getAttribute('href') || null,
      });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [selected]);

  const value = useMemo(() => ({ selected, select }), [selected, select]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSonarSelection() {
  return useContext(SelectionContext);
}

/** Shows its (server-rendered) children only while `id` is the selection. */
export function DimensionSlot({ id, children }) {
  const { selected } = useSonarSelection();
  return (
    <div className="dso-slot" hidden={selected !== id}>
      {children}
    </div>
  );
}
