'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AccountLockedPage() {
  const router = useRouter();
  const [reason, setReason] = useState(null);
  const [email, setEmail] = useState(null);
  const [lockedAt, setLockedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setSessionEnded(true);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_disabled, disabled_reason, disabled_at')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!profile?.is_disabled) {
        router.replace('/home-dashboard');
        return;
      }

      setEmail(user.email);
      setReason(profile.disabled_reason);
      setLockedAt(profile.disabled_at);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/auth/signin');
  };

  if (loading) {
    return (
      <div className="acl-container">
        <div className="acl-card acl-card-loading">
          <div className="acl-spinner" />
        </div>
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="acl-container">
        <div className="acl-card">
          <div className="acl-icon-wrap">
            <i className="bi bi-shield-lock-fill acl-icon" />
          </div>
          <h1 className="acl-title">Account Locked</h1>
          <p className="acl-subtitle">
            Your browsing session was ended because this account no longer has access. Sign in again to see
            account-specific details, or contact support.
          </p>
          <div className="acl-actions">
            <a href="mailto:support@ezana.world" className="acl-btn acl-btn-primary">
              <i className="bi bi-envelope" />
              Contact Support
            </a>
            <a href="/auth/signin" className="acl-btn acl-btn-secondary">
              Sign In
            </a>
          </div>
          <p className="acl-footer-note">
            If you believe this is an error, email support and include the address you use to log in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="acl-container">
      <div className="acl-card">
        <div className="acl-icon-wrap">
          <i className="bi bi-shield-lock-fill acl-icon" />
        </div>

        <h1 className="acl-title">Account Locked</h1>

        <p className="acl-subtitle">Access to this account has been suspended.</p>

        {reason && (
          <div className="acl-reason">
            <span className="acl-reason-label">Reason</span>
            <p className="acl-reason-text">{reason}</p>
          </div>
        )}

        <div className="acl-meta">
          <div className="acl-meta-row">
            <span className="acl-meta-label">Account</span>
            <span className="acl-meta-value">{email}</span>
          </div>
          {lockedAt && (
            <div className="acl-meta-row">
              <span className="acl-meta-label">Locked since</span>
              <span className="acl-meta-value">
                {new Date(lockedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          )}
        </div>

        <div className="acl-actions">
          <a href="mailto:support@ezana.world" className="acl-btn acl-btn-primary">
            <i className="bi bi-envelope" />
            Contact Support
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="acl-btn acl-btn-secondary"
          >
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>

        <p className="acl-footer-note">
          If you believe this is an error, please contact support and reference this account email.
        </p>
      </div>
    </div>
  );
}
