'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isLanding = pathname === '/';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isLanding) {
    return (
      <nav className="navbar">
        <div className="nav-container">
          <Link href="/" className="logo">
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
              <a href="#faq" className="nav-link">FAQ</a>
            </li>
            <li className="nav-item">
              <Link href="/signin" className="nav-link">Sign In</Link>
            </li>
            <li className="nav-item">
              <Link href="/signup" className="btn-nav-primary">Sign Up</Link>
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
              <Link href="/economic-indicators" className="dropdown-item">
                <i className="bi bi-currency-dollar"></i>
                <div><div className="item-title">Economic Indicators</div><div className="item-desc">Fed tracking</div></div>
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
          <button className="nav-action-btn theme-toggle" onClick={toggleTheme} title="Toggle theme" type="button">
            <i className={`bi ${theme === 'dark' ? 'bi-sun-fill light-icon' : 'bi-moon-fill dark-icon'}`}></i>
          </button>
          <button className="nav-action-btn notification-toggle" title="Notifications" type="button">
            <i className="bi bi-bell"></i>
            <span className="notification-badge">3</span>
          </button>
          {user ? (
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
