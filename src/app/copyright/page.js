import Link from 'next/link';
import { DMCA_FALLBACK_EMAIL, dmcaAgent } from '@/lib/legal/dmca';
import '../legal-pages.css';

export const metadata = {
  title: 'Copyright and DMCA Policy | Ezana Finance',
  description:
    'How to report copyright infringement on Ezana Finance, the counter-notice process and our repeat-infringer policy.',
};

/* Env is read per request so setting the agent in Vercel needs no code change. */
export const dynamic = 'force-dynamic';

const LAST_UPDATED = 'October 7, 2026';

export default function CopyrightPage() {
  const agent = dmcaAgent();
  return (
    <div className="legal-page">
      <main className="legal-container">
        <p className="legal-eyebrow">Legal</p>
        <h1 className="legal-title">Copyright and DMCA policy</h1>
        <p className="legal-meta">Last updated: {LAST_UPDATED}</p>
        <p className="legal-lede">
          Ezana Finance respects copyright and expects its members to do the same. Members can
          upload images, avatars and documents and post in the community. If you believe something
          on Ezana infringes a copyright you own or are authorized to act for, tell us as described
          below and we will act on it promptly.
        </p>

        <hr className="legal-divider" />

        <Section title="1. Our designated copyright agent">
          {agent ? (
            <address className="legal-address">
              {agent.name}
              <br />
              Ezana Finance
              <br />
              {agent.address}
              <br />
              Email: <a href={`mailto:${agent.email}`}>{agent.email}</a>
              <br />
              Phone: {agent.phone}
            </address>
          ) : (
            <p>
              Send copyright notices to{' '}
              <a href={`mailto:${DMCA_FALLBACK_EMAIL}`}>{DMCA_FALLBACK_EMAIL}</a>.
            </p>
          )}
          <p>
            This contact is for copyright notices only. For anything else, use the{' '}
            <Link href="/help-center">Help Center</Link>.
          </p>
        </Section>

        <Section title="2. How to send a takedown notice">
          <p>Your notice must be in writing and include all of the following:</p>
          <ul>
            <li>
              Your physical or electronic signature, as the copyright owner or as a person
              authorized to act for the owner.
            </li>
            <li>
              Identification of the copyrighted work you say is infringed (or, for several works, a
              representative list).
            </li>
            <li>
              Identification of the material you say is infringing and where it is on Ezana, with
              the URL of each item so we can find it.
            </li>
            <li>Your name, postal address, telephone number and email address.</li>
            <li>
              A statement that you have a good-faith belief that the use is not authorized by the
              copyright owner, its agent or the law.
            </li>
            <li>
              A statement that the information in your notice is accurate and, under penalty of
              perjury, that you are the owner or authorized to act for the owner.
            </li>
          </ul>
          <p>
            A notice missing any of these may not be valid. Knowingly misrepresenting that material
            is infringing can make you liable for damages.
          </p>
        </Section>

        <Section title="3. What we do when we receive a valid notice">
          <ul>
            <li>We remove or disable access to the material.</li>
            <li>
              We tell the member who posted it that it was removed, why, and how to send a
              counter-notice.
            </li>
            <li>We keep a record of the notice for our repeat-infringer policy.</li>
          </ul>
        </Section>

        <Section title="4. Counter-notices">
          <p>
            If your material was removed and you believe it was a mistake or a misidentification, or
            that you have the right to post it, you can send a counter-notice to the same contact.
            It must include:
          </p>
          <ul>
            <li>Your physical or electronic signature.</li>
            <li>Identification of the material that was removed and where it appeared before.</li>
            <li>
              A statement, under penalty of perjury, that you have a good-faith belief the material
              was removed by mistake or misidentification.
            </li>
            <li>Your name, postal address and telephone number.</li>
            <li>
              A statement that you consent to the jurisdiction of the federal district court for
              your address (or, if you are outside the United States, any judicial district in which
              Ezana may be found), and that you will accept service of process from the person who
              sent the original notice or their agent.
            </li>
          </ul>
          <p>
            We send a valid counter-notice to the person who sent the original notice. Unless they
            tell us within 10 to 14 business days that they have filed a court action, we may
            restore the material.
          </p>
        </Section>

        <Section title="5. Repeat infringers">
          <p>
            We close the accounts of members who are the subject of repeated valid copyright
            notices. We may also close an account after a single notice where the infringement is
            clear or serious.
          </p>
        </Section>

        <Section title="6. Related terms">
          <p>
            This policy is part of our <Link href="/terms-of-service">Terms of Service</Link>. How
            we handle personal information in notices is described in our{' '}
            <Link href="/privacy-policy">Privacy Policy</Link>.
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
