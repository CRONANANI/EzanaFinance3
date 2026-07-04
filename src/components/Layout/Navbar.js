'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { supabase } from '@/lib/supabase-browser';
import { NavNotifications } from '@/components/NavNotifications';
import { ChecklistProgressIcon } from '@/components/ChecklistProgressIcon';
import { AnimatedNav } from '@/components/ui/AnimatedNav';
import { MobileAuthNavDrawer } from '@/components/Layout/MobileAuthNavDrawer';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { isBetaLockedRoute, hasBetaFullAccess } from '@/lib/beta-locked-routes';
import {
  ChevronDown,
  ArrowRight,
  Landmark,
  Building2,
  Radar,
  Globe,
  Users,
  TrendingUp,
  ScrollText,
} from 'lucide-react';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import '@/components/ui/animated-nav.css';

/* Landing-nav Datasets mega-menu — the SAME seven dimensions as the orbital map,
   the in-page CategoryBar, and the signal map, built from the shared
   DATASET_TAXONOMY so the nav can never drift. One Lucide icon per dimension;
   roadmap (live:false) items render a muted "Soon" tag. */
const DIMENSION_ICON = {
  capitol: Landmark,
  titans: Building2,
  eyes: Radar,
  whispers: TrendingUp,
  hive: Users,
  lighthouse: Globe,
  regulatory: ScrollText,
};
const DATASET_MENU = DATASET_TAXONOMY.map((d) => ({
  id: d.id,
  heading: d.label,
  color: d.color,
  icon: DIMENSION_ICON[d.id],
  items: d.items.map((it) => ({ label: it.label, href: it.href, live: it.live })),
}));

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const hasFullBetaAccess = hasBetaFullAccess(user);
  const { isOrgUser } = useOrg();
  useActivityTracker();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [datasetsOpen, setDatasetsOpen] = useState(false);
  const landingNavRef = useRef(null);
  const datasetsRef = useRef(null);
  const isSettings = pathname?.startsWith('/settings');
  const isLanding = pathname === '/';
  const isPricing = pathname === '/pricing';
  const isAuthPage = pathname?.startsWith('/auth');
  const isHelpCenter = pathname?.startsWith('/help-center');
  const isPrivacyPolicy = pathname === '/privacy-policy';
  const isTermsOfService = pathname === '/terms-of-service';
  const isAccessibility = pathname === '/accessibility';
  const isEzanaEcho = pathname?.startsWith('/ezana-echo');
  // Public marketing pages that ship their own self-contained chrome via
  // <MarketingPageShell> (its own header + "Back to home" / "Get started").
  // The global app navbar must NEVER render on top of these — otherwise a
  // visitor who still has a stale client session would see the logged-in app
  // navigation bar on a fully public page (e.g. /datasets reached from the
  // landing "View datasets"). Returning null here makes the nav decision
  // independent of any client-side session, exactly like /auth and /settings.
  const isMarketingShell =
    pathname?.startsWith('/datasets') || pathname?.startsWith('/brokerages-integrations');
  // Ezana Echo is a public reading destination reached from the landing page,
  // so it ALWAYS renders the marketing navbar — never the authed global
  // dashboard navbar. This guarantees a logged-out visitor can never see the
  // logged-in app chrome on Echo, and removes any dependency on a possibly
  // stale client-side session for the nav decision.
  // Public legal pages (privacy / terms / accessibility) always use the
  // marketing navbar — even for signed-in users — so reaching them from the
  // landing footer never surfaces the logged-in app chrome.
  const showLandingNav =
    isLanding ||
    isHelpCenter ||
    isPricing ||
    isPrivacyPolicy ||
    isTermsOfService ||
    isAccessibility ||
    isEzanaEcho;
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

  const isTradingActive = pathname?.includes('/trading') || pathname?.includes('/org-trading');

  const handleLogout = () => {
    // Best-effort client-side clear (fire-and-forget — never await, so a hung
    // signOut network call can't block the redirect or trap the user).
    try {
      supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    // Authoritative server sign-out: clears the session cookie on the response
    // and redirects to the login chooser (/auth/login). Doing it server-side
    // means a failed/hung client signOut can't leave the user half-logged-in.
    // Covers regular users AND university orgs (both render this global Navbar).
    window.location.href = '/api/auth/signout';
  };

  const userNavItems = [
    // Org (university) users get the Team Hub dropdown as their leftmost item
    // (it replaces Dashboard and sits to the left of Research). Regular users
    // get the standard Dashboard item.
    ...(isOrgUser
      ? [
          {
            id: 5,
            title: 'Team Hub',
            url: '/org-team-hub',
            icon: 'bi-building',
            dropdown: true,
            isActive: pathname?.includes('/org-team-hub') || pathname?.includes('/org-trading'),
            variant: 'purple',
            items: [
              {
                id: 51,
                title: 'Home',
                description: 'Fund overview, activity & analytics',
                url: '/org-team-hub',
                icon: 'bi-building',
              },
              {
                id: 52,
                title: 'Council Trading',
                description: 'Org mock portfolios & position flags',
                url: '/org-trading',
                icon: 'bi-bank2',
              },
              {
                id: 53,
                title: 'Pitch Pipeline',
                description: 'Active pitches through committee',
                url: '/org-team-hub/pitches',
                icon: 'bi-kanban',
              },
              {
                id: 54,
                title: 'Pitch Archive',
                description: 'Decided pitches & hindsight',
                url: '/org-team-hub/pitch-archive',
                icon: 'bi-archive',
              },
            ],
          },
        ]
      : [
          {
            id: 1,
            title: 'Dashboard',
            url: '/home-dashboard',
            icon: 'bi-speedometer2',
            isActive: pathname?.includes('home-dashboard'),
          },
        ]),
    {
      id: 2,
      title: 'Research',
      url: '#',
      icon: 'bi-search',
      dropdown: true,
      isActive: isResearchActive,
      items: [
        {
          id: 22,
          title: 'Company & Portfolio Research',
          description: 'Stock analysis + portfolio modeling',
          url: '/company-research',
          icon: 'bi-bar-chart-line',
        },
        {
          id: 23,
          title: 'Global Market Analysis',
          description: 'Worldwide sector trends',
          url: '/market-analysis',
          icon: 'bi-graph-up-arrow',
        },
        {
          id: 26,
          title: 'Ezana Echo',
          description: 'Articles & insights',
          url: '/ezana-echo',
          icon: 'bi-newspaper',
        },
        {
          id: 27,
          title: 'Alternative Markets',
          description: 'Crypto & commodities',
          url: '/alternative-markets',
          icon: 'bi-globe2',
        },
        {
          id: 30,
          title: 'Real Estate Marketplace',
          description: 'Fractional property investments',
          url: '/real-estate',
          icon: 'bi-houses',
          variant: 'gold',
        },
        {
          id: 28,
          title: 'Centaur Intelligence',
          description: 'AI research assistant',
          url: '/centaur-intelligence',
          icon: 'bi-stars',
          variant: 'gold',
        },
        {
          id: 29,
          title: 'Kairos Signal',
          description: 'Weather & alternative macro data',
          url: '/kairos-signal',
          icon: 'bi-cloud-sun-fill',
          variant: 'gold',
        },
        {
          id: 25,
          title: 'Betting Markets',
          description: 'Odds, predictions & EV models',
          url: '/betting-markets',
          icon: 'bi-bullseye',
          variant: 'gold',
        },
        {
          id: 24,
          title: 'For The Quants',
          description: 'Quant tools & backtesting',
          url: '/for-the-quants',
          icon: 'bi-calculator',
          variant: 'gold',
        },
        {
          id: 21,
          title: 'Inside The Capitol',
          description: 'Congressional trading',
          url: '/inside-the-capitol',
          icon: 'bi-building',
          variant: 'gold',
        },
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
        {
          id: 31,
          title: 'Brokerage Account',
          description: 'Real-money trading account',
          url: '/trading',
          icon: 'bi-bank',
        },
        {
          id: 32,
          title: 'Mock Portfolio',
          description: '$100K paper trading account',
          url: '/trading/mock',
          icon: 'bi-controller',
        },
        // Council Trading moved to the Team Hub dropdown for org users.
      ],
    },
    {
      id: 4,
      title: 'Watchlist',
      url: '/watchlist',
      icon: 'bi-bookmark',
      isActive: pathname?.includes('/watchlist'),
    },
    // Team Hub (org users) now lives at the front of the nav, to the left of
    // Research — so only the non-org Community item remains in this slot.
    ...(isOrgUser
      ? []
      : [
          {
            id: 5,
            title: 'Community',
            url: '/community',
            icon: 'bi-people',
            isActive: pathname?.includes('/community'),
          },
        ]),
    {
      id: 6,
      title: 'Learning Center',
      url: '/learning-center',
      icon: 'bi-mortarboard',
      isActive: pathname?.includes('/learning-center'),
    },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
    setDatasetsOpen(false);
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

  // Datasets mega-menu — close on Escape or any click/focus outside the
  // dropdown. Listeners are only attached while the menu is open.
  useEffect(() => {
    if (!datasetsOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setDatasetsOpen(false);
    };
    const onPointerDown = (e) => {
      if (datasetsRef.current && !datasetsRef.current.contains(e.target)) {
        setDatasetsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [datasetsOpen]);

  // Let other surfaces (e.g. the landing hero's "View datasets" button) open
  // the Datasets mega-menu instead of navigating away.
  useEffect(() => {
    const openDatasets = () => setDatasetsOpen(true);
    window.addEventListener('ezana:open-datasets-menu', openDatasets);
    return () => window.removeEventListener('ezana:open-datasets-menu', openDatasets);
  }, []);

  if (isAuthPage || isSettings || isMarketingShell) return null;

  if (showLandingNav) {
    return (
      <nav ref={landingNavRef} className="navbar navbar-sticky">
        <div className="nav-container nav-container-centered">
          <Link
            href="/"
            className="logo logo-centered nav-brand nav-home-btn"
            title="Ezana Finance"
          >
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
              <a href="/#features" className="nav-link">
                Features
              </a>
            </li>
            <li className="nav-item">
              <a href="/#resources" className="nav-link">
                Resources
              </a>
            </li>
            <li
              className="nav-item nav-datasets"
              ref={datasetsRef}
              onMouseEnter={() => setDatasetsOpen(true)}
              onMouseLeave={() => setDatasetsOpen(false)}
            >
              <button
                type="button"
                className="nav-link nav-datasets-trigger"
                aria-haspopup="true"
                aria-expanded={datasetsOpen}
                onClick={() => setDatasetsOpen((open) => !open)}
              >
                Datasets
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={`nav-datasets-caret${datasetsOpen ? ' is-open' : ''}`}
                />
              </button>
              <div
                className={`nav-datasets-mega${datasetsOpen ? ' is-open' : ''}`}
                role="menu"
                aria-label="Datasets"
              >
                <div className="nav-datasets-panel">
                  <div className="nav-datasets-cols">
                    {DATASET_MENU.map((col) => {
                      const ColIcon = col.icon;
                      return (
                        <div key={col.id} className="nav-datasets-col">
                          <p className="nav-datasets-col-head">
                            <ColIcon
                              size={14}
                              aria-hidden
                              className="nav-datasets-col-icon"
                              style={{ color: col.color }}
                            />
                            {col.heading}
                          </p>
                          {col.items.map((item) => (
                            <a
                              key={item.label}
                              href={item.href}
                              className="nav-datasets-item"
                              role="menuitem"
                            >
                              <span className="nav-datasets-item-label">{item.label}</span>
                              {!item.live && <span className="nav-datasets-soon">Soon</span>}
                            </a>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <a href="/datasets" className="nav-datasets-foot" role="menuitem">
                    View all datasets
                    <ArrowRight size={14} aria-hidden />
                  </a>
                </div>
              </div>
            </li>
            <li className="nav-item">
              <a href="/pricing" className="nav-link">
                Pricing
              </a>
            </li>
            <li className="nav-item">
              <a href="/ezana-echo" className="nav-link">
                Ezana Echo
              </a>
            </li>
            <li className="nav-item">
              <a href="/#faq" className="nav-link">
                FAQ
              </a>
            </li>
            <li className="nav-item">
              <a href="/help-center" className="nav-link">
                Help Center
              </a>
            </li>
          </ul>

          {/* Desktop sign-in — hidden on mobile via CSS */}
          <div className="nav-sign-in-wrap">
            <a href="/auth/login" className="nav-link nav-link-text">
              Login
            </a>
            <a href="/auth/partner/apply" className="nav-link nav-link-text">
              Become a Partner
            </a>
          </div>

          {/* ═══ MOBILE MENU — completely separate element, only rendered on mobile ═══ */}
          {mobileMenuOpen && (
            <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-nav-menu" onClick={(e) => e.stopPropagation()}>
                {/* Auth buttons at top */}
                <div className="mobile-nav-auth">
                  <a
                    href="/auth/login"
                    className="mobile-nav-auth-btn mobile-nav-login"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-person" />
                    <span>Login</span>
                  </a>
                  <a
                    href="/auth/partner/apply"
                    className="mobile-nav-auth-btn mobile-nav-partner"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-briefcase" />
                    <span>Become a Partner</span>
                  </a>
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
                  <a
                    href="/datasets"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-stack" />
                    <span>Datasets</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </a>
                  <a
                    href="/pricing"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-tag" />
                    <span>Pricing</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </a>
                  <a
                    href="/ezana-echo"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-newspaper" />
                    <span>Ezana Echo</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </a>
                  <a
                    href="/#faq"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-question-circle" />
                    <span>FAQ</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </a>
                  <a
                    href="/help-center"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-life-preserver" />
                    <span>Help Center</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </a>
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

        <AnimatedNav
          items={userNavItems}
          accentColor="#10b981"
          hasFullBetaAccess={hasFullBetaAccess}
        />

        {/* ── RIGHT ZONE: profile + gear + logout (desktop) | hamburger (mobile) ── */}
        <div className="nav-actions">
          {user?.id && (
            <Link
              href={`/profile/${user.id}`}
              className="nav-action-tap nav-action-tap--desktop-only"
              title="My profile"
              aria-label="My profile"
            >
              <span className="nav-action-inner nav-profile-icon">
                <i className="bi bi-person-circle" aria-hidden="true" />
              </span>
            </Link>
          )}
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
