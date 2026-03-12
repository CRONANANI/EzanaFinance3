"use client";

import { useState } from 'react';
import Link from 'next/link';
import { LandingHero } from '@/components/landing/LandingHero';
import { TestimonialsHero } from '@/components/landing/TestimonialsHero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { ResourcesSection } from '@/components/landing/ResourcesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { Faq1 } from '@/components/ui/faq1';
import { FooterSection } from '@/components/ui/footer-section';
import { ContactSupportDialog } from '@/components/ui/contact-support-dialog';

export default function HomePage() {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <div className="landing-page">
      <div className="background-elements">
        <div className="glow-circle" />
        <div className="glow-circle" />
        <div className="glow-circle" />
      </div>

      <main className="main-content hero-section" id="heroSection">
        <LandingHero />
      </main>

      <TestimonialsHero />

      <div id="features-section-container">
        <FeaturesSection />
      </div>

      <ResourcesSection />

      <PricingSection />

      <section id="faq" className="faq-section-wrapper">
        <Faq1 heading="FAQ" onContactClick={() => setSupportOpen(true)} />
      </section>

      <FooterSection onContactClick={() => setSupportOpen(true)} />
      <ContactSupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}
