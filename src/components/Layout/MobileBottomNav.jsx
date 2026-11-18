'use client';

/**
 * Mobile bottom bar (Nov 18 2026: compact and customisable).
 *
 * About 48px tall plus the safe area (it was about 72px and covered taps near
 * the bottom of long pages). Trade stays in the centre; the four other slots
 * are the member's choice, kept per browser (lib/mobile-nav/catalog.js).
 * Customise by pressing and holding any tab, or from Customize bottom bar in
 * the menu drawer; both open the same sheet. Partners keep their fixed bar.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { usePartner } from '@/contexts/PartnerContext';
import { matchesPartnerRouteList, PARTNER_SHARED_APP_ROUTES } from '@/lib/partner-chrome';
import {
  CHANGE_EVENT,
  DEFAULT_SLOTS,
  OPEN_EVENT,
  readSlots,
  itemFor,
} from '@/lib/mobile-nav/catalog';
import { MobileNavCustomizer } from './MobileNavCustomizer';

const HOLD_MS = 550;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isPartner, isLoading } = usePartner();
  const isPartnerRoute = pathname?.startsWith('/partner-');
  const isSharedPartner =
    !isLoading && isPartner && matchesPartnerRouteList(pathname ?? '', PARTNER_SHARED_APP_ROUTES);
  const isPartnerExperience = isPartnerRoute || isSharedPartner;

  const profileHandle =
    user?.user_metadata?.username ||
    user?.user_metadata?.profile_username ||
    user?.id ||
    '';
  const profileHref = profileHandle ? `/profile/${profileHandle}` : '/community';

  /* Defaults on the server and first paint; the stored choice after mount. */
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setSlots(readSlots());
    const onChange = (e) => setSlots(Array.isArray(e.detail) ? e.detail : readSlots());
    const onOpen = () => setEditing(true);
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  /* Press and hold a tab to customise. A hold suppresses the tap's click. */
  const holdTimer = useRef(null);
  const held = useRef(false);
  const startHold = useCallback(() => {
    held.current = false;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      held.current = true;
      setEditing(true);
    }, HOLD_MS);
  }, []);
  const endHold = useCallback(() => clearTimeout(holdTimer.current), []);
  const onClickCapture = useCallback((e) => {
    if (held.current) {
      e.preventDefault();
      e.stopPropagation();
      held.current = false;
    }
  }, []);

  const trade = { id: 'trade', href: '/trading', icon: 'bi-lightning-charge', label: 'Trade' };
  const chosen = slots.map((id) => itemFor(id, profileHref)).filter(Boolean);
  const userItems = [...chosen.slice(0, 2), { ...trade, center: true }, ...chosen.slice(2, 4)];

  const partnerItems = [
    { id: 'p-home', href: '/partner-home', icon: 'bi-house', label: 'Home' },
    { id: 'p-dash', href: '/partner-dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
    {
      id: 'p-community',
      href: '/partner-community',
      icon: 'bi-people',
      label: 'Community',
      center: true,
    },
    { id: 'p-creator', href: '/partner-learning', icon: 'bi-mortarboard', label: 'Creator' },
    { id: 'p-profile', href: profileHref, icon: 'bi-person-circle', label: 'Profile' },
  ];

  const items = isPartnerExperience ? partnerItems : userItems;
  const isActive = (item) => {
    if (!pathname) return false;
    if (item.href.startsWith('/profile/')) return pathname.startsWith('/profile/');
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <>
      <nav
        className={`mobile-bottom-nav ${isPartnerExperience ? 'partner-nav' : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
        onClickCapture={onClickCapture}
      >
        {items.map((item) => {
          const active = isActive(item);
          const holdable = !isPartnerExperience;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`mobile-bottom-nav-item ${item.center ? 'mobile-bottom-nav-center' : ''} ${active ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onTouchStart={holdable ? startHold : undefined}
              onTouchEnd={holdable ? endHold : undefined}
              onTouchMove={holdable ? endHold : undefined}
              onContextMenu={holdable ? (e) => e.preventDefault() : undefined}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {editing && !isPartnerExperience ? (
        <MobileNavCustomizer
          slots={slots}
          profileHref={profileHref}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  );
}
