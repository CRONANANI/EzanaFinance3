'use client';

/**
 * SonarToolsRow (Nov 21 2026): Research controls, Evidence and sources and Next steps on one
 * horizontal line under the follow-ups, part of the universal Sonar answer shell. Each is a
 * compact header (icon and title, only as wide as it needs); choosing one opens its panel over the
 * page below, and it closes on a second click, Escape, or a click anywhere else. Only one
 * panel is open at a time. Panels are overlays, so they keep a solid surface and a shadow.
 *
 * items: [{ key, icon, title, node, anchor? }]; an item with no node is left out.
 * The side navigation's "Evidence and sources" opens the sources panel through the
 * 'sonar:open-tool' window event. Styles: sonar-tools-row.css (stl-).
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { VisuallyHidden } from '@/components/ds';
import { FOCUS_OPTIONS, HORIZON_OPTIONS, SOURCE_OPTIONS } from '@/lib/sonar/research-controls';
import { useResearchControls } from './research-controls-store';
import { SonarResearchControls } from './SonarResearchControls';
import { SonarNextSteps, SonarRelatedResearch } from './SonarWorkspaceRail';
import './sonar-tools-row.css';

export const OPEN_TOOL_EVENT = 'sonar:open-tool';

/** Every row the answer used: name, what it is, a link out when there is one. */
export function SonarEvidenceList({ rows = [] }) {
  if (!rows.length) return null;
  return (
    <ul className="stl-ev">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="stl-ev-tile" aria-hidden="true">
              {r.initial}
            </span>
            <span className="stl-ev-text">
              <span className="stl-ev-name">{r.name}</span>
              {r.descriptor ? <span className="stl-ev-desc">{r.descriptor}</span> : null}
            </span>
            {r.href && r.external ? (
              <i className="bi bi-box-arrow-up-right stl-ev-out" aria-hidden="true" />
            ) : null}
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <a
                className="stl-ev-row"
                href={r.href}
                {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {inner}
                {r.external ? <VisuallyHidden> (opens in a new tab)</VisuallyHidden> : null}
              </a>
            ) : (
              <span className="stl-ev-row">{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The three tools for one answer.
 * steps/onStep     Next steps (lib/sonar/workspace nextSteps, runWorkspaceStep)
 * related/moreHref Related research, shown in the Next steps panel under the steps
 * sources/count    deskSourceRows(resources, Infinity) and the true total
 * anchorSources    the sources header carries the page's sa-sources anchor
 */
export function workspaceTools({
  steps = [],
  onStep = null,
  related = [],
  moreHref = null,
  sources = [],
  sourceCount = 0,
  anchorSources = false,
} = {}) {
  const stepCount = steps.length + (related.length ? 1 : 0);
  return [
    {
      key: 'controls',
      icon: 'bi-sliders',
      title: 'Research controls',
      node: <SonarResearchControls />,
    },
    sourceCount
      ? {
          key: 'sources',
          icon: 'bi-database',
          title: 'Evidence and sources',
          anchor: anchorSources ? 'sa-sources' : null,
          node: <SonarEvidenceList rows={sources} />,
        }
      : null,
    stepCount && typeof onStep === 'function'
      ? {
          key: 'steps',
          icon: 'bi-signpost-split',
          title: 'Next steps',
          node: (
            <>
              <SonarNextSteps steps={steps} onStep={onStep} />
              <SonarRelatedResearch items={related} moreHref={moreHref} />
            </>
          ),
        }
      : null,
  ].filter(Boolean);
}

export function SonarToolsRow({ items = [] }) {
  const id = useId();
  const [open, setOpen] = useState(null);
  const root = useRef(null);
  const buttons = useRef({});

  const close = useCallback((refocus = false) => {
    setOpen((cur) => {
      if (refocus && cur) buttons.current[cur]?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (root.current && !root.current.contains(e.target)) close(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  useEffect(() => {
    const onOpen = (e) => {
      const key = e?.detail?.key;
      if (key && items.some((it) => it.key === key)) setOpen(key);
    };
    window.addEventListener(OPEN_TOOL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TOOL_EVENT, onOpen);
  }, [items]);

  if (!items.length) return null;
  return (
    <div className="stl" ref={root} style={{ '--stl-n': items.length }}>
      {items.map((it) => {
        const isOpen = open === it.key;
        const panelId = `${id}-${it.key}`;
        return (
          <div
            key={it.key}
            id={it.anchor || undefined}
            className={`stl-item${isOpen ? ' is-open' : ''}`}
          >
            <button
              type="button"
              ref={(el) => {
                buttons.current[it.key] = el;
              }}
              className="stl-head"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : it.key)}
            >
              <span className="stl-ico" aria-hidden="true">
                <i className={`bi ${it.icon}`} />
              </span>
              <span className="stl-title">{it.title}</span>
              <i className="bi bi-chevron-down stl-chev" aria-hidden="true" />
            </button>
            <div
              id={panelId}
              className="stl-pop"
              role="region"
              aria-label={it.title}
              hidden={!isOpen}
            >
              {it.node}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SonarToolsRow;
