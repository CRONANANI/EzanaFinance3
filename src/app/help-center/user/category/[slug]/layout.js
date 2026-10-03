import { USER_CATEGORIES } from '@/lib/help-center-content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

export function generateMetadata({ params }) {
  const c = USER_CATEGORIES.find((x) => x.id === params.slug);
  if (!c) return { title: 'Category not found | Ezana Help Center', robots: { index: false } };
  return {
    title: `${c.title} | Ezana Help Center`,
    description: `${c.description}. ${c.articles.length} articles.`,
    alternates: { canonical: `${SITE_URL}/help-center/user/category/${params.slug}` },
  };
}

export default function Layout({ children }) {
  return children;
}
