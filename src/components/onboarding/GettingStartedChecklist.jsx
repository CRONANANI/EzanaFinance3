'use client';

import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavIcon from '@/components/nav/NavIcon';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';
import { LIVE_TRADING_HREF } from '@/lib/onboarding/checklistConfig';
import './getting-started-checklist.css';

/* Bootstrap Icons (the repo's icon set), sized by font-size. */
const Icon = ({ name, size = 16, className = '', label }) => (
  <i
    className={`bi bi-${name} ${className}`.trim()}
    style={{ fontSize: size, lineHeight: 1 }}
    {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' })}
  />
);

function useIsPhone() {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isPhone;
}

/**
 * Navbar trigger + Getting Started checklist (Nov 2026).
 * >= 768px: anchored dropdown under the trigger.
 * <  768px: bottom sheet with scrim, portaled to <body>.
 * Nov 12 2026 redesign: a flat ledger in the /home idiom. No title, ring or
 * header art (the trigger names the panel): one progress strip, then stages
 * as hairline-separated sections whose tasks are plain rows. Every task row
 * is a real link to the page where that task is done.
 * Hides itself entirely once every task is done, unless `showWhenComplete`.
 * The trigger keeps the nav's summit glyph and corner badge; `variant="partner"`
 * switches the accent to gold.
 */
export default function GettingStartedChecklist({ showWhenComplete = false, variant = 'default' }) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const isPhone = useIsPhone();
  const panelId = useId();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const router = useRouter();
  const data = useChecklistProgress({ refetchKey: openCount });

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    setOpenCount((c) => c + 1);
  };

  // Esc + outside click
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && close();
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, close]);

  // Move focus into the panel on open; lock body scroll for the sheet
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    if (!isPhone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isPhone]);

  if (data.loading && !data.doneCount) return null;
  if (data.allDone && !showWhenComplete) return null;

  const go = (href) => {
    setOpen(false);
    if (href) router.push(href);
  };

  const panel = (
    <ChecklistPanel
      ref={panelRef}
      id={panelId}
      variant={isPhone ? 'sheet' : 'popover'}
      data={data}
      onNavigate={go}
      onFollow={() => setOpen(false)}
      onClose={close}
    />
  );

  return (
    <div
      className={`gsc gsc-anchor${variant === 'partner' ? ' gsc--partner' : ''}`}
      data-tutorial="checklist-icon"
    >
      <button
        ref={triggerRef}
        type="button"
        className="checklist-trigger-btn"
        data-open={open || undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        aria-label={`Getting started checklist, ${data.doneCount} of ${data.total} tasks done`}
        title={`${data.doneCount}/${data.total} tasks done`}
        onClick={toggle}
      >
        <span className="checklist-trigger-inner" aria-hidden="true">
          <NavIcon name="summit" size={22} />
        </span>
        <span className="checklist-trigger-badge gsc-mono" aria-hidden="true">
          {data.doneCount}/{data.total}
        </span>
      </button>

      {open && !isPhone && panel}
      {open &&
        isPhone &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className={`gsc gsc-sheet-root${variant === 'partner' ? ' gsc--partner' : ''}`}>
            <div className="gsc-scrim" aria-hidden="true" onClick={close} />
            {panel}
          </div>,
          document.body,
        )}
    </div>
  );
}

// forwardRef: Next 14 ships React 18, where ref is not a regular prop.
const ChecklistPanel = forwardRef(function ChecklistPanel(
  { id, variant, data, onNavigate, onFollow, onClose },
  ref,
) {
  const { stages, total, doneCount, xp, allDone, activeStage, tasksLeftInStage, nextTask } = data;
  const pct = total ? doneCount / total : 0;
  const isSheet = variant === 'sheet';

  const footText = allDone
    ? 'Live trading unlocked'
    : `${tasksLeftInStage} ${tasksLeftInStage === 1 ? 'task' : 'tasks'} left in Stage ${activeStage.number}`;
  const ctaLabel = allDone ? 'Start trading' : doneCount === 0 ? 'Start' : 'Resume';
  const ctaHref = allDone ? LIVE_TRADING_HREF : nextTask?.href;

  return (
    <section
      ref={ref}
      id={id}
      tabIndex={-1}
      className={isSheet ? 'gsc-panel gsc-panel--sheet' : 'gsc-panel gsc-panel--popover'}
      role="dialog"
      aria-modal={isSheet || undefined}
      aria-label="Getting started checklist"
    >
      {/* One progress strip, no title: count, XP and the bar. */}
      <header className="gsc-head">
        {isSheet && <span className="gsc-handle" aria-hidden="true" />}
        <div className="gsc-head-row">
          <span className="gsc-count gsc-mono">
            {doneCount}
            <span className="gsc-count-of">/{total}</span>
          </span>
          <span className="gsc-count-label">tasks done</span>
          <span className="gsc-xp gsc-mono">{xp} XP</span>
          {isSheet && (
            <button
              type="button"
              className="gsc-close"
              aria-label="Close checklist"
              onClick={onClose}
            >
              <Icon name="x-lg" size={14} />
            </button>
          )}
        </div>
        <div
          className="gsc-bar"
          role="progressbar"
          aria-label="Checklist progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
        >
          <div
            className="gsc-bar-fill"
            style={{ width: `${Math.max(pct * 100, doneCount ? 4 : 0)}%` }}
          />
        </div>
      </header>

      <div className="gsc-body">
        {stages.map((stage) => (
          <Stage key={stage.id} stage={stage} prevNumber={stage.number - 1} onFollow={onFollow} />
        ))}
      </div>

      <footer className="gsc-foot">
        <span className="gsc-foot-text">{footText}</span>
        <button type="button" className="gsc-cta" onClick={() => onNavigate(ctaHref)}>
          {ctaLabel}
          <Icon name="arrow-right" size={14} />
        </button>
      </footer>
    </section>
  );
});

const two = (n) => String(n).padStart(2, '0');

/* A stage is one section: a head row (marker, name, tally) and, for the
   stage in progress, its tasks. Finished and locked stages are the head row
   alone, so the list stays short. */
function Stage({ stage, prevNumber, onFollow }) {
  const { status } = stage;
  const complete = status === 'complete';
  const active = status === 'active';
  const locked = !complete && !active;

  return (
    <section
      className="gsc-stage"
      data-status={complete ? 'complete' : active ? 'active' : 'locked'}
    >
      <div className="gsc-stage-head">
        <span className="gsc-marker gsc-mono">
          {complete ? (
            <Icon name="check-lg" size={14} label="Complete" />
          ) : locked ? (
            <Icon name="lock" size={13} label="Locked" />
          ) : (
            two(stage.number)
          )}
        </span>
        <h3 className="gsc-stage-name">{stage.name}</h3>
        <span className="gsc-stage-tally gsc-mono">
          {complete
            ? `Earned +${stage.bonusXp} XP`
            : active
              ? `${stage.doneN}/${stage.tasks.length} · +${stage.bonusXp} XP`
              : `${stage.tasks.length} tasks`}
        </span>
      </div>

      {status === 'next-locked' && (
        <p className="gsc-stage-note">
          Complete Stage {prevNumber} to unlock. {stage.lockDesc}
        </p>
      )}

      {active && (
        <ul className="gsc-tasks">
          {stage.tasks.map((task) => (
            <li key={task.id}>
              <Task task={task} onFollow={onFollow} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* A task is a link to the page where it is done (a finished task still
   links there). A task whose feature has not shipped is shown, not linked. */
function Task({ task, onFollow }) {
  const soon = task.soon && !task.done;
  const inner = (
    <>
      <span className="gsc-check" aria-hidden="true">
        {task.done && <Icon name="check-lg" size={11} />}
      </span>
      <span className="gsc-task-copy">
        <span className="gsc-task-title">
          {task.title}
          <span className="gsc-sr">
            {task.done ? ', done' : soon ? ', coming soon' : ', not done'}
          </span>
        </span>
        <span className="gsc-task-desc">{task.desc}</span>
      </span>
      <span className="gsc-task-xp gsc-mono">
        {task.done ? 'Earned' : soon ? 'Soon' : `+${task.xp} XP`}
      </span>
      {!soon && <Icon name="arrow-right" size={13} className="gsc-task-go" />}
    </>
  );

  if (soon) {
    return (
      <div className="gsc-task" data-soon="true">
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={task.href}
      className="gsc-task"
      data-done={task.done || undefined}
      onClick={onFollow}
    >
      {inner}
    </Link>
  );
}
