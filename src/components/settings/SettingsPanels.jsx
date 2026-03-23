'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePartner } from '@/contexts/PartnerContext';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════
   SETTINGS PANELS — 10 panels with full form fields
   ═══════════════════════════════════════════════════════════ */

export function MyDetailsPanel({ onSave }) {
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File must be under 2MB');
      return;
    }
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">My Details</h2>
        <p className="settings-panel-desc">Update your personal information and contact details.</p>
      </div>
      <div className="settings-section">
        <div className="settings-avatar-area">
          <div className="settings-avatar" onClick={() => fileInputRef.current?.click()}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" className="settings-avatar-img" />
            ) : (
              <i className="bi bi-person-fill" />
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} className="settings-avatar-input" />
          <div className="settings-avatar-actions">
            <span className="settings-avatar-name">Profile photo</span>
            <span className="settings-avatar-hint">JPG, PNG. Max 2MB.</span>
            <button type="button" className="settings-btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => fileInputRef.current?.click()}>Upload</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">First name</label>
            <input type="text" className="settings-input" placeholder="John" />
          </div>
          <div className="settings-field">
            <label className="settings-label">Last name</label>
            <input type="text" className="settings-input" placeholder="Doe" />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Email</label>
            <input type="email" className="settings-input" placeholder="john@example.com" />
          </div>
          <div className="settings-field">
            <label className="settings-label">Phone</label>
            <input type="tel" className="settings-input" placeholder="+1 (555) 000-0000" />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Date of birth</label>
            <input type="date" className="settings-input" />
          </div>
          <div className="settings-field">
            <label className="settings-label">Country</label>
            <select className="settings-input">
              <option>United States</option>
              <option>Canada</option>
              <option>United Kingdom</option>
            </select>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">City</label>
            <input type="text" className="settings-input" placeholder="New York" />
          </div>
          <div className="settings-field">
            <label className="settings-label">Timezone</label>
            <select className="settings-input">
              <option>America/New_York (EST)</option>
              <option>America/Los_Angeles (PST)</option>
              <option>America/Chicago (CST)</option>
            </select>
          </div>
        </div>
        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={onSave}>Save changes</button>
        </div>
        <div className="settings-danger-zone">
          <h3 className="settings-danger-title"><i className="bi bi-exclamation-triangle" /> Danger Zone</h3>
          <div className="settings-danger-card">
            <div>
              <strong>Delete account</strong>
              <p>Permanently delete your account and all associated data. This cannot be undone.</p>
            </div>
            <button type="button" className="settings-btn-danger" onClick={() => {
              if (confirm('Are you sure? This will permanently delete your account.')) {
                alert('Account deletion would be processed. Connect to your auth provider to implement.');
              }
            }}>Delete account</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePanel({ onSave }) {
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    website: '',
    twitter: '',
    linkedin: '',
    investorType: 'retail',
    experience: 'intermediate',
    publicProfile: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { isPartner } = usePartner();

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/partner/profile', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.profile) {
          setForm((prev) => ({
            ...prev,
            username: data.profile.username || '',
            displayName: data.profile.display_name || '',
          }));
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };
    loadProfile();
  }, [getToken]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/partner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: form.username || null,
          displayName: form.displayName || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSuccess('Profile saved successfully');
      onSave?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Profile</h2>
        <p className="settings-panel-desc">Control how others see your public profile.</p>
      </div>
      <div className="settings-section">
        {isPartner && (
          <div className="settings-row single">
            <div className="settings-field">
              <label className="settings-label">Platform Username</label>
              <div className="settings-input-row">
                <span className="settings-input-prefix">@</span>
                <input
                  type="text"
                  className="settings-input"
                  value={form.username}
                  onChange={(e) => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_username"
                  maxLength={24}
                />
              </div>
              <span className="settings-field-hint">3-24 characters. Letters, numbers, underscores only. This appears on your hero card and public profile.</span>
            </div>
          </div>
        )}
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Public profile</span>
            <span className="settings-toggle-desc">Allow others to view your profile and activity</span>
          </div>
          <button type="button" className={`settings-switch ${form.publicProfile ? 'on' : ''}`} onClick={() => update('publicProfile', !form.publicProfile)} aria-label="Toggle public profile" />
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Display name</label>
            <input
              type="text"
              className="settings-input"
              placeholder="John D."
              value={form.displayName}
              onChange={(e) => update('displayName', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Bio</label>
            <textarea className="settings-input" placeholder="Tell us about yourself..." rows={4} value={form.bio} onChange={(e) => update('bio', e.target.value)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Investor type</label>
            <select className="settings-input" value={form.investorType} onChange={(e) => update('investorType', e.target.value)}>
              <option value="retail">Individual</option>
              <option value="professional">Professional</option>
              <option value="institutional">Institutional</option>
            </select>
          </div>
          <div className="settings-field">
            <label className="settings-label">Experience level</label>
            <select className="settings-input" value={form.experience} onChange={(e) => update('experience', e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Website</label>
            <input type="url" className="settings-input" placeholder="https://" value={form.website} onChange={(e) => update('website', e.target.value)} />
          </div>
          <div className="settings-field">
            <label className="settings-label">Twitter</label>
            <input type="text" className="settings-input" placeholder="@username" value={form.twitter} onChange={(e) => update('twitter', e.target.value)} />
          </div>
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">LinkedIn</label>
            <input type="url" className="settings-input" placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={(e) => update('linkedin', e.target.value)} />
          </div>
        </div>
        {error && (
          <div className="settings-field-error" style={{ marginBottom: '0.75rem' }}>{error}</div>
        )}
        {success && (
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{success}</div>
        )}
        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', pct: 0 };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const pcts = [0, 20, 40, 60, 80, 100];
  return { score, label: labels[score], pct: pcts[score] };
}

export function PasswordPanel({ onSave }) {
  const [twoFA, setTwoFA] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const strength = passwordStrength(newPassword);
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Password & Security</h2>
        <p className="settings-panel-desc">Manage your password and security settings.</p>
      </div>
      <div className="settings-section">
        <h3 className="settings-section-title"><i className="bi bi-key" />Change password</h3>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Current password</label>
            <input type="password" className="settings-input" placeholder="••••••••" />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">New password</label>
            <input type="password" className="settings-input" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            {newPassword && (
              <div className="settings-password-strength">
                <div className="settings-strength-bar">
                  <div className="settings-strength-fill" style={{ width: `${strength.pct}%`, background: strength.pct < 40 ? '#ef4444' : strength.pct < 70 ? '#f59e0b' : '#10b981' }} />
                </div>
                <span className="settings-strength-label">{strength.label}</span>
              </div>
            )}
          </div>
          <div className="settings-field">
            <label className="settings-label">Confirm new password</label>
            <input type="password" className="settings-input" placeholder="••••••••" />
          </div>
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Two-factor authentication</span>
            <span className="settings-toggle-desc">Add an extra layer of security</span>
          </div>
          <button type="button" className={`settings-switch ${twoFA ? 'on' : ''}`} onClick={() => setTwoFA(!twoFA)} aria-label="Toggle 2FA" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Login alerts</span>
            <span className="settings-toggle-desc">Email when a new device signs in</span>
          </div>
          <button type="button" className={`settings-switch ${loginAlerts ? 'on' : ''}`} onClick={() => setLoginAlerts(!loginAlerts)} aria-label="Toggle login alerts" />
        </div>
        <h3 className="settings-section-title"><i className="bi bi-laptop" />Active sessions</h3>
        <table className="settings-table">
          <thead>
            <tr><th>Device</th><th>Location</th><th>Last active</th><th></th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Chrome on Windows</td>
              <td>New York, US</td>
              <td>Just now</td>
              <td><button type="button" className="settings-btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>Revoke</button></td>
            </tr>
          </tbody>
        </table>
        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={onSave}>Update password</button>
        </div>
      </div>
    </div>
  );
}

export function FamilyPanel({ onSave }) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Family</h2>
        <p className="settings-panel-desc">Manage linked family accounts and sharing.</p>
      </div>
      <div className="settings-section">
        <div className="settings-info-card">
          <strong>Member slots:</strong> 2 of 5 used
        </div>
        <h3 className="settings-section-title"><i className="bi bi-people" />Family members</h3>
        <table className="settings-table">
          <thead>
            <tr><th>Email</th><th>Role</th><th></th></tr>
          </thead>
          <tbody>
            <tr>
              <td>jane@example.com</td>
              <td>Viewer</td>
              <td><button type="button" className="settings-btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>Remove</button></td>
            </tr>
          </tbody>
        </table>
        <h3 className="settings-section-title"><i className="bi bi-person-plus" />Invite member</h3>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Email</label>
            <input type="email" className="settings-input" placeholder="family@example.com" />
          </div>
          <div className="settings-field">
            <label className="settings-label">Role</label>
            <select className="settings-input">
              <option>Viewer</option>
              <option>Editor</option>
            </select>
          </div>
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Share watchlist</span>
            <span className="settings-toggle-desc">Allow family members to see your watchlist</span>
          </div>
          <button type="button" className="settings-switch on" aria-label="Toggle" />
        </div>
        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={onSave}>Send invite</button>
        </div>
      </div>
    </div>
  );
}

export function PlanPanel({ onSave }) {
  const [portalLoading, setPortalLoading] = useState(false);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        window.location.href = '/auth/login?redirect=/settings';
        return;
      }
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open billing portal');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(e.message || 'Billing portal unavailable. Subscribe once from Pricing, or add Stripe keys.');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Plan</h2>
        <p className="settings-panel-desc">Manage your subscription and usage.</p>
      </div>
      <div className="settings-section">
        <div className="settings-info-card">
          <span className="settings-badge green">Current plan</span>
          <strong style={{ marginLeft: '0.5rem' }}>Pro</strong>
        </div>
        <h3 className="settings-section-title"><i className="bi bi-pie-chart" />Usage</h3>
        <div className="settings-field">
          <span className="settings-label">API calls this month</span>
          <div className="settings-usage-bar">
            <div className="settings-usage-fill" style={{ width: '65%' }} />
          </div>
          <div className="settings-usage-text">
            <span>6,500</span>
            <span>10,000 limit</span>
          </div>
        </div>
        <div className="settings-plan-cards">
          <div className="settings-plan-card">
            <div className="settings-plan-name">Free</div>
            <div className="settings-plan-price">$0 <span>/month</span></div>
            <div className="settings-plan-feature"><i className="bi bi-check" />Basic features</div>
            <div className="settings-plan-feature"><i className="bi bi-check" />1,000 API calls</div>
          </div>
          <div className="settings-plan-card current">
            <div className="settings-plan-name">Pro</div>
            <div className="settings-plan-price">$19 <span>/month</span></div>
            <div className="settings-plan-feature"><i className="bi bi-check" />All features</div>
            <div className="settings-plan-feature"><i className="bi bi-check" />10,000 API calls</div>
          </div>
          <div className="settings-plan-card">
            <div className="settings-plan-name">Elite</div>
            <div className="settings-plan-price">$49 <span>/month</span></div>
            <div className="settings-plan-feature"><i className="bi bi-check" />Priority support</div>
            <div className="settings-plan-feature"><i className="bi bi-check" />Unlimited API</div>
          </div>
        </div>
        <div className="settings-btn-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link href="/pricing" className="settings-btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            View plans &amp; checkout
          </Link>
          <button
            type="button"
            className="settings-btn-secondary"
            onClick={openCustomerPortal}
            disabled={portalLoading}
          >
            {portalLoading ? 'Opening…' : 'Manage subscription'}
          </button>
          <button type="button" className="settings-btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function BillingPanel({ onSave }) {
  const [portalLoading, setPortalLoading] = useState(false);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        window.location.href = '/auth/login?redirect=/settings';
        return;
      }
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open billing portal');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(e.message || 'Open the Stripe Customer Portal after your first subscription.');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Billing</h2>
        <p className="settings-panel-desc">Payment methods and billing history.</p>
      </div>
      <div className="settings-section">
        <h3 className="settings-section-title"><i className="bi bi-credit-card" />Payment method</h3>
        <div className="settings-info-card">
          <strong>•••• •••• •••• 4242</strong> — Expires 12/26
        </div>
        <div className="settings-btn-row" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            className="settings-btn-primary"
            onClick={openCustomerPortal}
            disabled={portalLoading}
          >
            {portalLoading ? 'Opening…' : 'Update payment method'}
          </button>
        </div>
        <button type="button" className="settings-btn-secondary">Add payment method</button>
        <h3 className="settings-section-title"><i className="bi bi-geo-alt" />Billing address</h3>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Address</label>
            <input type="text" className="settings-input" placeholder="123 Main St" />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">City</label>
            <input type="text" className="settings-input" placeholder="New York" />
          </div>
          <div className="settings-field">
            <label className="settings-label">ZIP</label>
            <input type="text" className="settings-input" placeholder="10001" />
          </div>
        </div>
        <h3 className="settings-section-title"><i className="bi bi-receipt" />Billing history</h3>
        <table className="settings-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
          </thead>
          <tbody>
            <tr><td>Mar 1, 2025</td><td>Pro subscription</td><td>$19.00</td></tr>
            <tr><td>Feb 1, 2025</td><td>Pro subscription</td><td>$19.00</td></tr>
          </tbody>
        </table>
        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={onSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

export function EmailPanel({ onSave }) {
  const [transactional, setTransactional] = useState(true);
  const [marketing, setMarketing] = useState(false);
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Email</h2>
        <p className="settings-panel-desc">Email preferences and frequency.</p>
      </div>
      <div className="settings-section">
        <h3 className="settings-section-title"><i className="bi bi-envelope" />Transactional</h3>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Order confirmations</span>
            <span className="settings-toggle-desc">Receipts and transaction confirmations</span>
          </div>
          <button type="button" className={`settings-switch ${transactional ? 'on' : ''}`} onClick={() => setTransactional(!transactional)} aria-label="Toggle" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Security alerts</span>
            <span className="settings-toggle-desc">Login alerts and password changes</span>
          </div>
          <button type="button" className="settings-switch on" aria-label="Toggle" />
        </div>
        <h3 className="settings-section-title"><i className="bi bi-megaphone" />Marketing</h3>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Newsletter</span>
            <span className="settings-toggle-desc">Weekly market insights and tips</span>
          </div>
          <button type="button" className={`settings-switch ${marketing ? 'on' : ''}`} onClick={() => setMarketing(!marketing)} aria-label="Toggle" />
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Email frequency</label>
            <select className="settings-input">
              <option>Daily digest</option>
              <option>Weekly digest</option>
              <option>Monthly digest</option>
            </select>
          </div>
        </div>
        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={onSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

export function NotificationsPanel({ onSave }) {
  const [push, setPush] = useState(true);
  const [sound, setSound] = useState(true);
  const [desktop, setDesktop] = useState(false);
  const [quietHours, setQuietHours] = useState(false);
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Notifications</h2>
        <p className="settings-panel-desc">Alert and push notification settings.</p>
      </div>
      <div className="settings-section">
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Push notifications</span>
            <span className="settings-toggle-desc">Receive alerts in browser</span>
          </div>
          <button type="button" className={`settings-switch ${push ? 'on' : ''}`} onClick={() => setPush(!push)} aria-label="Toggle" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Sound</span>
            <span className="settings-toggle-desc">Play sound for new notifications</span>
          </div>
          <button type="button" className={`settings-switch ${sound ? 'on' : ''}`} onClick={() => setSound(!sound)} aria-label="Toggle" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Desktop notifications</span>
            <span className="settings-toggle-desc">Show even when tab is in background</span>
          </div>
          <button type="button" className={`settings-switch ${desktop ? 'on' : ''}`} onClick={() => setDesktop(!desktop)} aria-label="Toggle" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Quiet hours</span>
            <span className="settings-toggle-desc">Mute notifications 10pm–7am</span>
          </div>
          <button type="button" className={`settings-switch ${quietHours ? 'on' : ''}`} onClick={() => setQuietHours(!quietHours)} aria-label="Toggle" />
        </div>
        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={onSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

const INTEGRATIONS = [
  { id: '1', name: 'Brokerage API', icon: 'bi-bank', status: 'connected' },
  { id: '2', name: 'Google Sheets', icon: 'bi-file-earmark-spreadsheet', status: '' },
  { id: '3', name: 'Slack', icon: 'bi-slack', status: '' },
  { id: '4', name: 'Discord', icon: 'bi-discord', status: '' },
  { id: '5', name: 'Zapier', icon: 'bi-lightning', status: '' },
  { id: '6', name: 'Webhook', icon: 'bi-link-45deg', status: '' },
  { id: '7', name: 'API', icon: 'bi-code-slash', status: 'connected' },
  { id: '8', name: 'Excel', icon: 'bi-file-earmark-excel', status: '' },
];

export function IntegrationsPanel({ onSave }) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Integrations</h2>
        <p className="settings-panel-desc">Connect external services and tools.</p>
      </div>
      <div className="settings-section">
        <div className="settings-integrations-grid">
          {INTEGRATIONS.map((int) => (
            <div key={int.id} className={`settings-integration-card ${int.status ? 'connected' : ''}`}>
              <div className="settings-integration-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <i className={`bi ${int.icon}`} />
              </div>
              <div className="settings-integration-body">
                <span className="settings-integration-name">{int.name}</span>
                <span className={`settings-integration-status ${int.status ? 'connected-text' : ''}`}>
                  {int.status || 'Not connected'}
                </span>
              </div>
              <button type="button" className="settings-btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                {int.status ? 'Manage' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={onSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

export function ApiPanel({ onSave }) {
  const [keyVisible, setKeyVisible] = useState(false);
  const apiKey = 'ez_live_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">API</h2>
        <p className="settings-panel-desc">API keys, usage, and webhook configuration.</p>
      </div>
      <div className="settings-section">
        <h3 className="settings-section-title"><i className="bi bi-key" />API key</h3>
        <div className="settings-api-key">
          <code>{keyVisible ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}</code>
          <div className="settings-api-key-actions">
            <button type="button" className="settings-api-key-btn" onClick={() => setKeyVisible(!keyVisible)} title={keyVisible ? 'Hide' : 'Show'}>
              <i className={`bi bi-${keyVisible ? 'eye-slash' : 'eye'}`} />
            </button>
            <button type="button" className="settings-api-key-btn" title="Copy" onClick={() => navigator.clipboard.writeText(apiKey)}>
              <i className="bi bi-clipboard" />
            </button>
          </div>
        </div>
        <div className="settings-field">
          <span className="settings-label">API usage this month</span>
          <div className="settings-usage-bar">
            <div className="settings-usage-fill" style={{ width: '42%' }} />
          </div>
          <div className="settings-usage-text">
            <span>4,200</span>
            <span>10,000 limit</span>
          </div>
        </div>
        <h3 className="settings-section-title"><i className="bi bi-link" />Endpoints</h3>
        <table className="settings-table">
          <thead>
            <tr><th>Endpoint</th><th>Usage</th></tr>
          </thead>
          <tbody>
            <tr><td>GET /api/v1/trades</td><td>1,200</td></tr>
            <tr><td>GET /api/v1/watchlist</td><td>800</td></tr>
          </tbody>
        </table>
        <h3 className="settings-section-title"><i className="bi bi-broadcast" />Webhook</h3>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Webhook URL</label>
            <input type="url" className="settings-input" placeholder="https://your-server.com/webhook" />
          </div>
        </div>
        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={onSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}
