'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { User, Upload, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';
import { useAuth } from '@/components/AuthProvider';
import { LedgerField, LedgerSelect, LedgerRow, LedgerSaveBar } from '../primitives';

/* DeleteAccountModal is an overlay that only mounts once the user opens it, and
   it lives in the large SettingsPanels.jsx module — defer it so that module
   isn't pulled into this panel's chunk. Overlay modal: null fallback is safe
   (no in-flow layout to reserve). Named export. */
const DeleteAccountModal = dynamic(
  () =>
    import('@/components/settings/SettingsPanels').then((m) => ({ default: m.DeleteAccountModal })),
  { loading: () => null },
);

export function MyDetailsLedger({ onSave, settings, updateSetting, saving }) {
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
        try {
          const provisionRes = await fetch('/api/admin/ensure-avatars-bucket', { method: 'POST' });
          const provisionData = await provisionRes.json();
          if (provisionRes.ok && provisionData.success) {
            uploadErr = await tryUpload();
          }
        } catch {
          /* provisioning failed */
        }
      }

      if (uploadErr) {
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
        alert('Photo uploaded but URL could not be resolved. Please refresh.');
        URL.revokeObjectURL(localUrl);
        return;
      }

      const bust = `${publicUrl}?t=${Date.now()}`;
      updateSetting('avatar_url', bust);
      setAvatarPreview(bust);
      URL.revokeObjectURL(localUrl);

      const { data: existing, error: readErr } = await supabase
        .from('profiles')
        .select('user_settings')
        .eq('id', authUser.id)
        .maybeSingle();

      if (readErr) {
        alert('Photo uploaded but could not read your profile. Click "Save changes" to retry.');
        return;
      }

      const merged = { ...(existing?.user_settings || {}), avatar_url: bust };
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ user_settings: merged, updated_at: new Date().toISOString() })
        .eq('id', authUser.id);

      if (dbErr) {
        alert(
          `Photo uploaded but profile update failed: ${dbErr.message || 'unknown error'}. Click "Save changes" to retry.`,
        );
      }
    } catch (err) {
      alert(`Failed to upload photo: ${err?.message || 'unknown error'}`);
      URL.revokeObjectURL(localUrl);
      setAvatarPreview(settings?.avatar_url || null);
    }
  };

  const avatarSrc = avatarPreview || settings?.avatar_url;

  return (
    <>
      <LedgerRow
        idx="01.1"
        title="Profile photo"
        helper="JPG, PNG, or WebP. 2 MB max. Paste a URL to sync across devices."
      >
        <div className="sl-photo-row">
          <div className="sl-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" />
            ) : (
              <User className="sl-avatar-ico" strokeWidth={1.6} />
            )}
          </div>
          <div className="sl-photo-actions">
            <button
              type="button"
              className="sl-btn sl-btn-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload strokeWidth={1.8} />
              Upload image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
            />
            <input
              className="sl-input"
              placeholder="https://…  profile image URL (optional)"
              value={settings?.avatar_url || ''}
              onChange={(e) => updateSetting('avatar_url', e.target.value)}
            />
          </div>
        </div>
      </LedgerRow>

      <LedgerRow idx="01.2" title="Identity" helper="Your legal name and primary contact methods.">
        <div className="sl-fgrid">
          <LedgerField
            label="First name"
            value={settings?.first_name || ''}
            onChange={(e) => updateSetting('first_name', e.target.value)}
          />
          <LedgerField
            label="Last name"
            value={settings?.last_name || ''}
            onChange={(e) => updateSetting('last_name', e.target.value)}
          />
          <LedgerField label="Email" value={user?.email || ''} disabled />
          <LedgerField
            label="Phone"
            mono
            value={settings?.phone || ''}
            onChange={(e) => updateSetting('phone', e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </LedgerRow>

      <LedgerRow
        idx="01.3"
        title="Location & time"
        helper="Used for market hours and regional defaults."
      >
        <div className="sl-fgrid">
          <LedgerField
            label="Date of birth"
            type="date"
            value={settings?.date_of_birth || ''}
            onChange={(e) => updateSetting('date_of_birth', e.target.value)}
          />
          <LedgerSelect
            label="Country"
            value={settings?.country || 'United States'}
            onChange={(e) => updateSetting('country', e.target.value)}
          >
            <option value="United States">United States</option>
            <option value="Canada">Canada</option>
            <option value="United Kingdom">United Kingdom</option>
          </LedgerSelect>
          <LedgerField
            label="City"
            value={settings?.city || ''}
            onChange={(e) => updateSetting('city', e.target.value)}
            placeholder="New York"
          />
          <LedgerSelect
            label="Timezone"
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
          </LedgerSelect>
        </div>
      </LedgerRow>

      <LedgerSaveBar onSave={onSave} saving={saving} dirty />

      <div className="sl-danger">
        <div className="sl-danger-head">
          <AlertTriangle strokeWidth={1.9} />
          Danger zone
        </div>
        <div className="sl-danger-row">
          <div>
            <div className="sl-danger-t">Delete account</div>
            <div className="sl-danger-d">
              Permanently delete your account and all associated data. This action cannot be undone.
            </div>
          </div>
          <button type="button" className="sl-btn-danger" onClick={() => setDeleteModalOpen(true)}>
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
    </>
  );
}
