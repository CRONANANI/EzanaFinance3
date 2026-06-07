'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Facebook, Instagram, Linkedin, Send } from 'lucide-react';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import './footer-section.css';

export function FooterSection({ onContactClick }) {
  const router = useRouter();
  const footerRef = useRef(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  const go = (href) => (e) => {
    e.preventDefault();
    router.push(href);
  };

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const links = footer.querySelectorAll(
      '.landing-footer-legal a, .landing-footer-legal button, .landing-footer-links a',
    );
    const fixers = [];
    links.forEach((link) => {
      const r = link.getBoundingClientRect();
      if (r.width === 0) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      if (top && !link.contains(top) && top !== link) {
        let el = top;
        while (el && el !== document.body) {
          if (footer.contains(el)) break;
          const cs = getComputedStyle(el);
          if (cs.pointerEvents !== 'none') {
            el.dataset._footerClickFix = '1';
            const prev = el.style.pointerEvents;
            el.style.pointerEvents = 'none';
            fixers.push(() => {
              el.style.pointerEvents = prev;
            });
          }
          el = el.parentElement;
        }
      }
    });
    return () => fixers.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('debug') || params.get('debug') !== 'footer') return;
    window.debugFooterClicks = () => {
      const footer = footerRef.current;
      if (!footer) {
        console.log('Footer not mounted');
        return;
      }
      const links = footer.querySelectorAll(
        '.landing-footer-legal a, .landing-footer-legal button, .landing-footer-links a',
      );
      links.forEach((link) => {
        const r = link.getBoundingClientRect();
        if (r.width === 0) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const top = document.elementFromPoint(cx, cy);
        if (top && (link.contains(top) || top === link)) {
          console.log(`clickable ✓  ${link.textContent.trim()}`);
        } else {
          console.log(`BLOCKED ✗  ${link.textContent.trim()} — covered by:`, top);
        }
      });
    };
  }, []);

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
    <footer className="landing-footer" ref={footerRef}>
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
              <Link href="/pricing">Pricing</Link>
              <a href="#faq">FAQ</a>
              <Link href="/help-center">Help Center</Link>
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
            <Link href="/help-center" onClick={go('/help-center')}>
              Help Center
            </Link>
            <Link href="/privacy-policy" onClick={go('/privacy-policy')}>
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" onClick={go('/terms-of-service')}>
              Terms of Service
            </Link>
            <Link href="/accessibility" onClick={go('/accessibility')}>
              Accessibility
            </Link>
            <button
              type="button"
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
