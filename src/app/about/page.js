import Link from 'next/link';
import { BRAND, BRAND_COPY, FOUNDER, FOUNDER_PATH, SITE_URL } from '@/lib/brand';
import '../legal-pages.css';

/* About Ezana Finance (Nov 23, 2026): the authoritative description of the company and how
   its products connect, for readers and for search engines. Static and server-rendered;
   every product described here is live (copy in BRAND_COPY, src/lib/brand.js). No dates,
   counts, partners or claims that are not on the site itself. */

const URL = `${SITE_URL}/about`;
const TITLE = 'About Ezana Finance | AI-Powered Financial Intelligence & Research';
const DESCRIPTION =
  'What Ezana Finance is, the research problem it addresses, and how Ezana Sonar, Ezana Echo, Quant Lab, Organizations and Community fit together in one financial intelligence platform.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    url: URL,
    siteName: BRAND.name,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og/ezana-share.png', width: 1200, height: 630, alt: 'Ezana Finance' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${URL}#page`,
  url: URL,
  name: TITLE,
  description: DESCRIPTION,
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#organization` },
  mainEntity: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en',
};

const PRODUCTS = [
  {
    name: BRAND_COPY.sonar.name,
    href: '/datasets',
    cta: 'Try Ezana Sonar',
    text: BRAND_COPY.sonar.about,
  },
  {
    name: BRAND_COPY.echo.name,
    href: '/ezana-echo',
    cta: 'Read Ezana Echo',
    text: BRAND_COPY.echo.about,
  },
  {
    name: BRAND_COPY.quant.name,
    href: '/#quant',
    cta: 'See Quant Lab',
    text: BRAND_COPY.quant.about,
  },
  {
    name: BRAND_COPY.organizations.name,
    href: '/pricing',
    cta: 'Plans for teams',
    text: BRAND_COPY.organizations.about,
  },
  {
    name: BRAND_COPY.community.name,
    href: '/#social',
    cta: 'See Community',
    text: BRAND_COPY.community.about,
  },
];

const DATA = [
  ['Congressional trading disclosures', '/datasets/politician-tracker'],
  ['Federal contracts and lobbying', '/datasets/government'],
  ['Insider activity', '/datasets/insider'],
  ['ETF holdings', '/datasets/etf-holdings'],
  ['Prediction markets', '/datasets/prediction-markets'],
  ['Global macroeconomic data', '/datasets/oecd-macro'],
];

export default function AboutPage() {
  return (
    <div className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c') }}
      />
      <main className="legal-container">
        <p className="legal-eyebrow">About</p>
        <h1 className="legal-title">Ezana Finance</h1>
        <p className="legal-meta">AI-powered financial intelligence and investment research</p>
        <p className="legal-lede">{BRAND_COPY.long}</p>

        <hr className="legal-divider" />

        <Section title="The problem we work on">
          <p>
            The information behind an investment decision is scattered. Prices sit in one place,
            company financials in another, institutional filings, congressional disclosures, federal
            contracts and economic releases in others, each with its own format and reporting delay.
            Connecting them by hand is slow, and the relationships between them (a company&apos;s
            contracts and its lobbying, a fund&apos;s holdings and a member of Congress&apos;s
            trades, a policy and the sector it moves) are where much of the useful research is.
          </p>
          <p>
            Ezana brings those sources into one platform, keeps each one attributed, and gives
            people tools to investigate the connections: ask a question, run an analysis, test a
            strategy, read the reporting, and work on it with a team.
          </p>
        </Section>

        <Section title="One platform, connected products">
          {PRODUCTS.map((p) => (
            <div key={p.name} className="legal-subsection">
              <h3>{p.name}</h3>
              <p>
                {p.text} <Link href={p.href}>{p.cta}</Link>.
              </p>
            </div>
          ))}
          <p>
            Around them sit the everyday research tools: portfolio management and analytics, company
            research, market analysis, a research library for saved work, the Learning Center, and
            mock trading for practising without real money. They share one account and one set of
            data.
          </p>
        </Section>

        <Section title="The data it connects">
          <p>Every dataset is sourced and attributed. Examples of what Ezana connects include:</p>
          <ul>
            <li>Market prices and company fundamentals from SEC filings</li>
            <li>Institutional holdings from Form 13F filings</li>
            {DATA.map(([label, href]) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
          <p>
            Browse them all on the <Link href="/datasets">datasets overview</Link>.
          </p>
        </Section>

        <Section title="Who it is for">
          <ul>
            <li>
              Individual investors who want institutional-grade research tools for their own
              portfolio.
            </li>
            <li>
              Investment teams, including university investment councils and student-managed
              investment funds, who research, pitch and manage a portfolio together.
            </li>
            <li>
              Readers who follow markets, the economy and the institutions behind them through Ezana
              Echo.
            </li>
          </ul>
        </Section>

        <Section title="How we approach research">
          <p>
            Evidence first. Sonar answers with the sources it used; analyses run as deterministic
            calculations on stored data, with their assumptions and coverage stated; and the limits
            of each source are said plainly. Congressional disclosures, for example, report value
            ranges and arrive weeks after a trade, and 13F filings are quarterly snapshots, so Ezana
            never presents them as real-time or exact.
          </p>
          <p>
            Ezana is a research and education platform, not an investment adviser. Nothing on it is
            investment advice.
          </p>
        </Section>

        <Section title="The company">
          <p>
            Ezana is built by {BRAND.legalName}. It was founded by{' '}
            <Link href={FOUNDER_PATH}>{FOUNDER.name}</Link>, its {FOUNDER.jobTitle.toLowerCase()}.
            Questions are answered in the <Link href="/help-center">Help Center</Link>, and plans
            are on the <Link href="/pricing">pricing page</Link>.
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
