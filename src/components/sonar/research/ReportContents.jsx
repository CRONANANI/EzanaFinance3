'use client';

/**
 * ReportContents: the contents legend on the left of a Sonar research
 * answer (Nov 2026), the same pattern as the Ezana Echo article contents
 * and the Ezana API docs legend: a sticky list of the report's standard
 * sections (lib/sonar/report-sections.js), the current one in emerald, a
 * click scrolls to it.
 *
 * It reads the report it sits beside (`rootRef`): the sections present are
 * resolved from the heading ids on the page and kept current while the
 * report streams in (MutationObserver), so every shape of report, and a
 * saved org report, gets the same legend. Scroll-spy is the deterministic
 * Echo tracker (the last section whose heading is above the reading line),
 * listening in the capture phase so it works whatever element scrolls.
 * Renders nothing until the report has MIN_SECTIONS sections.
 * On narrow containers the legend becomes a row of chips above the report
 * (CSS container query, research-report.css).
 */
import { useCallback, useEffect, useState } from 'react';
import { MIN_SECTIONS, activeSection, resolveSections } from '@/lib/sonar/report-sections';

const HEADING_ID = /^(srr|srm|spm|sff|sch)-[\w-]*h$/;

export default function ReportContents({ rootRef }) {
  const [sections, setSections] = useState([]);
  const [active, setActive] = useState(null);

  /* Which standard sections the report has, in page order. */
  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return undefined;
    let raf = 0;
    const scan = () => {
      raf = 0;
      const ids = [...root.querySelectorAll('[id]')]
        .map((el) => el.id)
        .filter((id) => HEADING_ID.test(id));
      const next = resolveSections(ids);
      setSections((prev) =>
        prev.length === next.length && prev.every((s, i) => s.id === next[i].id) ? prev : next,
      );
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(scan);
    };
    scan();
    const mo = new MutationObserver(schedule);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [rootRef]);

  /* Scroll-spy. */
  useEffect(() => {
    if (sections.length < MIN_SECTIONS) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.35;
      const tops = sections.map((s) => document.getElementById(s.id)?.getBoundingClientRect().top);
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      const next = activeSection(
        sections,
        tops,
        line,
        atBottom && doc.scrollHeight > window.innerHeight,
      );
      setActive((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [sections]);

  const go = useCallback((e, s) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    e.preventDefault();
    setActive(s.key);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (sections.length < MIN_SECTIONS) return null;

  return (
    <nav className="srr-contents" aria-label="Report contents">
      <p className="srr-contents-head">Contents</p>
      <ul>
        {sections.map((s) => (
          <li key={s.key}>
            <a
              href={`#${s.id}`}
              className={active === s.key ? 'is-active' : ''}
              aria-current={active === s.key ? 'location' : undefined}
              onClick={(e) => go(e, s)}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
