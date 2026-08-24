'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useKeywordPopup } from './EchoKeywordContext';
import { getKeywordById } from '@/lib/echo-keywords';
import './echo-keyword-popup.css';

export function EchoKeywordPopup() {
  const { activeKeywordId, anchorElement, closeKeyword } = useKeywordPopup();
  const [isVisible, setIsVisible] = useState(false);
  const popupRef = useRef(null);
  const lastAnchorRef = useRef(null);
  // Rail anchoring: on grail articles at desktop the popup overlays the
  // "Geography of the Story" column instead of floating at the viewport edge.
  // Measured from the live rail rect (fixed positioning, so only the sticky
  // top needs clamping); null = no rail on screen -> fall back to the fixed
  // right-side card / bottom sheet the CSS already defines.
  const [railBox, setRailBox] = useState(null);

  useEffect(() => {
    if (!anchorElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const rect = entry.boundingClientRect;
        if (!entry.isIntersecting && rect.bottom < 0) {
          closeKeyword();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -40% 0px' },
    );

    observer.observe(anchorElement);
    return () => observer.disconnect();
  }, [anchorElement, closeKeyword]);

  useEffect(() => {
    if (activeKeywordId) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [activeKeywordId]);

  useEffect(() => {
    if (!activeKeywordId) return;
    const handler = (e) => {
      if (e.key === 'Escape') closeKeyword();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeKeywordId, closeKeyword]);

  // Anchor over the rail column while open (>=1280px is where the rail is a
  // real third column). Remeasured on resize; horizontal position is scroll-
  // independent, and the top clamps to the rail's sticky line.
  useEffect(() => {
    if (!activeKeywordId) {
      setRailBox(null);
      return undefined;
    }
    const measure = () => {
      const rail = window.innerWidth >= 1280 ? document.querySelector('.echo-grail') : null;
      if (!rail) {
        setRailBox(null);
        return;
      }
      const rect = rail.getBoundingClientRect();
      const inset = 8;
      setRailBox({
        top: Math.max(90, Math.round(rect.top)),
        left: Math.round(rect.left + inset),
        width: Math.round(rect.width - inset * 2),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeKeywordId]);

  // Dim the rail beneath while the popup overlays it (wash lives in
  // echo-globe-rail.css, keyed off this body class).
  useEffect(() => {
    if (!activeKeywordId || !railBox) return undefined;
    document.body.classList.add('ekp-rail-dim');
    return () => document.body.classList.remove('ekp-rail-dim');
  }, [activeKeywordId, railBox]);

  // Focus management: into the dialog on open, back to the trigger term on
  // close (opening a second term retargets the return to the newer trigger).
  // preventScroll on both: the popup is fixed (nothing to reveal), and when
  // the auto-close fires because the reader scrolled past the anchor, the
  // focus return must not yank the page back up to the trigger.
  useEffect(() => {
    if (activeKeywordId) {
      lastAnchorRef.current = anchorElement;
      requestAnimationFrame(() => popupRef.current?.focus({ preventScroll: true }));
      return undefined;
    }
    const back = lastAnchorRef.current;
    lastAnchorRef.current = null;
    back?.focus?.({ preventScroll: true });
    return undefined;
  }, [activeKeywordId, anchorElement]);

  // Outside click/tap dismisses. Clicks on keyword triggers are exempt so
  // opening a second term switches cleanly instead of racing a close.
  useEffect(() => {
    if (!activeKeywordId) return undefined;
    const onPointerDown = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      if (e.target.closest?.('.ekp-keyword-span')) return;
      closeKeyword();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [activeKeywordId, closeKeyword]);

  if (!activeKeywordId) return null;
  const keyword = getKeywordById(activeKeywordId);
  if (!keyword) return null;

  return (
    <aside
      ref={popupRef}
      className={`ekp-popup${railBox ? ' ekp-popup--rail' : ''} ${isVisible ? 'is-visible' : ''}`}
      style={
        railBox
          ? { top: railBox.top, left: railBox.left, width: railBox.width, right: 'auto' }
          : undefined
      }
      role="dialog"
      aria-modal="false"
      aria-labelledby="ekp-title"
      tabIndex={-1}
    >
      <button
        type="button"
        className="ekp-close"
        onClick={closeKeyword}
        aria-label="Close definition"
      >
        <i className="bi bi-x-lg" />
      </button>

      <div className="ekp-eyebrow">Keyword</div>
      <h3 className="ekp-title" id="ekp-title">
        {keyword.term}
      </h3>
      <p className="ekp-definition">{keyword.definition}</p>

      <div className="ekp-template">
        <KeywordTemplate template={keyword.template} data={keyword.templateData} />
      </div>

      {keyword.realWorld && (
        <div className="ekp-realworld">
          <div className="ekp-realworld-label">
            <i className="bi bi-lightbulb" /> In this article
          </div>
          <p className="ekp-realworld-text">{keyword.realWorld}</p>
        </div>
      )}

      {keyword.courseId && (
        <Link
          href={`/learning-center/course/${keyword.courseId}`}
          className="ekp-course-link"
          onClick={closeKeyword}
        >
          <div className="ekp-course-icon">
            <i className="bi bi-mortarboard-fill" />
          </div>
          <div className="ekp-course-text">
            <div className="ekp-course-eyebrow">Learning Academy</div>
            <div className="ekp-course-title">{keyword.courseTitle || 'Take the course'}</div>
          </div>
          <i className="bi bi-arrow-right ekp-course-arrow" />
        </Link>
      )}
    </aside>
  );
}

function KeywordTemplate({ template, data }) {
  if (!data) return null;
  switch (template) {
    case 'timeline':
      return <TimelineTemplate data={data} />;
    case 'comparison':
      return <ComparisonTemplate data={data} />;
    case 'formula':
      return <FormulaTemplate data={data} />;
    case 'schema':
      return <SchemaTemplate data={data} />;
    default:
      return null;
  }
}

function TimelineTemplate({ data }) {
  return (
    <div className="ekp-timeline">
      {data.title && <div className="ekp-template-title">{data.title}</div>}
      <ol className="ekp-timeline-list">
        {data.events.map((event, i) => (
          <li key={i} className="ekp-timeline-event">
            <span className="ekp-timeline-year">{event.year}</span>
            <div className="ekp-timeline-content">
              <div className="ekp-timeline-label">{event.label}</div>
              {event.detail && <div className="ekp-timeline-detail">{event.detail}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ComparisonTemplate({ data }) {
  return (
    <div className="ekp-comparison">
      {data.title && <div className="ekp-template-title">{data.title}</div>}
      <div className="ekp-comparison-table">
        {data.headers && (
          <div className="ekp-comparison-row ekp-comparison-header">
            {data.headers.map((h, i) => (
              <div key={i} className="ekp-comparison-cell">
                {h}
              </div>
            ))}
          </div>
        )}
        {data.rows.map((row, i) => (
          <div key={i} className="ekp-comparison-row">
            <div className="ekp-comparison-cell ekp-comparison-label">{row.label}</div>
            {row.cells.map((cell, j) => (
              <div key={j} className="ekp-comparison-cell">
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
      {data.footnote && <div className="ekp-comparison-footnote">{data.footnote}</div>}
    </div>
  );
}

function FormulaTemplate({ data }) {
  return (
    <div className="ekp-formula">
      <div className="ekp-formula-equation">{data.formula}</div>
      {data.example && (
        <div className="ekp-formula-example">
          <div className="ekp-formula-example-label">{data.example.title}</div>
          <div className="ekp-formula-example-eq">{data.example.substitution}</div>
        </div>
      )}
      {data.tiers && data.tiers.length > 0 && (
        <div className="ekp-formula-tiers">
          {data.tiers.map((tier, i) => (
            <div key={i} className="ekp-formula-tier">
              <span className="ekp-formula-tier-dot" style={{ background: tier.color }} />
              <span className="ekp-formula-tier-label">{tier.label}</span>
              <span className="ekp-formula-tier-value">{tier.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SchemaTemplate({ data }) {
  return (
    <div className="ekp-schema">
      {data.title && <div className="ekp-template-title">{data.title}</div>}
      <div className="ekp-schema-grid">
        {data.nodes.map((node, i) => (
          <div key={i} className="ekp-schema-node">
            <div className="ekp-schema-node-label" style={{ borderLeftColor: node.color }}>
              {node.label}
            </div>
            <div className="ekp-schema-node-items">
              {node.sectors?.map((s, j) => (
                <span
                  key={j}
                  className="ekp-schema-pill"
                  style={{ color: node.color, borderColor: `${node.color}55` }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
