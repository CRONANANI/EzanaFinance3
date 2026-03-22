'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { usePartner } from '@/contexts/PartnerContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AnimatedNav } from '@/components/ui/AnimatedNav';
import '@/components/ui/animated-nav.css';

export function PartnerNavbar() {
  const pathname = usePathname();
  const { verified, partnerRole } = usePartner();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const partnerNavItems = [
    { id: 1, title: 'Home', url: '/partner-home', icon: 'bi-house-door', isActive: pathname === '/partner-home' },
    { id: 2, title: 'Dashboard', url: '/partner-dashboard', icon: 'bi-speedometer2', isActive: pathname?.includes('partner-dashboard') },
    { id: 3, title: 'Community', url: '/partner-community', icon: 'bi-people', isActive: pathname?.includes('partner-community') },
    { id: 4, title: 'Content Studio', url: '/partner-learning', icon: 'bi-mortarboard', isActive: pathname?.includes('partner-learning') },
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
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <nav className="main-nav partner-nav" id="partnerNav">
      <div className="nav-container">
        <div className="nav-left-zone">
          <Link href="/partner-home" className="nav-brand nav-home-btn partner-brand" title="Partner Hub">
            <Image src="/ezana-logo.png" alt="Ezana Finance" width={48} height={48} className="nav-logo-img" style={{ objectFit: 'contain', display: 'block' }} />
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
          <ThemeToggle />
          <Link href="/settings" className="nav-action-btn" title="Settings">
            <i className="bi bi-gear" />
          </Link>
        </div>
      </div>
      {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
    </nav>
  );
}
