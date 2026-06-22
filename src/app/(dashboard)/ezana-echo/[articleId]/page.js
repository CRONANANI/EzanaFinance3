import { notFound } from 'next/navigation';
import { Source_Serif_4 } from 'next/font/google';
import { getArticleBySlug, getRelatedAndMore, bumpArticleView } from '@/lib/echo-data';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdminUser } from '@/lib/admin-helpers';
import { isArticleArchived } from '@/lib/echo-article-status';
import EchoArticleClient from './EchoArticleClient';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif-editorial',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

function ogImageFor(article) {
  return article?.heroImage?.src
    ? `${SITE_URL}${article.heroImage.src}`
    : `${SITE_URL}/ezana-logo.png`;
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

  const archived = await isArticleArchived(params.articleId);
  if (archived) {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminUser(user)) {
      notFound();
    }
  }

  if (!archived && article.status === 'published') {
    bumpArticleView(article.slug);
  }

  const { related, more } = await getRelatedAndMore(article.category, article.slug, 3, 4);

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
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/ezana-logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  };

  return (
    <div className={sourceSerif.variable}>
      {/* Server-rendered structured data so crawlers see it in the initial HTML. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
