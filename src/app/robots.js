const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

/**
 * robots.txt — allow crawling of public content, keep API routes out, and
 * point crawlers at the sitemap.
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
