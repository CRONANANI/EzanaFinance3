'use client';

/**
 * Right column of the Company view (Nov 2026 redesign):
 *   [F] Analyst recommendations  [G] Key metrics
 *   [H] News & sentiment         [I] Pins / saved sections
 * All read the useCompanyResearch snapshot; pins come from useSectionStack.
 */
import { SECTIONS } from '@/lib/research/sectionStack';
import {
  analystUpsidePct,
  fmtGap,
  fmtMoney,
  fmtPct,
  fmtSignedPct,
  largestRemainderPercents,
  signOf,
} from '@/lib/research/company-research';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function Skeleton({ rows = 3 }) {
  return (
    <div className="rc-skel-stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="rc-skel rc-skel--line" />
      ))}
    </div>
  );
}

export function AnalystCard({ analyst, price }) {
  const c = analyst.counts;
  const pct = c ? largestRemainderPercents([c.buy, c.hold, c.sell]) : [0, 0, 0];
  const upside = analystUpsidePct(analyst.avgTarget, price);
  const parts = c
    ? [
        { key: 'buy', label: 'Buy', n: c.buy, p: pct[0] },
        { key: 'hold', label: 'Hold', n: c.hold, p: pct[1] },
        { key: 'sell', label: 'Sell', n: c.sell, p: pct[2] },
      ]
    : [];
  return (
    <section
      className="rc-card"
      aria-labelledby="rc-f-title"
      aria-busy={analyst.status === 'loading'}
    >
      <header className="rc-card__head">
        <h3 id="rc-f-title" className="rc-card__title">
          Analyst recommendations
        </h3>
      </header>
      {analyst.status === 'loading' ? (
        <Skeleton rows={4} />
      ) : analyst.status === 'empty' || analyst.status === 'error' ? (
        <p className="rc-state">No analyst ratings or price targets reported.</p>
      ) : (
        <div className="rc-analyst">
          {c ? (
            <div className="rc-analyst__split">
              <div
                className="rc-stackbar"
                role="img"
                aria-label={parts.map((p) => `${p.label} ${p.p}%`).join(', ')}
              >
                {parts.map((p) =>
                  p.p > 0 ? (
                    <span
                      key={p.key}
                      className={`rc-stackbar__seg rc-stackbar__seg--${p.key}`}
                      style={{ width: `${p.p}%` }}
                    />
                  ) : null,
                )}
              </div>
              <ul className="rc-legend">
                {parts.map((p) => (
                  <li key={p.key}>
                    <span
                      className={`rc-legend__dot rc-legend__dot--${p.key}`}
                      aria-hidden="true"
                    />
                    <span className="rc-legend__label">{p.label}</span>
                    <span className="rc-num rc-muted">
                      {p.p}% ({p.n})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="rc-analyst__target">
            <span className="rc-stat__label">Avg. price target</span>
            <span className="rc-analyst__target-value rc-num">{fmtMoney(analyst.avgTarget)}</span>
            {upside != null ? (
              <span className={`rc-num rc-tone--${signOf(upside)}`}>{fmtGap(upside)}</span>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

export function KeyMetricsCard({ metrics }) {
  const groups = [
    {
      name: 'Profitability',
      items: [
        ['Gross margin', fmtPct(metrics.grossMargin)],
        ['Operating margin', fmtPct(metrics.opMargin)],
      ],
    },
    {
      name: 'Growth (YoY)',
      items: [
        ['Revenue growth', fmtSignedPct(metrics.revGrowthYoY)],
        ['EPS growth', fmtSignedPct(metrics.epsGrowthYoY)],
      ],
    },
    {
      name: 'Per share',
      items: [
        ['EPS (TTM)', fmtMoney(metrics.eps)],
        ['FCF/share (TTM)', fmtMoney(metrics.fcfPerShare)],
      ],
    },
  ];
  return (
    <section
      className="rc-card"
      aria-labelledby="rc-g-title"
      aria-busy={metrics.status === 'loading'}
    >
      <header className="rc-card__head">
        <h3 id="rc-g-title" className="rc-card__title">
          Key metrics
        </h3>
      </header>
      {metrics.status === 'loading' ? (
        <Skeleton rows={3} />
      ) : metrics.status === 'error' || metrics.status === 'empty' ? (
        <p className="rc-state">Key metrics unavailable.</p>
      ) : (
        <div className="rc-metrics">
          {groups.map((g) => (
            <div key={g.name} className="rc-metrics__group">
              <span className="rc-metrics__name">{g.name}</span>
              <dl className="rc-metrics__list">
                {g.items.map(([k, v]) => (
                  <div key={k} className="rc-metrics__item">
                    <dt>{k}</dt>
                    <dd className="rc-num">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const SENTIMENT_TONE = { Positive: 'up', Neutral: 'neutral', Negative: 'down' };

export function NewsCard({ news, onViewAll }) {
  return (
    <section className="rc-card" aria-labelledby="rc-h-title" aria-busy={news.status === 'loading'}>
      <header className="rc-card__head">
        <h3 id="rc-h-title" className="rc-card__title">
          News &amp; sentiment
        </h3>
        <button type="button" className="rc-link-btn rc-card__action" onClick={onViewAll}>
          View all <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      </header>
      {news.status === 'loading' ? (
        <Skeleton rows={3} />
      ) : news.items.length === 0 ? (
        <p className="rc-state">No recent news</p>
      ) : (
        <ul className="rc-news">
          {news.items.map((n) => (
            <li key={n.url} className="rc-news__item">
              <span className="rc-news__src" aria-hidden="true">
                {(n.source || '?')
                  .replace(/[^A-Za-z0-9]/g, '')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="rc-news__text">
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rc-news__title"
                >
                  {n.title}
                </a>
                <span className="rc-news__meta">
                  {[n.source, n.date ? dateFmt.format(n.date) : null].filter(Boolean).join(' · ')}
                </span>
              </div>
              {n.sentiment ? (
                <span className={`rc-sentiment rc-tone--${SENTIMENT_TONE[n.sentiment]}`}>
                  <span className="rc-sentiment__dot" aria-hidden="true" />
                  {n.sentiment}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

export function PinsCard({ pinned, onOpen }) {
  const items = (pinned || []).map((id) => SECTION_BY_ID[id]).filter(Boolean);
  return (
    <section className="rc-card" aria-labelledby="rc-i-title">
      <header className="rc-card__head">
        <h3 id="rc-i-title" className="rc-card__title">
          Pins / saved sections
        </h3>
      </header>
      {items.length === 0 ? (
        <p className="rc-state">Pin a section to keep it here.</p>
      ) : (
        <ul className="rc-pins">
          {items.map((s) => (
            <li key={s.id}>
              <button type="button" className="rc-pins__row" onClick={() => onOpen(s.id, s.label)}>
                <i className={`bi ${s.icon}`} aria-hidden="true" />
                <span className="rc-pins__label">{s.label}</span>
                <i className="bi bi-pin-angle-fill rc-pins__pin" role="img" aria-label="Pinned" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
