'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import './partner-login.css';

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('error');
    if (e) {
      try {
        setError(decodeURIComponent(e));
      } catch {
        setError(e);
      }
    }
  }, []);

  const validatePartnerStatus = async (userId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.partner_role) return true;

    const { data: partner } = await supabase
      .from('partners')
      .select('id, partner_role, verified, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return !!partner;
  };

  const handlePartnerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr) throw authErr;

      const isPartner = await validatePartnerStatus(data.user.id);

      if (!isPartner) {
        await supabase.auth.signOut();
        throw new Error(
          'This account is not registered as a partner. If you believe this is an error, contact support@ezana.world or apply to become a partner.'
        );
      }

      router.push('/partner-home');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page partner-auth-page">
      <div className="auth-container">
        <div className="auth-card partner-auth-card">
          <div className="auth-logo-wrap">
            <Image src="/ezana-logo.svg" alt="Ezana Finance" width={93} height={93} className="nav-logo-img" style={{ objectFit: 'contain' }} />
            <span className="auth-logo-text" style={{ color: '#d4a853' }}>Ezana Finance</span>
          </div>

          <div className="pauth-badge">
            <i className="bi bi-patch-check-fill" />
            <span>Partner Login</span>
          </div>

          <h1 className="auth-title pauth-title">Welcome back, Partner</h1>
          <p className="auth-subtitle">Sign in to access your Partner Hub, earnings, and content studio</p>

          {error && (
            <div className="auth-error pauth-error">
              <i className="bi bi-exclamation-triangle" /> {error}
            </div>
          )}

          <form onSubmit={handlePartnerLogin} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Partner Email</label>
              <input
                className="auth-input pauth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@example.com"
                required
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className="auth-input pauth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="auth-row">
              <label className="auth-checkbox-wrap">
                <input type="checkbox" className="auth-checkbox" />
                <span>Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="auth-link pauth-link">Forgot password?</Link>
            </div>

            <button type="submit" className="auth-btn-primary pauth-btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <i className="bi bi-shield-check" /> Verifying partner status...
                </>
              ) : (
                <>
                  <i className="bi bi-patch-check-fill" /> Sign In as Partner
                </>
              )}
            </button>
          </form>

          <p className="auth-footer-text">
            Not a partner? <Link href="/auth/signin" className="auth-link pauth-link">Login as regular user</Link>
          </p>

          <p className="auth-footer-text" style={{ marginTop: '0.5rem' }}>
            Want to become a partner? <Link href="/auth/partner/apply" className="auth-link pauth-link">Apply here</Link>
          </p>
        </div>
      </div>

      <div className="pauth-bg-glow" />
    </div>
  );
}
