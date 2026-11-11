'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNewsCenter } from '@/hooks/useNewsCenter';
import { WIRE_NAME, WIRE_TABS, relativeTime, reasonText } from '@/lib/home/news-center';
import './news-center.css';

const KIND_META = {
  echo: { label: 'Ezana Echo', icon: 'bi-journal-richtext' },
  news: { label: 'News', icon: 'bi-newspaper' },
  creator: { label: 'Creator', icon: 'bi-person-check' },
  trending: { label: 'Trending', icon: 'bi-fire' },
};

const EMPTY_COPY = {
  'for-you': 'Nothing to show yet. New stories land here as they publish.',
  echo: 'No Echo articles to show right now.',
  news: 'No fresh market news right now.',
  community:
    'Follow a few creators and their newest posts will show up here, next to what is trending.',
};

function ItemLink({ item, className, children }) {
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {children}
    </Link>
  );
}

function ItemMeta({ item }) {
  const time = relativeTime(item.at);
  const isPost = item.kind === 'creator' || item.kind === 'trending';
  return (
    <span className="nwc-meta">
      <span>{item.source}</span>
      {item.kind === 'echo' && <span>{item.mins} min read</span>}
      {isPost && item.ticker && <span className="nwc-meta-num">{item.ticker}</span>}
      {isPost && (
        <span className="nwc-meta-num">
          <i className="bi bi-heart" aria-hidden="true" /> {item.likes}
          <span className="nwc-sr"> likes</span>
        </span>
      )}
      {isPost && (
        <span className="nwc-meta-num">
          <i className="bi bi-chat" aria-hidden="true" /> {item.comments}
          <span className="nwc-sr"> comments</span>
        </span>
      )}
      {time && <span className="nwc-meta-num">{time}</span>}
    </span>
  );
}

function WhyLine({ item }) {
  const text = item.note || reasonText(item.reason);
  if (!text) return null;
  return (
    <span className="nwc-why">
      <i className="bi bi-stars" aria-hidden="true" />
      {text}
    </span>
  );
}

function LeadStory({ item }) {
  return (
    <ItemLink item={item} className={`nwc-lead${item.image ? '' : ' nwc-lead--text'}`}>
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="nwc-lead-img" src={item.image} alt={item.imageAlt || ''} loading="lazy" />
      )}
      <span className="nwc-lead-body">
        <span className="nwc-kind">
          <i className={`bi ${KIND_META.echo.icon}`} aria-hidden="true" />
          {KIND_META.echo.label}
        </span>
        <span className="nwc-lead-title">{item.title}</span>
        {item.dek && <span className="nwc-lead-dek">{item.dek}</span>}
        <ItemMeta item={item} />
        <WhyLine item={item} />
      </span>
    </ItemLink>
  );
}

function Row({ item }) {
  const kind = KIND_META[item.kind] || KIND_META.news;
  return (
    <li className="nwc-row">
      <ItemLink item={item} className="nwc-row-link">
        <span className="nwc-kind">
          <i className={`bi ${kind.icon}`} aria-hidden="true" />
          {kind.label}
        </span>
        <span className="nwc-row-title">
          {item.title}
          {item.external && (
            <i className="bi bi-arrow-up-right nwc-ext" aria-label="Opens in a new tab" />
          )}
        </span>
        {(item.kind === 'creator' || item.kind === 'trending') && item.dek && (
          <span className="nwc-row-dek">{item.dek}</span>
        )}
        <ItemMeta item={item} />
        <WhyLine item={item} />
      </ItemLink>
    </li>
  );
}

function Skeleton() {
  return (
    <div className="nwc-skel" aria-hidden="true">
      <div className="nwc-skel-lead" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="nwc-skel-row" />
      ))}
    </div>
  );
}

/**
 * /home Band II: the News Center. Echo articles, market news and community
 * posts ordered by the reader's interests, with the schedule calendar in the
 * right column (passed in as `aside`, since its state lives on the page).
 *
 * @param {{ tickers?: Set<string>, aside?: React.ReactNode }} props
 */
export function NewsCenter({ tickers, aside = null }) {
  const { feed, isLoading } = useNewsCenter({ tickers });
  const [tab, setTab] = useState('for-you');

  const lead = tab === 'for-you' || tab === 'echo' ? feed?.lead || null : null;
  const list =
    tab === 'for-you'
      ? feed?.forYou || []
      : tab === 'echo'
        ? (feed?.echo || []).filter((i) => i.key !== lead?.key)
        : feed?.[tab] || [];
  const isEmpty = !isLoading && !lead && list.length === 0;
  const seeAll =
    tab === 'echo'
      ? { href: '/ezana-echo', label: 'All of Ezana Echo' }
      : tab === 'community'
        ? { href: '/community', label: 'Open the community' }
        : null;

  return (
    <div className="nwc">
      <div className="nwc-main">
        <div className="nwc-bar">
          <div className="nwc-tabs" role="tablist" aria-label={`Filter ${WIRE_NAME}`}>
            {WIRE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`nwc-tab${tab === t.id ? ' is-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {feed && (
            <span className="nwc-basis">
              {feed.personalized ? 'Ranked by your activity' : 'Latest across Ezana'}
            </span>
          )}
        </div>

        {isLoading ? (
          <Skeleton />
        ) : isEmpty ? (
          <p className="nwc-empty">{EMPTY_COPY[tab]}</p>
        ) : (
          <>
            {lead && <LeadStory item={lead} />}
            <ul className="nwc-list">
              {list.map((item) => (
                <Row key={item.key} item={item} />
              ))}
            </ul>
            {seeAll && (
              <Link href={seeAll.href} className="nwc-more">
                {seeAll.label} <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            )}
          </>
        )}
      </div>
      {aside && <aside className="nwc-aside">{aside}</aside>}
    </div>
  );
}
