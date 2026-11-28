'use client';

/**
 * SonarCompanionRenderer (Nov 28 2026): draws the active answer for the compact or the
 * sidebar mode from the one normalized view (lib/sonar/companion/view.js). The compact mode
 * shows a Desk Summary preview, three findings, two metrics and three sources; the sidebar
 * adds the research library's components (SonarAdaptiveVisual, code-split) and the actions.
 * Both read the same objects, so a figure never differs between modes or from the full
 * report. Nothing here calculates a value.
 */
import { useSonarCompanion } from './SonarCompanionContext';
import { forMode } from '@/lib/sonar/companion/view';
import { availableActions } from '@/lib/sonar/companion/actions';
import { planPresentation } from '@/lib/sonar/presentation/planner';
import { SonarAdaptiveVisual } from '@/components/sonar/layout/SonarAdaptiveVisual';
import Link from 'next/link';

export function SonarCompanionRenderer({ mode = 'compact' }) {
  const c = useSonarCompanion();
  const v = forMode(c?.view, mode);
  if (!v) {
    const interrupted = c?.entries.find((e) => e.id === c.activeId && e.status === 'interrupted');
    if (interrupted)
      return (
        <p className="scc-muted">
          This run was still in progress when the page reloaded. It was not started again; if it
          finished, it is in{' '}
          <Link href="/sonar/history" className="scc-link">
            Research history
          </Link>
          .
        </p>
      );
    return c?.streaming ? (
      <p className="scc-muted">Researching. You can keep browsing; the answer will be here.</p>
    ) : null;
  }
  const actions = availableActions(v, c.ctx, {
    orgMember: c.orgMember,
    permissions: c.permissions,
  });
  const plan =
    mode === 'sidebar' && v.visuals.length
      ? planPresentation(v.visuals, { depth: 'standard' })
      : null;
  const running = v.status === 'running';

  return (
    <article className="scc-answer" aria-busy={running}>
      {v.error && v.status !== 'running' ? (
        <p className="scc-error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {v.error}
          {v.gated ? ' Your plan or today’s quota does not cover this run.' : ''}
        </p>
      ) : null}
      {v.headline || v.summary ? (
        <div className="scc-desk">
          <p className="scc-eyebrow">
            {v.kind === 'council' ? 'Council records' : running ? 'Researching' : 'Desk summary'}
          </p>
          {v.headline ? <h3 className="scc-headline">{v.headline}</h3> : null}
          {v.summary ? <p className="scc-summary">{v.summary}</p> : null}
          {v.hypothetical ? <p className="scc-flag">Hypothetical, no trade executed.</p> : null}
          {v.qualification ? <p className="scc-muted">{v.qualification}</p> : null}
        </div>
      ) : null}
      {v.metrics.length ? (
        <dl className="scc-metrics">
          {v.metrics.map((m) => (
            <div key={m.id}>
              <dt>{m.label}</dt>
              <dd>{m.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {v.findings.length ? (
        <ol className="scc-findings" aria-label="Key findings">
          {v.findings.map((f) => (
            <li key={f.id || f.text}>{f.text}</li>
          ))}
        </ol>
      ) : null}
      {plan?.items.length ? (
        <div className="scc-visuals">
          {plan.items
            .filter((i) => i.componentId)
            .map((item) => (
              <SonarAdaptiveVisual key={item.id} item={item} />
            ))}
        </div>
      ) : null}
      {mode === 'sidebar' && v.limitations?.length ? (
        <ul className="scc-findings" aria-label="Limitations">
          {v.limitations.map((l) => (
            <li key={l.measure}>
              {l.measure}: {l.reason}
            </li>
          ))}
        </ul>
      ) : null}
      {v.citations.length ? (
        <p className="scc-sources">
          <span>Sources:</span>
          {v.citations.map((s) => (
            <span key={s.id || s.title} className="scc-source">
              {s.title}
            </span>
          ))}
        </p>
      ) : null}
      {v.more && mode === 'compact' ? (
        <button type="button" className="scc-link" onClick={() => c.setMode('sidebar')}>
          Show more in the sidebar
        </button>
      ) : null}
      {actions.length ? (
        <p className="scc-actions">
          {actions.map((a) =>
            a.key === 'open_full' ? (
              <button key={a.key} type="button" className="scc-link" onClick={c.goFull}>
                {a.label}
              </button>
            ) : a.key === 'open_history' ? (
              <Link key={a.key} href="/sonar/history" className="scc-link">
                {a.label}
              </Link>
            ) : a.key === 'open_company' ? (
              <Link
                key={a.key}
                href={`/company-research?ticker=${encodeURIComponent(c.ctx.entity.symbol)}`}
                className="scc-link"
              >
                {a.label}
              </Link>
            ) : a.key === 'open_council' ? (
              <Link key={a.key} href="/org-team-hub/sonar?tab=intelligence" className="scc-link">
                {a.label}
              </Link>
            ) : a.key === 'save_to_org' ? (
              <Link key={a.key} href={`/org-team-hub/sonar?tab=research`} className="scc-link">
                {a.label}
              </Link>
            ) : a.key === 'copy_citation' ? (
              <button
                key={a.key}
                type="button"
                className="scc-link"
                onClick={() =>
                  navigator.clipboard
                    ?.writeText(v.citations.map((s) => s.title).join('\n'))
                    .catch(() => {})
                }
              >
                {a.label}
              </button>
            ) : null,
          )}
        </p>
      ) : null}
    </article>
  );
}

export default SonarCompanionRenderer;
