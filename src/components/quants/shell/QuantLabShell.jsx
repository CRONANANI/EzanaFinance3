import { Suspense } from 'react';
import { Badge, Heading } from '@/components/ds';
import { QuantLabSidebar } from './QuantLabSidebar';

/**
 * The Quant Lab frame: workspace sidebar on the left, the workspace on the
 * right, on the flat home canvas. The sidebar reads the URL, so it sits in
 * its own Suspense boundary.
 */
export function QuantLabShell({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas ql-app">
      <Suspense fallback={<nav className="qlx-side" aria-label="Quant Lab workspaces" />}>
        <QuantLabSidebar />
      </Suspense>
      <main className="qlx-main">{children}</main>
    </div>
  );
}

/** The first row of a workspace: its context controls and its one primary action. */
export function QuantLabToolbar({ children, label = 'Workspace controls' }) {
  return (
    <div className="qlx-toolbar" role="group" aria-label={label}>
      {children}
    </div>
  );
}

/** A section on the canvas: a header over a hairline, then its content. No box. */
export function QuantSection({ title, minor = false, actions, children, ...rest }) {
  return (
    <section {...rest}>
      <div className="qlx-head">
        {minor ? (
          <h3 className="qlx-minor-title">{title}</h3>
        ) : (
          <Heading level="card" className="qlx-title">
            {title}
          </Heading>
        )}
        {actions && <div className="qlx-row">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * A ruled stat strip. `cells` is [{ label, value, sub, tone }], where tone is
 * 'up', 'down' or 'muted'. A value the data cannot supply is passed as 'n/a'.
 */
export function QuantStatStrip({ cells, dense = false, label }) {
  const toneClass = { up: 'qlx-up', down: 'qlx-down', muted: 'qlx-muted' };
  return (
    <div className={`qlx-strip${dense ? ' qlx-strip--four' : ''}`} role="group" aria-label={label}>
      {cells.map((c) => (
        <div key={c.label} className="qlx-cell">
          <span className="qlx-eyebrow">{c.label}</span>
          <span className={`qlx-val${dense ? ' qlx-val--sm' : ''} ${toneClass[c.tone] || ''}`}>
            {c.value}
          </span>
          {c.sub && <span className="qlx-sub">{c.sub}</span>}
        </div>
      ))}
    </div>
  );
}

const STAGE_TONE = { Draft: 'neutral', Research: 'info', Archived: 'neutral' };

/**
 * A strategy's research stage. Stage 1 knows the three stages the data can
 * support today; Validated, Paper trading and Paused arrive with their
 * backends.
 */
export function StageBadge({ stage }) {
  return (
    <Badge
      tone={STAGE_TONE[stage] || 'neutral'}
      className={stage === 'Archived' ? 'qlx-tag--plan' : undefined}
    >
      {stage}
    </Badge>
  );
}

const RUN_TONE = { completed: 'positive', running: 'info', failed: 'negative' };
const RUN_LABEL = { completed: 'Completed', running: 'Running', failed: 'Failed' };

/** Run status as text and tone together, never colour alone. */
export function RunStatusBadge({ status }) {
  return <Badge tone={RUN_TONE[status] || 'neutral'}>{RUN_LABEL[status] || status}</Badge>;
}

/**
 * A feature that is designed but not built. It carries a dashed "Planned"
 * chip and one sentence, never greyed-out placeholder values.
 */
export function PlannedPanel({ title, children }) {
  return (
    <QuantSection title={title} actions={<span className="qlx-tag qlx-tag--plan">Planned</span>}>
      <div className="qlx-slot">{children}</div>
    </QuantSection>
  );
}

export default QuantLabShell;
