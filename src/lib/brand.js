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
  /* Nov 23, 2026 positioning: Ezana is defined by its purpose (AI-powered financial
     intelligence and investment research); congressional trades, 13F holdings and other
     datasets are examples of what it connects, not the definition of the company. */
  description:
    'Ezana Finance is an AI-powered financial intelligence and investment research platform connecting market, corporate, institutional, economic and government data.',
  logo: '/ezana-logo.png',
};

/**
 * Brand copy (Nov 23, 2026): the one source for how Ezana and its products are described
 * in metadata, structured data and the About page. Route metadata stays specific to each
 * page; these are the defaults and the product definitions they draw on. Every claim here
 * is a live, shipped capability: keep it that way (no real-time, accuracy or performance
 * claims).
 */
export const BRAND_COPY = {
  /** The master positioning statement (About page, Organization description at length). */
  long: 'Ezana Finance is an AI-powered financial intelligence and investment research platform that brings together market data, corporate financials, institutional activity, government intelligence, and macroeconomic research in one connected ecosystem. Through tools for AI-driven research, portfolio analytics, quantitative modelling, and collaborative investment research, Ezana helps individuals and investment teams uncover relationships, evaluate opportunities, and make more informed financial decisions.',
  /** Home page and the default social description. */
  short:
    'Ezana Finance is an AI-powered financial intelligence platform for market research, portfolio analytics, quantitative modelling, and investment intelligence.',
  homeTitle: 'Ezana Finance | AI-Powered Financial Intelligence & Research',
  sonar: {
    name: 'Ezana Sonar',
    title: 'Ezana Sonar | AI Financial Research & Market Intelligence',
    description:
      'Investigate companies, markets, institutions, and economic trends with Ezana Sonar, an AI-powered financial research assistant connecting evidence across data sources.',
    about:
      'Ezana Sonar is an AI-powered financial research assistant that connects market, corporate, institutional, economic, and government data to investigate complex questions, evaluate evidence, and deliver structured research with its sources.',
  },
  echo: {
    name: 'Ezana Echo',
    title: 'Ezana Echo | Financial Research, Markets & Economic Analysis',
    description:
      "Ezana Echo is Ezana Finance's editorial research publication, covering global markets, economic trends, corporate strategy, technology, and the future of finance.",
    about:
      'Ezana Echo is the financial research and editorial publication of Ezana Finance, exploring global markets, economic trends, corporate strategy, emerging technologies, and the institutions shaping the future of finance. Through investigative analysis and evidence-driven commentary, Echo connects financial developments with the broader economic, political, and technological forces behind them.',
  },
  quant: {
    name: 'Ezana Quant Lab',
    title: 'Ezana Quant Lab | Quantitative Research, Models & Backtesting',
    description:
      'Ezana Quant Lab is the quantitative research environment of Ezana Finance: a model library, strategy building, factor and risk research, and backtesting on historical market data.',
    about:
      'Ezana Quant Lab is the quantitative research environment: a library of documented models, a strategy builder, factor, risk and statistical-arbitrage research, and a backtesting engine that runs strategies on historical prices with costs and its assumptions reported.',
  },
  organizations: {
    name: 'Ezana Organizations',
    about:
      'Ezana Organizations is the collaborative research and portfolio-management workspace for investment councils and student-managed investment funds: a team hub, shared research and pitches, an organization portfolio with trading workflows, and competitions.',
  },
  community: {
    name: 'Ezana Community',
    about:
      'Ezana Community is where investors and researchers share ideas, follow one another, message, and compare results on leaderboards.',
  },
  datasets: {
    title: 'Ezana Datasets | Public Market, Government & Economic Data',
    description:
      'The public datasets behind Ezana Sonar, each sourced and attributed: congressional trades, federal contracts and lobbying, SEC and 13F filings, insider activity, prediction markets and global macroeconomic data.',
  },
};

export const SOCIAL_PROFILES = {
  x: 'https://x.com/EzanaWorld',
  linkedin: 'https://www.linkedin.com/company/119054217/',
  instagram: 'https://www.instagram.com/ezanafinance/',
  facebook: null,
  youtube: null,
  crunchbase: null,
};

const sameAs = () => Object.values(SOCIAL_PROFILES).filter(Boolean);

/**
 * The founder, for /about/noah-asheber and for the Organization's `founder`.
 *
 * Every sentence on the founder page and every field in its structured data
 * is built from this object, and search engines repeat it as written. State
 * only what is true and checkable: no superlatives. A value left null is
 * omitted from the page and from the structured data.
 */
export const FOUNDER_PATH = '/about/noah-asheber';

export const FOUNDER = {
  name: 'Noah Asheber',
  givenName: 'Noah',
  familyName: 'Asheber',
  jobTitle: 'Founder and CEO',
  city: 'Montreal',
  region: 'Quebec',
  country: 'CA',
  description:
    'Noah Asheber is the founder and CEO of Ezana Finance. He dropped out of McMaster University, built his own quantitative trading strategies, then built Ezana Finance as education technology for university investment councils. He is based in Montreal, Quebec.',
  /* Where he studied. He left before graduating: the page says "dropped out",
     and the structured data lists the school under alumniOf (schema.org has
     no separate field for attended without a degree). null = omitted. */
  education: {
    school: 'McMaster University',
    city: 'Hamilton',
    region: 'Ontario',
    url: 'https://www.mcmaster.ca/',
  },
  knowsAbout: ['Quantitative trading', 'Investment research', 'Education technology'],
  // Noah's own public profiles. null = omitted.
  profiles: {
    linkedin: null,
    x: null,
    github: null,
    website: null,
  },
  parent: {
    name: 'Asheber Sewalem',
    jobTitle: 'Statistical Geneticist',
    field: 'dairy cattle genetics',
    employer: 'ABS Global',
    employerCity: 'DeForest',
    employerRegion: 'Wisconsin',
    employerCountry: 'US',
    /* Earlier career in Canada. `years: null` drops the duration and the
       sentence reads "He was previously a research scientist with ...". */
    previous: {
      role: 'research scientist',
      employer: 'Agriculture and Agri-Food Canada',
      city: 'Guelph',
      region: 'Ontario',
      focus: 'the national genetic evaluations of Canadian dairy breeds',
      years: null,
    },
    /* `count: null` drops the number; an empty `journals` drops the list. */
    papers: {
      count: 40,
      journals: ['the Journal of Dairy Science', 'Genetics'],
    },
    // His public professional profiles. null = omitted.
    profiles: {
      linkedin: 'https://www.linkedin.com/in/asheber-sewalem-4820a6178/',
      researchGate: 'https://www.researchgate.net/profile/Asheber-Sewalem',
      googleScholar: null,
      orcid: null,
    },
  },
};

const compact = (obj) => Object.values(obj).filter(Boolean);

/** The founder's own story, as plain sentences. Shared by the page and the structured data. */
export function founderStorySentences() {
  const school = FOUNDER.education?.school;
  return [
    school
      ? `${FOUNDER.name} dropped out of ${school} before building his own quantitative trading strategies.`
      : `${FOUNDER.name} began by building his own quantitative trading strategies.`,
    'He then built Ezana Finance as education technology for university investment councils.',
  ];
}

/** The founder's father, as plain sentences. Shared by the page and the structured data. */
export function founderParentSentences() {
  const p = FOUNDER.parent;
  const prev = p.previous;
  const where = `${prev.employer} in ${prev.city}, ${prev.region}`;
  const sentences = [
    `${p.name} is a ${p.jobTitle.toLowerCase()} specialising in ${p.field}.`,
    prev.years
      ? `He spent ${prev.years} years as a ${prev.role} with ${where}, working on ${prev.focus}.`
      : `He was previously a ${prev.role} with ${where}, working on ${prev.focus}.`,
  ];
  const journals = p.papers.journals.length
    ? ` in journals including ${p.papers.journals.join(' and ')}`
    : '';
  if (p.papers.count) {
    sentences.push(`He has authored more than ${p.papers.count} peer-reviewed papers${journals}.`);
  } else if (journals) {
    sentences.push(`He has published${journals}.`);
  }
  sentences.push(
    `He now works in the private sector at ${p.employer} in ${p.employerCity}, ${p.employerRegion}.`,
  );
  return sentences;
}

/** ProfilePage + Person structured data, for the founder page only. */
export function founderJsonLd() {
  const pageUrl = `${SITE_URL}${FOUNDER_PATH}`;
  const personId = `${pageUrl}#person`;
  const parentId = `${pageUrl}#asheber-sewalem`;
  const p = FOUNDER.parent;

  const parent = {
    '@type': 'Person',
    '@id': parentId,
    name: p.name,
    jobTitle: p.jobTitle,
    description: founderParentSentences().join(' '),
    knowsAbout: ['Quantitative genetics', 'Dairy cattle genetics', 'Animal breeding'],
    worksFor: {
      '@type': 'Organization',
      name: p.employer,
      address: {
        '@type': 'PostalAddress',
        addressLocality: p.employerCity,
        addressRegion: p.employerRegion,
        addressCountry: p.employerCountry,
      },
    },
    children: { '@id': personId },
  };
  const parentLinks = compact(p.profiles);
  if (parentLinks.length) parent.sameAs = parentLinks;

  const person = {
    '@type': 'Person',
    '@id': personId,
    name: FOUNDER.name,
    givenName: FOUNDER.givenName,
    familyName: FOUNDER.familyName,
    jobTitle: FOUNDER.jobTitle,
    description: FOUNDER.description,
    url: pageUrl,
    worksFor: { '@id': `${SITE_URL}/#organization` },
    knowsAbout: FOUNDER.knowsAbout,
    homeLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: FOUNDER.city,
        addressRegion: FOUNDER.region,
        addressCountry: FOUNDER.country,
      },
    },
    parent: { '@id': parentId },
  };
  if (FOUNDER.education) {
    person.alumniOf = {
      '@type': 'CollegeOrUniversity',
      name: FOUNDER.education.school,
      url: FOUNDER.education.url,
      address: {
        '@type': 'PostalAddress',
        addressLocality: FOUNDER.education.city,
        addressRegion: FOUNDER.education.region,
        addressCountry: 'CA',
      },
    };
  }
  const links = compact(FOUNDER.profiles);
  if (links.length) person.sameAs = links;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': pageUrl,
        url: pageUrl,
        name: `${FOUNDER.name}, ${FOUNDER.jobTitle} of Ezana Finance`,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': personId },
        mainEntity: { '@id': personId },
        inLanguage: 'en',
      },
      person,
      parent,
    ],
  };
}

/**
 * Organization + WebSite structured data for every page. The WebSite `name`
 * is what Google shows as the site name above each result, and the
 * Organization ties the name "Ezana" to this domain and its profiles.
 */
export function brandJsonLd() {
  const org = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Ezana Finance',
    legalName: BRAND.legalName,
    alternateName: ['Ezana', 'ezana.world'],
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}${BRAND.logo}`, width: 1024, height: 1024 },
    description: BRAND.description,
    /* What the company does, as topics (not claims about results). */
    knowsAbout: [
      'Financial intelligence',
      'Investment research',
      'Portfolio analytics',
      'Quantitative analysis',
      'Macroeconomic research',
      'Institutional ownership (13F) data',
      'Congressional trading disclosures',
      'Government contracts and lobbying data',
    ],
    founder: { '@type': 'Person', '@id': `${SITE_URL}${FOUNDER_PATH}#person`, name: FOUNDER.name },
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
