import { PARTNER_ARTICLES } from '@/lib/help-center-content';
import { htmlToText } from '@/lib/help-center-search';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

export function generateMetadata({ params }) {
  const a = PARTNER_ARTICLES[params.slug];
  if (!a) return { title: 'Article not found | Ezana Help Center', robots: { index: false } };
  const text = htmlToText(a.content);
  const description = text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
  return {
    title: `${a.title} | Ezana Help Center`,
    description,
    alternates: { canonical: `${SITE_URL}/help-center/partner/article/${params.slug}` },
  };
}

export default function Layout({ children }) {
  return children;
}
