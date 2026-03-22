'use client';

import { useState } from 'react';
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

  const handleGooglePartnerLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=partner`,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="auth-page partner-auth-page">
      <div className="auth-container">
        <div className="auth-card partner-auth-card">
          <div className="auth-logo-wrap">
            <Image src="/ezana-logo.png" alt="Ezana Finance" width={48} height={48} className="nav-logo-img" style={{ objectFit: 'contain' }} />
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

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button className="auth-btn-google pauth-btn-google" onClick={handleGooglePartnerLogin} type="button">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google (Partner)
          </button>

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
