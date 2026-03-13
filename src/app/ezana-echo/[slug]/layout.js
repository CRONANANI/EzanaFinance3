import { ARTICLES_META } from '../articles-data';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = ARTICLES_META[slug];
  if (!article) return { title: 'Article | Ezana Echo' };
  return {
    title: `${article.title} | Ezana Echo`,
    description: `Ezana Echo - ${article.title}. Market insights and analysis from Ezana Finance.`,
  };
}

export default function ArticleLayout({ children }) {
  return children;
}
