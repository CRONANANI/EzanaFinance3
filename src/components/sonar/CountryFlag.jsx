/**
 * A country's flag, from the vendored 3:2 SVG set in public/flags/3x2 (country-flag-icons
 * 1.6.20, MIT, licence in public/flags/LICENSE). SVG files, not emoji: emoji flags render as
 * two letters on Windows.
 *
 * Decorative by default (the country's name always sits beside it); pass `label` when the
 * flag stands alone. Renders nothing for a missing or unknown code, so a flag never breaks
 * the layout. Styles: the host sizes it; the class adds the radius and a hairline inset
 * shadow so white flags hold their edge on the dark band.
 */
export function CountryFlag({ iso2, label = '', className = '', width = 36 }) {
  const code = String(iso2 || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/3x2/${code}.svg`}
      alt={label}
      aria-hidden={label ? undefined : 'true'}
      width={width}
      height={Math.round((width * 2) / 3)}
      className={`ez-flag ${className}`.trim()}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

export default CountryFlag;
