'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { supabase } from '@/lib/supabase';
import { NavNotifications } from '@/components/NavNotifications';
import { ChecklistProgressIcon } from '@/components/ChecklistProgressIcon';
import { AnimatedNav } from '@/components/ui/AnimatedNav';
import { MobileAuthNavDrawer } from '@/components/Layout/MobileAuthNavDrawer';
import '@/components/ui/animated-nav.css';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isOrgUser } = useOrg();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const landingNavRef = useRef(null);
  const isSettings = pathname?.startsWith('/settings');
  const isLanding = pathname === '/';
  const isPricing = pathname === '/pricing';
  const isAuthPage = pathname?.startsWith('/auth');
  const isHelpCenter = pathname?.startsWith('/help-center');
  const isPrivacyPolicy = pathname === '/privacy-policy';
  const showLandingNav = isLanding || isHelpCenter || isPricing || isPrivacyPolicy;
  const isResearchActive =
    pathname?.includes('/inside-the-capitol') ||
    pathname?.includes('/company-research') ||
    pathname?.includes('/market-analysis') ||
    pathname?.includes('/empire-ranking') ||
    pathname?.includes('/for-the-quants') ||
    pathname?.includes('/betting-markets') ||
    pathname?.includes('/ezana-echo') ||
    pathname?.includes('/alternative-markets') ||
    pathname?.includes('/centaur-intelligence') ||
    pathname?.includes('/kairos-signal');

  const isTradingActive = pathname?.includes('/trading');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const userNavItems = [
    { id: 1, title: 'Dashboard', url: '/home-dashboard', icon: 'bi-speedometer2', isActive: pathname?.includes('home-dashboard') },
    {
      id: 2,
      title: 'Research',
      url: '#',
      icon: 'bi-search',
      dropdown: true,
      isActive: isResearchActive,
      items: [
        { id: 21, title: 'Inside The Capitol', description: 'Congressional trading', url: '/inside-the-capitol', icon: 'bi-building' },
        { id: 22, title: 'Company & Portfolio Research', description: 'Stock analysis + portfolio modeling', url: '/company-research', icon: 'bi-bar-chart-line' },
        { id: 23, title: 'Global Market Analysis', description: 'Worldwide sector trends', url: '/market-analysis', icon: 'bi-graph-up-arrow' },
        { id: 26, title: 'Ezana Echo', description: 'Articles & insights', url: '/ezana-echo', icon: 'bi-newspaper' },
        { id: 27, title: 'Alternative Markets', description: 'Crypto & commodities', url: '/alternative-markets', icon: 'bi-globe2' },
        { id: 28, title: 'Centaur Intelligence', description: 'AI research assistant', url: '/centaur-intelligence', icon: 'bi-stars' },
        { id: 29, title: 'Kairos Signal', description: 'Weather & alternative macro data', url: '/kairos-signal', icon: 'bi-cloud-sun-fill' },
        { id: 25, title: 'Betting Markets', description: 'Odds, predictions & EV models', url: '/betting-markets', icon: 'bi-bullseye' },
        { id: 24, title: 'For The Quants', description: 'Quant tools & backtesting', url: '/for-the-quants', icon: 'bi-calculator' },
      ],
    },
    {
      id: 3,
      title: 'Trading',
      url: '/trading',
      icon: 'bi-graph-up-arrow',
      dropdown: true,
      isActive: isTradingActive,
      items: [
        { id: 31, title: 'Brokerage Account', description: 'Real-money trading account', url: '/trading', icon: 'bi-bank' },
        { id: 32, title: 'Mock Portfolio', description: '$100K paper trading account', url: '/trading/mock', icon: 'bi-controller' },
      ],
    },
    { id: 4, title: 'Watchlist', url: '/watchlist', icon: 'bi-bookmark', isActive: pathname?.includes('/watchlist') },
    isOrgUser
      ? { id: 5, title: 'Team Hub', url: '/org-team-hub', icon: 'bi-building', isActive: pathname?.includes('/org-team-hub'), variant: 'purple' }
      : { id: 5, title: 'Community', url: '/community', icon: 'bi-people', isActive: pathname?.includes('/community') },
    { id: 6, title: 'Learning Center', url: '/learning-center', icon: 'bi-mortarboard', isActive: pathname?.includes('/learning-center') },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!showLandingNav) return undefined;
    const el = landingNavRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      el.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showLandingNav, pathname]);

  if (isAuthPage || isSettings) return null;

  if (showLandingNav) {
    return (
      <nav ref={landingNavRef} className="navbar navbar-sticky">
        <div className="nav-container nav-container-centered">
          <Link href="/" className="logo logo-centered nav-brand nav-home-btn" title="Ezana Finance">
            <EzanaNavLogo priority={isLanding || isPricing} />
          </Link>
          <button
            className="mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`} />
          </button>

          {/* Desktop nav links — hidden on mobile via CSS */}
          <ul className="nav-menu nav-menu-desktop">
            <li className="nav-item">
              <a href="/#features" className="nav-link">Features</a>
            </li>
            <li className="nav-item">
              <a href="/#resources" className="nav-link">Resources</a>
            </li>
            <li className="nav-item">
              <Link href="/pricing" className="nav-link">Pricing</Link>
            </li>
            <li className="nav-item">
              <Link href="/ezana-echo" className="nav-link">Ezana Echo</Link>
            </li>
            <li className="nav-item">
              <a href="/#faq" className="nav-link">FAQ</a>
            </li>
            <li className="nav-item">
              <Link href="/help-center" className="nav-link">Help Center</Link>
            </li>
          </ul>

          {/* Desktop sign-in — hidden on mobile via CSS */}
          <div className="nav-sign-in-wrap">
            <Link href="/auth/login" className="nav-link nav-link-text">
              Login
            </Link>
            <Link href="/auth/partner/apply" className="nav-link nav-link-text">
              Become a Partner
            </Link>
          </div>

          {/* ═══ MOBILE MENU — completely separate element, only rendered on mobile ═══ */}
          {mobileMenuOpen && (
            <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}>
              <div
                className="mobile-nav-menu"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Auth buttons at top */}
                <div className="mobile-nav-auth">
                  <Link
                    href="/auth/login"
                    className="mobile-nav-auth-btn mobile-nav-login"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-person" />
                    <span>Login</span>
                  </Link>
                  <Link
                    href="/auth/partner/apply"
                    className="mobile-nav-auth-btn mobile-nav-partner"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-briefcase" />
                    <span>Become a Partner</span>
                  </Link>
                </div>

                <div className="mobile-nav-divider" />

                {/* Navigation links */}
                <div className="mobile-nav-links">
                  <a
                    href="/#features"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-grid" />
                    <span>Features</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </a>
                  <a
                    href="/#resources"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-database" />
                    <span>Resources</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </a>
                  <Link
                    href="/pricing"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-tag" />
                    <span>Pricing</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </Link>
                  <Link
                    href="/ezana-echo"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-newspaper" />
                    <span>Ezana Echo</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </Link>
                  <a
                    href="/#faq"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-question-circle" />
                    <span>FAQ</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </a>
                  <Link
                    href="/help-center"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-life-preserver" />
                    <span>Help Center</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </Link>
                </div>

                <div className="mobile-nav-divider" />

                {/* Footer branding */}
                <div className="mobile-nav-footer">
                  <span className="mobile-nav-brand">Ezana Finance</span>
                  <span className="mobile-nav-tagline">Follow the moves that matter</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav className="main-nav" id="mainNav" data-tutorial="main-nav">
      <div className="nav-container">
        {/* ── LEFT ZONE: Logo + bell + checklist ── */}
        <div className="nav-left-zone">
          <Link href="/home" className="nav-brand nav-home-btn" title="Home">
            <EzanaNavLogo />
          </Link>
          <div className="nav-bell-checklist-wrap">
            <div className="nn-wrapper">
              <NavNotifications />
            </div>
            {isAuthenticated && <ChecklistProgressIcon />}
          </div>
        </div>

        <AnimatedNav items={userNavItems} accentColor="#10b981" />

        {/* ── RIGHT ZONE: gear + logout (desktop) | hamburger (mobile) ── */}
        <div className="nav-actions">
          <Link
            href="/settings"
            className="nav-action-tap nav-action-tap--desktop-only"
            title="Settings"
            aria-label="Settings"
          >
            <span className="nav-action-inner nav-settings-gear">
              <i className="bi bi-gear-fill" aria-hidden="true" />
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="nav-action-tap nav-action-tap--desktop-only"
            title="Log out"
            aria-label="Log out"
          >
            <span className="nav-action-inner nav-logout-btn">
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
            </span>
          </button>

          <button
            className="mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`} />
          </button>
        </div>

        <MobileAuthNavDrawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          isOrgUser={isOrgUser}
          onLogout={handleLogout}
        />
      </div>
    </nav>
  );
}
