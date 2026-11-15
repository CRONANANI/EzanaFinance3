'use client';

import { useState } from 'react';
import { stripDemoLabel } from '@/lib/org-display';
import { dayKey, reviewQueue, todayOf, typeMeta } from '@/lib/org-assignments-model';
import { Section, SectionError, Skel } from '@/components/org/command-center/parts';
import { DatedList, MiniCalendar } from './Calendars';
import { TypeMark } from './AssignmentList';

function Lines({ n = 4 }) {
  return (
    <div className="oas-skel oas-skel--side" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <Skel key={i} w={`${90 - i * 12}%`} h={12} />
      ))}
    </div>
  );
}

/**
 * The side column: the month (in the list view) or the next dated work (in
 * the calendar view), then, for managers, the review queue and the council's
 * reusable templates.
 */
export function SideColumn({
  status,
  view,
  assignments,
  all,
  templates,
  canAssign,
  cursor,
  onCursor,
  onOpen,
  onUseTemplate,
  onNew,
  onRetry,
  onShowQueue,
}) {
  const [allTemplates, setAllTemplates] = useState(false);
  const loading = status === 'loading';
  const failed = status === 'error';
  const queue = reviewQueue(all);
  const today = todayOf().key;
  const upcoming = (assignments || [])
    .filter((a) => {
      const k = dayKey(a.due_date);
      return k && k >= today;
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6);
  const shownTemplates = allTemplates ? templates : templates.slice(0, 4);

  return (
    <aside className="oas-side" aria-label="Calendar, review queue and templates">
      {view === 'list' ? (
        <Section id="oas-side-cal" title="Calendar">
          {loading ? (
            <Lines n={6} />
          ) : failed ? (
            <SectionError message="The calendar could not be loaded." onRetry={onRetry} />
          ) : (
            <MiniCalendar
              assignments={assignments}
              cursor={cursor}
              onCursor={onCursor}
              onOpen={onOpen}
            />
          )}
        </Section>
      ) : (
        <Section id="oas-side-next" title="Due next">
          {loading ? (
            <Lines />
          ) : failed ? (
            <SectionError message="Due dates could not be loaded." onRetry={onRetry} />
          ) : (
            <DatedList
              rows={upcoming}
              onOpen={onOpen}
              empty="Nothing in this view is due from today on."
            />
          )}
        </Section>
      )}

      {(canAssign || loading) && (
        <Section
          id="oas-side-queue"
          title={
            <>
              Review queue{' '}
              {status === 'ready' && (
                <span className="tcc-mono oas-group__count">({queue.length})</span>
              )}
            </>
          }
        >
          {loading ? (
            <Lines n={3} />
          ) : failed ? (
            <SectionError message="The review queue could not be loaded." onRetry={onRetry} />
          ) : queue.length === 0 ? (
            <p className="tcc-state">
              <span>Nothing is waiting for review.</span>
            </p>
          ) : (
            <>
              <ul className="oas-queue">
                {queue.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <TypeMark a={a} label={false} />
                    <button
                      type="button"
                      className="oas-open oas-clip"
                      onClick={() => onOpen(a, 'grade')}
                      title={`${typeMeta(a.type).label}: ${stripDemoLabel(a.title)}`}
                    >
                      {stripDemoLabel(a.title)}
                    </button>
                    <span
                      className="tcc-mono oas-queue__n"
                      title={`${a.version || 0} submissions on file`}
                    >
                      v{a.version || 0}
                    </span>
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                  </li>
                ))}
              </ul>
              {queue.length > 5 && (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent oas-sidelink"
                  onClick={onShowQueue}
                >
                  View all <span className="tcc-mono">{queue.length}</span> in the list
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </Section>
      )}

      {canAssign && !loading && (
        <Section id="oas-side-templates" title="Templates">
          {failed ? (
            <SectionError message="Templates could not be loaded." onRetry={onRetry} />
          ) : templates.length === 0 ? (
            <p className="tcc-state">
              <span>No templates yet. Save one from the new assignment form.</span>
              <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onNew}>
                New assignment
              </button>
            </p>
          ) : (
            <>
              <ul className="oas-templates">
                {shownTemplates.map((t) => (
                  <li key={t.id}>
                    <i className="bi bi-file-earmark" aria-hidden="true" />
                    <span className="oas-clip" title={stripDemoLabel(t.name)}>
                      {stripDemoLabel(t.name)}
                    </span>
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent"
                      onClick={() => onUseTemplate(t)}
                      aria-label={`Use template ${stripDemoLabel(t.name)}`}
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
              {templates.length > 4 && (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent oas-sidelink"
                  aria-expanded={allTemplates}
                  onClick={() => setAllTemplates((v) => !v)}
                >
                  {allTemplates ? 'Show fewer' : 'View all templates'}
                </button>
              )}
            </>
          )}
        </Section>
      )}
    </aside>
  );
}
