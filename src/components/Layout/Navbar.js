'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { useSidebar } from '@/contexts/SidebarContext';
import { supabase } from '@/lib/supabase';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { toggleNotifications } = useSidebar();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const isLanding = pathname === '/';
  const DASHBOARD_PAGES = ['/home-dashboard', '/watchlist', '/community', '/learning-center', '/inside-the-capitol', '/company-research', '/market-analysis', '/for-the-quants', '/economic-indicators'];
  const isDashboardPage = DASHBOARD_PAGES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isLanding) {
    return (
      <nav className="navbar">
        <div className="nav-container nav-container-centered">
          <div className="nav-spacer" aria-hidden="true" />
          <Link href="/" className="logo logo-centered">
            <span className="logo-text">Ezana Finance</span>
          </Link>
          <ul className="nav-menu">
            <li className="nav-item">
              <a href="#features" className="nav-link">Features</a>
            </li>
            <li className="nav-item">
              <a href="#resources" className="nav-link">Resources</a>
            </li>
            <li className="nav-item">
              <a href="#pricing" className="nav-link">Pricing</a>
            </li>
            <li className="nav-item">
              <a href="#faq" className="nav-link">FAQ</a>
            </li>
            <li className="nav-item">
              <Link href="/auth/signin" className="sign-in-btn">
                Sign In
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    );
  }

  return (
    <nav className="main-nav" id="mainNav">
      <div className="nav-container">
        <Link href="/" className="nav-brand">
          <span className="brand-text">Ezana Finance</span>
        </Link>
        <div className="nav-links">
          <Link href="/home-dashboard" className={`nav-link ${pathname.includes('home-dashboard') ? 'active' : ''}`} data-page="home-dashboard">
            <i className="bi bi-speedometer2"></i>
            <span>Dashboard</span>
          </Link>
          <div className="nav-dropdown">
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
            </div>
          </div>
          <Link href="/watchlist" className={`nav-link ${pathname.includes('watchlist') ? 'active' : ''}`} data-page="watchlist">
            <i className="bi bi-bookmark"></i>
            <span>Watchlist</span>
          </Link>
          <Link href="/community" className={`nav-link ${pathname.includes('community') ? 'active' : ''}`} data-page="community">
            <i className="bi bi-people"></i>
            <span>Community</span>
          </Link>
          <Link href="/learning-center" className={`nav-link ${pathname.includes('learning-center') ? 'active' : ''}`} data-page="learning-center">
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
              <Link href="/signin" className="nav-link">Sign In</Link>
              <Link href="/signup" className="btn-nav-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
