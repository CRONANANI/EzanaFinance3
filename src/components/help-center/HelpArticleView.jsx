'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ArticleFeedback from '@/components/help-center/ArticleFeedback';
import { HelpSidebarNav } from '@/components/help-center/HelpSidebarNav';
import { ArticleToc } from '@/components/help-center/ArticleToc';
import { formatHelpArticle, helpReadTime } from '@/lib/help-center/article-format';

/* Loaded on first open only, so the article route does not carry the form. */
const ContactSupportDialog = dynamic(
  () =>
    import('@/components/ui/contact-support-dialog').then((m) => ({
      default: m.ContactSupportDialog,
    })),
  { ssr: false },
);

/* Article bodies are authored in this repo (src/lib/help-center-content.js,
   a static module), so per src/lib/sanitize-html.js they are trusted HTML and
   are NOT run through DOMPurify. That matters: isomorphic-dompurify loads
   jsdom on the server, whose html-encoding-sniffer require()s an ES-only
   module, and on Vercel's Node runtime that threw ERR_REQUIRE_ESM and
   500'd every article page. Never feed user or DB content into these sinks. */
const PROSE_ID = 'hc-article-body';
const MAX_RELATED = 5;

/**
 * The whole article page for either help center (user or partner): topic
 * tree, article column and "on this page" rail. The two route files only
 * choose the content set and fire the view/read hooks.
 *
 * @param {object}   props
 * @param {object}   props.article       entry from USER_ARTICLES / PARTNER_ARTICLES, or null
 * @param {string}   props.slug
 * @param {'user'|'partner'} props.section
 * @param {string}   props.base          e.g. '/help-center/user'
 * @param {string}   props.sectionLabel  breadcrumb label, e.g. 'User Support'
 * @param {string}   props.homeLabel     e.g. 'User Help Center'
 * @param {object[]} props.categories
 * @param {object}   props.articles      slug -> article map, for related titles
 * @param {{marker: string, Component: Function}[]} [props.embeds]
 *        live components an article can host mid-prose, keyed by the
 *        placeholder its content carries. One per article.
 */
export function HelpArticleView({
  article,
  slug,
  section,
  base,
  sectionLabel,
  homeLabel,
  categories,
  articles,
  embeds = [],
}) {
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMounted, setSupportMounted] = useState(false);

  /* The category is matched by title, since the article map stores a
     human-readable category string. It drives the breadcrumbs, the topic
     tree's active state and the previous/next pager. */
  const category = useMemo(() => {
    if (!article) return null;
    return categories.find((c) => c.title === article.category) || null;
  }, [article, categories]);

  const formatted = useMemo(() => formatHelpArticle(article?.content || ''), [article]);

  /* Related links: the list the author wrote for this article when there is
     one (lifted out of the prose by formatHelpArticle), otherwise the
     article's siblings in its category. */
  const related = useMemo(() => {
    if (formatted.related.length > 0) {
      return formatted.related.slice(0, MAX_RELATED).map((r) => {
        const target = r.href.split('/article/')[1];
        return { href: r.href, title: (target && articles[target]?.title) || r.title };
      });
    }
    if (!category) return [];
    return category.articles
      .filter((a) => a.slug !== slug)
      .slice(0, MAX_RELATED)
      .map((a) => ({ href: `${base}/article/${a.slug}`, title: a.title }));
  }, [formatted, category, articles, base, slug]);

  const { prev, next } = useMemo(() => {
    if (!category) return { prev: null, next: null };
    const list = category.articles;
    const i = list.findIndex((a) => a.slug === slug);
    if (i === -1) return { prev: null, next: null };
    return { prev: i > 0 ? list[i - 1] : null, next: i < list.length - 1 ? list[i + 1] : null };
  }, [category, slug]);

  if (!article) {
    return (
      <div className="hc-page px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="hc-title mb-4 text-2xl font-semibold">Article not found</h1>
          <Link href={base} className="hc-link inline-flex items-center gap-2 hover:underline">
            <i className="bi bi-chevron-left" aria-hidden="true" />
            Back to {homeLabel}
          </Link>
        </div>
      </div>
    );
  }

  const openSupport = () => {
    setSupportMounted(true);
    setSupportOpen(true);
  };

  /* One article hosts a live React table mid-prose. Splitting the HTML on
     its marker puts the table under the heading that announces it instead of
     after the whole article. Both halves stay inside #hc-article-body so the
     table of contents still sees every heading. */
  const embed = embeds.find((e) => formatted.html.includes(e.marker));
  const [before, after = ''] = embed ? formatted.html.split(embed.marker) : [formatted.html];

  return (
    <div className="hc-page">
      <div className="hc-article-grid">
        <aside>
          <HelpSidebarNav
            categories={categories}
            base={base}
            activeCategoryId={category?.id}
            activeSlug={slug}
          />
        </aside>

        <article className="hc-article-main hc-doc">
          <nav className="hc-crumbs" aria-label="Breadcrumb">
            <Link href="/help-center">Help Center</Link>
            <i className="bi bi-chevron-right" aria-hidden="true" />
            <Link href={base}>{sectionLabel}</Link>
            {category && (
              <>
                <i className="bi bi-chevron-right" aria-hidden="true" />
                <Link href={`${base}/category/${category.id}`}>{category.title}</Link>
              </>
            )}
          </nav>

          <header className="hc-doc-head">
            <p className="hc-doc-eyebrow">{article.category}</p>
            <h1 className="hc-doc-title">{article.title}</h1>
            <p className="hc-meta">
              <span>{helpReadTime(article.content || '')} min read</span>
              {article.updated ? <span>Updated {article.updated}</span> : null}
            </p>
          </header>

          <div id={PROSE_ID} className="hc-prose max-w-none">
            <div className="hc-prose-html" dangerouslySetInnerHTML={{ __html: before }} />
            {embed ? (
              <>
                <embed.Component />
                <div className="hc-prose-html" dangerouslySetInnerHTML={{ __html: after }} />
              </>
            ) : null}
          </div>

          {related.length > 0 && (
            <section className="hc-doc-related" aria-labelledby="hc-related-heading">
              <h2 id="hc-related-heading" className="hc-doc-label">
                Related articles
              </h2>
              <ul>
                {related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className="hc-doc-row">
                      <span>{r.title}</span>
                      <i className="bi bi-arrow-right" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(prev || next) && (
            <nav className="hc-pager" aria-label="Article pagination">
              {prev && (
                <Link href={`${base}/article/${prev.slug}`} className="hc-pager-link">
                  <span className="hc-pager-eyebrow">
                    <i className="bi bi-arrow-left" aria-hidden="true" />
                    Previous
                  </span>
                  <span className="hc-pager-title">{prev.title}</span>
                </Link>
              )}
              {next && (
                <Link
                  href={`${base}/article/${next.slug}`}
                  className="hc-pager-link hc-pager-link--next"
                >
                  <span className="hc-pager-eyebrow">
                    Next
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </span>
                  <span className="hc-pager-title">{next.title}</span>
                </Link>
              )}
            </nav>
          )}

          <ArticleFeedback section={section} articleSlug={slug} />

          <footer className="hc-doc-foot">
            <Link href={category ? `${base}/category/${category.id}` : base}>
              <i className="bi bi-chevron-left" aria-hidden="true" />
              Back to {category ? category.title : homeLabel}
            </Link>
            <button type="button" className="hc-doc-contact" onClick={openSupport}>
              Still have questions? Contact support
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </footer>
        </article>

        <aside>
          <ArticleToc containerId={PROSE_ID} />
        </aside>
      </div>

      {supportMounted ? (
        <ContactSupportDialog
          open={supportOpen}
          onOpenChange={setSupportOpen}
          source={`Help Center article: ${article.title}`}
        />
      ) : null}
    </div>
  );
}

export default HelpArticleView;
