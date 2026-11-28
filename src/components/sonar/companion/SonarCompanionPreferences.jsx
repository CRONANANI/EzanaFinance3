'use client';

/**
 * SonarCompanionPreferences (Nov 28 2026): the compact preferences panel. Every choice is a
 * non-sensitive interface setting stored on this device (lib/sonar/companion/prefs.js);
 * sensible defaults mean nobody has to open it first.
 */
import { Checkbox } from '@/components/ds';
import { EzDropdown } from '@/components/ui/ez-dropdown';
import { useSonarCompanion } from './SonarCompanionContext';
import { WIDTH_MIN, WIDTH_MAX } from '@/lib/sonar/companion/prefs';

export function SonarCompanionPreferences() {
  const c = useSonarCompanion();
  const p = c.prefs;
  return (
    <div className="scc-prefs" role="group" aria-label="Sonar Companion preferences">
      <EzDropdown
        label="Opens as"
        size="sm"
        value={p.openMode}
        onChange={(v) => c.setPrefs({ openMode: v })}
        options={[
          { value: 'compact', label: 'Compact assistant' },
          { value: 'sidebar', label: 'Research sidebar' },
        ]}
      />
      <EzDropdown
        label="Side"
        size="sm"
        value={p.side}
        onChange={(v) => c.setPrefs({ side: v })}
        options={[
          { value: 'right', label: 'Right' },
          { value: 'left', label: 'Left' },
        ]}
      />
      <EzDropdown
        label="Density"
        size="sm"
        value={p.density}
        onChange={(v) => c.setPrefs({ density: v })}
        options={[
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact', label: 'Compact' },
        ]}
      />
      <label className="scc-range">
        <span>
          Sidebar width <span className="scc-mono">{p.width}px</span>
        </span>
        <input
          type="range"
          min={WIDTH_MIN}
          max={WIDTH_MAX}
          step={8}
          value={p.width}
          onChange={(e) => c.setPrefs({ width: Number(e.target.value) })}
        />
      </label>
      <Checkbox
        label="Dock the sidebar beside the page when there is room"
        checked={p.docked}
        onChange={(e) => c.setPrefs({ docked: e.target.checked })}
      />
      <Checkbox
        label="Show suggestions for this page"
        checked={p.suggestions}
        onChange={(e) => c.setPrefs({ suggestions: e.target.checked })}
      />
      <Checkbox
        label="Restore my last conversation"
        checked={p.restoreLast}
        onChange={(e) => c.setPrefs({ restoreLast: e.target.checked })}
      />
      <Checkbox
        label="Start minimized"
        checked={p.startMinimized}
        onChange={(e) => c.setPrefs({ startMinimized: e.target.checked })}
      />
    </div>
  );
}

export default SonarCompanionPreferences;
