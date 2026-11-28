'use client';

/**
 * Linked selection for one Sonar answer (Nov 28 2026). When a reader selects a security in
 * the securities monitor, a tile in the universe map or a row in a research table, every
 * component of the same answer that shows that entity highlights it, from one shared value
 * instead of each component's own local state (so two views never disagree). Selecting never
 * reruns research: it only changes what is highlighted.
 *
 * Outside a provider, useSonarSelection() keeps a local value, so a component also works on
 * its own.
 */
import { createContext, useContext, useMemo, useState } from 'react';

const Ctx = createContext(null);

export function SonarSelectionProvider({ children }) {
  const [selected, setSelected] = useState(null);
  const value = useMemo(() => ({ selected, setSelected }), [selected]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** [selectedId, select(id | null)]; selecting the selected id clears it. */
export function useSonarSelection() {
  const shared = useContext(Ctx);
  const [own, setOwn] = useState(null);
  const selected = shared ? shared.selected : own;
  const set = shared ? shared.setSelected : setOwn;
  const select = (id) => set((prev) => (id == null || prev === id ? null : id));
  return [selected, select];
}
