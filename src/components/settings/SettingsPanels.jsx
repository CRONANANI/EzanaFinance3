'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePartner } from '@/contexts/PartnerContext';
import { supabase } from '@/lib/supabase-browser';
import { ManageBillingButton } from '@/components/ManageBillingButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/components/AuthProvider';
import { NotificationPreferences } from './NotificationPreferences';
import { useBeginnerLevelContext } from '@/contexts/BeginnerLevelContext';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SETTINGS PANELS â€” 10 panels with full form fields
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export function MyDetailsPanel({ onSave, settings, updateSetting }) {
  const { user } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const MAX_BYTES = 2 * 1024 * 1024;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      alert('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > MAX_BYTES) {
      alert('File must be under 2MB.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        alert('Please log in to upload a photo.');
        URL.revokeObjectURL(localUrl);
        setAvatarPreview(null);
        return;
      }

      /*
       * Path is `<uid>/avatar.<ext>` â€” no redundant `avatars/` prefix. The
       * storage RLS policy checks `(storage.foldername(name))[1]` against
       * `auth.uid()::text`, so the first path segment MUST be the user id
       * or INSERT/UPDATE will be blocked.
       */
      const rawExt = file.name.split('.').pop()?.toLowerCase();
      const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
      const path = `${authUser.id}/avatar.${ext}`;

      const tryUpload = async () => {
        const { error: err } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true, contentType: file.type });
        return err;
      };

      let uploadErr = await tryUpload();

      if (uploadErr && /bucket\s*not\s*found/i.test(uploadErr.message || '')) {
        console.warn('[avatar upload] avatars bucket missing, attempting to provision');
        try {
          const provisionRes = await fetch('/api/admin/ensure-avatars-bucket', {
            method: 'POST',
          });
          const provisionData = await provisionRes.json();
          if (provisionRes.ok && provisionData.success) {
            console.log('[avatar upload] bucket provisioned, retrying upload', provisionData);
            uploadErr = await tryUpload();
          } else {
            console.error('[avatar upload] bucket provisioning failed:', provisionData);
          }
        } catch (provisionErr) {
          console.error('[avatar upload] bucket provisioning request failed:', provisionErr);
        }
      }

      if (uploadErr) {
        console.error('[avatar upload] storage error:', uploadErr);
        const friendly = /bucket\s*not\s*found/i.test(uploadErr.message || '')
          ? "Avatar storage isn't configured on this server. Please contact support."
          : `Failed to upload photo: ${uploadErr.message || 'unknown error'}`;
        alert(friendly);
        URL.revokeObjectURL(localUrl);
        setAvatarPreview(settings?.avatar_url || null);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        console.error('[avatar upload] no public URL returned for path:', path);
        alert('Photo uploaded but URL could not be resolved. Please refresh.');
        URL.revokeObjectURL(localUrl);
        return;
      }

      const bust = `${publicUrl}?t=${Date.now()}`;
      updateSetting('avatar_url', bust);
      setAvatarPreview(bust);
      URL.revokeObjectURL(localUrl);

      /*
       * Persist `avatar_url` into profiles.user_settings immediately so the
       * new photo survives a page reload / navigation even if the user
       * never clicks "Save changes". Report DB errors separately from the
       * storage error so users know the photo did upload.
       */
      const { data: existing, error: readErr } = await supabase
        .from('profiles')
        .select('user_settings')
        .eq('id', authUser.id)
        .maybeSingle();

      if (readErr) {
        console.error('[avatar upload] profile read error:', readErr);
        alert('Photo uploaded but could not read your profile. Click "Save changes" to retry.');
        return;
      }

      const merged = {
        ...(existing?.user_settings || {}),
        avatar_url: bust,
      };

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({
          user_settings: merged,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (dbErr) {
        console.error('[avatar upload] profile update error:', dbErr);
        alert(
          `Photo uploaded but profile update failed: ${dbErr.message || 'unknown error'}. ` +
            'Click "Save changes" to retry.',
        );
      }
    } catch (err) {
      console.error('[avatar upload] unexpected error:', err);
      alert(`Failed to upload photo: ${err?.message || 'unknown error'}`);
      URL.revokeObjectURL(localUrl);
      setAvatarPreview(settings?.avatar_url || null);
    }
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="settings-avatar-input"
          />
          <div className="settings-avatar-actions">
            <span className="settings-avatar-name">Profile photo</span>
            <span className="settings-avatar-hint">
              JPG, PNG, or WebP. Max 2MB. Paste an image URL below to sync across devices.
            </span>
            <button
              type="button"
              className="settings-btn-secondary"
              style={{ marginTop: '0.5rem' }}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </button>
          </div>
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Profile image URL (optional)</label>
            <input
              type="url"
              className="settings-input"
              placeholder="https://â€¦"
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
            <input
              type="email"
              className="settings-input"
              placeholder="john@example.com"
              value={user?.email || ''}
              readOnly
              disabled
              style={{ opacity: 0.85 }}
            />
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
            <select
              className="settings-input"
              value={settings?.country || 'United States'}
              onChange={(e) => updateSetting('country', e.target.value)}
            >
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
            <select
              className="settings-input"
              value={settings?.timezone || 'America/New_York'}
              onChange={(e) => updateSetting('timezone', e.target.value)}
            >
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
          <button type="button" className="settings-btn-primary" onClick={onSave}>
            Save changes
          </button>
        </div>
        <div className="settings-danger-zone">
          <h3 className="settings-danger-title">
            <i className="bi bi-exclamation-triangle" /> Danger Zone
          </h3>
          <div className="settings-danger-card">
            <div className="settings-danger-text">
              <strong>Delete account</strong>
              <p>Permanently delete your account and all associated data. This cannot be undone.</p>
            </div>
            <button
              type="button"
              className="settings-btn-danger"
              onClick={() => setDeleteModalOpen(true)}
            >
              Delete account
            </button>
          </div>
        </div>

        {deleteModalOpen && (
          <DeleteAccountModal
            onClose={() => setDeleteModalOpen(false)}
            onDeleted={() => {
              window.location.href = '/auth/signin?reason=account_deletion';
            }}
          />
        )}
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
        <h3 className="settings-section-title">
          <i className="bi bi-brightness-high" /> Theme
        </h3>
        <p className="settings-appearance-hint">
          Switch between dark and light mode. Click Save changes to sync across devices.
        </p>
        <div className="settings-appearance-row">
          <div>
            <span className="settings-label">Color mode</span>
            <p className="settings-appearance-sub">
              Dark reduces glare; light works well in bright rooms.
            </p>
          </div>
          <ThemeToggle onThemeChange={(next) => updateSetting('theme', next)} />
        </div>
        <h3 className="settings-section-title settings-section-title--spaced">
          <i className="bi bi-translate" /> Language &amp; currency
        </h3>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Language</label>
            <select
              className="settings-input"
              value={settings?.language || 'en'}
              onChange={(e) => updateSetting('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">EspaÃ±ol</option>
              <option value="fr">FranÃ§ais</option>
            </select>
          </div>
          <div className="settings-field">
            <label className="settings-label">Currency</label>
            <select
              className="settings-input"
              value={settings?.currency || 'USD'}
              onChange={(e) => updateSetting('currency', e.target.value)}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (â‚¬)</option>
              <option value="GBP">GBP (Â£)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="JPY">JPY (Â¥)</option>
            </select>
          </div>
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

export function ProfilePanel({ onSave, settings, updateSetting, saveSettings, saving }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tipsBusy, setTipsBusy] = useState(false);
  const { isPartner } = usePartner();
  const { tipsPref, setTipsPref, clearSeen, band, score } = useBeginnerLevelContext();

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!isPartner) return;
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/partner/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
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
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  placeholder="your_username"
                  maxLength={24}
                />
              </div>
              <span className="settings-field-hint">
                3-24 characters. Letters, numbers, underscores only. This appears on your hero card
                and public profile.
              </span>
            </div>
          </div>
        )}
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Public profile</span>
            <span className="settings-toggle-desc">
              Allow others to view your profile and activity
            </span>
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
            <select
              className="settings-input"
              value={settings?.investor_type || 'retail'}
              onChange={(e) => updateSetting('investor_type', e.target.value)}
            >
              <option value="retail">Individual</option>
              <option value="professional">Professional</option>
              <option value="institutional">Institutional</option>
            </select>
          </div>
          <div className="settings-field">
            <label className="settings-label">Experience level</label>
            <select
              className="settings-input"
              value={settings?.experience_level || 'intermediate'}
              onChange={(e) => updateSetting('experience_level', e.target.value)}
            >
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
            <input
              type="url"
              className="settings-input"
              placeholder="https://"
              value={settings?.website || ''}
              onChange={(e) => updateSetting('website', e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">Twitter</label>
            <input
              type="text"
              className="settings-input"
              placeholder="@username"
              value={settings?.twitter || ''}
              onChange={(e) => updateSetting('twitter', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">LinkedIn</label>
            <input
              type="url"
              className="settings-input"
              placeholder="https://linkedin.com/in/..."
              value={settings?.linkedin || ''}
              onChange={(e) => updateSetting('linkedin', e.target.value)}
            />
          </div>
        </div>
        <h3 className="settings-section-title settings-section-title--spaced">
          <i className="bi bi-lightbulb" /> Beginner guidance
        </h3>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Beginner tips</label>
            <select
              className="settings-input"
              value={tipsPref}
              disabled={tipsBusy}
              onChange={async (e) => {
                setTipsBusy(true);
                await setTipsPref(e.target.value);
                setTipsBusy(false);
              }}
            >
              <option value="auto">Auto (fade as you progress)</option>
              <option value="on">Always on</option>
              <option value="off">Off</option>
            </select>
            <span className="settings-field-hint">
              Current level: {band} (score {score}/100). Tips show spotlights, explainers, and
              educational cards — not investment advice.
            </span>
          </div>
        </div>
        <div className="settings-row single">
          <button
            type="button"
            className="settings-btn settings-btn--secondary"
            disabled={tipsBusy}
            onClick={async () => {
              setTipsBusy(true);
              await clearSeen();
              setSuccess('Beginner tips will show again on your next visit to each page.');
              setTipsBusy(false);
              setTimeout(() => setSuccess(''), 2500);
            }}
          >
            Replay beginner tips
          </button>
        </div>
        <h3 className="settings-section-title settings-section-title--spaced">
          <i className="bi bi-shield-lock" /> Privacy
        </h3>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my portfolio publicly</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.privacy_show_portfolio ? 'on' : ''}`}
            onClick={() =>
              updateSetting('privacy_show_portfolio', !settings?.privacy_show_portfolio)
            }
            aria-label="Toggle portfolio visibility"
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my activity in the community feed</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.privacy_show_activity ? 'on' : ''}`}
            onClick={() => updateSetting('privacy_show_activity', !settings?.privacy_show_activity)}
            aria-label="Toggle activity visibility"
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show me on the leaderboard</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.privacy_show_on_leaderboard ? 'on' : ''}`}
            onClick={() =>
              updateSetting('privacy_show_on_leaderboard', !settings?.privacy_show_on_leaderboard)
            }
            aria-label="Toggle leaderboard"
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my trades publicly</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.privacy_show_trades ? 'on' : ''}`}
            onClick={() => updateSetting('privacy_show_trades', !settings?.privacy_show_trades)}
            aria-label="Toggle trades visibility"
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my holdings</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.privacy_show_holdings ? 'on' : ''}`}
            onClick={() => updateSetting('privacy_show_holdings', !settings?.privacy_show_holdings)}
            aria-label="Toggle holdings visibility"
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Show my watchlist</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.privacy_show_watchlist ? 'on' : ''}`}
            onClick={() =>
              updateSetting('privacy_show_watchlist', !settings?.privacy_show_watchlist)
            }
            aria-label="Toggle watchlist visibility"
          />
        </div>
        <h3 className="settings-section-title settings-section-title--spaced">
          <i className="bi bi-graph-up" /> Trading defaults
        </h3>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Default watchlist</label>
            <input
              type="text"
              className="settings-input"
              value={settings?.default_watchlist || 'main'}
              onChange={(e) => updateSetting('default_watchlist', e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">Chart style</label>
            <select
              className="settings-input"
              value={settings?.chart_style || 'candlestick'}
              onChange={(e) => updateSetting('chart_style', e.target.value)}
            >
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
            <select
              className="settings-input"
              value={settings?.chart_timeframe || '1D'}
              onChange={(e) => updateSetting('chart_timeframe', e.target.value)}
            >
              <option value="1D">1D</option>
              <option value="5D">5D</option>
              <option value="1M">1M</option>
              <option value="3M">3M</option>
              <option value="1Y">1Y</option>
            </select>
          </div>
        </div>
        {error && (
          <div className="settings-field-error" style={{ marginBottom: '0.75rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '8px',
              color: '#10b981',
              fontSize: '0.75rem',
              marginBottom: '0.75rem',
            }}
          >
            {success}
          </div>
        )}
        <div className="settings-btn-row">
          <button
            type="button"
            className="settings-btn-primary"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

export {
  PasswordPanel,
  FamilyPanel,
  PlanPanel,
  BillingPanel,
  ApiPanel,
} from './SettingsOverhaulPanels';

export function EmailPanel({ onSave, settings, updateSetting }) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Email</h2>
        <p className="settings-panel-desc">Email preferences and frequency.</p>
      </div>
      <div className="settings-section">
        <h3 className="settings-section-title">
          <i className="bi bi-envelope" />
          Transactional
        </h3>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Order confirmations</span>
            <span className="settings-toggle-desc">Receipts and transaction confirmations</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.email_transactional_confirmations ? 'on' : ''}`}
            onClick={() =>
              updateSetting(
                'email_transactional_confirmations',
                !settings?.email_transactional_confirmations,
              )
            }
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
        <h3 className="settings-section-title">
          <i className="bi bi-megaphone" />
          Marketing
        </h3>
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
          <button type="button" className="settings-btn-primary" onClick={onSave}>
            Save changes
          </button>
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
            'Your browser blocked notifications. Open the lock icon in the address bar ΓåÆ Site settings ΓåÆ Notifications ΓåÆ Allow, then try again.',
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
    {
      key: 'notifications_email_alerts',
      label: 'Price alerts',
      desc: 'When your watchlist triggers fire',
    },
    {
      key: 'notifications_email_community',
      label: 'Community replies and mentions',
      desc: 'When someone engages with you',
    },
    {
      key: 'notifications_email_newsletter',
      label: 'Weekly newsletter',
      desc: 'Market insights and tips',
    },
  ];

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Notifications</h2>
        <p className="settings-panel-desc">
          Manage how you hear from Ezana Finance. Desktop push can only be enabled here ΓÇö we never
          ask on sign-up or login.
        </p>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">
          <i className="bi bi-bell" /> Desktop
        </h3>
        <div className="settings-push-card">
          <div className="settings-toggle-row settings-toggle-row--push">
            <div className="settings-toggle-info">
              <span className="settings-toggle-label">Desktop notifications</span>
              <span className="settings-toggle-desc">
                Receive push notifications in your browser for alerts and updates ΓÇö even when this
                site is in the background. The browser will ask for permission only when you turn
                this on.
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
                aria-label={
                  isSubscribed ? 'Disable desktop notifications' : 'Enable desktop notifications'
                }
              />
            )}
          </div>
          {supported && (
            <p className={`settings-push-status ${isSubscribed ? 'is-on' : ''}`}>
              {loading || toggling
                ? 'CheckingΓÇª'
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

        <h3 className="settings-section-title settings-section-title--spaced">
          <i className="bi bi-envelope" /> Email
        </h3>
        <div className="settings-push-card settings-push-card--muted">
          <p className="settings-toggle-label" style={{ marginBottom: '0.35rem' }}>
            Email notifications
          </p>
          <p className="settings-toggle-desc" style={{ marginBottom: '0.75rem' }}>
            Choose which updates you receive by email. Click Save changes to sync.
          </p>
          {emailRows.map(({ key, label, desc }) => (
            <div
              key={key}
              className="settings-toggle-row"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
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

        <NotificationPreferences />

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
            <div
              key={int.id}
              className={`settings-integration-card ${int.status ? 'connected' : ''}`}
            >
              <div
                className="settings-integration-icon"
                style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
              >
                <i className={`bi ${int.icon}`} />
              </div>
              <div className="settings-integration-body">
                <span className="settings-integration-name">{int.name}</span>
                <span
                  className={`settings-integration-status ${int.status ? 'connected-text' : ''}`}
                >
                  {int.status || 'Not connected'}
                </span>
              </div>
              <button
                type="button"
                className="settings-btn-secondary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              >
                {int.status ? 'Manage' : 'Connect'}
              </button>
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

export function DeleteAccountModal({ onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not schedule deletion');
        setBusy(false);
        return;
      }
      try {
        await supabase.auth.signOut();
      } catch {
        /* non-blocking */
      }
      onDeleted();
    } catch (err) {
      setError(err.message || 'Network error');
      setBusy(false);
    }
  };

  return (
    <div
      className="settings-delete-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="settings-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <h2 id="delete-modal-title">
          <i className="bi bi-exclamation-triangle" /> Delete your account?
        </h2>
        <p>This will:</p>
        <ul>
          <li>
            Cancel your subscription at the end of the current billing period (no further charges)
          </li>
          <li>Sign you out of all your devices</li>
          <li>Mark your account for permanent deletion when the billing period ends</li>
          <li>Send you an email with a reactivation link in case you change your mind</li>
        </ul>
        <p className="settings-delete-modal__highlight">
          You can reactivate your account anytime <strong>before</strong> your billing period ends.
          After that, your data is permanently removed and cannot be recovered.
        </p>

        <label className="settings-delete-modal__confirm-label" htmlFor="delete-confirm-input">
          Type <code>DELETE</code> to confirm:
        </label>
        <input
          id="delete-confirm-input"
          type="text"
          className="settings-delete-modal__input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoComplete="off"
          autoFocus
          disabled={busy}
        />

        {error && <p className="settings-delete-modal__error">{error}</p>}

        <div className="settings-delete-modal__actions">
          <button
            type="button"
            className="settings-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="settings-btn-danger"
            onClick={handleDelete}
            disabled={!isConfirmed || busy}
          >
            {busy ? 'Deleting...' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  );
}
