"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LandingHero } from '@/components/landing/LandingHero';

const TrustedLogos = dynamic(
  () => import('@/components/TrustedLogos').then((m) => ({ default: m.TrustedLogos })),
  { loading: () => null }
);
const FeaturesSection = dynamic(
  () => import('@/components/landing/FeaturesSection').then((m) => ({ default: m.FeaturesSection })),
  { loading: () => null }
);
const ResourcesSection = dynamic(
  () => import('@/components/landing/ResourcesSection').then((m) => ({ default: m.ResourcesSection })),
  { loading: () => null }
);
const Faq1 = dynamic(
  () => import('@/components/ui/faq1').then((m) => ({ default: m.Faq1 })),
  { loading: () => null }
);
const FooterSection = dynamic(
  () => import('@/components/ui/footer-section').then((m) => ({ default: m.FooterSection })),
  { loading: () => null }
);
const ContactSupportDialog = dynamic(
  () => import('@/components/ui/contact-support-dialog').then((m) => ({ default: m.ContactSupportDialog })),
  { loading: () => null }
);

export default function HomePage() {
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    document.body.classList.remove('light-mode');
    document.documentElement.classList.remove('light-mode');
  }, []);

  return (
    <div className="landing-page">
      <main className="main-content hero-section" id="heroSection">
        <LandingHero />
      </main>

      <TrustedLogos />

      <div id="features-section-container">
        <FeaturesSection />
      </div>

      <ResourcesSection />

      <section id="faq" className="faq-section-wrapper">
        <Faq1 heading="FAQ" onContactClick={() => setSupportOpen(true)} />
      </section>

      <FooterSection onContactClick={() => setSupportOpen(true)} />
      <ContactSupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}
