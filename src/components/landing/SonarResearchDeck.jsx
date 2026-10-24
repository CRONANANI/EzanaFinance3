'use client';

/**
 * The research below a Sonar result (landing band and /datasets search):
 *
 *   1. For a sanctions ping, the sanctions panel: the OFAC map, the
 *      jurisdictions and programs with the most listings, and the companies
 *      the brief's web research names as most exposed.
 *   2. Three columns of news, each with a job (for a member of Congress:
 *      their heaviest positions, the member in the news, policy that touches
 *      their book). Ezana's own news cache fills a column first and is
 *      marked as such; web results fill the rest.
 *   3. The web pages the brief read.
 *
 * Oct 19: the news columns are also exported as <NewsAround rail />, which the
 * /datasets results band renders in its right column in place of the
 * Relevant News card. The band then passes hideNews so the deck does not
 * repeat them below.
 *
 * Text, icons and data shapes only: no card outlines. It renders nothing
 * when a ping brought back none of the three.
 */
import { newsHeaderTitle } from '@/lib/sonar/display-copy';
import dynamic from 'next/dynamic';
import './sonar-research.css';

const SonarSanctionsPanel = dynamic(() => import('./SonarSanctionsPanel'), {
  ssr: false,
  loading: () => <p className="snrx-loading">Loading the sanctions map…</p>,
});

function when(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 24);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** True when a ping brought back at least one news column with items. */
export function hasNewsColumns(live) {
  const cols = Array.isArray(live?.newsColumns) ? live.newsColumns : [];
  return cols.some((c) => c.items?.length);
}

function NewsColumn({ col, Heading = 'h3' }) {
  return (
    <div className="snrx-col">
      <Heading className="snrx-col-title">
        <i className={`bi ${col.icon || 'bi-newspaper'}`} aria-hidden="true" />
        {col.title}
      </Heading>
      {col.items.length ? (
        <ol className="snrx-list">
          {col.items.map((n) => (
            <li key={n.url}>
              <a className="snrx-item" href={n.url} target="_blank" rel="noopener noreferrer">
                <span className="snrx-item-title">{n.title}</span>
                <span className="snrx-item-meta">
                  {n.origin === 'dataset' ? (
                    <span className="snrx-tag">
                      <i className="bi bi-database" aria-hidden="true" />
                      Ezana data
                    </span>
                  ) : null}
                  {n.source || host(n.url)}
                  {when(n.publishedAt) ? ` · ${when(n.publishedAt)}` : ''}
                </span>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="snrx-empty">Nothing recent came back for this column.</p>
      )}
    </div>
  );
}

/**
 * "The news around it". Full width (three columns) below the band, or `rail`:
 * one stacked column inside the band's right-hand stack on /datasets.
 */
export function NewsAround({ live, rail = false }) {
  if (!hasNewsColumns(live)) return null;
  const cols = live.newsColumns;
  const Title = rail ? 'h3' : 'h2';
  const title = newsHeaderTitle(live);
  const block = (
    <div className="snrx-block">
      <div className="snrx-head">
        <p className="snrx-eyebrow">The news around it</p>
        <Title className="snrx-title">{title}</Title>
      </div>
      <div className="snrx-cols">
        {cols.map((c) => (
          <NewsColumn key={c.id} col={c} Heading={rail ? 'h4' : 'h3'} />
        ))}
      </div>
    </div>
  );
  /* The rail sits inside the band, outside any .snrx root, so it carries its
     own .snrx scope for the text and mint tokens. */
  return rail ? (
    <section className="snrx snrx--rail" aria-label="The news around it">
      {block}
    </section>
  ) : (
    block
  );
}

export default function SonarResearchDeck({ live, hideNews = false }) {
  const showNews = !hideNews && hasNewsColumns(live);
  const web = Array.isArray(live?.webSources) ? live.webSources : [];
  if (!live?.sanctions && !showNews && !web.length) return null;

  return (
    <section className="snrx" aria-label="Further research for this ping">
      <div className="snrx-inner">
        {live.sanctions ? <SonarSanctionsPanel data={live.sanctions} /> : null}

        {showNews ? <NewsAround live={live} /> : null}

        {web.length ? (
          <div className="snrx-block snrx-block--sources">
            <p className="snrx-eyebrow">Web pages the brief read</p>
            <ul className="snrx-sources">
              {web.map((w) => (
                <li key={w.url}>
                  <a href={w.url} target="_blank" rel="noopener noreferrer">
                    <i className="bi bi-link-45deg" aria-hidden="true" />
                    <span>{w.title || host(w.url)}</span>
                    <span className="snrx-host">{host(w.url)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
