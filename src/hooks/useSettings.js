'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getDefaultUserSettings } from '@/lib/user-settings-defaults';

function buildMergedSettings(profileUserSettings, user) {
  const defaults = getDefaultUserSettings();
  const metaName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '';
  if (profileUserSettings && typeof profileUserSettings === 'object') {
    return {
      ...defaults,
      ...profileUserSettings,
      display_name: profileUserSettings.display_name || metaName || '',
    };
  }
  return {
    ...defaults,
    display_name: metaName || '',
  };
}

/** Loads/saves `profiles.user_settings`. Used by `SettingsProvider`; app code should use `useUserSettings`. */
export function useSettings() {
  const [settings, setSettings] = useState(() => getDefaultUserSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSettings(getDefaultUserSettings());
        return;
      }

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('user_settings, email')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Failed to load settings:', fetchError);
        setSettings(buildMergedSettings(null, user));
        return;
      }

      setSettings(buildMergedSettings(profile?.user_settings, user));
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    setSaved(false);
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return false;
      }

      const displayName = (settings.display_name || '').trim();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          user_settings: settings,
          full_name: displayName || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to save settings:', updateError);
        setError('Failed to save settings. Please try again.');
        return false;
      }

      /* Mirror the saved theme into the `ezana.theme` cookie so the blocking
         <head> script on the next reload can apply the correct class before
         first paint — eliminates any split-theme flash on login / refresh. */
      try {
        if (settings.theme === 'dark' || settings.theme === 'light') {
          const secure =
            typeof window !== 'undefined' && window.location.protocol === 'https:'
              ? '; secure'
              : '';
          document.cookie = `ezana.theme=${settings.theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${secure}`;
        }
      } catch {
        /* non-fatal; server will still read the DB on next load */
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return true;
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Something went wrong. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const resetSettings = useCallback(() => {
    setSettings(getDefaultUserSettings());
    setSaved(false);
  }, []);

  return {
    settings,
    loading,
    saving,
    saved,
    error,
    updateSetting,
    updateSettings,
    saveSettings,
    resetSettings,
    reloadSettings: loadSettings,
    DEFAULT_SETTINGS: getDefaultUserSettings(),
  };
}
