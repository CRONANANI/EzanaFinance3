import { notFound } from 'next/navigation';
import { getArticleById } from '@/lib/ezana-echo-mock';
import EchoArticleClient from './EchoArticleClient';

export async function generateMetadata({ params }) {
  const a = getArticleById(params.articleId);
  if (!a) return { title: 'Article | Ezana Echo' };
  return {
    title: `${a.title} | Ezana Echo`,
    description: a.excerpt,
  };
}

export default function EzanaEchoArticlePage({ params }) {
  const article = getArticleById(params.articleId);
  if (!article) notFound();
  return <EchoArticleClient article={article} />;
}
