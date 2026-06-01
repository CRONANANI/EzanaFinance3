'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LandingHero } from '@/components/landing/LandingHero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { ResourcesSection } from '@/components/landing/ResourcesSection';
import { Faq1 } from '@/components/ui/faq1';
import { FooterSection } from '@/components/ui/footer-section';
import { CookieConsentBanner } from '@/components/landing/CookieConsentBanner';
import { AnalyticsGate } from '@/components/landing/AnalyticsGate';
import { LandingErrorBoundary } from '@/components/landing/LandingErrorBoundary';
import { FooterClickDebug } from '@/components/landing/footer-click-debug';
import { TrustedLogos } from '@/components/TrustedLogos';
import { BrokerageLogos } from '@/components/BrokerageLogos';

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

      <LandingErrorBoundary name="TrustedLogos">
        <TrustedLogos />
      </LandingErrorBoundary>

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
      <FooterClickDebug />
    </div>
  );
}
