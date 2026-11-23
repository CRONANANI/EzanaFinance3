import { BRAND, BRAND_COPY, SITE_URL } from '@/lib/brand';

/* Ezana Echo is positioned as Ezana Finance's financial research and editorial
   publication (Nov 23, 2026), not by its partner-publishing tools. Articles set their own
   metadata (and openGraph, with their hero image), which replaces this for them. */
const URL = `${SITE_URL}/ezana-echo`;

export const metadata = {
  title: BRAND_COPY.echo.title,
  description: BRAND_COPY.echo.description,
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    url: URL,
    title: BRAND_COPY.echo.title,
    description: BRAND_COPY.echo.description,
    images: [
      {
        url: '/og/ezana-share.png',
        width: 1200,
        height: 630,
        alt: 'Ezana Echo, published by Ezana Finance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND_COPY.echo.title,
    description: BRAND_COPY.echo.description,
  },
};

export default function EzanaEchoLayout({ children }) {
  return children;
}
