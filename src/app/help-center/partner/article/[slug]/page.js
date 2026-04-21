'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight, FileText } from 'lucide-react';
import { PARTNER_ARTICLES, PARTNER_CATEGORIES } from '@/lib/help-center-content';
import '../../../help-center.css';

const BASE = '/help-center/partner';

export default function PartnerHelpArticlePage() {
  const params = useParams();
  const slug = params?.slug;
  const article = slug ? PARTNER_ARTICLES[slug] : null;

  const relatedCategory = useMemo(() => {
    if (!article) return null;
    return PARTNER_CATEGORIES.find((c) => c.title === article.category) || null;
  }, [article]);

  const relatedArticles = useMemo(() => {
    if (!relatedCategory) return [];
    return relatedCategory.articles
      .filter((a) => a.slug !== slug)
      .slice(0, 5);
  }, [relatedCategory, slug]);

  if (!article) {
    return (
      <div className="hc-page px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="hc-title mb-4 text-2xl font-semibold">Article not found</h1>
          <Link href={BASE} className="hc-link inline-flex items-center gap-2 hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Back to Partner Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="hc-page">
      <article className="mx-auto max-w-3xl px-4 py-12">
        <nav className="hc-faint mb-6 flex flex-wrap items-center gap-2 text-xs">
          <Link href="/help-center" className="hc-link-muted hover:underline">Help Center</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={BASE} className="hc-link-muted hover:underline">Partner Support</Link>
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
        <h1 className="hc-title mb-8 text-3xl font-bold">{article.title}</h1>

        <div
          className="hc-prose max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

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

        <div
          className="mt-12 pt-8"
          style={{ borderTop: '1px solid var(--border-primary)' }}
        >
          <p className="hc-faint mb-4 text-sm">Was this article helpful?</p>
          <div className="flex gap-2">
            <button type="button" className="hc-btn-ghost text-sm">Yes</button>
            <button type="button" className="hc-btn-ghost text-sm">No</button>
          </div>
        </div>

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
              Back to Partner Help Center
            </Link>
          )}
          <Link
            href="mailto:partners@ezana.world"
            className="hc-accent inline-flex items-center gap-1 text-sm hover:underline"
          >
            Still have questions? Contact partner support
            <ArrowRight className="h-3 w-3" />
          </Link>
        </footer>
      </article>
    </div>
  );
}
