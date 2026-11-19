'use client';

import { EzSentimentBar } from '@/components/charts/EzSentimentBar';
import { EchoFigureShell } from './EchoFigureShell';

/**
 * Sentiment bar (Nov 2026): one split of a whole by tone.
 *   parts: [{ label, value, tone: 'pos' | 'neu' | 'neg' }]
 *   overall: optional { label, tone }
 */
export function EchoSentiment({
  figureLabel,
  kicker,
  hint,
  source,
  title,
  overall,
  parts = [],
  unit = '',
}) {
  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <EzSentimentBar
        className="echo-sentiment"
        title={title}
        overall={overall}
        parts={parts.map((p, i) => ({ key: `${i}`, ...p }))}
        count={(v) => `${Number(v).toLocaleString('en-US')}${unit}`}
      />
    </EchoFigureShell>
  );
}

export default EchoSentiment;
