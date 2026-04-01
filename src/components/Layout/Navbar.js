'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { NavNotifications } from '@/components/NavNotifications';
import { ChecklistProgressIcon } from '@/components/ChecklistProgressIcon';
import { AnimatedNav } from '@/components/ui/AnimatedNav';
import '@/components/ui/animated-nav.css';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSettings = pathname?.startsWith('/settings');
  const isLanding = pathname === '/';
  const isAuthPage = pathname?.startsWith('/auth');
  const isHelpCenter = pathname?.startsWith('/help-center');
  const showLandingNav = isLanding || isHelpCenter;
  const isResearchActive =
    pathname?.includes('/inside-the-capitol') ||
    pathname?.includes('/company-research') ||
    pathname?.includes('/market-analysis') ||
    pathname?.includes('/for-the-quants') ||
    pathname?.includes('/betting-markets') ||
    pathname?.includes('/ezana-echo') ||
    pathname?.includes('/alternative-markets') ||
    pathname?.includes('/centaur-intelligence') ||
    pathname?.includes('/kairos-signal');

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
        { id: 29, title: 'Kairos Signal', description: 'Weather & alternative macro data', url: '/kairos-signal', icon: 'bi-cloud-sun-fill', variant: 'gold' },
        { id: 21, title: 'Inside The Capitol', description: 'Congressional trading', url: '/inside-the-capitol', icon: 'bi-building' },
        { id: 22, title: 'Company Research', description: 'Financial analysis', url: '/company-research', icon: 'bi-bar-chart-line' },
        { id: 23, title: 'Market Analysis', description: 'Sector trends', url: '/market-analysis', icon: 'bi-graph-up-arrow' },
        { id: 24, title: 'For The Quants', description: 'Quant tools', url: '/for-the-quants', icon: 'bi-calculator' },
        { id: 25, title: 'Betting Markets', description: 'Odds & predictions', url: '/betting-markets', icon: 'bi-bullseye' },
        { id: 26, title: 'Ezana Echo', description: 'Articles & insights', url: '/ezana-echo', icon: 'bi-newspaper' },
        { id: 27, title: 'Alternative Markets', description: 'Crypto & commodities', url: '/alternative-markets', icon: 'bi-globe2' },
      ],
    },
    { id: 3, title: 'Trading', url: '/trading', icon: 'bi-graph-up-arrow', isActive: pathname?.includes('/trading') },
    { id: 4, title: 'Watchlist', url: '/watchlist', icon: 'bi-bookmark', isActive: pathname?.includes('/watchlist') },
    { id: 5, title: 'Community', url: '/community', icon: 'bi-people', isActive: pathname?.includes('/community') },
    { id: 6, title: 'Learning Center', url: '/learning-center', icon: 'bi-mortarboard', isActive: pathname?.includes('/learning-center') },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  if (isAuthPage || isSettings) return null;

  if (showLandingNav) {
    return (
      <nav className="navbar">
        <div className="nav-container nav-container-centered">
          <Link href="/" className="logo logo-centered nav-brand nav-home-btn" title="Ezana Finance">
            <Image
              src="/ezana-nav-logo.png"
              alt="Ezana Finance"
              width={60}
              height={51}
              priority={isLanding}
              className="nav-logo-img nav-logo-img--wing"
              style={{ objectFit: 'contain', display: 'block', transform: 'scaleX(-1)' }}
            />
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
        {/* ── LEFT ZONE: Logo + bell + checklist (checklist right of bell) ── */}
        <div className="nav-left-zone">
          <Link href="/home" className="nav-brand nav-home-btn" title="Home">
            <Image
              src="/ezana-nav-logo.png"
              alt="Ezana Finance"
              width={60}
              height={51}
              className="nav-logo-img nav-logo-img--wing"
              style={{ objectFit: 'contain', display: 'block', transform: 'scaleX(-1)' }}
            />
          </Link>
          <div className="nav-bell-checklist-wrap">
            <div className="nn-wrapper">
              <NavNotifications />
            </div>
            {isAuthenticated && <ChecklistProgressIcon />}
          </div>
        </div>
        <button
          className="mobile-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          type="button"
          aria-label="Toggle menu"
        >
          <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`} />
        </button>
        <AnimatedNav items={userNavItems} accentColor="#10b981" />
        <div className={`nav-links ${mobileMenuOpen ? 'nav-links-open' : ''}`}>
          <Link href="/home-dashboard" className={`nav-link ${pathname?.includes('home-dashboard') ? 'active' : ''}`} data-page="home-dashboard" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-speedometer2"></i>
            <span>Dashboard</span>
          </Link>
          <div className={`nav-dropdown mobile-dropdown-flat ${isResearchActive ? 'active' : ''}`}>
            <span className={`nav-link mobile-dropdown-label ${isResearchActive ? 'active' : ''}`}>
              <i className="bi bi-search"></i>
              <span>Research</span>
            </span>
            <div className="mobile-dropdown-items">
              <Link href="/kairos-signal" className="dropdown-item dropdown-item--gold" onClick={() => setMobileMenuOpen(false)}>
                <i className="bi bi-cloud-sun-fill"></i>
                <div>
                  <div className="item-title">Kairos Signal</div>
                  <div className="item-desc">Weather &amp; alternative macro data</div>
                </div>
              </Link>
              <Link href="/inside-the-capitol" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                <i className="bi bi-building"></i>
                <div><div className="item-title">Inside The Capitol</div></div>
              </Link>
              <Link href="/company-research" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                <i className="bi bi-bar-chart-line"></i>
                <div><div className="item-title">Company Research</div></div>
              </Link>
              <Link href="/market-analysis" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                <i className="bi bi-graph-up-arrow"></i>
                <div><div className="item-title">Market Analysis</div></div>
              </Link>
              <Link href="/for-the-quants" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                <i className="bi bi-calculator"></i>
                <div><div className="item-title">For The Quants</div></div>
              </Link>
              <Link href="/betting-markets" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                <i className="bi bi-bullseye"></i>
                <div><div className="item-title">Betting Markets</div></div>
              </Link>
              <Link href="/ezana-echo" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                <i className="bi bi-newspaper"></i>
                <div><div className="item-title">Ezana Echo</div></div>
              </Link>
              <Link href="/alternative-markets" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                <i className="bi bi-globe2"></i>
                <div><div className="item-title">Alternative Markets</div></div>
              </Link>
            </div>
          </div>
          <Link href="/trading" className={`nav-link ${pathname?.includes('trading') ? 'active' : ''}`} data-page="trading" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-graph-up-arrow"></i>
            <span>Trading</span>
          </Link>
          <Link href="/watchlist" className={`nav-link ${pathname?.includes('watchlist') ? 'active' : ''}`} data-page="watchlist" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-bookmark"></i>
            <span>Watchlist</span>
          </Link>
          <Link href="/community" className={`nav-link ${pathname?.includes('community') ? 'active' : ''}`} data-page="community" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-people"></i>
            <span>Community</span>
          </Link>
          <Link href="/learning-center" className={`nav-link ${pathname?.includes('learning-center') ? 'active' : ''}`} data-page="learning-center" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-mortarboard"></i>
            <span>Learning Center</span>
          </Link>
        </div>
        <div className="nav-actions">
          <Link href="/settings" className="nav-action-btn nav-settings-gear" title="Settings" aria-label="Settings">
            <i className="bi bi-gear"></i>
          </Link>
          <button
            onClick={handleLogout}
            className="nav-action-btn nav-logout-btn"
            title="Log out"
            aria-label="Log out"
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>
      {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
    </nav>
  );
}
