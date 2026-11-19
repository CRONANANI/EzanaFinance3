import { notFound } from 'next/navigation';
import localFont from 'next/font/local';
import {
  getArticleBySlug,
  getRelatedAndMore,
  bumpArticleView,
  hasUnverifiedMarkers,
} from '@/lib/echo-data';
import { getUserClient } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { isArticleArchived } from '@/lib/echo-article-status';
import EchoArticleClient from './EchoArticleClient';

/* Source Serif 4 ships with the repo (src/fonts/source-serif-4, OFL), not
   from next/font/google: fetching it from Google at build time broke
   production builds on Nov 19, 2026 (a Next 14 font-loader bug on Google's
   response). Same weights, styles and CSS variable as before. */
const sourceSerif = localFont({
  src: [
    {
      path: '../../../../fonts/source-serif-4/source-serif-4-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../../fonts/source-serif-4/source-serif-4-latin-400-italic.woff2',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../../../../fonts/source-serif-4/source-serif-4-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../../fonts/source-serif-4/source-serif-4-latin-500-italic.woff2',
      weight: '500',
      style: 'italic',
    },
    {
      path: '../../../../fonts/source-serif-4/source-serif-4-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../../../fonts/source-serif-4/source-serif-4-latin-600-italic.woff2',
      weight: '600',
      style: 'italic',
    },
  ],
  variable: '--font-serif-editorial',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

function ogImageFor(article) {
  return article?.heroImage?.src ? `${SITE_URL}${article.heroImage.src}` : `${SITE_URL}/logo.png`;
}

export async function generateMetadata({ params }) {
  const a = await getArticleBySlug(params.articleId);
  if (!a) return { title: 'Article | Ezana Echo' };
  const url = `${SITE_URL}/ezana-echo/${a.slug}`;
  const image = ogImageFor(a);
  return {
    title: `${a.title} | Ezana Echo`,
    description: a.excerpt,
    alternates: { canonical: url },
    // Unfinished fact-checking: readable, but not indexed until cleared.
    ...(hasUnverifiedMarkers(a) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: a.title,
      description: a.excerpt,
      url,
      siteName: 'Ezana Echo',
      type: 'article',
      publishedTime: a.publishedAt || undefined,
      authors: a.author ? [a.author] : undefined,
      images: [{ url: image, alt: a.heroImage?.alt || a.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: a.title,
      description: a.excerpt,
      images: [image],
    },
  };
}

export default async function EzanaEchoArticlePage({ params }) {
  const article = await getArticleBySlug(params.articleId);
  if (!article) notFound();

  // Resolve the viewer once — used for the archived-article gate and for
  // personalized "more" ranking (PERSONALIZATION_V2).
  const supabase = getUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const archived = await isArticleArchived(params.articleId);
  // Drafts gate exactly like archived pieces: invisible to everyone except
  // admins (who need to preview them) until article_status is 'published'.
  const unpublished = article.status && article.status !== 'published';
  if ((archived || unpublished) && (!user || !isAdminUser(user))) {
    notFound();
  }

  if (!archived && article.status === 'published') {
    bumpArticleView(article.slug);
  }

  const { related, more } = await getRelatedAndMore(
    article.category,
    article.slug,
    3,
    4,
    user?.id || null,
  );

  const canonical = `${SITE_URL}/ezana-echo/${article.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: [ogImageFor(article)],
    datePublished: article.publishedAt || undefined,
    dateModified: article.publishedAt || undefined,
    author: { '@type': 'Organization', name: article.author || 'Ezana Finance Editorial' },
    publisher: {
      '@type': 'Organization',
      name: 'Ezana',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  };

  return (
    <div className={sourceSerif.variable}>
      {/* Server-rendered structured data so crawlers see it in the initial HTML. */}
      <script
        type="application/ld+json"
        // Escape "<" so a title/excerpt containing "</script>" cannot break
        // out of the JSON-LD block and inject markup (< stays valid JSON).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <EchoArticleClient
        article={article}
        relatedArticles={related}
        moreArticles={more}
        isArchived={archived}
      />
    </div>
  );
}
