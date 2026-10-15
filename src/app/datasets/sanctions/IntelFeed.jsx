'use client';

/**
 * Sanctions intelligence feed: two sources, never mixed.
 *   Official  OFAC Recent Actions, Treasury's own dated notices. Title, date
 *             and link exactly as OFAC published them; the type tags are
 *             keyword matches on the title and are labelled as such.
 *   Press     sanctions reporting from news publishers, with the countries
 *             each story names. Reporting, not a designation: a name in a
 *             story does not mean anyone is sanctioned.
 * Each tab shows its own freshness and an honest state when its source has
 * not loaded. Nothing here is written or summarised by us.
 */
import { useState } from 'react';
import { ACTION_KIND_LABEL } from '@/lib/sanctions/actions';
import { Seg, StateNote, shortDate } from './ui';

const SHOW = 6;
const DAY = 86400000;

function ageDays(iso, today) {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : Math.floor((today - t) / DAY);
}

export default function IntelFeed({ actions, news, today }) {
  const [tab, setTab] = useState('official');
  const [all, setAll] = useState(false);
  const now = Date.parse(today) || 0;

  const officialItems = actions?.items || [];
  const pressItems = news?.items || [];
  const items = tab === 'official' ? officialItems : pressItems;
  const shown = all ? items.slice(0, 30) : items.slice(0, SHOW);
  const newest = items[0]?.date;
  const age = ageDays(newest, now);

  return (
    <section className="snx-card snx-feed" aria-labelledby="snx-feed-title">
      <div className="snx-card-head">
        <div>
          <h2 id="snx-feed-title" className="snx-card-title">
            Sanctions intelligence feed
          </h2>
          <p className="snx-card-sub">
            {tab === 'official'
              ? 'Official OFAC actions: designations, removals, licenses and enforcement, as Treasury published them.'
              : 'Press coverage of sanctions, export controls and enforcement. Reporting, not official action.'}
          </p>
        </div>
        <Seg
          label="Source"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setAll(false);
          }}
          options={[
            { key: 'official', label: 'Official', icon: 'bi-bank2' },
            { key: 'press', label: 'Press', icon: 'bi-newspaper' },
          ]}
        />
      </div>

      {!(tab === 'official' ? actions?.ready : news?.ready) ? (
        <StateNote kind="unavailable">
          {tab === 'official'
            ? 'OFAC Recent Actions have not been loaded yet.'
            : 'Press coverage has not been loaded yet.'}
        </StateNote>
      ) : items.length === 0 ? (
        <StateNote kind="empty">
          {tab === 'official'
            ? 'No OFAC notices stored yet.'
            : 'No sanctions stories in the past 60 days.'}
        </StateNote>
      ) : (
        <>
          {age != null && age > (tab === 'official' ? 14 : 3) ? (
            <StateNote kind="stale">
              Newest item is {age} days old ({shortDate(newest)}). This feed may not be updating.
            </StateNote>
          ) : null}
          <ol className="snx-feed-list">
            {shown.map((it) =>
              tab === 'official' ? (
                <li key={it.id} className="snx-feed-item is-official">
                  <span className="snx-feed-kicker">
                    <span className="snx-feed-badge">Official · OFAC</span>
                    {it.kinds
                      .filter((k) => k !== 'other')
                      .map((k) => (
                        <span key={k} className="snx-feed-tag" title="From the notice title">
                          {ACTION_KIND_LABEL[k] || k}
                        </span>
                      ))}
                    <span className="snx-mono snx-muted">{shortDate(it.date)}</span>
                  </span>
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="snx-feed-title"
                  >
                    {it.title}
                    <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  </a>
                  {it.programHints.length ? (
                    <span className="snx-feed-hints" title="Matched in the notice title">
                      {it.programHints.join(' · ')}
                    </span>
                  ) : null}
                </li>
              ) : (
                <li key={it.id} className="snx-feed-item is-press">
                  <span className="snx-feed-kicker">
                    <span className="snx-feed-badge is-press">
                      Press{it.source ? ` · ${it.source}` : ''}
                    </span>
                    <span className="snx-mono snx-muted">{shortDate(it.date)}</span>
                  </span>
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="snx-feed-title"
                  >
                    {it.title}
                    <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  </a>
                  {it.summary ? (
                    <p className="snx-feed-summary">Publisher summary: {it.summary}</p>
                  ) : null}
                  {it.countries.length ? (
                    <span className="snx-feed-hints" title="Countries the story names">
                      Names {it.countries.slice(0, 4).join(', ')}
                      {it.countries.length > 4 ? ` +${it.countries.length - 4}` : ''}
                    </span>
                  ) : null}
                </li>
              ),
            )}
          </ol>
          {items.length > SHOW ? (
            <button
              type="button"
              className="snx-action-btn"
              aria-expanded={all}
              onClick={() => setAll((v) => !v)}
            >
              {all ? 'Show fewer' : `Show ${Math.min(items.length, 30) - SHOW} more`}
            </button>
          ) : null}
        </>
      )}
      <p className="snx-fine">
        {tab === 'official' ? (
          <>
            Source:{' '}
            <a
              href="https://ofac.treasury.gov/recent-actions"
              target="_blank"
              rel="noopener noreferrer"
            >
              OFAC Recent Actions
            </a>
            . Type tags are matched from each notice&apos;s title; open the notice for what it
            contains.
          </>
        ) : (
          'Stories from news publishers that mention sanctions and name a country on the OFAC list. A mention in the press does not mean a person or company is sanctioned; check the official list.'
        )}
      </p>
    </section>
  );
}
