'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AnimatedNav } from '@/components/ui/AnimatedNav';
import '@/components/ui/animated-nav.css';
import '@/app/(dashboard)/partner.css';
import { MobileAuthNavDrawer } from '@/components/Layout/MobileAuthNavDrawer';

export function PartnerNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const partnerNavItems = [
    { id: 1, title: 'Home', url: '/partner-home', icon: 'bi-house-door', isActive: pathname === '/partner-home' },
    { id: 2, title: 'Dashboard', url: '/partner-dashboard', icon: 'bi-speedometer2', isActive: pathname?.includes('partner-dashboard') },
    { id: 3, title: 'Community', url: '/partner-community', icon: 'bi-people', isActive: pathname?.includes('partner-community') },
    { id: 4, title: 'Content Studio', url: '/partner-learning', icon: 'bi-mortarboard', isActive: pathname?.includes('partner-learning') },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="main-nav partner-nav" id="partnerNav">
      <div className="nav-container">
        <div className="nav-left-zone">
          <Link href="/partner-home" className="nav-brand nav-home-btn partner-brand" title="Partner Hub">
            <EzanaNavLogo />
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
        <MobileAuthNavDrawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          variant="partner"
        />

        <div className="nav-actions">
          <Link href="/settings" className="nav-action-tap" title="Settings" aria-label="Settings">
            <span className="nav-action-inner nav-settings-gear">
              <i className="bi bi-gear" aria-hidden="true" />
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="nav-action-tap"
            title="Log out"
            aria-label="Log out"
          >
            <span className="nav-action-inner nav-logout-btn">
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
