'use client';

/**
 * SonarCompanionWindow (Nov 28 2026): the compact assistant and the research sidebar of Sonar
 * Companion, one component in two presentation modes over the same state. Switching modes,
 * resizing, docking and minimizing only change the layout; they never ask the server again.
 *
 *   header        mode controls (sidebar, full workspace), new conversation, history,
 *                 preferences, minimize
 *   context       what the answer may use, as removable chips (route and page descriptors)
 *   conversation  the reader's questions in this workspace and the active answer
 *   suggestions   deterministic, executable (lib/sonar/companion/suggestions.js)
 *   composer      fixed at the bottom
 *
 * Escape minimizes and returns focus to the launcher. The sidebar's width changes with the
 * drag handle or the keyboard (arrow keys, Home, End on the handle).
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSonarCompanion } from './SonarCompanionContext';
import { SonarCompanionRenderer } from './SonarCompanionRenderer';
import { SonarCompanionPreferences } from './SonarCompanionPreferences';
import { contextItems } from '@/lib/sonar/companion/page-context';
import { suggestionsFor } from '@/lib/sonar/companion/suggestions';
import { resizeStep, WIDTH_MIN, WIDTH_MAX } from '@/lib/sonar/companion/prefs';

export function SonarCompanionWindow() {
  const c = useSonarCompanion();
  const [text, setText] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const input = useRef(null);
  const root = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && root.current?.contains(document.activeElement)) {
        e.preventDefault();
        c.minimize();
        requestAnimationFrame(() => document.getElementById('scc-launcher')?.focus());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c]);

  if (!c) return null;
  const { ui, prefs, ctx, view } = c;
  const sidebar = ui.mode === 'sidebar';
  const chips = contextItems(ctx).filter((i) => !c.removed.includes(i.key));
  const suggestions = suggestionsFor(ctx, { enabled: prefs.suggestions, orgMember: c.orgMember });

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, w: prefs.width };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    c.setPrefs({ width: drag.current.w + (prefs.side === 'left' ? dx : -dx) });
  };

  const submit = (e) => {
    e.preventDefault();
    if (c.ask(text).ok) setText('');
  };

  return (
    <section
      ref={root}
      className={`scc-window ${sidebar ? 'is-sidebar' : 'is-compact'}${prefs.side === 'left' ? ' is-left' : ''}${c.docked ? ' is-docked' : ''}${prefs.density === 'compact' ? ' is-dense' : ''}`}
      style={sidebar ? { '--scc-w': `${prefs.width}px` } : undefined}
      role="dialog"
      aria-modal="false"
      aria-label="Sonar Companion"
    >
      {sidebar ? (
        <div
          className="scc-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Sonar Companion"
          aria-valuemin={WIDTH_MIN}
          aria-valuemax={WIDTH_MAX}
          aria-valuenow={prefs.width}
          tabIndex={0}
          onKeyDown={(e) => {
            const w = resizeStep(
              prefs.width,
              prefs.side === 'left'
                ? { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' }[e.key] || e.key
                : e.key,
            );
            if (w !== prefs.width) {
              e.preventDefault();
              c.setPrefs({ width: w });
            }
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
        />
      ) : null}

      <header className="scc-head">
        <span className="scc-brand">
          <i className="bi bi-broadcast" aria-hidden="true" /> Sonar
          <span className="scc-scope">
            {ctx.workspace === 'organization' ? 'Council' : 'Personal'}
          </span>
        </span>
        <span className="scc-tools">
          <button
            type="button"
            className="scc-icon"
            aria-label="New conversation"
            title="New conversation"
            onClick={c.newConversation}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="scc-icon"
            aria-label="Conversations"
            title="Conversations"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <i className="bi bi-clock-history" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="scc-icon"
            aria-label={sidebar ? 'Compact view' : 'Expand to sidebar'}
            title={sidebar ? 'Compact view' : 'Expand to sidebar'}
            onClick={() => c.setMode(sidebar ? 'compact' : 'sidebar')}
          >
            <i
              className={`bi ${sidebar ? 'bi-arrows-angle-contract' : 'bi-layout-sidebar-reverse'}`}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="scc-icon"
            aria-label="Open the full Sonar workspace"
            title="Open full workspace"
            onClick={c.goFull}
          >
            <i className="bi bi-arrows-fullscreen" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="scc-icon"
            aria-label="Preferences"
            title="Preferences"
            aria-expanded={ui.prefsOpen}
            onClick={c.togglePrefs}
          >
            <i className="bi bi-sliders" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="scc-icon"
            aria-label="Minimize Sonar Companion"
            title="Minimize"
            onClick={() => {
              c.minimize();
              requestAnimationFrame(() => document.getElementById('scc-launcher')?.focus());
            }}
          >
            <i className="bi bi-dash-lg" aria-hidden="true" />
          </button>
        </span>
      </header>

      {ui.prefsOpen ? <SonarCompanionPreferences /> : null}

      {chips.length || c.removed.length ? (
        <p className="scc-context" aria-label="Context this answer may use">
          {chips.map((i) => (
            <span key={i.key} className="scc-chip">
              {i.label}
              {i.removable ? (
                <button
                  type="button"
                  className="scc-chip-x"
                  aria-label={`Leave out ${i.label}`}
                  onClick={() => c.removeContext(i.key)}
                >
                  <i className="bi bi-x" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ))}
          {c.removed.length ? (
            <button type="button" className="scc-link" onClick={c.restoreContext}>
              Restore context
            </button>
          ) : null}
        </p>
      ) : null}

      <div className="scc-body">
        {historyOpen ? (
          <nav className="scc-history" aria-label="Conversations in this workspace">
            {c.entries.length ? (
              <ul>
                {[...c.entries].reverse().map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`scc-hist${e.id === c.activeId ? ' is-on' : ''}`}
                      aria-current={e.id === c.activeId ? 'true' : undefined}
                      onClick={() => {
                        c.openEntry(e.id);
                        setHistoryOpen(false);
                      }}
                    >
                      {e.question || (e.kind === 'council' ? 'Council research' : 'Research run')}
                      <span className="scc-hist-status">
                        {e.status === 'interrupted'
                          ? 'Interrupted'
                          : e.status === 'running'
                            ? 'Running'
                            : e.status === 'error'
                              ? 'Did not complete'
                              : e.status === 'unavailable'
                                ? 'Not available'
                                : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="scc-muted">No conversations in this workspace yet.</p>
            )}
            {ctx.workspace === 'personal' ? (
              <Link href="/sonar/history" className="scc-link">
                All research history
              </Link>
            ) : null}
          </nav>
        ) : null}

        <SonarCompanionRenderer mode={sidebar ? 'sidebar' : 'compact'} />

        {!view && !c.streaming && suggestions.length ? (
          <div className="scc-suggest" aria-label="Suggested research">
            {suggestions.map((s) =>
              s.kind === 'navigate' ? (
                <Link key={s.id} href={s.href} className="scc-sugg">
                  {s.label} <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
              ) : (
                <button
                  key={s.id}
                  type="button"
                  className="scc-sugg"
                  onClick={() =>
                    s.kind === 'council'
                      ? c.askCouncil(s.capability, s.params, s.label)
                      : c.ask(s.query)
                  }
                >
                  {s.label}
                  {s.kind === 'council' ? (
                    <span className="scc-sugg-tag">Council records</span>
                  ) : null}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>

      <p className="scc-live" role="status" aria-live="polite">
        {c.streaming ? 'Sonar is researching.' : c.notice || ''}
      </p>

      <form className="scc-composer" onSubmit={submit}>
        <label htmlFor="scc-input" className="scc-sr">
          Ask Sonar
        </label>
        <textarea
          id="scc-input"
          ref={input}
          rows={1}
          value={text}
          placeholder={ctx.entity?.symbol ? `Ask about ${ctx.entity.symbol}` : 'Ask Sonar'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e);
          }}
        />
        <button
          type="submit"
          className="scc-send"
          aria-label="Send question"
          disabled={!text.trim() || c.streaming}
        >
          <i className="bi bi-arrow-up" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

export default SonarCompanionWindow;
