'use client';

/** Community Insights (right rail): Most Discussed | Trending Topics | Sentiment. */
import { useRef, useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { SectionCard, TickerChip, DeltaValue } from './primitives';
import { useCommunityResource } from './useCommunityResource';
import { groupNumber } from '@/lib/community/redesign';

const VIEWS = [
  { key: 'most-discussed', label: 'Most Discussed' },
  { key: 'trending-topics', label: 'Trending Topics' },
  { key: 'sentiment', label: 'Sentiment' },
];

function MostDiscussed({ rows }) {
  if (!rows.length) return <p className={s.empty}>No ticker discussions this week.</p>;
  return (
    <ul className={s.rows}>
      {rows.map((r) => (
        <li key={r.ticker}>
          <Link
            href={`/company-research?q=${encodeURIComponent(r.ticker)}`}
            className={`${s.row} ${s.rowLink} ${s.mdRow}`}
          >
            <TickerChip ticker={r.ticker} href={false} />
            <span className={s.ellipsis}>{r.name || r.ticker}</span>
            <span className={`${s.muted} ${s.num} ${s.mdPosts}`}>{groupNumber(r.posts)} posts</span>
            <DeltaValue value={r.change_pct} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TrendingTopics({ rows, onTopic }) {
  if (!rows.length) return <p className={s.empty}>No topic activity this week.</p>;
  return (
    <ul className={s.rows}>
      {rows.map((r) => (
        <li key={r.slug}>
          <button
            type="button"
            className={`${s.row} ${s.rowLink} ${s.topicRow}`}
            style={{
              width: '100%',
              border: 0,
              background: 'transparent',
              font: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onClick={() => onTopic?.(r.slug)}
          >
            <span className={`${s.ellipsis} ${s.strong}`}>{r.label}</span>
            <span className={`${s.muted} ${s.num}`}>{groupNumber(r.posts)} posts</span>
            {r.prior === 0 ? (
              <span className={`${s.badge} ${s.badgeRising}`}>New</span>
            ) : (
              <DeltaValue value={r.delta_pct} digits={0} />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Sentiment({ sentiment }) {
  if (!sentiment) return <p className={s.empty}>No sentiment reading yet.</p>;
  const bull = Math.round((sentiment.net + 100) / 2);
  const bear = 100 - bull;
  return (
    <div>
      <div className={s.sentLegend}>
        <span className={s.up}>
          Bullish <span className={s.num}>{bull}%</span>
        </span>
        <span className={s.down}>
          Bearish <span className={s.num}>{bear}%</span>
        </span>
      </div>
      <div
        className={s.sentBar}
        role="img"
        aria-label={`Net sentiment ${sentiment.net > 0 ? '+' : ''}${sentiment.net}: ${bull}% bullish, ${bear}% bearish`}
      >
        <span className={s.sentBull} style={{ width: `${bull}%` }} />
        <span className={s.sentBear} style={{ width: `${bear}%` }} />
      </div>
      <div className={s.sentFacts}>
        <div className={s.fact}>
          <div className={s.muted}>Hottest ticker</div>
          <div className={s.factValue}>{sentiment.hottest_ticker || 'None'}</div>
        </div>
        <div className={s.fact}>
          <div className={s.muted}>Posts in the last hour</div>
          <div className={s.factValue}>{groupNumber(sentiment.posts_last_hour)}</div>
        </div>
      </div>
    </div>
  );
}

export function CommunityInsights({ onTopic }) {
  const [view, setView] = useState('most-discussed');
  const res = useCommunityResource(`/api/community/insights?view=${view}`);
  const tabRefs = useRef([]);
  const onKey = (e, i) => {
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % VIEWS.length;
    if (e.key === 'ArrowLeft') j = (i - 1 + VIEWS.length) % VIEWS.length;
    if (j === null) return;
    e.preventDefault();
    tabRefs.current[j]?.focus();
    setView(VIEWS[j].key);
  };
  return (
    <SectionCard
      id="community-insights"
      icon="bi-bar-chart"
      title="Community Insights"
      state={{ ...res, loading: false }}
    >
      <div className={s.railTabs} role="tablist" aria-label="Insights">
        {VIEWS.map((v, i) => (
          <button
            key={v.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            tabIndex={view === v.key ? 0 : -1}
            className={s.railTab}
            onClick={() => setView(v.key)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {res.loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={s.skel} style={{ height: 40 }} />
            ))}
          </div>
        ) : res.error ? null : view === 'most-discussed' ? (
          <MostDiscussed rows={res.data?.rows || []} />
        ) : view === 'trending-topics' ? (
          <TrendingTopics rows={res.data?.rows || []} onTopic={onTopic} />
        ) : (
          <Sentiment sentiment={res.data?.sentiment} />
        )}
      </div>
    </SectionCard>
  );
}
