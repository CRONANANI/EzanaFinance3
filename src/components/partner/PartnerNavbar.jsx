'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { usePartner } from '@/contexts/PartnerContext';
import { AnimatedNav } from '@/components/ui/AnimatedNav';
import '@/components/ui/animated-nav.css';
import '@/app/(dashboard)/partner.css';
import { PARTNER_RESEARCH_ROUTES } from '@/lib/partner-chrome';

export function PartnerNavbar() {
  const pathname = usePathname();
  const { verified, partnerRole } = usePartner();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);

  const isResearchActive = PARTNER_RESEARCH_ROUTES.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

  const partnerNavItems = [
    { id: 1, title: 'Home', url: '/partner-home', icon: 'bi-house-door', isActive: pathname === '/partner-home' },
    { id: 2, title: 'Dashboard', url: '/partner-dashboard', icon: 'bi-speedometer2', isActive: pathname?.includes('partner-dashboard') },
    { id: 3, title: 'Community', url: '/partner-community', icon: 'bi-people', isActive: pathname?.includes('partner-community') },
    { id: 4, title: 'Content Studio', url: '/partner-learning', icon: 'bi-mortarboard', isActive: pathname?.includes('partner-learning') },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
    setResearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const closeResearch = () => {
    setResearchOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="main-nav partner-nav" id="partnerNav">
      <div className="nav-container">
        <div className="nav-left-zone">
          <Link href="/partner-home" className="nav-brand nav-home-btn partner-brand" title="Partner Hub">
            <Image src="/ezana-nav-logo.png" alt="Ezana Finance" width={40} height={34} className="nav-logo-img" style={{ objectFit: 'contain', display: 'block' }} />
          </Link>
          <div className="partner-badge-nav">
            <i className="bi bi-patch-check-fill" />
            <span>Partner</span>
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

        <AnimatedNav items={partnerNavItems} accentColor="#d4a853" />
        <div className={`nav-links ${mobileMenuOpen ? 'nav-links-open' : ''}`}>
          <Link href="/partner-home" className={`nav-link ${pathname === '/partner-home' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-house-door" />
            <span>Home</span>
          </Link>
          <Link href="/partner-dashboard" className={`nav-link ${pathname?.includes('partner-dashboard') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-speedometer2" />
            <span>Dashboard</span>
          </Link>

          <div
            className="nav-dropdown-wrapper partner-research-wrap"
            onMouseEnter={() => setResearchOpen(true)}
            onMouseLeave={() => setResearchOpen(false)}
          >
            <button
              type="button"
              className={`nav-link partner-research-trigger ${isResearchActive ? 'active' : ''}`}
              onClick={() => setResearchOpen((o) => !o)}
              aria-expanded={researchOpen}
              aria-haspopup="true"
            >
              <i className="bi bi-search" />
              <span>Research</span>
              <i className="bi bi-chevron-down partner-research-chevron" />
            </button>
            {researchOpen && (
              <div className="nav-dropdown partner-nav-dropdown">
                <Link href="/inside-the-capitol" className="nav-dropdown-item" onClick={closeResearch}>
                  <i className="bi bi-bank" />
                  <div><span className="nav-dropdown-title">Inside The Capitol</span><span className="nav-dropdown-desc">Congressional trading</span></div>
                </Link>
                <Link href="/company-research" className="nav-dropdown-item" onClick={closeResearch}>
                  <i className="bi bi-building" />
                  <div><span className="nav-dropdown-title">Company Research</span><span className="nav-dropdown-desc">Financial analysis</span></div>
                </Link>
                <Link href="/market-analysis" className="nav-dropdown-item" onClick={closeResearch}>
                  <i className="bi bi-graph-up" />
                  <div><span className="nav-dropdown-title">Market Analysis</span><span className="nav-dropdown-desc">Global markets</span></div>
                </Link>
                <Link href="/for-the-quants" className="nav-dropdown-item" onClick={closeResearch}>
                  <i className="bi bi-calculator" />
                  <div><span className="nav-dropdown-title">For The Quants</span><span className="nav-dropdown-desc">Quant tools</span></div>
                </Link>
                <Link href="/betting-markets" className="nav-dropdown-item" onClick={closeResearch}>
                  <i className="bi bi-trophy" />
                  <div><span className="nav-dropdown-title">Betting Markets</span><span className="nav-dropdown-desc">Odds & predictions</span></div>
                </Link>
                <Link href="/ezana-echo" className="nav-dropdown-item" onClick={closeResearch}>
                  <i className="bi bi-newspaper" />
                  <div><span className="nav-dropdown-title">Ezana Echo</span><span className="nav-dropdown-desc">Articles & insights</span></div>
                </Link>
                <Link href="/alternative-markets" className="nav-dropdown-item" onClick={closeResearch}>
                  <i className="bi bi-globe2" />
                  <div><span className="nav-dropdown-title">Alternative Markets</span><span className="nav-dropdown-desc">Crypto & commodities</span></div>
                </Link>
                <Link href="/financial-analytics" className="nav-dropdown-item" onClick={closeResearch}>
                  <i className="bi bi-pie-chart" />
                  <div><span className="nav-dropdown-title">Financial Analytics</span><span className="nav-dropdown-desc">Deep metrics</span></div>
                </Link>
              </div>
            )}
          </div>

          <Link href="/partner-community" className={`nav-link ${pathname?.includes('partner-community') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-people" />
            <span>Community</span>
          </Link>
          <Link href="/partner-learning" className={`nav-link ${pathname?.includes('partner-learning') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <i className="bi bi-mortarboard" />
            <span>Content Studio</span>
          </Link>
        </div>

        <div className="nav-actions">
          <Link href="/settings" className="nav-action-btn nav-settings-gear" title="Settings" aria-label="Settings">
            <i className="bi bi-gear" />
          </Link>
        </div>
      </div>
      {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
    </nav>
  );
}
