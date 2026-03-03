"use client";

import { useState } from 'react';
import Link from 'next/link';
import '../../app/pages/landing.css';
import '../../app/components/landing/features-section.css';
import { LandingHero } from '@/components/landing/LandingHero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingModule } from '@/components/ui/pricing-module';
import { Faq1 } from '@/components/ui/faq1';
import { FooterSection } from '@/components/ui/footer-section';
import { ContactSupportDialog } from '@/components/ui/contact-support-dialog';

export default function HomePage() {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
      <div className="background-elements">
        <div className="glow-circle" />
        <div className="glow-circle" />
        <div className="glow-circle" />
      </div>

      <main className="main-content hero-section" id="heroSection">
        <LandingHero />
      </main>

      <div id="features-section-container">
        <FeaturesSection />
      </div>

      <section id="pricing">
        <PricingModule
          title="Simple, Transparent Pricing"
          subtitle="Choose the plan that fits your investment strategy."
          annualBillingLabel="Pay annually and save 20%"
          buttonLabel="Get started"
        />
      </section>

      <section id="faq" className="faq-section-wrapper">
        <Faq1 heading="Frequently asked questions" onContactClick={() => setSupportOpen(true)} />
      </section>

      <FooterSection onContactClick={() => setSupportOpen(true)} />
      <ContactSupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </>
  );
}
