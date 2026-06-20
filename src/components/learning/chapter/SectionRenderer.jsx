'use client';

import { PullQuote } from './PullQuote';
import { ChartModule } from './ChartModule';
import { TickerCards } from './TickerCards';
import { KeyTermCards } from './KeyTermCards';
import { KeyTermsList } from './KeyTermsList';
import { ContextTimeline } from './ContextTimeline';
import { Callout } from './Callout';
import { BodyText } from './BodyText';
import { FinancialStatement } from './FinancialStatement';
import { VideoModule } from './VideoModule';

function Module({ module }) {
  switch (module.type) {
    case 'paragraphs':
      return <BodyText body={module.body} />;
    case 'pullQuote':
      return <PullQuote {...module} />;
    case 'chart':
      return <ChartModule {...module} />;
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
    case 'financialStatement':
      return <FinancialStatement {...module} />;
    case 'video':
      return <VideoModule {...module} />;
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
