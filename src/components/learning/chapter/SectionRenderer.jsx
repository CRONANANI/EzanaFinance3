'use client';

import { PullQuote } from './PullQuote';
import { ChartModule } from './ChartModule';
import { TickerChart } from './TickerChart';
import { TickerCards } from './TickerCards';
import { KeyTermCards } from './KeyTermCards';
import { KeyTermsList } from './KeyTermsList';
import { ContextTimeline } from './ContextTimeline';
import { Callout } from './Callout';

function renderRichText(body) {
  if (!body) return '';
  return body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function Module({ module }) {
  switch (module.type) {
    case 'paragraphs':
      return (
        <div
          className="lc-edit-paragraph"
          dangerouslySetInnerHTML={{ __html: renderRichText(module.body) }}
        />
      );
    case 'pullQuote':
      return <PullQuote {...module} />;
    case 'chart':
      return <ChartModule {...module} />;
    case 'tickerChart':
      return <TickerChart {...module} />;
    case 'tickerCards':
      return <TickerCards {...module} />;
    case 'keyTermCards':
      return <KeyTermCards {...module} />;
    case 'keyTermsList':
      return <KeyTermsList {...module} />;
    case 'contextTimeline':
      return <ContextTimeline {...module} />;
    case 'callout':
      return <Callout {...module} />;
    default:
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[SectionRenderer] Unknown module type: ${module.type}`);
      }
      return null;
  }
}

export function SectionRenderer({ modules }) {
  const list = modules || [];
  const rightTimelineIdx = list.findIndex(
    (m) => m.type === 'contextTimeline' && m.position === 'right',
  );

  if (rightTimelineIdx >= 0) {
    const before = list.slice(0, rightTimelineIdx);
    const timeline = list[rightTimelineIdx];
    const after = list.slice(rightTimelineIdx + 1);

    return (
      <>
        {before.map((m, i) => (
          <Module key={`b${i}`} module={m} />
        ))}
        <div className="lc-edit-twocol">
          <div className="lc-edit-twocol-main">
            {after.map((m, i) => (
              <Module key={`a${i}`} module={m} />
            ))}
          </div>
          <aside className="lc-edit-twocol-side">
            <ContextTimeline {...timeline} />
          </aside>
        </div>
      </>
    );
  }

  return list.map((m, i) => <Module key={i} module={m} />);
}
