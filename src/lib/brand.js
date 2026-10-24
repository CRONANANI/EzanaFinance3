/**
 * Brand identity, in one place, for search engines and for the UI.
 *
 * Google decides what "Ezana" means from the same facts repeated everywhere:
 * the site's structured data, its <title>, its og:site_name and the public
 * profiles that link back here. Keep the name, the URLs and the profiles in
 * this file only, so the footer and the structured data can never disagree.
 *
 * SOCIAL_PROFILES: the company's own public pages. A profile left null is
 * hidden from the footer and left out of the structured data, rather than
 * linking to a network's home page.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

export const BRAND = {
  name: 'Ezana',
  legalName: 'Ezana Finance, Inc.',
  alternateNames: ['Ezana Finance', 'ezana.world'],
  tagline: 'Follow the moves that matter',
  description:
    'Ezana is an investment research platform that turns public filings into market intelligence: congressional trades, insider and institutional (13F) holdings, government contracts, lobbying and more.',
  logo: '/ezana-logo.png',
};

export const SOCIAL_PROFILES = {
  x: 'https://x.com/EzanaWorld',
  linkedin: null,
  instagram: null,
  facebook: null,
  youtube: null,
  crunchbase: null,
};

const sameAs = () => Object.values(SOCIAL_PROFILES).filter(Boolean);

/**
 * Organization + WebSite structured data for every page. The WebSite `name`
 * is what Google shows as the site name above each result, and the
 * Organization ties the name "Ezana" to this domain and its profiles.
 */
export function brandJsonLd() {
  const org = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: BRAND.name,
    legalName: BRAND.legalName,
    alternateName: BRAND.alternateNames,
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}${BRAND.logo}`, width: 1024, height: 1024 },
    description: BRAND.description,
  };
  const links = sameAs();
  if (links.length) org.sameAs = links;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: BRAND.name,
        alternateName: BRAND.alternateNames,
        url: `${SITE_URL}/`,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en',
      },
    ],
  };
}
