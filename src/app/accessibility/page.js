import Link from 'next/link';

export const metadata = {
  title: 'Accessibility Statement | Ezana Finance',
  description:
    'Ezana Finance accessibility statement covering our commitments, conformance status, supported assistive technologies, and feedback channels.',
};

export default function AccessibilityPage() {
  return (
    <div className="accessibility-page min-h-screen bg-white text-neutral-800">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold uppercase tracking-tight mb-8">
          Accessibility Statement
        </h1>

        <p className="mb-8">
          This statement applies to the{' '}
          <a href="https://ezana.world/" className="text-emerald-700 underline">
            https://ezana.world/
          </a>{' '}
          website.
        </p>

        <Section title="Our Commitment">
          <p>
            Ezana Finance is committed to ensuring our services are accessible to people with
            disabilities. We aim to conform to <strong>WCAG 2.2 Level AA</strong> and the EU&apos;s{' '}
            <strong>EN 301 549 v3.2.1</strong> standard. This accessibility statement forms an
            integral part of our{' '}
            <Link href="/terms-of-service" className="text-emerald-700 underline">
              Terms of Service
            </Link>
            .
          </p>
        </Section>

        <Section title="Accessibility Features">
          <p className="mb-3">You should be able to:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Change colors, contrast levels, and fonts</li>
            <li>Zoom in up to 200% without loss of information or functionality</li>
            <li>Navigate the website with just a keyboard</li>
            <li>Listen to the website using a screen reader</li>
            <li>Use transcripts or closed captions with audio and video materials</li>
            <li>Download materials in alternative formats on request</li>
            <li>Stop moving images and animations</li>
          </ul>
          <p className="mt-3">
            Most of these are configurable in your account at{' '}
            <Link href="/settings#accessibility" className="text-emerald-700 underline">
              Settings → Accessibility
            </Link>
            .
          </p>
        </Section>

        <Section title="Conformance Status">
          <p>
            <strong>Status:</strong> Substantially conformant with WCAG 2.2 Level AA and EN 301 549
            v3.2.1.
          </p>
          <p className="mt-3">
            &quot;Substantially conformant&quot; means we meet the conformance criteria for most of
            our site, with documented exceptions for some interactive data-visualization components
            where we offer accessible alternatives.
          </p>
        </Section>

        <Section title="Preparation of This Statement">
          <p>
            This statement was prepared on{' '}
            {new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            and is reviewed quarterly or when we make significant service changes.
          </p>
          <p className="mt-3">
            We maintain records of accessibility feedback and our responses for regulatory
            compliance.
          </p>
        </Section>

        <Section title="How We Test">
          <p>We evaluate accessibility using:</p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li>Ongoing monitoring and regular accessibility reviews</li>
            <li>
              Self-assessment conducted in accordance with EAA (European Accessibility Act)
              requirements
            </li>
            <li>Automated audits (axe-core, Lighthouse) in our continuous integration pipeline</li>
            <li>Manual keyboard-only and screen-reader testing of new features before release</li>
          </ul>
        </Section>

        <Section title="Compatibility With Assistive Technology">
          <p>Our website is designed to be compatible with the following assistive technologies:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Alternative Input:</strong> alternative keyboards and on-screen keyboards
            </li>
            <li>
              <strong>Mobile Accessibility Features:</strong> AssistiveTouch (iOS), Live Transcribe
              (Android), Select to Speak (Android), and Guided Access (iOS)
            </li>
            <li>
              <strong>Motor Assistance:</strong> Sticky Keys, Filter Keys, and Mouse Keys
            </li>
            <li>
              <strong>Screen Magnification:</strong> Magnification (Android), Zoom (macOS/iOS),
              ZoomText (Windows), and Magnifier (Windows)
            </li>
            <li>
              <strong>Screen Readers:</strong> NVDA (Windows), VoiceOver (macOS/iOS), TalkBack
              (Android), and ORCA (Linux)
            </li>
            <li>
              <strong>Switch Access:</strong> Switch Access (Android), Switch Control (iOS)
            </li>
            <li>
              <strong>Voice Recognition &amp; Control:</strong> Windows Speech Recognition, Voice
              Control (macOS/iOS), and Dragon NaturallySpeaking (Windows/Mac)
            </li>
          </ul>
        </Section>

        <Section title="Feedback and Contact Information">
          <p>
            Please let us know if you experience accessibility barriers using our services or need
            information in an alternative format.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-3">
            <li>
              <strong>Email:</strong>{' '}
              <a
                href="mailto:contact@ezana.world?subject=Accessibility"
                className="text-emerald-700 underline"
              >
                contact@ezana.world
              </a>{' '}
              (mark subject line &quot;Accessibility&quot;)
            </li>
            <li>
              <strong>Help center:</strong>{' '}
              <Link href="/help-center" className="text-emerald-700 underline">
                https://ezana.world/help-center
              </Link>
            </li>
          </ul>
          <p className="mt-3">We respond to accessibility feedback within 2–5 business days.</p>
        </Section>

        <Section title="Enforcement">
          <p>
            If you&apos;re not satisfied with our response, you can contact the enforcement
            authority in your country:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-3">
            <li>
              Germany:{' '}
              <a
                href="https://www.bfit-bund.de/"
                className="text-emerald-700 underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                BFIT-Bund
              </a>
            </li>
            <li>
              France:{' '}
              <a
                href="https://www.defenseurdesdroits.fr/"
                className="text-emerald-700 underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Défenseur des droits
              </a>
            </li>
            <li>
              Ireland:{' '}
              <a
                href="https://nda.ie/"
                className="text-emerald-700 underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                National Disability Authority
              </a>
            </li>
            <li>
              Spain:{' '}
              <a
                href="https://oadis.mdsocialesa2030.gob.es/"
                className="text-emerald-700 underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                OADIS
              </a>
            </li>
            <li>
              Italy:{' '}
              <a
                href="https://www.agid.gov.it/"
                className="text-emerald-700 underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                AgID
              </a>
            </li>
          </ul>
          <p className="mt-3">
            For other EU countries, contact your national consumer protection authority.
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold uppercase tracking-tight mb-3">{title}</h2>
      <div className="text-base leading-relaxed">{children}</div>
    </section>
  );
}
