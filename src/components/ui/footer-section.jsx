'use client';

import Link from 'next/link';
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { NewsletterSignup } from '@/components/landing/NewsletterSignup';
import './footer-section.css';

export function FooterSection({ onContactClick }) {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Link href="/" className="landing-footer-brand-logo">
              <span className="landing-footer-wordmark">Ezana</span>
              <EzanaNavLogo width={40} height={34} priority={false} />
            </Link>
            <h3>Stay connected</h3>
            <p>Join our newsletter for product updates, market insights, and platform news.</p>
            <NewsletterSignup source="landing_footer" />
          </div>

          <div className="landing-footer-col">
            <h4>Product</h4>
            <nav className="landing-footer-links" aria-label="Product">
              <a href="#heroSection">Home</a>
              <a href="#features">Features</a>
              <a href="/pricing">Pricing</a>
              <a href="#faq">FAQ</a>
              <a href="/help-center">Help Center</a>
              <button
                type="button"
                className="landing-footer-link-btn"
                data-support-trigger
                onClick={(e) => {
                  if (onContactClick) {
                    e.preventDefault();
                    onContactClick();
                  }
                }}
              >
                Contact
              </button>
            </nav>
          </div>

          <div className="landing-footer-col">
            <h4>Connect</h4>
            <div className="landing-footer-socials">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-social"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/EzanaWorld"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-social"
                aria-label="X (Twitter)"
              >
                <i className="bi bi-twitter-x" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-social"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-social"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="landing-footer-bar">
          <p className="landing-footer-copy">
            © {new Date().getFullYear()} Ezana Finance. All rights reserved.
          </p>
          <nav className="landing-footer-legal" aria-label="Legal">
            <a href="/help-center">Help Center</a>
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-of-service">Terms of Service</a>
            <a href="/accessibility">Accessibility</a>
            <button
              type="button"
              className="landing-footer-link-btn"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('ezana:open-cookie-settings'));
                }
              }}
            >
              Cookie Settings
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
