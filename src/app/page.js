import Link from 'next/link';
import '../../app/pages/landing.css';
import '../../app/components/landing/features-section.css';
import '../../app/components/landing/faq-section.css';
import { LandingHero } from '@/components/landing/LandingHero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { FAQSection } from '@/components/landing/FAQSection';

export default function HomePage() {
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

      <section id="faq" className="faq-section-wrapper">
        <FAQSection />
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} Ezana Finance. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
