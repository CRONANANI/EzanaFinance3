'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  ChevronRight,
  Home,
  LayoutDashboard,
  Bookmark,
  LineChart,
  Banknote,
  Gamepad2,
  ListChecks,
  Landmark,
  BarChart3,
  Globe2,
  Radio,
  CloudSun,
  Target,
  Calculator,
  Sparkles,
  Users,
  MessageSquare,
  Trophy,
  GraduationCap,
  Award,
  Settings,
  UserCircle,
  HelpCircle,
  Building2,
  Network,
  Terminal,
  Crown,
  CreditCard,
  ShoppingCart,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function isActivePath(pathname, href) {
  if (!pathname || !href) return false;
  if (pathname === href) return true;
  if (href === '/home') return false;
  return pathname.startsWith(`${href}/`);
}

/**
 * Authenticated app routes (verified against src/app `page.js` files).
 * Grouped for scannability; only includes routes that exist in the app.
 */
function buildNavGroups(isOrgUser) {
  const overview = {
    label: 'Overview',
    items: [
      { label: 'Home', href: '/home', icon: Home, description: 'Main hub' },
      { label: 'Dashboard', href: '/home-dashboard', icon: LayoutDashboard, description: 'Metrics & summary' },
      { label: 'Watchlist', href: '/watchlist', icon: Bookmark, description: 'Symbols & alerts' },
    ],
  };

  const trading = {
    label: 'Trading',
    items: [
      { label: 'Brokerage & trading', href: '/trading', icon: LineChart, description: 'Live account' },
      { label: 'Trading dashboard', href: '/trading/dashboard', icon: BarChart3, description: 'Orders & activity' },
      { label: 'Mock portfolio', href: '/trading/mock', icon: Gamepad2, description: 'Paper $100K' },
      ...(isOrgUser
        ? [
            {
              label: 'Council trading',
              href: '/org-trading',
              icon: Landmark,
              description: 'Org portfolios & flags',
            },
          ]
        : []),
      { label: 'Open account', href: '/trading/open-account', icon: Banknote, description: 'Start brokerage' },
    ],
  };

  const research = {
    label: 'Research & markets',
    items: [
      { label: 'Inside the Capitol', href: '/inside-the-capitol', icon: Landmark, description: 'Congressional trades' },
      { label: 'Company & portfolio research', href: '/company-research', icon: BarChart3, description: 'Stocks & models' },
      { label: 'Global market analysis', href: '/market-analysis', icon: Globe2, description: 'Sectors & trends' },
      { label: 'Financial analytics', href: '/financial-analytics', icon: LineChart, description: 'Deep metrics' },
      { label: 'Alternative markets', href: '/alternative-markets', icon: Globe2, description: 'Crypto & commodities' },
      { label: 'Ezana Echo', href: '/ezana-echo', icon: Radio, description: 'Articles & insights' },
      { label: 'Kairos Signal', href: '/kairos-signal', icon: CloudSun, description: 'Weather & macro' },
      { label: 'Betting markets', href: '/betting-markets', icon: Target, description: 'Odds & EV' },
      { label: 'For the Quants', href: '/for-the-quants', icon: Calculator, description: 'Backtests & tools' },
      { label: 'Centaur Intelligence', href: '/centaur-intelligence', icon: Sparkles, description: 'AI assistant' },
    ],
  };

  const globalRank = {
    label: 'Rankings & tools',
    items: [
      { label: 'Empire rankings', href: '/empire-ranking', icon: Crown, description: 'Leaders & scores' },
      { label: 'Leaderboard', href: '/leaderboard', icon: Trophy, description: 'Top performers' },
      { label: 'Terminal', href: '/terminal', icon: Terminal, description: 'Market terminal' },
    ],
  };

  const community = !isOrgUser
    ? {
        label: 'Community',
        items: [
          { label: 'Community feed', href: '/community', icon: Users, description: 'Posts & people' },
          { label: 'Messages', href: '/community/messages', icon: MessageSquare, description: 'Direct messages' },
        ],
      }
    : {
        label: 'Organization',
        items: [
          { label: 'Team hub', href: '/org-team-hub', icon: Building2, description: 'Council workspace' },
          { label: 'Council trading', href: '/org-trading', icon: LineChart, description: 'Mock books & flags' },
          { label: 'Hierarchy', href: '/org-team-hub/hierarchy', icon: Network, description: 'Structure' },
        ],
      };

  const learning = {
    label: 'Learning',
    items: [
      { label: 'Learning center', href: '/learning-center', icon: GraduationCap, description: 'Courses' },
      { label: 'Badges', href: '/learning-center/badges', icon: Award, description: 'Achievements' },
    ],
  };

  const account = {
    label: 'Account & help',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings, description: 'Preferences & plan' },
      { label: 'Profile & appearance', href: '/user-profile-settings', icon: UserCircle, description: 'Your profile' },
      { label: 'Select plan', href: '/select-plan', icon: CreditCard, description: 'Upgrade' },
      { label: 'Subscribe', href: '/subscribe', icon: ShoppingCart, description: 'Checkout' },
      { label: 'Onboarding', href: '/onboarding', icon: ListChecks, description: 'Get started' },
      { label: 'Help center', href: '/help-center', icon: HelpCircle, description: 'Guides & support' },
    ],
  };

  return [overview, trading, research, globalRank, community, learning, account];
}

/** Partner / creator shell — routes under (dashboard) used from partner chrome */
function buildPartnerNavGroups() {
  return [
    {
      label: 'Partner',
      items: [
        { label: 'Partner home', href: '/partner-home', icon: Home, description: 'Hub' },
        { label: 'Partner dashboard', href: '/partner-dashboard', icon: LayoutDashboard, description: 'Metrics' },
        { label: 'Partner community', href: '/partner-community', icon: Users, description: 'Network' },
        { label: 'Content studio', href: '/partner-learning', icon: GraduationCap, description: 'Courses & content' },
      ],
    },
    {
      label: 'Research',
      items: [
        { label: 'Centaur Intelligence', href: '/centaur-intelligence', icon: Sparkles, description: 'AI assistant' },
        { label: 'Kairos Signal', href: '/kairos-signal', icon: CloudSun, description: 'Weather & macro' },
        { label: 'Inside the Capitol', href: '/inside-the-capitol', icon: Landmark, description: 'Congressional trades' },
        { label: 'Company & portfolio research', href: '/company-research', icon: BarChart3, description: 'Analysis' },
        { label: 'Global market analysis', href: '/market-analysis', icon: Globe2, description: 'Trends' },
        { label: 'For the Quants', href: '/for-the-quants', icon: Calculator, description: 'Quant tools' },
        { label: 'Betting markets', href: '/betting-markets', icon: Target, description: 'Odds & EV' },
        { label: 'Ezana Echo', href: '/ezana-echo', icon: Radio, description: 'Articles' },
        { label: 'Alternative markets', href: '/alternative-markets', icon: Globe2, description: 'Crypto & commodities' },
        { label: 'Financial analytics', href: '/financial-analytics', icon: LineChart, description: 'Deep metrics' },
      ],
    },
    {
      label: 'Account & help',
      items: [
        { label: 'Settings', href: '/settings', icon: Settings, description: 'Preferences' },
        { label: 'Help center', href: '/help-center', icon: HelpCircle, description: 'Support' },
      ],
    },
  ];
}

export function MobileAuthNavDrawer({ open, onClose, isOrgUser = false, variant = 'user', onLogout }) {
  const pathname = usePathname();
  const groups =
    variant === 'partner' ? buildPartnerNavGroups() : buildNavGroups(isOrgUser);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10060] flex md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close menu"
        onClick={onClose}
      />
      <nav
        className={cn(
          'mobile-auth-drawer',
          'absolute right-0 top-0 flex h-full w-[min(100%,20rem)] max-w-sm flex-col',
          'border-l border-border bg-card text-foreground shadow-xl'
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground transition hover:bg-muted"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {groups.map((group) => (
            <section key={group.label} className="py-3">
              <h3 className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <ul>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={`${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 border-l-2 px-4 py-3 text-sm font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-transparent text-foreground hover:bg-muted/80'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            active ? 'text-primary' : 'text-muted-foreground'
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{item.label}</div>
                          {item.description && (
                            <div className="truncate text-[11px] font-normal text-muted-foreground">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            active ? 'text-primary' : 'text-muted-foreground/50'
                          )}
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {onLogout && (
          <div className="mobile-drawer-footer shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="mobile-drawer-logout"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </nav>
    </div>,
    document.body
  );
}

export default MobileAuthNavDrawer;
