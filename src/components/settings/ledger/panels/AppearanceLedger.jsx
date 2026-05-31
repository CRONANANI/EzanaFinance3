'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { LedgerRow, LedgerSelect, LedgerSegmented, LedgerSaveBar } from '../primitives';

export function AppearanceLedger({ settings, updateSetting, onSave, saving }) {
  const { theme, setTheme } = useTheme();
  const storedTheme = settings?.theme || theme || 'light';
  const displayTheme =
    storedTheme === 'system' || storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : theme === 'dark'
        ? 'dark'
        : 'light';

  const handleThemeChange = (next) => {
    updateSetting('theme', next);
    setTheme(next === 'system' ? 'system' : next === 'dark' ? 'dark' : 'light', {
      persist: false,
    });
  };

  const handleSave = () => {
    const t = settings?.theme || displayTheme;
    if (t === 'system' || t === 'light' || t === 'dark') {
      setTheme(t, { persist: true });
    }
    onSave?.();
  };

  return (
    <>
      <LedgerRow idx="02.1" title="Theme" helper="Choose how Ezana looks on this device.">
        <LedgerSegmented
          value={displayTheme}
          onChange={handleThemeChange}
          options={[
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'system', label: 'System', icon: Monitor },
          ]}
        />
      </LedgerRow>

      <LedgerRow
        idx="02.2"
        title="Language & currency"
        helper="Regional formatting for numbers and dates."
      >
        <div className="sl-fgrid">
          <LedgerSelect
            label="Language"
            value={settings?.language || 'en'}
            onChange={(e) => updateSetting('language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </LedgerSelect>
          <LedgerSelect
            label="Currency"
            value={settings?.currency || 'USD'}
            onChange={(e) => updateSetting('currency', e.target.value)}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CAD">CAD (C$)</option>
            <option value="AUD">AUD (A$)</option>
            <option value="JPY">JPY (¥)</option>
          </LedgerSelect>
        </div>
      </LedgerRow>

      <LedgerSaveBar onSave={handleSave} saving={saving} dirty />
    </>
  );
}
