'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { NavNotifications } from '@/components/NavNotifications';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSettings = pathname?.startsWith('/settings');
  const isLanding = pathname === '/';
  const isAuthPage = pathname?.startsWith('/auth');
  const isHelpCenter = pathname?.startsWith('/help-center');
  const isEzanaEcho = pathname?.startsWith('/ezana-echo');
  const showLandingNav = isLanding || (isHelpCenter && !isAuthenticated) || isEzanaEcho;

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
          <Link href="/" className="logo logo-centered" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="logo-text" style={{ color: '#10b981' }}>Ezana Finance</span>
            <Image src="/ezana-logo.png" alt="Ezana Finance" width={28} height={28} style={{ objectFit: 'contain' }} />
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
              <a href="/#pricing" className="nav-link">Pricing</a>
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
                  <a
                    href="/#pricing"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-tag" />
                    <span>Pricing</span>
                    <i className="bi bi-chevron-right mobile-nav-chevron" />
                  </a>
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
    <nav className="main-nav" id="mainNav">
      <div className="nav-container">
        {/* ── LEFT ZONE: Raven logo + Notifications bell ── */}
        <div className="nav-left-zone">
          <Link href="/home" className="nav-brand nav-home-btn" title="Home">
            <Image src="/ezana-logo.png" alt="Ezana Finance" width={48} height={48} style={{ objectFit: 'contain', display: 'block' }} />
          </Link>
          <div className="nn-wrapper">
            <NavNotifications />
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
        <div className={`nav-links ${mobileMenuOpen ? 'nav-links-open' : ''}`}>
          <Link href="/home-dashboard" className={`nav-link ${pathname.includes('home-dashboard') ? 'active' : ''}`} data-page="home-dashboard" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-speedometer2"></i>
            <span>Dashboard</span>
          </Link>
          <div className="nav-dropdown mobile-dropdown-flat">
            <span className="nav-link mobile-dropdown-label">
              <i className="bi bi-search"></i>
              <span>Research Tools</span>
            </span>
            <div className="mobile-dropdown-items">
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
            </div>
          </div>
          <div className="nav-dropdown desktop-dropdown-only">
            <button className="nav-link dropdown-trigger" type="button">
              <i className="bi bi-search"></i>
              <span>Research Tools</span>
              <i className="bi bi-chevron-down chevron"></i>
            </button>
            <div className="dropdown-menu">
              <Link href="/inside-the-capitol" className="dropdown-item">
                <i className="bi bi-building"></i>
                <div><div className="item-title">Inside The Capitol</div><div className="item-desc">Congressional trading</div></div>
              </Link>
              <Link href="/company-research" className="dropdown-item">
                <i className="bi bi-bar-chart-line"></i>
                <div><div className="item-title">Company Research</div><div className="item-desc">Financial analysis</div></div>
              </Link>
              <Link href="/market-analysis" className="dropdown-item">
                <i className="bi bi-graph-up-arrow"></i>
                <div><div className="item-title">Market Analysis</div><div className="item-desc">Sector trends</div></div>
              </Link>
              <Link href="/for-the-quants" className="dropdown-item">
                <i className="bi bi-calculator"></i>
                <div><div className="item-title">For The Quants</div><div className="item-desc">Quant tools</div></div>
              </Link>
              <Link href="/betting-markets" className="dropdown-item">
                <i className="bi bi-bullseye"></i>
                <div><div className="item-title">Betting Markets</div><div className="item-desc">Odds & predictions</div></div>
              </Link>
            </div>
          </div>
          <Link href="/trading" className={`nav-link ${pathname.includes('trading') ? 'active' : ''}`} data-page="trading" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-graph-up-arrow"></i>
            <span>Trading</span>
          </Link>
          <Link href="/watchlist" className={`nav-link ${pathname.includes('watchlist') ? 'active' : ''}`} data-page="watchlist" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-bookmark"></i>
            <span>Watchlist</span>
          </Link>
          <Link href="/community" className={`nav-link ${pathname.includes('community') ? 'active' : ''}`} data-page="community" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-people"></i>
            <span>Community</span>
          </Link>
          <Link href="/learning-center" className={`nav-link ${pathname.includes('learning-center') ? 'active' : ''}`} data-page="learning-center" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-mortarboard"></i>
            <span>Learning Center</span>
          </Link>
          <Link href="/ezana-echo" className={`nav-link ${pathname.includes('ezana-echo') ? 'active' : ''}`} data-page="ezana-echo" onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-newspaper"></i>
            <span>Ezana Echo</span>
          </Link>
        </div>
        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/settings" className="nav-action-btn" title="Settings" aria-label="Settings">
            <i className="bi bi-gear"></i>
          </Link>
        </div>
      </div>
      {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
    </nav>
  );
}
