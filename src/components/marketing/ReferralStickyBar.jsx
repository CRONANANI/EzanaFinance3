'use client';

import { useEffect, useState } from 'react';
import './referral-sticky-bar.css';

/* Landing-page referral bar, phones only (<768px, gated in CSS). It replaces
   the generic "Get started" bar on the landing page (the hero already carries
   that CTA): it appears once the hero has scrolled out of view, can be
   dismissed for the session, and routes through /auth/continue so a signed-out
   visitor signs up (and lands on their code) while a signed-in one chooses an
   account first. An account is all it takes to get a code; no purchase. */
const DISMISS_KEY = 'ezana.referralBar.dismissed.v1';
const TARGET = `/auth/continue?intent=signup&next=${encodeURIComponent('/settings?tab=referrals')}`;

export default function ReferralStickyBar({ heroSelector = '.lp-hero' }) {
  const [pastHero, setPastHero] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    const hero = document.querySelector(heroSelector);
    if (!hero || typeof IntersectionObserver === 'undefined') {
      setPastHero(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(hero);
    return () => io.disconnect();
  }, [heroSelector]);

  /* Never stack with the cookie banner: it reserves its height in
     --cookie-banner-height on <html>, the same contract PublicMobileCta uses. */
  const [bannerOpen, setBannerOpen] = useState(true);
  useEffect(() => {
    const read = () =>
      setBannerOpen(
        Boolean(document.documentElement.style.getPropertyValue('--cookie-banner-height')),
      );
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  const visible = pastHero && !dismissed && !bannerOpen;

  useEffect(() => {
    document.body.classList.toggle('rsb-open', visible);
    return () => document.body.classList.remove('rsb-open');
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode: the in-memory state still hides it for this page */
    }
  };

  return (
    <div className="rsb-bar" role="complementary" aria-label="Referral program">
      <div className="rsb-copy">
        <p className="rsb-title">Get 5 friends on Ezana, get a year of Personal Advanced free.</p>
        <p className="rsb-sub">Sign up, grab your code, share it.</p>
      </div>
      <a className="rsb-btn" href={TARGET}>
        Get my code
      </a>
      <button type="button" className="rsb-close" onClick={dismiss} aria-label="Dismiss">
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>
    </div>
  );
}
