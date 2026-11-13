/**
 * The public share page's body (Sonar research workspace, Nov 13 2026): only the
 * publicSnapshot() fields (question, headline, summary, takeaways, sources, mode, date), then a
 * quiet link to run your own research. No account, no menu, no actions. Server component.
 */
import Link from 'next/link';
import './research-workspace.css';

const MODE = { quick: 'Quick ping', standard: 'Standard research', deep: 'Deep research' };

function dateLabel(value) {
  const t = Date.parse(value || '');
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(t));
}

const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

export function SharedResearchView({ data }) {
  if (!data) {
    return (
      <div className="srw-public">
        <p className="srw-empty">This shared research is no longer available.</p>
        <Link className="srw-btn" href="/datasets">
          Run your own research on Ezana Sonar
        </Link>
      </div>
    );
  }
  const paras = String(data.summary || '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\[(S?\d+)\]/g, '').trim())
    .filter(Boolean);
  const meta = [MODE[data.depth] || null, dateLabel(data.answeredAt)].filter(Boolean);
  return (
    <article className="srw-public">
      <p className="srw-eyebrow">Shared research</p>
      <p className="srw-public-q">{data.question}</p>
      {meta.length ? <p className="srw-row-meta">{meta.join(' · ')}</p> : null}
      <h1 className="srw-title">{data.headline || data.question}</h1>
      {paras.map((p, i) => (
        <p key={i} className="srw-public-p">
          {p}
        </p>
      ))}
      {data.takeaways?.length ? (
        <section className="srw-section" aria-labelledby="srw-pub-take">
          <h2 id="srw-pub-take" className="srw-section-title">
            Key takeaways
          </h2>
          <ul className="srw-public-list">
            {data.takeaways.map((t, i) => (
              <li key={i}>{t.replace(/\[(S?\d+)\]/g, '').trim()}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.sources?.length ? (
        <section className="srw-section" aria-labelledby="srw-pub-src">
          <h2 id="srw-pub-src" className="srw-section-title">
            Evidence and sources ({data.sources.length})
          </h2>
          <ul className="srw-rows">
            {data.sources.map((s, i) => (
              <li key={i} className="srw-row">
                {s.url ? (
                  <a
                    className="srw-row-link"
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {s.name}
                    <span className="srw-sr"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="srw-row-link">{s.name}</span>
                )}
                {s.url && host(s.url) ? <span className="srw-row-meta">{host(s.url)}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="srw-public-foot">
        Findings only, never financial advice.{' '}
        <Link href="/datasets">Run your own research on Ezana Sonar</Link>
      </p>
    </article>
  );
}

export default SharedResearchView;
