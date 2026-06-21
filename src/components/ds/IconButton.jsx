'use client';

import { Button } from './Button';

/**
 * Icon-only button that REQUIRES an accessible label. Use this instead of a
 * bare `<button><i/></button>` so screen-reader users always hear the action.
 */
export function IconButton({ icon, label, variant = 'ghost', size = 'md', className, ...rest }) {
  if (process.env.NODE_ENV !== 'production' && !label) {
    // eslint-disable-next-line no-console
    console.warn('[ds] IconButton requires a `label` prop for screen-reader users.');
  }
  return (
    <Button
      variant={variant}
      size={size}
      iconOnly
      icon={icon}
      aria-label={label}
      className={className}
      {...rest}
    />
  );
}
