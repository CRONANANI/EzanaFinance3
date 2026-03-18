'use client';

import { useAuth } from '@/components/AuthProvider';
import { usePartner } from '@/contexts/PartnerContext';
import Link from 'next/link';
import '../partner.css';

const QUICK_LINKS = [
  { href: '/partner-dashboard', icon: 'bi-speedometer2', label: 'Dashboard', desc: 'Revenue, copiers, and performance', color: '#10b981' },
  { href: '/partner-community', icon: 'bi-people', label: 'Community', desc: 'Engage followers and copiers', color: '#3b82f6' },
  { href: '/partner-learning', icon: 'bi-mortarboard', label: 'Content Studio', desc: 'Build courses and content', color: '#a78bfa' },
  { href: '/settings', icon: 'bi-gear', label: 'Settings', desc: 'Profile, payouts, and API', color: '#fbbf24' },
];

const ACTIVITY_FEED = [
  { type: 'copier', text: 'Alex M. started copying your portfolio', time: '12 min ago', icon: 'bi-person-plus', color: '#10b981' },
  { type: 'commission', text: 'Commission earned: $47.20 from copy trades', time: '1 hour ago', icon: 'bi-cash-coin', color: '#fbbf24' },
  { type: 'course', text: '3 new enrollments in "Options Trading Basics"', time: '3 hours ago', icon: 'bi-mortarboard', color: '#a78bfa' },
  { type: 'follower', text: 'Sarah K. followed your profile', time: '5 hours ago', icon: 'bi-heart', color: '#f472b6' },
  { type: 'copier', text: 'Mark R. copied your NVDA position', time: '8 hours ago', icon: 'bi-arrow-repeat', color: '#10b981' },
  { type: 'payout', text: 'Monthly payout of $2,340.00 processed', time: '1 day ago', icon: 'bi-bank', color: '#3b82f6' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function PartnerHomePage() {
  const { user } = useAuth();
  const { partnerRole } = usePartner();

  const name = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Partner';

  return (
    <div className="ptr-page">
      <div className="ptr-hero">
        <div className="ptr-hero-content">
          <div className="ptr-hero-badge-row">
            <span className="ptr-verified-badge">
              <i className="bi bi-patch-check-fill" /> Verified {partnerRole === 'creator' ? 'Creator' : partnerRole === 'trader' ? 'Trader' : 'Partner'}
            </span>
          </div>
          <h1 className="ptr-hero-title">{getGreeting()}, {name}</h1>
          <p className="ptr-hero-sub">Welcome to your Partner Hub. Manage your strategies, grow your audience, and track your earnings.</p>

          <div className="ptr-hero-stats">
            <div className="ptr-hero-stat">
              <span className="ptr-hero-stat-value">$12,450</span>
              <span className="ptr-hero-stat-label">Total Earnings</span>
            </div>
            <div className="ptr-hero-stat">
              <span className="ptr-hero-stat-value">847</span>
              <span className="ptr-hero-stat-label">Followers</span>
            </div>
            <div className="ptr-hero-stat">
              <span className="ptr-hero-stat-value">234</span>
              <span className="ptr-hero-stat-label">Active Copiers</span>
            </div>
            <div className="ptr-hero-stat">
              <span className="ptr-hero-stat-value">3</span>
              <span className="ptr-hero-stat-label">Published Courses</span>
            </div>
          </div>
        </div>
        <div className="ptr-hero-glow" />
      </div>

      <div className="ptr-links-grid">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="ptr-link-card">
            <div className="ptr-link-icon" style={{ background: `${link.color}15`, color: link.color }}>
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
          <span className="ptr-card-badge">Live</span>
        </div>
        <div className="ptr-activity-list">
          {ACTIVITY_FEED.map((item, i) => (
            <div key={i} className="ptr-activity-item" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="ptr-activity-icon" style={{ background: `${item.color}15`, color: item.color }}>
                <i className={`bi ${item.icon}`} />
              </div>
              <div className="ptr-activity-body">
                <span className="ptr-activity-text">{item.text}</span>
                <span className="ptr-activity-time">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
