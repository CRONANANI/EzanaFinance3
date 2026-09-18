'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight, FileText } from 'lucide-react';
import { USER_ARTICLES, USER_CATEGORIES } from '@/lib/help-center-content';
import ArticleFeedback from '@/components/help-center/ArticleFeedback';
import { HelpSidebarNav } from '@/components/help-center/HelpSidebarNav';
import { ArticleToc } from '@/components/help-center/ArticleToc';
import { BrokerageAccessTable } from '@/components/help-center/BrokerageAccessTable';
import { sanitizeHtml } from '@/lib/sanitize-html';
import '../../../help-center.css';

const BASE = '/help-center/user';
const PROSE_ID = 'hc-article-body';

/* ~200 words per minute, floored at 1, computed from the stripped body. */
function readTime(html) {
  return Math.max(
    1,
    Math.round(
      html
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length / 200,
    ),
  );
}

export default function UserHelpArticlePage() {
  const params = useParams();
  const slug = params?.slug;
  const article = slug ? USER_ARTICLES[slug] : null;

  /*
   * Find the category this article belongs to (matched by title, since
   * USER_ARTICLES stores a human-readable category string) so we can
   * render breadcrumbs, the topic tree's active state, sibling links and the
   * previous/next pager.
   */
  const relatedCategory = useMemo(() => {
    if (!article) return null;
    return USER_CATEGORIES.find((c) => c.title === article.category) || null;
  }, [article]);

  const relatedArticles = useMemo(() => {
    if (!relatedCategory) return [];
    return relatedCategory.articles.filter((a) => a.slug !== slug).slice(0, 5);
  }, [relatedCategory, slug]);

  const { prev, next } = useMemo(() => {
    if (!relatedCategory) return { prev: null, next: null };
    const list = relatedCategory.articles;
    const i = list.findIndex((a) => a.slug === slug);
    if (i === -1) return { prev: null, next: null };
    return { prev: i > 0 ? list[i - 1] : null, next: i < list.length - 1 ? list[i + 1] : null };
  }, [relatedCategory, slug]);

  if (!article) {
    return (
      <div className="hc-page px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="hc-title mb-4 text-2xl font-semibold">Article not found</h1>
          <Link href={BASE} className="hc-link inline-flex items-center gap-2 hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Back to User Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="hc-page">
      <div className="hc-article-grid">
        <aside>
          <HelpSidebarNav
            categories={USER_CATEGORIES}
            base={BASE}
            activeCategoryId={relatedCategory?.id}
            activeSlug={slug}
          />
        </aside>

        <article className="hc-article-main">
          {/* Breadcrumbs */}
          <nav className="hc-faint mb-6 flex flex-wrap items-center gap-2 text-xs">
            <Link href="/help-center" className="hc-link-muted hover:underline">
              Help Center
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={BASE} className="hc-link-muted hover:underline">
              User Support
            </Link>
            {relatedCategory && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link
                  href={`${BASE}/category/${relatedCategory.id}`}
                  className="hc-link-muted hover:underline"
                >
                  {relatedCategory.title}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3" />
            <span className="hc-title">{article.title}</span>
          </nav>

          <p className="hc-accent mb-2 text-sm font-medium">{article.category}</p>
          <h1 className="hc-title mb-3 text-3xl font-bold">{article.title}</h1>
          <p className="hc-meta">
            <span>{readTime(article.content)} min read</span>
            {article.updated ? <span>Updated {article.updated}</span> : null}
          </p>

          <div
            id={PROSE_ID}
            className="hc-prose max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
          />

          {/* The live capability tables belong to this one article; the static
              fallback inside the component covers the API being unavailable. */}
          {slug === 'brokerage-access-levels' && <BrokerageAccessTable />}

          {relatedArticles.length > 0 && (
            <section className="hc-card mt-12 p-5">
              <h2 className="hc-title mb-3 text-sm font-semibold">Related articles</h2>
              <ul className="space-y-1.5">
                {relatedArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`${BASE}/article/${a.slug}`}
                      className="hc-title inline-flex items-center gap-2 text-sm hover:text-[color:var(--emerald-text)]"
                    >
                      <FileText className="hc-faint h-3.5 w-3.5" />
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(prev || next) && (
            <nav className="hc-pager" aria-label="Article pagination">
              {prev && (
                <Link href={`${BASE}/article/${prev.slug}`} className="hc-pager-card">
                  <span className="hc-pager-eyebrow">Previous</span>
                  <span className="hc-pager-title">{prev.title}</span>
                </Link>
              )}
              {next && (
                <Link
                  href={`${BASE}/article/${next.slug}`}
                  className="hc-pager-card hc-pager-card--next"
                >
                  <span className="hc-pager-eyebrow">Next</span>
                  <span className="hc-pager-title">{next.title}</span>
                </Link>
              )}
            </nav>
          )}

          <ArticleFeedback section="user" articleSlug={slug} />

          <footer
            className="mt-8 flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center"
            style={{ borderTop: '1px solid var(--border-primary)' }}
          >
            {relatedCategory ? (
              <Link
                href={`${BASE}/category/${relatedCategory.id}`}
                className="hc-link-muted inline-flex items-center gap-1 text-sm"
              >
                <ChevronLeft className="h-3 w-3" />
                Back to {relatedCategory.title}
              </Link>
            ) : (
              <Link href={BASE} className="hc-link-muted inline-flex items-center gap-1 text-sm">
                <ChevronLeft className="h-3 w-3" />
                Back to User Help Center
              </Link>
            )}
            <Link
              href="mailto:contact@ezana.world"
              className="hc-accent inline-flex items-center gap-1 text-sm hover:underline"
            >
              Still have questions? Contact support
              <ArrowRight className="h-3 w-3" />
            </Link>
          </footer>
        </article>

        <aside>
          <ArticleToc containerId={PROSE_ID} />
        </aside>
      </div>
    </div>
  );
}
