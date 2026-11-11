'use client';

import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const RING_C = 2 * Math.PI * 38; // r = 38 in an 88 viewBox

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
  { id, variant, data, onNavigate, onClose },
  ref,
) {
  const { stages, total, doneCount, xp, allDone, activeStage, tasksLeftInStage, nextTask } = data;
  const pct = total ? doneCount / total : 0;
  const isSheet = variant === 'sheet';

  const footText = allDone
    ? `All ${total} tasks complete`
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
      <header className="gsc-head">
        <svg className="gsc-head-art" viewBox="0 0 200 70" aria-hidden="true">
          <path d="M0 70 L70 30 L95 44 L140 6 L200 40 L200 70 Z" />
          <path d="M60 70 L120 34 L150 50 L200 22 L200 70 Z" />
        </svg>
        {isSheet && <span className="gsc-handle" aria-hidden="true" />}
        <div className="gsc-head-row">
          <div className="gsc-ring">
            <svg viewBox="0 0 88 88" aria-hidden="true">
              <circle className="gsc-ring-track" cx="44" cy="44" r="38" />
              <circle
                className="gsc-ring-fill"
                cx="44"
                cy="44"
                r="38"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - pct)}
              />
            </svg>
            <div className="gsc-ring-label">
              <span className="gsc-mono gsc-ring-count">
                {doneCount}/{total}
              </span>
              {!isSheet && <span className="gsc-mono gsc-ring-caption">TASKS</span>}
            </div>
          </div>
          <div className="gsc-head-copy">
            <h2>{allDone ? 'Live trading unlocked' : 'Getting started'}</h2>
            <p>
              {allDone
                ? 'You finished every task. Your account is ready to trade.'
                : 'Finish these to unlock live trading'}
            </p>
            {!isSheet && <Progress doneCount={doneCount} total={total} pct={pct} xp={xp} />}
          </div>
          {isSheet && (
            <button
              type="button"
              className="gsc-close"
              aria-label="Close checklist"
              onClick={onClose}
            >
              <Icon name="x-lg" size={16} />
            </button>
          )}
        </div>
        {isSheet && <Progress doneCount={doneCount} total={total} pct={pct} xp={xp} />}
      </header>

      <div className="gsc-body">
        {stages.map((stage) => (
          <Stage
            key={stage.id}
            stage={stage}
            prevNumber={stage.number - 1}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <footer className="gsc-foot">
        <span className="gsc-foot-text">{footText}</span>
        <button type="button" className="gsc-cta" onClick={() => onNavigate(ctaHref)}>
          {ctaLabel}
          <Icon name="arrow-right" size={16} />
        </button>
      </footer>
    </section>
  );
});

function Progress({ doneCount, total, pct, xp }) {
  return (
    <div className="gsc-progress">
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
      <span className="gsc-mono gsc-xp">{xp} XP</span>
    </div>
  );
}

function Stage({ stage, prevNumber, onNavigate }) {
  const { status } = stage;

  if (status === 'complete') {
    return (
      <div className="gsc-stage gsc-stage--row">
        <span className="gsc-num gsc-num--done">
          <Icon name="check-lg" size={15} />
        </span>
        <StageTitle
          stage={stage}
          meta={`Stage ${stage.number} · ${stage.doneN}/${stage.tasks.length} done`}
        />
        <span className="gsc-chip gsc-mono">Earned +{stage.bonusXp} XP</span>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="gsc-stage gsc-stage--row gsc-stage--locked">
        <span className="gsc-num gsc-num--locked gsc-mono">{stage.number}</span>
        <StageTitle
          stage={stage}
          meta={`Stage ${stage.number} · ${stage.tasks.length} tasks`}
          muted
        />
        <Icon name="lock-fill" size={16} label="Locked" className="gsc-lock-icon" />
      </div>
    );
  }

  const active = status === 'active';
  return (
    <div className="gsc-stage">
      <div className="gsc-stage-head">
        <span className={`gsc-num gsc-mono ${active ? 'gsc-num--active' : 'gsc-num--locked'}`}>
          {stage.number}
        </span>
        <StageTitle
          stage={stage}
          meta={
            active
              ? `Stage ${stage.number} · ${stage.doneN}/${stage.tasks.length} done`
              : `Stage ${stage.number} · ${stage.tasks.length} tasks`
          }
        />
        <span className={`gsc-chip gsc-mono ${active ? '' : 'gsc-chip--soft'}`}>
          +{stage.bonusXp} XP
        </span>
      </div>

      {active ? (
        <ul className="gsc-tasks">
          {stage.tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className="gsc-task"
                data-done={task.done || undefined}
                data-soon={task.soon || undefined}
                disabled={task.soon && !task.done}
                onClick={() => onNavigate(task.href)}
              >
                <span className="gsc-check" aria-hidden="true">
                  {task.done && <Icon name="check-lg" size={13} />}
                </span>
                <span className="gsc-task-copy">
                  <span className="gsc-task-title">
                    {task.title}
                    <span className="gsc-sr">{task.done ? ', done' : ', not done'}</span>
                  </span>
                  <span className="gsc-task-desc">{task.desc}</span>
                </span>
                <span
                  className={`gsc-chip gsc-mono ${task.done ? 'gsc-chip--earned' : task.soon ? 'gsc-chip--soft' : ''}`}
                >
                  {task.done ? 'Earned' : task.soon ? 'Coming soon' : `+${task.xp} XP`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="gsc-locked-card">
          <span className="gsc-locked-tile">
            <Icon name="lock-fill" size={16} />
          </span>
          <span className="gsc-task-copy">
            <span className="gsc-task-title">Complete Stage {prevNumber} to unlock</span>
            <span className="gsc-task-desc">{stage.lockDesc}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function StageTitle({ stage, meta, muted }) {
  return (
    <div className="gsc-stage-title">
      <h3 className={muted ? 'gsc-muted-title' : undefined}>{stage.name}</h3>
      <span>{meta}</span>
    </div>
  );
}
