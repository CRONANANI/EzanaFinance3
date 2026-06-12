import Link from 'next/link';
import '../legal-pages.css';

export const metadata = {
  title: 'Terms of Service | Ezana Finance',
  description:
    'The terms and conditions that govern your access to and use of the Ezana Finance platform.',
};

const LAST_UPDATED = 'June 12, 2026';

export default function TermsOfServicePage() {
  return (
    <div className="legal-page">
      <main className="legal-container">
        <p className="legal-eyebrow">Legal</p>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-meta">Last updated: {LAST_UPDATED}</p>
        <p className="legal-lede">
          These Terms of Service (&quot;Terms&quot;) form a binding agreement between you and Ezana
          Finance (&quot;Ezana,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) and govern
          your access to and use of the Ezana website, applications, and services (together, the
          &quot;Services&quot;). Please read them carefully. By creating an account or using the
          Services, you agree to these Terms.
        </p>

        <hr className="legal-divider" />

        <Section title="1. Acceptance of these Terms">
          <p>
            By accessing or using the Services, you confirm that you have read, understood, and agree
            to be bound by these Terms and by our{' '}
            <Link href="/privacy-policy">Privacy Policy</Link>, which is incorporated here by
            reference. If you do not agree, you may not use the Services. If you are using the
            Services on behalf of an organization, you represent that you are authorized to bind that
            organization to these Terms.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 18 years old (or the age of majority in your jurisdiction) and
            capable of forming a binding contract to use the Services. The Services are intended for
            individual investors and educational use, and are not offered where prohibited by law.
          </p>
        </Section>

        <Section title="3. Your account">
          <p>
            You are responsible for the information you provide, for keeping your login credentials
            confidential, and for all activity that occurs under your account. Notify us promptly at{' '}
            <a href="mailto:contact@ezana.world">contact@ezana.world</a> if you suspect any
            unauthorized use. We may suspend or terminate accounts that violate these Terms or that
            we reasonably believe pose a security or legal risk.
          </p>
        </Section>

        <Section title="4. Subscriptions, billing, and free trials">
          <ul>
            <li>
              Paid plans are billed in advance on a recurring basis (monthly or annually) through our
              payment processor. By subscribing, you authorize us to charge your payment method on
              each renewal until you cancel.
            </li>
            <li>
              Where a free trial is offered, your selected plan begins automatically at the end of
              the trial unless you cancel beforehand. We will tell you the trial length and renewal
              price at sign-up.
            </li>
            <li>
              Prices, taxes, and plan features may change; we will give reasonable notice of material
              changes, and changes take effect at your next billing cycle.
            </li>
          </ul>
        </Section>

        <Section title="5. Cancellation and refunds">
          <p>
            You may cancel at any time from your account settings. If you cancel during a free trial,
            you will not be charged. If you cancel during a paid period, you keep access until the end
            of that period, and we do not provide prorated refunds except where required by law. If
            you are charged in error, contact us within a reasonable time and we will work with you in
            good faith to resolve it.
          </p>
        </Section>

        <Section title="6. Acceptable use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the Services for any unlawful, fraudulent, or abusive purpose;</li>
            <li>
              Scrape, harvest, resell, or redistribute data or content from the Services except as
              expressly permitted;
            </li>
            <li>
              Reverse engineer, interfere with, overload, or attempt to gain unauthorized access to
              the Services or related systems;
            </li>
            <li>Misrepresent your identity or impersonate any person or entity; or</li>
            <li>Upload malicious code or content that infringes the rights of others.</li>
          </ul>
        </Section>

        <Section title="7. Not financial, investment, tax, or legal advice">
          <p>
            Ezana provides research, data, analytics, and educational tools to help you make your own
            decisions. <strong>Nothing on the Services constitutes financial, investment, tax, legal,
            or other professional advice</strong>, a recommendation, or a solicitation to buy or sell
            any security or asset. We are not a broker-dealer, investment adviser, or financial
            planner. Investing involves risk, including the possible loss of principal, and past
            performance does not guarantee future results. You are solely responsible for your
            decisions and should consult a licensed professional where appropriate.
          </p>
        </Section>

        <Section title="8. Market data and third-party sources">
          <p>
            The Services aggregate information from third-party data providers and public sources.
            Such data may be delayed, incomplete, or inaccurate, and is provided &quot;as is&quot;
            without warranty. We do not guarantee the accuracy, timeliness, or completeness of any
            data and are not liable for decisions made in reliance on it.
          </p>
        </Section>

        <Section title="9. Brokerage connections and paper trading">
          <p>
            Where you connect a brokerage account, connections are made through regulated, read-only
            aggregators; we can read positions and balances to power your analysis but cannot move
            money or place trades on your live account, and we do not store your brokerage
            credentials. Paper trading is simulated for educational purposes only and does not
            represent real orders, executions, or returns.
          </p>
        </Section>

        <Section title="10. Intellectual property">
          <p>
            The Services, including all software, text, design, logos, and content we provide, are
            owned by Ezana or our licensors and are protected by intellectual property laws. We grant
            you a limited, non-exclusive, non-transferable, revocable license to use the Services for
            your personal, non-commercial use in accordance with these Terms. All rights not expressly
            granted are reserved.
          </p>
        </Section>

        <Section title="11. Your content">
          <p>
            You retain ownership of content you submit (such as notes, watchlists, or feedback). You
            grant us a worldwide, royalty-free license to host, store, and use that content solely to
            operate and improve the Services. You are responsible for your content and represent that
            you have the rights to submit it.
          </p>
        </Section>

        <Section title="12. Privacy">
          <p>
            Our <Link href="/privacy-policy">Privacy Policy</Link> explains how we collect, use, and
            share personal information. By using the Services, you consent to those practices.
          </p>
        </Section>

        <Section title="13. Third-party services and links">
          <p>
            The Services may contain links to or integrations with third-party websites and services
            that we do not control. We are not responsible for their content, policies, or practices,
            and your use of them is governed by their own terms.
          </p>
        </Section>

        <Section title="14. Disclaimers">
          <p>
            The Services are provided &quot;as is&quot; and &quot;as available&quot; without
            warranties of any kind, whether express, implied, or statutory, including warranties of
            merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do
            not warrant that the Services will be uninterrupted, secure, or error-free.
          </p>
        </Section>

        <Section title="15. Limitation of liability">
          <p>
            To the maximum extent permitted by law, Ezana and its affiliates, officers, employees, and
            suppliers will not be liable for any indirect, incidental, special, consequential, or
            punitive damages, or for any loss of profits, data, or goodwill, arising out of or related
            to your use of the Services. Our total liability for any claim relating to the Services
            will not exceed the greater of the amount you paid us in the twelve months before the
            claim or USD $100. Some jurisdictions do not allow certain limitations, so some of the
            above may not apply to you.
          </p>
        </Section>

        <Section title="16. Indemnification">
          <p>
            You agree to indemnify and hold harmless Ezana from any claims, damages, liabilities, and
            expenses (including reasonable legal fees) arising from your misuse of the Services or your
            violation of these Terms or applicable law.
          </p>
        </Section>

        <Section title="17. Termination">
          <p>
            You may stop using the Services at any time. We may suspend or terminate your access if you
            breach these Terms, if required by law, or to protect the Services or other users. Upon
            termination, the rights granted to you will end, while provisions that by their nature
            should survive (such as intellectual property, disclaimers, and limitation of liability)
            will continue to apply.
          </p>
        </Section>

        <Section title="18. Changes to the Services and these Terms">
          <p>
            We may modify the Services or these Terms from time to time. When changes are material, we
            will provide reasonable notice, such as by posting the updated Terms with a new
            &quot;Last updated&quot; date or notifying you in the product. Your continued use of the
            Services after changes take effect constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="19. Governing law and dispute resolution">
          <p>
            These Terms are governed by the laws applicable where Ezana is established, without regard
            to conflict-of-laws principles. You agree to first attempt to resolve any dispute with us
            informally by contacting us. Any dispute that cannot be resolved informally will be
            subject to the exclusive jurisdiction of the competent courts in that location, except
            where applicable law provides otherwise.
          </p>
        </Section>

        <Section title="20. Contact us">
          <p>
            Questions about these Terms? Reach us at{' '}
            <a href="mailto:contact@ezana.world">contact@ezana.world</a>.
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
      <div className="legal-body">{children}</div>
    </section>
  );
}
