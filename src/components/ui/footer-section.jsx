'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Send } from 'lucide-react';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import './footer-section.css';

export function FooterSection({ onContactClick }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email || status === 'submitting') return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, step: 'email' }),
      });
      setStatus(res.ok ? 'done' : 'error');
      if (res.ok) setEmail('');
    } catch {
      setStatus('error');
    }
  };

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
            <form className="landing-footer-newsletter" onSubmit={handleNewsletterSubmit}>
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="landing-footer-send"
                aria-label="Subscribe"
                disabled={status === 'submitting'}
              >
                <Send className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
            {status === 'done' && (
              <p className="landing-footer-newsletter-msg">Thanks — check your inbox to confirm.</p>
            )}
            {status === 'error' && (
              <p className="landing-footer-newsletter-msg landing-footer-newsletter-msg--err">
                Something went wrong. Try again.
              </p>
            )}
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
