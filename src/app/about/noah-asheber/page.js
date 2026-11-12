import Link from 'next/link';
import {
  BRAND,
  FOUNDER,
  FOUNDER_PATH,
  SITE_URL,
  founderJsonLd,
  founderParentSentences,
  founderStorySentences,
} from '@/lib/brand';
import '../../legal-pages.css';

/* Public founder profile. Every fact comes from FOUNDER in src/lib/brand.js,
   which also feeds the structured data, so the visible page and the markup
   can never disagree. Static: no auth, no per-request data. */

const TITLE = `${FOUNDER.name}, ${FOUNDER.jobTitle} of Ezana Finance`;
const URL = `${SITE_URL}${FOUNDER_PATH}`;

export const metadata = {
  title: `${TITLE} | Ezana Finance`,
  description: FOUNDER.description,
  alternates: { canonical: URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'profile',
    title: TITLE,
    description: FOUNDER.description,
    url: URL,
    siteName: BRAND.name,
    firstName: FOUNDER.givenName,
    lastName: FOUNDER.familyName,
  },
  twitter: { card: 'summary', title: TITLE, description: FOUNDER.description },
};

const PROFILE_LABELS = {
  linkedin: 'LinkedIn',
  x: 'X',
  github: 'GitHub',
  website: 'Personal website',
};

export default function FounderPage() {
  const profiles = Object.entries(FOUNDER.profiles).filter(([, url]) => Boolean(url));
  return (
    <div className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(founderJsonLd()).replace(/</g, '\\u003c'),
        }}
      />
      <main className="legal-container">
        <p className="legal-eyebrow">About</p>
        <h1 className="legal-title">{FOUNDER.name}</h1>
        <p className="legal-meta">{FOUNDER.jobTitle}, Ezana Finance</p>
        <p className="legal-lede">
          {FOUNDER.name} is the founder and CEO of <Link href="/">Ezana Finance</Link>. He is based
          in {FOUNDER.city}, {FOUNDER.region}.
        </p>

        <hr className="legal-divider" />

        <Section title="Background">
          <p>{founderStorySentences().join(' ')}</p>
        </Section>

        <Section title="Ezana Finance">
          <p>
            {BRAND.legalName} serves university student-managed investment funds and individual
            investors. The platform turns public filings into market intelligence, including
            congressional trades, insider and institutional holdings, government contracts and
            lobbying records.
          </p>
        </Section>

        <Section title="Family">
          <p>
            Noah is the son of {FOUNDER.parent.name}. {founderParentSentences().join(' ')}
          </p>
        </Section>

        {profiles.length > 0 && (
          <Section title="Elsewhere">
            <ul>
              {profiles.map(([key, url]) => (
                <li key={key}>
                  <a href={url} rel="me noopener noreferrer" target="_blank">
                    {PROFILE_LABELS[key] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
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
