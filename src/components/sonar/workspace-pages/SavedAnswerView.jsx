'use client';

/**
 * A saved quick ping, read-only, rendered from its snapshot inside the same workspace frame:
 * the Desk Summary first, then its sources. Also used, without the frame's menu, by nothing
 * else: the public share page renders its own plain view (SharedResearchView).
 */
import { SonarAnswerFrame } from '../SonarAnswerFrame';
import { SonarDeskSummary } from '../SonarDeskSummary';
import { researchMenu } from '../workspace-rail-helpers';
import { summaryParas } from '@/lib/sonar/desk-summary';

export function sourceRowsFromSnapshot(sources) {
  return (Array.isArray(sources) ? sources : [])
    .filter((s) => s && s.name)
    .map((s, i) => {
      let name = s.name;
      if (s.url) {
        try {
          name = new URL(s.url).hostname.replace(/^www\./, '');
        } catch {
          /* keep the name */
        }
      }
      return {
        key: `${i}:${s.name}`,
        name,
        initial: (name.match(/[\p{L}\p{N}]/u)?.[0] || '?').toUpperCase(),
        descriptor: s.url ? s.name : '',
        date: null,
        href: s.url || null,
        external: Boolean(s.url),
      };
    });
}

export function SavedAnswerView({ snapshot, actions = null }) {
  const s = snapshot || {};
  const rows = sourceRowsFromSnapshot(s.sources);
  const present = ['answer', ...(rows.length ? ['sources'] : [])];
  return (
    <SonarAnswerFrame
      present={present}
      research={researchMenu({ signedIn: true, current: 'saved' })}
    >
      <div id="sa-answer">
        <SonarDeskSummary
          mode={s.depth || 'quick'}
          answeredAt={s.answeredAt || null}
          dataAsOf={s.dataAsOf || null}
          actions={actions}
          subhead={s.subject ? <span>{s.subject}</span> : null}
          headline={s.headline || null}
          question={s.question || 'Saved research'}
          summary={summaryParas(s.summary)}
          takeaways={s.takeaways || []}
          sources={rows.slice(0, 3)}
          sourceCount={rows.length}
        />
      </div>
      {rows.length ? (
        <section id="sa-sources" className="srw-section" aria-labelledby="srw-src-h">
          <h2 id="srw-src-h" className="srw-section-title">
            Evidence and sources
          </h2>
          <ul className="srw-rows">
            {rows.map((r) => (
              <li key={r.key} className="srw-row">
                {r.href ? (
                  <a
                    className="srw-row-link"
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.descriptor || r.name}
                    <span className="srw-sr"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="srw-row-link">{r.name}</span>
                )}
                {r.href ? <span className="srw-row-meta">{r.name}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </SonarAnswerFrame>
  );
}

export default SavedAnswerView;
