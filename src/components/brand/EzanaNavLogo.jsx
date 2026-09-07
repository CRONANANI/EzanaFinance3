'use client';

import Image from 'next/image';

const DEFAULT_W = 45;
const DEFAULT_H = 51;

/**
 * Brand mark used in the main nav, partner nav, and other surfaces that must
 * match the app header. Single source: `/logo-tight.png` (the Walia ibex mark,
 * tight-cropped; padded master lives at `/logo.png`).
 */
export function EzanaNavLogo({
  width = DEFAULT_W,
  height = DEFAULT_H,
  className = 'nav-logo-img nav-logo-img--wing',
  priority = false,
  style,
}) {
  return (
    <Image
      src="/logo-tight.png"
      alt="Ezana Finance"
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
    />
  );
}
