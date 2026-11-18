'use client';

/**
 * Language selector (Nov 18 2026), from the dropdown reference that set the
 * Ezana standard. Built on EzDropdown so it carries the same look, theme
 * handling and keyboard support. Not mounted yet: Ezana has no translated
 * interface, so this is ready for when one ships. `onChange` receives the
 * language code.
 */
import { useState } from 'react';
import { EzDropdown } from './ez-dropdown';

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
];

export function LanguageSelector({ value, onChange, size = 'sm', align = 'start' }) {
  const [inner, setInner] = useState(LANGUAGES[0].code);
  const current = value ?? inner;
  return (
    <EzDropdown
      label="Language"
      size={size}
      align={align}
      value={current}
      onChange={(code) => {
        if (value === undefined) setInner(code);
        onChange?.(code);
      }}
      options={LANGUAGES.map((l) => ({
        value: l.code,
        label: l.label,
        icon: <span>{l.flag}</span>,
      }))}
    />
  );
}

/* Kept for the reference's import name. */
export const Component = LanguageSelector;
export default LanguageSelector;
