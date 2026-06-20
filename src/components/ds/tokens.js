/**
 * Design-system token access layer.
 *
 * A semantic, documented map from theme-variables.css onto `var(--token)`
 * strings, so component code references tokens by intent ("surface", "danger")
 * instead of raw CSS variables or — worse — hardcoded hex. This introduces NO
 * new global tokens; it is a read-only access layer over the existing ones.
 *
 * Use in inline styles where a class isn't practical:
 *   style={{ color: token.textMuted, borderColor: token.border }}
 */
export const token = Object.freeze({
  // Surfaces / backgrounds
  pageBg: 'var(--bg-primary)',
  surface: 'var(--surface-card)',
  surfaceHover: 'var(--surface-card-hover)',
  surfaceInput: 'var(--surface-input)',
  inset: 'var(--inset)',
  overlay: 'var(--bg-overlay)',

  // Text
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textBody: 'var(--text-body)',
  textMuted: 'var(--text-muted)',
  textFaint: 'var(--text-faint)',
  textGhost: 'var(--text-ghost)',

  // Borders
  border: 'var(--border-primary)',
  borderSecondary: 'var(--border-secondary)',
  borderHover: 'var(--border-hover)',
  borderFocus: 'var(--border-focus)',
  borderInput: 'var(--border-input)',

  // Brand — emerald (user) / gold (partner)
  emerald: 'var(--emerald)',
  emeraldText: 'var(--emerald-text)',
  emeraldBg: 'var(--emerald-bg)',
  emeraldBorder: 'var(--emerald-border)',
  emeraldGlow: 'var(--emerald-glow)',
  gold: 'var(--gold)',
  goldBg: 'var(--gold-bg)',
  goldBorder: 'var(--gold-border)',

  // Semantic status
  positive: 'var(--positive)',
  negative: 'var(--negative)',
  danger: 'var(--danger)',
  dangerBg: 'var(--danger-bg)',
  warning: 'var(--warning)',
  info: 'var(--info)',

  // Radius / shadow
  radiusSm: 'var(--radius-sm)',
  radiusMd: 'var(--radius-md)',
  radiusLg: 'var(--radius-lg)',
  radiusXl: 'var(--radius-xl)',
  shadowSm: 'var(--shadow-sm)',
  shadowMd: 'var(--shadow-md)',
  shadowLg: 'var(--shadow-lg)',
  shadowXl: 'var(--shadow-xl)',

  // Typography
  fontSans: 'var(--font-sans)',
  fontMono: 'var(--font-mono)',
});

/** Join class names, dropping falsy entries. */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
