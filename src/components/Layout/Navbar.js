'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { useSidebar } from '@/contexts/SidebarContext';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const { toggleNotifications } = useSidebar();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settingsRef = useRef(null);
  const isLanding = pathname === '/';
  const isAuthPage = pathname?.startsWith('/auth');
  const isHelpCenter = pathname?.startsWith('/help-center');
  const DASHBOARD_PAGES = ['/home', '/home-dashboard', '/watchlist', '/community', '/learning-center', '/inside-the-capitol', '/company-research', '/market-analysis', '/for-the-quants', '/economic-indicators', '/betting-markets'];
  const isDashboardPage = DASHBOARD_PAGES.some((p) => pathname.startsWith(p));
  const isEzanaEcho = pathname?.startsWith('/ezana-echo');
  const showLandingNav = isLanding || (isHelpCenter && !isAuthenticated) || isEzanaEcho;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (isAuthPage) return null;

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
          >
            <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`} />
          </button>
          <ul className={`nav-menu ${mobileMenuOpen ? 'nav-menu-open' : ''}`}>
            <li className="nav-item">
              <a href="/#features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
            </li>
            <li className="nav-item">
              <a href="/#resources" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Resources</a>
            </li>
            <li className="nav-item">
              <a href="/#pricing" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            </li>
            <li className="nav-item">
              <Link href="/ezana-echo" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Ezana Echo</Link>
            </li>
            <li className="nav-item">
              <a href="/#faq" className="nav-link" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            </li>
            <li className="nav-item">
              <Link href="/help-center" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Help Center</Link>
            </li>
            <li className="nav-item mobile-menu-auth">
              <Link href="/auth/login" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            </li>
            <li className="nav-item mobile-menu-auth">
              <Link href="/auth/partner/apply" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Become a Partner</Link>
            </li>
          </ul>
          <div className="nav-sign-in-wrap">
            <Link href="/auth/login" className="nav-link nav-link-text">
              Login
            </Link>
            <Link href="/auth/partner/apply" className="nav-link nav-link-text">
              Become a Partner
            </Link>
          </div>
        </div>
        {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      </nav>
    );
  }

  return (
    <nav className="main-nav" id="mainNav">
      <div className="nav-container">
        <Link href="/home" className="nav-brand nav-home-btn" title="Home">
          <Image src="/ezana-logo.png" alt="Ezana Finance" width={48} height={48} style={{ objectFit: 'contain', display: 'block' }} />
        </Link>
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
        </div>
        <div className="nav-actions">
          <button className="nav-action-btn notification-toggle" onClick={toggleNotifications} title="Notifications" type="button">
            <i className="bi bi-bell"></i>
            <span className="notification-badge">3</span>
          </button>
          <div className="nav-settings-dropdown" ref={settingsRef}>
            <button className="nav-action-btn settings-toggle" onClick={() => setSettingsOpen(!settingsOpen)} title="App settings" type="button">
              <i className="bi bi-gear"></i>
            </button>
            {settingsOpen && (
              <div className="settings-dropdown-menu">
                <div className="settings-dropdown-item">
                  <span>Theme</span>
                  <button type="button" className="settings-theme-btn" onClick={toggleTheme} title="Toggle theme">
                    <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
                    <span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
                  </button>
                </div>
                <div className="settings-dropdown-item muted">More options coming soon</div>
              </div>
            )}
          </div>
          {isDashboardPage ? (
            <Link href={user ? "/user-profile-settings" : "/signin"} className="nav-action-btn user-menu-btn" title={user ? "Account & preferences" : "Sign in"}>
              <i className="bi bi-person-circle"></i>
            </Link>
          ) : user ? (
            <>
              <Link href="/user-profile-settings" className="nav-action-btn user-menu-btn" title="Account">
                <i className="bi bi-person-circle"></i>
              </Link>
              <button
                onClick={handleSignOut}
                className="nav-action-btn"
                title="Sign out"
                type="button"
              >
                <i className="bi bi-box-arrow-right"></i>
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="nav-link">Sign In</Link>
              <Link href="/auth/signup" className="btn-nav-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
      {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
    </nav>
  );
}
