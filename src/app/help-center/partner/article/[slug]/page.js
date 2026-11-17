'use client';

import { useParams } from 'next/navigation';
import { PARTNER_ARTICLES, PARTNER_CATEGORIES } from '@/lib/help-center-content';
import { useHelpArticleView } from '@/components/help-center/useHelpArticleView';
import { useHelpArticleRead } from '@/components/help-center/help-reads';
import { HelpArticleView } from '@/components/help-center/HelpArticleView';
import '../../../help-center.css';

export default function PartnerHelpArticlePage() {
  const params = useParams();
  const slug = params?.slug;
  const article = slug ? PARTNER_ARTICLES[slug] : null;
  useHelpArticleView('partner', article ? slug : null);
  useHelpArticleRead(article ? slug : null);

  return (
    <HelpArticleView
      article={article}
      slug={slug}
      section="partner"
      base="/help-center/partner"
      sectionLabel="Partner Support"
      homeLabel="Partner Help Center"
      categories={PARTNER_CATEGORIES}
      articles={PARTNER_ARTICLES}
    />
  );
}
