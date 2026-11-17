'use client';

import { useParams } from 'next/navigation';
import { USER_ARTICLES, USER_CATEGORIES } from '@/lib/help-center-content';
import { useHelpArticleView } from '@/components/help-center/useHelpArticleView';
import { useHelpArticleRead } from '@/components/help-center/help-reads';
import { HelpArticleView } from '@/components/help-center/HelpArticleView';
import { BrokerageAccessTable } from '@/components/help-center/BrokerageAccessTable';
import { InstitutionDirectory } from '@/components/help-center/InstitutionDirectory';
import '../../../help-center.css';

/* Live components an article can host mid-prose, keyed by the placeholder
   its content carries. One per article. */
const EMBEDS = [
  { marker: '<div id="hc-live-tables"></div>', Component: BrokerageAccessTable },
  { marker: '<div id="hc-institution-directory"></div>', Component: InstitutionDirectory },
];

export default function UserHelpArticlePage() {
  const params = useParams();
  const slug = params?.slug;
  const article = slug ? USER_ARTICLES[slug] : null;
  useHelpArticleView('user', article ? slug : null);
  useHelpArticleRead(article ? slug : null);

  return (
    <HelpArticleView
      article={article}
      slug={slug}
      section="user"
      base="/help-center/user"
      sectionLabel="User Support"
      homeLabel="User Help Center"
      categories={USER_CATEGORIES}
      articles={USER_ARTICLES}
      embeds={EMBEDS}
    />
  );
}
