import { notFound } from 'next/navigation';
import { Source_Serif_4 } from 'next/font/google';
import { getArticleById } from '@/lib/ezana-echo-mock';
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

export async function generateMetadata({ params }) {
  const a = getArticleById(params.articleId);
  if (!a) return { title: 'Article | Ezana Echo' };
  return {
    title: `${a.title} | Ezana Echo`,
    description: a.excerpt,
  };
}

export default async function EzanaEchoArticlePage({ params }) {
  const article = getArticleById(params.articleId);
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

  return (
    <div className={sourceSerif.variable}>
      <EchoArticleClient article={article} isArchived={archived} />
    </div>
  );
}
