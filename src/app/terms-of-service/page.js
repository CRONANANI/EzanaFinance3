import '../legal-pages.css';

export const metadata = {
  title: 'Terms of Service | Ezana Finance',
};

export default function TermsOfServicePage() {
  return (
    <div className="legal-page">
      <main className="legal-container">
        <p className="legal-eyebrow">Legal</p>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-meta">The agreement that governs your use of Ezana Finance.</p>

        <hr className="legal-divider" />

        <section className="legal-section">
          <p>
            Our complete Terms of Service are being finalized ahead of the v1.0 launch. They will set
            out the rules for using Ezana Finance — including your account, acceptable use,
            subscriptions and billing, the boundaries of the research and analysis we provide, and the
            limits of our liability.
          </p>
          <p>
            Nothing on the platform is investment advice. Ezana provides research, data, and tools to
            help you make your own decisions; paper trading is simulated, and any connected brokerage
            is accessed on a read-only basis.
          </p>
          <p>
            Have a question in the meantime? Reach us at{' '}
            <a href="mailto:contact@ezana.world">contact@ezana.world</a> and we&apos;ll be glad to
            help.
          </p>
        </section>
      </main>
    </div>
  );
}
