'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LandingHero } from '@/components/landing/LandingHero';
import { CookieConsentBanner } from '@/components/landing/CookieConsentBanner';
import { AnalyticsGate } from '@/components/landing/AnalyticsGate';
import { LandingErrorBoundary } from '@/components/landing/LandingErrorBoundary';
import { BrokerageLogos } from '@/components/BrokerageLogos';

// A tiny shared skeleton so the layout doesn't jump while a below-the-fold
// section hydrates (reserve the section's approximate height).
const sectionFallback = (minHeight) =>
  function Fallback() {
    return <div aria-hidden style={{ minHeight, width: '100%' }} />;
  };

// Below-the-fold sections code-split into their own chunks and hydrate after
// the hero. Kept SSR (ssr: true) so their content still renders for SEO.
const FeaturesSection = dynamic(
  () =>
    import('@/components/landing/FeaturesSection').then((m) => ({
      default: m.FeaturesSection,
    })),
  { loading: sectionFallback('520px') },
);
const ResourcesSection = dynamic(
  () =>
    import('@/components/landing/ResourcesSection').then((m) => ({
      default: m.ResourcesSection,
    })),
  { loading: sectionFallback('600px') },
);
const Faq1 = dynamic(() => import('@/components/ui/faq1').then((m) => ({ default: m.Faq1 })), {
  loading: sectionFallback('400px'),
});
const FooterSection = dynamic(
  () =>
    import('@/components/ui/footer-section').then((m) => ({
      default: m.FooterSection,
    })),
  { loading: sectionFallback('300px') },
);

const ContactSupportDialog = dynamic(
  () =>
    import('@/components/ui/contact-support-dialog').then((m) => ({
      default: m.ContactSupportDialog,
    })),
  { ssr: false, loading: () => null },
);

export default function HomePage() {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <div className="landing-page">
      <main className="main-content hero-section" id="heroSection">
        <LandingHero />
      </main>

      <LandingErrorBoundary name="BrokerageLogos">
        <BrokerageLogos />
      </LandingErrorBoundary>

      <LandingErrorBoundary name="FeaturesSection">
        <div id="features-section-container">
          <FeaturesSection />
        </div>
      </LandingErrorBoundary>

      <LandingErrorBoundary name="ResourcesSection">
        <ResourcesSection />
      </LandingErrorBoundary>

      <LandingErrorBoundary name="Faq1">
        <section id="faq" className="faq-section-wrapper">
          <Faq1 heading="FAQ" onContactClick={() => setSupportOpen(true)} />
        </section>
      </LandingErrorBoundary>

      <LandingErrorBoundary name="FooterSection">
        <FooterSection onContactClick={() => setSupportOpen(true)} />
      </LandingErrorBoundary>

      <ContactSupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
      <CookieConsentBanner />
      <AnalyticsGate />
    </div>
  );
}
