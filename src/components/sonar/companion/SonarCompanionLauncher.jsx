'use client';

/**
 * SonarCompanionLauncher (Nov 28 2026): the small floating button that opens Sonar Companion.
 * Tiny and always mounted; the window itself is a separate lazy chunk. It sits above the
 * mobile tab bar and the safe area, on the side the reader chose, and shows a quiet dot while
 * a research run continues in the background. Opening it never sends a request.
 */
import { useSonarCompanion } from './SonarCompanionContext';

export function SonarCompanionLauncher() {
  const c = useSonarCompanion();
  if (!c) return null;
  const { ui, prefs, streaming } = c;
  if (ui.open) return null;
  return (
    <button
      type="button"
      id="scc-launcher"
      className={`scc-launcher${prefs.side === 'left' ? ' is-left' : ''}`}
      aria-label={streaming ? 'Open Sonar Companion, research in progress' : 'Open Sonar Companion'}
      aria-keyshortcuts="Alt+S"
      onClick={() => c.open(prefs.openMode)}
    >
      <i className="bi bi-broadcast" aria-hidden="true" />
      <span className="scc-launcher-label">Sonar</span>
      {streaming ? <span className="scc-launcher-dot" aria-hidden="true" /> : null}
    </button>
  );
}

export default SonarCompanionLauncher;
