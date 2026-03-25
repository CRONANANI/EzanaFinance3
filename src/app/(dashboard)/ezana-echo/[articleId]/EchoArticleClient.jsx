'use client';

import Link from 'next/link';
import { EchoArticleEngagement } from '@/components/echo/EchoArticleEngagement';
import {
  ECHO_MOCK_COMMENTS_BY_ARTICLE,
  formatPublishedDate,
  getAllArticles,
  getRelatedArticles,
} from '@/lib/ezana-echo-mock';

import '../../../../../app-legacy/assets/css/theme.css';
import '../../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../../app-legacy/assets/css/pages-common.css';
import '../../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../../app-legacy/pages/home-dashboard.css';
import '../ezana-echo.css';

export default function EchoArticleClient({ article }) {
  const related = getRelatedArticles(article.category, article.id, 3);
  const fallback =
    related.length < 3
      ? getAllArticles()
          .filter((a) => a.id !== article.id && !related.some((r) => r.id === a.id))
          .slice(0, 3 - related.length)
      : [];
  const relatedCards = [...related, ...fallback].slice(0, 3);
  const seedComments = ECHO_MOCK_COMMENTS_BY_ARTICLE[article.id] ?? [];

  return (
    <div className="dashboard-page-inset echo-article-page db-page">
      <Link href="/ezana-echo" className="echo-back">
        <i className="bi bi-arrow-left" aria-hidden /> Back to Ezana Echo
      </Link>

      <article>
        <h1 className="echo-article-h1">{article.title}</h1>
        <p className="echo-article-meta">
          By {article.author} · {formatPublishedDate(article.publishedAt)} · {article.readTime} min read
        </p>
        <div className="echo-ticker-row" style={{ marginBottom: '1.5rem' }}>
          {article.tickers.map((t) => (
            <Link key={t} href={`/company-research?q=${encodeURIComponent(t)}`} className="echo-ticker">
              📈 {t}
            </Link>
          ))}
        </div>

        <div className="echo-article-body">
          {article.contentParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <p className="echo-article-stats">
          ❤️ {article.likes} likes &nbsp; 💬 {article.comments} comments
        </p>

        <EchoArticleEngagement
          articleId={article.id}
          initialLikes={article.likes}
          seedComments={seedComments}
        />

        <hr className="echo-article-divider" />

        <h2 className="echo-section-title" style={{ marginBottom: '1rem' }}>
          Related Articles
        </h2>
        <div className="echo-related-grid">
          {relatedCards.map((a) => (
            <Link key={a.id} href={`/ezana-echo/${a.id}`} className="echo-related-card">
              <p className="echo-related-title">{a.title}</p>
            </Link>
          ))}
        </div>
      </article>
    </div>
  );
}
