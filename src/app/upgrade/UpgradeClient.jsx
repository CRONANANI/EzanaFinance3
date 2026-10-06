'use client';

/**
 * In-app purchase screen for the iOS and Android apps (RevenueCat over the
 * App Store and Google Play). Prices are the store-localised strings the SDK
 * returns, never hard-coded. On the web this page sends you to /pricing.
 *
 * Without NEXT_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY the screen says
 * upgrades are not available yet and shows no price, so a free-features-only
 * build can still be submitted.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isNativeApp, nativePlatform } from '@/lib/native';
import { APP_PLANS, planForProduct } from '@/lib/billing/plans';
import { supabase } from '@/lib/supabase-browser';

const KEYS = {
  ios: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || '',
};

let configuredFor = null;

async function purchases(userId) {
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const apiKey = KEYS[nativePlatform()];
  if (configuredFor !== userId) {
    if (!configuredFor) await Purchases.configure({ apiKey, appUserID: userId });
    else await Purchases.logIn({ appUserID: userId });
    configuredFor = userId;
  }
  return Purchases;
}

export default function UpgradeClient() {
  const router = useRouter();
  const [phase, setPhase] = useState('loading'); // loading | unavailable | signin | ready | error
  const [packages, setPackages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!isNativeApp()) {
      router.replace('/pricing');
      return;
    }
    const real = !!window.Capacitor?.isNativePlatform?.();
    if (!real || !KEYS[nativePlatform()]) {
      setPhase('unavailable');
      return;
    }
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPhase('signin');
        return;
      }
      setUserId(user.id);
      try {
        const P = await purchases(user.id);
        const offerings = await P.getOfferings();
        const list = (offerings?.current?.availablePackages || [])
          .map((pkg) => ({ pkg, plan: planForProduct(pkg.product?.identifier) }))
          .filter((x) => x.plan);
        setPackages(list);
        setPhase(list.length ? 'ready' : 'unavailable');
      } catch {
        setPhase('error');
      }
    })();
  }, [router]);

  const buy = async (pkg) => {
    setBusy(pkg.identifier);
    setMessage(null);
    try {
      const P = await purchases(userId);
      await P.purchasePackage({ aPackage: pkg });
      setMessage('Thank you. Your plan is active; it can take a minute to show everywhere.');
    } catch (e) {
      if (!e?.userCancelled)
        setMessage('The purchase did not go through. You have not been charged.');
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    setMessage(null);
    try {
      const P = await purchases(userId);
      const { customerInfo } = await P.restorePurchases();
      const active = Object.keys(customerInfo?.entitlements?.active || {});
      setMessage(
        active.length ? 'Purchases restored.' : 'No purchases to restore on this account.',
      );
    } catch {
      setMessage('Purchases could not be restored. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const tierOrder = (t) => APP_PLANS.findIndex((p) => p.tier === t);

  return (
    <main id="main-content" className="upg-page">
      <h1 className="upg-title">Upgrade</h1>
      {phase === 'loading' ? <p className="upg-muted">Loading plans</p> : null}
      {phase === 'unavailable' ? (
        <p className="upg-muted">Upgrades are not available in the app yet.</p>
      ) : null}
      {phase === 'error' ? (
        <p className="upg-muted">Plans could not be loaded. Check your connection and try again.</p>
      ) : null}
      {phase === 'signin' ? (
        <p className="upg-muted">
          <Link href="/auth/signin?redirect=/upgrade">Sign in</Link> to see plans.
        </p>
      ) : null}

      {phase === 'ready' ? (
        <>
          <ul className="upg-list">
            {packages
              .slice()
              .sort(
                (a, b) =>
                  tierOrder(a.plan.tier) - tierOrder(b.plan.tier) ||
                  a.plan.period.localeCompare(b.plan.period),
              )
              .map(({ pkg, plan }) => {
                const meta = APP_PLANS.find((p) => p.tier === plan.tier);
                return (
                  <li key={pkg.identifier} className="upg-card">
                    <div className="upg-card-head">
                      <h2 className="upg-name">{meta.name}</h2>
                      <span className="upg-price">
                        {pkg.product.priceString}
                        <span className="upg-per">
                          {plan.period === 'annual' ? ' per year' : ' per month'}
                        </span>
                      </span>
                    </div>
                    <ul className="upg-features">
                      {meta.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="upg-buy"
                      onClick={() => buy(pkg)}
                      disabled={!!busy}
                      data-haptic
                    >
                      {busy === pkg.identifier ? 'Opening' : 'Subscribe'}
                    </button>
                  </li>
                );
              })}
          </ul>
          <button type="button" className="upg-restore" onClick={restore} disabled={!!busy}>
            {busy === 'restore' ? 'Restoring' : 'Restore purchases'}
          </button>
          <p className="upg-legal">
            Payment is charged to your {nativePlatform() === 'ios' ? 'Apple ID' : 'Google Play'}{' '}
            account at confirmation. Subscriptions renew automatically at the same price and period
            unless cancelled at least 24 hours before the end of the current period. Manage or
            cancel in your {nativePlatform() === 'ios' ? 'App Store' : 'Google Play'} account
            settings.
          </p>
        </>
      ) : null}

      {message ? (
        <p className="upg-msg" role="status">
          {message}
        </p>
      ) : null}

      <p className="upg-links">
        <Link href="/terms-of-service">Terms of Use (EULA)</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/privacy-policy">Privacy Policy</Link>
      </p>
    </main>
  );
}
