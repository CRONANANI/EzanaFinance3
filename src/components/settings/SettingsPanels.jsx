'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePartner } from '@/contexts/PartnerContext';
import { supabase } from '@/lib/supabase';
import { ManageBillingButton } from '@/components/ManageBillingButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/components/AuthProvider';

/* ═══════════════════════════════════════════════════════════
   SETTINGS PANELS — 10 panels with full form fields
   ═══════════════════════════════════════════════════════════ */

export function MyDetailsPanel({ onSave, settings, updateSetting }) {
  const { user } = useAuth();
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

  const avatarSrc = avatarPreview || settings?.avatar_url;

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">My Details</h2>
        <p className="settings-panel-desc">Update your personal information and contact details.</p>
      </div>
      <div className="settings-section">
        <div className="settings-avatar-area">
          <div className="settings-avatar" onClick={() => fileInputRef.current?.click()}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar preview" className="settings-avatar-img" />
            ) : (
              <i className="bi bi-person-fill" />
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} className="settings-avatar-input" />
          <div className="settings-avatar-actions">
            <span className="settings-avatar-name">Profile photo</span>
            <span className="settings-avatar-hint">JPG, PNG. Max 2MB. Paste an image URL below to sync across devices.</span>
            <button type="button" className="settings-btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => fileInputRef.current?.click()}>Upload</button>
          </div>
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Profile image URL (optional)</label>
            <input
              type="url"
              className="settings-input"
              placeholder="https://…"
              value={settings?.avatar_url || ''}
              onChange={(e) => updateSetting('avatar_url', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">First name</label>
            <input
              type="text"
              className="settings-input"
              placeholder="John"
              value={settings?.first_name || ''}
              onChange={(e) => updateSetting('first_name', e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">Last name</label>
            <input
              type="text"
              className="settings-input"
              placeholder="Doe"
              value={settings?.last_name || ''}
              onChange={(e) => updateSetting('last_name', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Email</label>
            <input type="email" className="settings-input" placeholder="john@example.com" value={user?.email || ''} readOnly disabled style={{ opacity: 0.85 }} />
          </div>
          <div className="settings-field">
            <label className="settings-label">Phone</label>
            <input
              type="tel"
              className="settings-input"
              placeholder="+1 (555) 000-0000"
              value={settings?.phone || ''}
              onChange={(e) => updateSetting('phone', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Date of birth</label>
            <input
              type="date"
              className="settings-input"
              value={settings?.date_of_birth || ''}
              onChange={(e) => updateSetting('date_of_birth', e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">Country</label>
            <select className="settings-input" value={settings?.country || 'United States'} onChange={(e) => updateSetting('country', e.target.value)}>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="United Kingdom">United Kingdom</option>
            </select>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">City</label>
            <input
              type="text"
              className="settings-input"
              placeholder="New York"
              value={settings?.city || ''}
              onChange={(e) => updateSetting('city', e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">Timezone</label>
            <select className="settings-input" value={settings?.timezone || 'America/New_York'} onChange={(e) => updateSetting('timezone', e.target.value)}>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Toronto">Toronto (ET)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Shanghai">Shanghai (CST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
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

export function AppearancePanel({ settings, updateSetting, onSave }) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Appearance</h2>
        <p className="settings-panel-desc">Choose how Ezana Finance looks on your device.</p>
      </div>
      <div className="settings-section">
        <h3 className="settings-section-title"><i className="bi bi-brightness-high" /> Theme</h3>
        <p className="settings-appearance-hint">Switch between dark and light mode. Click Save changes to sync across devices.</p>
        <div className="settings-appearance-row">
          <div>
            <span className="settings-label">Color mode</span>
            <p className="settings-appearance-sub">Dark reduces glare; light works well in bright rooms.</p>
          </div>
          <ThemeToggle onThemeChange={(next) => updateSetting('theme', next)} />
        </div>
        <h3 className="settings-section-title settings-section-title--spaced"><i className="bi bi-translate" /> Language &amp; currency</h3>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Language</label>
            <select className="settings-input" value={settings?.language || 'en'} onChange={(e) => updateSetting('language', e.target.value)}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div className="settings-field">
            <label className="settings-label">Currency</label>
            <select className="settings-input" value={settings?.currency || 'USD'} onChange={(e) => updateSetting('currency', e.target.value)}>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="JPY">JPY (¥)</option>
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

export function ProfilePanel({ onSave, settings, updateSetting, saveSettings, saving }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { isPartner } = usePartner();

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!isPartner) return;
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/partner/profile', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.profile?.username) {
          setUsername(data.profile.username || '');
        }
      } catch (err) {
        console.error('Failed to load partner profile:', err);
      }
    };
    loadProfile();
  }, [getToken, isPartner]);

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      if (isPartner) {
        const res = await fetch('/api/partner/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            username: username || null,
            displayName: settings?.display_name || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save partner profile');
      }

      const ok = await saveSettings();
      if (ok) {
        setSuccess('Profile saved successfully');
        onSave?.();
        setTimeout(() => setSuccess(''), 2500);
      }
    } catch (err) {
      setError(err.message || 'Failed to save');
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
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
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
          <button
            type="button"
            className={`settings-switch ${settings?.privacy_show_profile ? 'on' : ''}`}
            onClick={() => updateSetting('privacy_show_profile', !settings?.privacy_show_profile)}
            aria-label="Toggle public profile"
          />
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Display name</label>
            <input
              type="text"
              className="settings-input"
              placeholder="John D."
              value={settings?.display_name || ''}
              onChange={(e) => updateSetting('display_name', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Bio</label>
            <textarea
              className="settings-input"
              placeholder="Tell us about yourself..."
              rows={4}
              value={settings?.bio || ''}
              onChange={(e) => updateSetting('bio', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Investor type</label>
            <select className="settings-input" value={settings?.investor_type || 'retail'} onChange={(e) => updateSetting('investor_type', e.target.value)}>
              <option value="retail">Individual</option>
              <option value="professional">Professional</option>
              <option value="institutional">Institutional</option>
            </select>
          </div>
          <div className="settings-field">
            <label className="settings-label">Experience level</label>
            <select className="settings-input" value={settings?.experience_level || 'intermediate'} onChange={(e) => updateSetting('experience_level', e.target.value)}>
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
            <input type="url" className="settings-input" placeholder="https://" value={settings?.website || ''} onChange={(e) => updateSetting('website', e.target.value)} />
          </div>
          <div className="settings-field">
            <label className="settings-label">Twitter</label>
            <input type="text" className="settings-input" placeholder="@username" value={settings?.twitter || ''} onChange={(e) => updateSetting('twitter', e.target.value)} />
          </div>
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">LinkedIn</label>
            <input type="url" className="settings-input" placeholder="https://linkedin.com/in/..." value={settings?.linkedin || ''} onChange={(e) => updateSetting('linkedin', e.target.value)} />
          </div>
        </div>
        <h3 className="settings-section-title settings-section-title--spaced"><i className="bi bi-shield-lock" /> Privacy</h3>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my portfolio publicly</span>
          </div>
          <button type="button" className={`settings-switch ${settings?.privacy_show_portfolio ? 'on' : ''}`} onClick={() => updateSetting('privacy_show_portfolio', !settings?.privacy_show_portfolio)} aria-label="Toggle portfolio visibility" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my activity in the community feed</span>
          </div>
          <button type="button" className={`settings-switch ${settings?.privacy_show_activity ? 'on' : ''}`} onClick={() => updateSetting('privacy_show_activity', !settings?.privacy_show_activity)} aria-label="Toggle activity visibility" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show me on the leaderboard</span>
          </div>
          <button type="button" className={`settings-switch ${settings?.privacy_show_on_leaderboard ? 'on' : ''}`} onClick={() => updateSetting('privacy_show_on_leaderboard', !settings?.privacy_show_on_leaderboard)} aria-label="Toggle leaderboard" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my trades publicly</span>
          </div>
          <button type="button" className={`settings-switch ${settings?.privacy_show_trades ? 'on' : ''}`} onClick={() => updateSetting('privacy_show_trades', !settings?.privacy_show_trades)} aria-label="Toggle trades visibility" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my holdings</span>
          </div>
          <button type="button" className={`settings-switch ${settings?.privacy_show_holdings ? 'on' : ''}`} onClick={() => updateSetting('privacy_show_holdings', !settings?.privacy_show_holdings)} aria-label="Toggle holdings visibility" />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my watchlist</span>
          </div>
          <button type="button" className={`settings-switch ${settings?.privacy_show_watchlist ? 'on' : ''}`} onClick={() => updateSetting('privacy_show_watchlist', !settings?.privacy_show_watchlist)} aria-label="Toggle watchlist visibility" />
        </div>
        <h3 className="settings-section-title settings-section-title--spaced"><i className="bi bi-graph-up" /> Trading defaults</h3>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Default watchlist</label>
            <input type="text" className="settings-input" value={settings?.default_watchlist || 'main'} onChange={(e) => updateSetting('default_watchlist', e.target.value)} />
          </div>
          <div className="settings-field">
            <label className="settings-label">Chart style</label>
            <select className="settings-input" value={settings?.chart_style || 'candlestick'} onChange={(e) => updateSetting('chart_style', e.target.value)}>
              <option value="candlestick">Candlestick</option>
              <option value="line">Line</option>
              <option value="bar">Bar</option>
              <option value="area">Area</option>
            </select>
          </div>
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Default chart timeframe</label>
            <select className="settings-input" value={settings?.chart_timeframe || '1D'} onChange={(e) => updateSetting('chart_timeframe', e.target.value)}>
              <option value="1D">1D</option>
              <option value="5D">5D</option>
              <option value="1M">1M</option>
              <option value="3M">3M</option>
              <option value="1Y">1Y</option>
            </select>
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

export function PasswordPanel({ onSave, settings, updateSetting }) {
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
          <button
            type="button"
            className={`settings-switch ${settings?.security_two_factor ? 'on' : ''}`}
            onClick={() => updateSetting('security_two_factor', !settings?.security_two_factor)}
            aria-label="Toggle 2FA"
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Login alerts</span>
            <span className="settings-toggle-desc">Email when a new device signs in</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.security_login_alerts ? 'on' : ''}`}
            onClick={() => updateSetting('security_login_alerts', !settings?.security_login_alerts)}
            aria-label="Toggle login alerts"
          />
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
          <Link href="/subscribe" className="settings-btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            View plans &amp; checkout
          </Link>
          <ManageBillingButton className="settings-btn-secondary" label="Manage subscription" />
          <button type="button" className="settings-btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function BillingPanel({ onSave }) {
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
          <ManageBillingButton className="settings-btn-primary" label="Update payment method" />
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

export function EmailPanel({ onSave, settings, updateSetting }) {
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
          <button
            type="button"
            className={`settings-switch ${settings?.email_transactional_confirmations ? 'on' : ''}`}
            onClick={() => updateSetting('email_transactional_confirmations', !settings?.email_transactional_confirmations)}
            aria-label="Toggle order confirmations"
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Security alerts</span>
            <span className="settings-toggle-desc">Login alerts and password changes</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.email_security_alerts ? 'on' : ''}`}
            onClick={() => updateSetting('email_security_alerts', !settings?.email_security_alerts)}
            aria-label="Toggle security alerts email"
          />
        </div>
        <h3 className="settings-section-title"><i className="bi bi-megaphone" />Marketing</h3>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Newsletter</span>
            <span className="settings-toggle-desc">Weekly market insights and tips</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.email_marketing ? 'on' : ''}`}
            onClick={() => updateSetting('email_marketing', !settings?.email_marketing)}
            aria-label="Toggle newsletter"
          />
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Email frequency</label>
            <select
              className="settings-input"
              value={settings?.email_digest_frequency || 'weekly'}
              onChange={(e) => updateSetting('email_digest_frequency', e.target.value)}
            >
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
              <option value="monthly">Monthly digest</option>
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

export function NotificationsPanel({ onSave, settings, updateSetting }) {
  const { isSubscribed, loading, supported, subscribe, unsubscribe } = useNotifications();
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');

  const handleDesktopToggle = async () => {
    setToggling(true);
    setError('');
    if (isSubscribed) {
      const result = await unsubscribe();
      if (!result.success) setError(result.error || 'Could not disable notifications');
      else updateSetting('notifications_desktop_enabled', false);
    } else {
      const result = await subscribe();
      if (!result.success) {
        if (result.error === 'Permission denied by browser') {
          setError(
            'Your browser blocked notifications. Open the lock icon in the address bar → Site settings → Notifications → Allow, then try again.'
          );
        } else {
          setError(result.error || 'Failed to enable notifications');
        }
      } else {
        updateSetting('notifications_desktop_enabled', true);
      }
    }
    setToggling(false);
  };

  const emailRows = [
    { key: 'notifications_email_trades', label: 'Trade confirmations', desc: 'Receipts and fills' },
    { key: 'notifications_email_alerts', label: 'Price alerts', desc: 'When your watchlist triggers fire' },
    { key: 'notifications_email_community', label: 'Community replies and mentions', desc: 'When someone engages with you' },
    { key: 'notifications_email_newsletter', label: 'Weekly newsletter', desc: 'Market insights and tips' },
  ];

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Notifications</h2>
        <p className="settings-panel-desc">Manage how you hear from Ezana Finance. Desktop push can only be enabled here — we never ask on sign-up or login.</p>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title"><i className="bi bi-bell" /> Desktop</h3>
        <div className="settings-push-card">
          <div className="settings-toggle-row settings-toggle-row--push">
            <div className="settings-toggle-info">
              <span className="settings-toggle-label">Desktop notifications</span>
              <span className="settings-toggle-desc">
                Receive push notifications in your browser for alerts and updates — even when this site is in the background. The browser will ask for permission only when you turn this on.
              </span>
            </div>
            {!supported ? (
              <span className="settings-push-unsupported">Not supported in this browser</span>
            ) : (
              <button
                type="button"
                className={`settings-switch ${isSubscribed ? 'on' : ''}`}
                onClick={handleDesktopToggle}
                disabled={loading || toggling}
                aria-pressed={isSubscribed}
                aria-label={isSubscribed ? 'Disable desktop notifications' : 'Enable desktop notifications'}
              />
            )}
          </div>
          {supported && (
            <p className={`settings-push-status ${isSubscribed ? 'is-on' : ''}`}>
              {loading || toggling
                ? 'Checking…'
                : isSubscribed
                  ? 'Desktop notifications are enabled for this browser.'
                  : 'Desktop notifications are off.'}
            </p>
          )}
          {error ? (
            <p className="settings-push-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <h3 className="settings-section-title settings-section-title--spaced"><i className="bi bi-envelope" /> Email</h3>
        <div className="settings-push-card settings-push-card--muted">
          <p className="settings-toggle-label" style={{ marginBottom: '0.35rem' }}>
            Email notifications
          </p>
          <p className="settings-toggle-desc" style={{ marginBottom: '0.75rem' }}>
            Choose which updates you receive by email. Click Save changes to sync.
          </p>
          {emailRows.map(({ key, label, desc }) => (
            <div key={key} className="settings-toggle-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">{label}</span>
                <span className="settings-toggle-desc">{desc}</span>
              </div>
              <button
                type="button"
                className={`settings-switch ${settings?.[key] ? 'on' : ''}`}
                onClick={() => updateSetting(key, !settings?.[key])}
                aria-label={`Toggle ${label}`}
              />
            </div>
          ))}
        </div>

        <div className="settings-btn-row">
          <button type="button" className="settings-btn-primary" onClick={onSave}>
            Save changes
          </button>
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
