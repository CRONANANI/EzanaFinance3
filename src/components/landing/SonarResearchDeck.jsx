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
 * Text, icons and data shapes only: no card outlines. It renders nothing
 * when a ping brought back none of the three.
 */
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

function NewsColumn({ col }) {
  return (
    <div className="snrx-col">
      <h3 className="snrx-col-title">
        <i className={`bi ${col.icon || 'bi-newspaper'}`} aria-hidden="true" />
        {col.title}
      </h3>
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

export default function SonarResearchDeck({ live }) {
  const cols = Array.isArray(live?.newsColumns) ? live.newsColumns : [];
  const hasNews = cols.some((c) => c.items?.length);
  const web = Array.isArray(live?.webSources) ? live.webSources : [];
  if (!live?.sanctions && !hasNews && !web.length) return null;

  return (
    <section className="snrx" aria-label="Further research for this ping">
      <div className="snrx-inner">
        {live.sanctions ? <SonarSanctionsPanel data={live.sanctions} /> : null}

        {hasNews ? (
          <div className="snrx-block">
            <div className="snrx-head">
              <p className="snrx-eyebrow">The news around it</p>
              <h2 className="snrx-title">
                {live.query ? `What is moving around “${live.query}”` : 'What is moving around it'}
              </h2>
            </div>
            <div className="snrx-cols">
              {cols.map((c) => (
                <NewsColumn key={c.id} col={c} />
              ))}
            </div>
          </div>
        ) : null}

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
