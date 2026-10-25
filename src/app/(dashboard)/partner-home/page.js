'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePartner } from '@/contexts/PartnerContext';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { PartnerBadges } from '@/components/partner/PartnerBadges';
import { PartnerPreviewEmpty } from '@/components/partner/PartnerPreviewEmpty';
import { usePartnerPayouts, fmtUsdCents } from '@/hooks/usePartnerPayouts';
import '../partner.css';
import '@/components/partner/badges.css';

const QUICK_LINKS = [
  {
    href: '/partner-dashboard',
    icon: 'bi-speedometer2',
    label: 'Dashboard',
    desc: 'Revenue, copiers, and performance',
    color: '#10b981',
  },
  {
    href: '/partner-community',
    icon: 'bi-people',
    label: 'Community',
    desc: 'Engage followers and copiers',
    color: '#3b82f6',
  },
  {
    href: '/partner-learning',
    icon: 'bi-mortarboard',
    label: 'Creator Studio',
    desc: 'Build courses and content',
    color: '#a78bfa',
  },
  {
    href: '/settings',
    icon: 'bi-gear',
    label: 'Settings',
    desc: 'Profile, payouts, and API',
    color: '#fbbf24',
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function PartnerHomePage() {
  const { user } = useAuth();
  const { partnerRole, verified } = usePartner();
  const { loading: payoutsLoading, pendingCents, lifetimeCents } = usePartnerPayouts();
  const [profile, setProfile] = useState(null);

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const profileRes = await fetch('/api/partner/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
      } catch {}
    };
    fetchProfile();
  }, [getToken]);

  const displayName =
    profile?.username ||
    profile?.display_name ||
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Partner';

  return (
    <div className="ptr-page">
      <div className="ptr-hero">
        <div className="ptr-hero-left">
          {/* QA PAR-7: "Verified" only when partners.verified is true. */}
          {verified || profile?.verified === true ? (
            <div className="ptr-hero-badge-row">
              <span className="ptr-verified-badge">
                <i className="bi bi-patch-check-fill" /> Verified{' '}
                {partnerRole === 'creator'
                  ? 'Creator'
                  : partnerRole === 'trader'
                    ? 'Trader'
                    : 'Partner'}
              </span>
            </div>
          ) : null}
          <h1 className="ptr-hero-title">
            {getGreeting()}, {displayName}
          </h1>
          <p className="ptr-hero-sub">
            Welcome to your Partner Hub. Manage your strategies, grow your audience, and track your
            earnings.
          </p>
          <div className="ptr-hero-stats">
            <div className="ptr-hero-stat">
              <span className="ptr-hero-stat-value">
                {payoutsLoading || lifetimeCents == null ? '-' : fmtUsdCents(lifetimeCents)}
              </span>
              <span className="ptr-hero-stat-label">Lifetime paid</span>
            </div>
            <div className="ptr-hero-stat">
              <span className="ptr-hero-stat-value">
                {payoutsLoading || pendingCents == null ? '-' : fmtUsdCents(pendingCents)}
              </span>
              <span className="ptr-hero-stat-label">Pending payout</span>
            </div>
          </div>
        </div>

        <div className="ptr-hero-right">
          <div className="ptr-hero-identity-row">
            <div className="ptr-hero-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} />
              ) : (
                <span className="ptr-hero-avatar-initials">
                  {(displayName || 'P')[0].toUpperCase()}
                </span>
              )}
            </div>
            <PartnerBadges />
          </div>
        </div>

        <div className="ptr-hero-glow" />
      </div>

      <div className="ptr-links-grid">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="ptr-link-card">
            <div
              className="ptr-link-icon"
              style={{ background: `${link.color}15`, color: link.color }}
            >
              <i className={`bi ${link.icon}`} />
            </div>
            <div className="ptr-link-text">
              <span className="ptr-link-label">{link.label}</span>
              <span className="ptr-link-desc">{link.desc}</span>
            </div>
            <i className="bi bi-arrow-right ptr-link-arrow" />
          </Link>
        ))}
      </div>

      <div className="ptr-card">
        <div className="ptr-card-header">
          <h3>Recent Activity</h3>
        </div>
        <PartnerPreviewEmpty icon="bi-activity">
          New copiers, followers, enrollments and commissions will show up here.
        </PartnerPreviewEmpty>
      </div>
    </div>
  );
}
