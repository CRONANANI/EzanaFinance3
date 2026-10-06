'use client';

/**
 * Mounted once in the root layout. On the web it renders nothing and does
 * nothing. Inside the iOS and Android apps it:
 *   - marks <html> with .is-native (safe areas, web-only rules in native.css)
 *   - keeps the status bar style in step with the theme
 *   - Android back button: back in history, or minimise at the root
 *   - opens external links (other origins, target=_blank) in the in-app browser
 *   - gives a light haptic tick on primary actions ([data-haptic])
 *   - refreshes the session when the app returns to the foreground
 *   - routes deep links and push taps to their page
 *   - shows the Face ID / fingerprint lock when it is turned on
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isNativeApp, nativePlatform } from '@/lib/native';
import { supabase } from '@/lib/supabase-browser';
import { disableNativePush, refreshNativePushIfGranted } from '@/lib/native-push-client';
import {
  authenticateBiometric,
  getBiometricLockEnabled,
  shouldRelock,
} from '@/lib/native-biometric';
import './native.css';

const SITE_HOSTS = new Set(['ezana.world', 'www.ezana.world']);

/** Same-site path for a URL on ezana.world (or relative), else null. */
function internalPath(href) {
  try {
    const u = new URL(href, window.location.origin);
    if (u.origin === window.location.origin || SITE_HOSTS.has(u.hostname)) {
      return `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function NativeBridge() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [locked, setLocked] = useState(false);
  const pausedAt = useRef(null);

  useEffect(() => {
    if (!isNativeApp()) return undefined;
    setActive(true);
    const root = document.documentElement;
    root.classList.add('is-native', `is-native-${nativePlatform() || 'app'}`);
    /* Edge to edge in the app only; the website keeps its viewport. */
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp && !/viewport-fit/.test(vp.content)) vp.content = `${vp.content}, viewport-fit=cover`;
    const real = !!window.Capacitor?.isNativePlatform?.();
    const cleanups = [];

    /* External links open in the in-app browser. */
    const onClick = async (e) => {
      const hapticTarget = e.target.closest?.('[data-haptic]');
      if (hapticTarget && real) {
        import('@capacitor/haptics')
          .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
          .catch(() => {});
      }
      const a = e.target.closest?.('a[href]');
      if (!a || e.defaultPrevented) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || /^(mailto|tel|sms):/i.test(href)) return;
      const path = internalPath(href);
      if (path && a.target !== '_blank') return;
      e.preventDefault();
      if (path) {
        router.push(path);
        return;
      }
      if (real) {
        const { Browser } = await import('@capacitor/browser');
        Browser.open({ url: new URL(href, window.location.href).toString() });
      } else {
        window.open(href, '_blank', 'noopener');
      }
    };
    document.addEventListener('click', onClick, true);
    cleanups.push(() => document.removeEventListener('click', onClick, true));

    /* Sign-out disables this device's push token. */
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') disableNativePush();
    });
    cleanups.push(() => authSub?.subscription?.unsubscribe());

    if (!real) return () => cleanups.forEach((fn) => fn());

    let disposed = false;
    const setup = async () => {
      const [{ App }, { StatusBar, Style }, { PushNotifications }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/status-bar'),
        import('@capacitor/push-notifications'),
      ]);
      if (disposed) return;

      /* Status bar follows the theme class on <html>. */
      const syncBar = () => {
        const dark = root.classList.contains('dark');
        StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
      };
      syncBar();
      const mo = new MutationObserver(syncBar);
      mo.observe(root, { attributes: true, attributeFilter: ['class'] });
      cleanups.push(() => mo.disconnect());

      const handles = await Promise.all([
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else App.minimizeApp();
        }),
        App.addListener('pause', () => {
          pausedAt.current = Date.now();
        }),
        App.addListener('resume', async () => {
          supabase.auth.getSession().then(({ data }) => {
            if (data?.session) supabase.auth.refreshSession().catch(() => {});
          });
          const away = pausedAt.current ? Date.now() - pausedAt.current : 0;
          if (shouldRelock(await getBiometricLockEnabled(), away)) setLocked(true);
        }),
        App.addListener('appUrlOpen', ({ url }) => {
          const path = internalPath(url);
          if (path) router.push(path);
        }),
        PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
          const path = internalPath(notification?.data?.url || '/home');
          if (path) router.push(path);
        }),
      ]);
      cleanups.push(() => handles.forEach((h) => h.remove()));

      if (await getBiometricLockEnabled()) setLocked(true);
      refreshNativePushIfGranted().catch(() => {});
    };
    /* A plugin that fails to load must not take the page down with it. */
    setup().catch((e) => console.warn('[native] bridge setup', e?.message || e));

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, [router]);

  if (!active || !locked) return null;
  return <BiometricLockScreen onUnlock={() => setLocked(false)} />;
}

function BiometricLockScreen({ onUnlock }) {
  const [failed, setFailed] = useState(false);
  const tried = useRef(false);

  const unlock = async () => {
    setFailed(false);
    if (await authenticateBiometric()) onUnlock();
    else setFailed(true);
  };

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="native-lock" role="dialog" aria-modal="true" aria-labelledby="native-lock-t">
      <i className="bi bi-shield-lock native-lock-icon" aria-hidden="true" />
      <h1 id="native-lock-t" className="native-lock-title">
        Ezana is locked
      </h1>
      {failed ? <p className="native-lock-msg">Not unlocked. Try again.</p> : null}
      <button type="button" className="native-lock-btn" onClick={unlock}>
        Unlock
      </button>
    </div>
  );
}
