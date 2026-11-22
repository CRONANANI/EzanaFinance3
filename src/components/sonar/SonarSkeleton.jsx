'use client';

/**
 * SonarSkeleton (Nov 21 2026): the universal Sonar skeleton for answers that do not come
 * from a landing board: the exemplary briefs and the adaptive reports (for example
 * "Is Turkey's lira under pressure?"). It puts the same four pieces around them that every
 * board answer has (SonarAnswerFrame):
 *   - the Echo-style contents menu on the far left,
 *   - the query composer (SonarAnswerQueryBar) on the top line,
 *   - Research controls, Evidence and sources and Next steps on the same line at the right,
 *   - the suggested follow-ups under them.
 * The answer itself (`children`) keeps its own exemplary layout.
 *
 * question     the answer's question, the composer's first value
 * onPing(q)    a new question from the composer
 * onResearch(q, extra)  a question with Build or photo context: a research run (optional)
 * followUps    suggested follow-up questions; onAsk(q) asks one in this answer's thread
 * sources      the answer's sources: [{ id, title, url?, publisher?, date? }]
 * present      answer-section keys this answer has on the page (anchors `sa-<key>`)
 * kind, subject  for the Next steps card (lib/sonar/workspace nextSteps)
 * onDeep()     deep research on this question (optional)
 */

import { useMemo } from 'react';
import { SonarAnswerFrame } from './SonarAnswerFrame';
import { SonarAnswerQueryBar, contextText } from './SonarAnswerQueryBar';
import { SonarRelatedQuestions } from './SonarDeskSummary';
import { workspaceTools } from './SonarToolsRow';
import { useSonarPlan } from './useSonarPlan';
import { researchMenu, runnableSteps, runWorkspaceStep } from './workspace-rail-helpers';
import { nextSteps } from '@/lib/sonar/workspace';
import { sectionAccess } from '@/lib/sonar/answer-sections';
import { dayLabel } from './exemplary/SonarExemplaryChart';
import './sonar-skeleton.css';

/** The tools row's evidence rows from an answer's numbered sources. */
export function skeletonSourceRows(sources = []) {
  return (Array.isArray(sources) ? sources : [])
    .filter((s) => s && s.title)
    .map((s, i) => {
      const name = String(s.publisher || s.title).trim();
      return {
        key: s.id || `src-${i}`,
        name,
        initial: (name.match(/[\p{L}\p{N}]/u)?.[0] || '?').toUpperCase(),
        descriptor: [s.publisher ? s.title : s.detail || null, s.date ? dayLabel(s.date) : null]
          .filter(Boolean)
          .join(' · '),
        href: s.url || null,
        external: Boolean(s.url && /^https?:/.test(s.url)),
      };
    });
}

export function SonarSkeleton({
  question = '',
  onPing = null,
  onResearch = null,
  followUps = [],
  onAsk = null,
  sources = [],
  present = [],
  kind = null,
  subject = null,
  onDeep = null,
  children,
}) {
  const plan = useSonarPlan();
  const signedIn = !plan.isGuest;
  const access = useMemo(
    () =>
      sectionAccess({
        depth: 'quick',
        planTier: plan.planTier,
        isGuest: plan.isGuest,
        version: plan.version,
      }),
    [plan.planTier, plan.isGuest, plan.version],
  );
  const rows = skeletonSourceRows(sources);
  const steps = runnableSteps(
    nextSteps({
      kind,
      name: subject,
      depth: 'quick',
      unlocked: Boolean(access?.unlocked),
      present,
      canDeep: Boolean(onDeep),
    }),
    { onRun: onPing },
  );
  const tools = workspaceTools({
    steps,
    onStep: (st) => runWorkspaceStep(st, { onDeep, onRun: onPing }),
    related: [],
    moreHref: signedIn ? '/sonar/saved' : null,
    sources: rows,
    sourceCount: rows.length,
    anchorSources: present.includes('sources'),
  });

  const submit = (q, ctx) => {
    const text = String(q || '').trim();
    if (!text) return;
    const extra = ctx?.length ? contextText(ctx) : '';
    if (extra && typeof onResearch === 'function')
      onResearch(text, { attachment: { name: 'Context added in Sonar', text: extra } });
    else onPing?.(text);
  };

  return (
    <>
      {/* Nov 22: the Sonar page ground behind every answer: the dotted ranges of the
          /datasets backdrop, fixed behind the cards (sonar-skeleton.css). */}
      <div className="ssk-backdrop" aria-hidden="true">
        <div className="ssk-dots" />
      </div>
      <SonarAnswerFrame
        className="ssk"
        present={present}
        access={access}
        onDeep={onDeep}
        tools={tools}
        research={researchMenu({ signedIn })}
        queryBar={
          <SonarAnswerQueryBar
            key={question}
            initial={question}
            onSubmit={submit}
            contextEnabled={typeof onResearch === 'function'}
          />
        }
        followUps={<SonarRelatedQuestions questions={followUps} onAsk={onAsk} />}
      >
        {children}
      </SonarAnswerFrame>
    </>
  );
}

export default SonarSkeleton;
