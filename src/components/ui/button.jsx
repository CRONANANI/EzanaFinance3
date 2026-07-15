'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The ONE canonical Ezana Button (there used to be two dead ones — ui/button.jsx
 * and ds/Button.jsx — with zero importers; ds/Button.jsx is deleted).
 *
 * It references the --btn-* tokens DIRECTLY (see theme-variables.css) rather
 * than the shared Tailwind color keys, so every variant is correct in BOTH light
 * and dark without changing any existing bg-background / bg-card / border-input
 * consumer. Plus Jakarta Sans inherits via font-sans; numeric labels should add
 * `font-mono tabular-nums` at the call site. House radius = 10px (matches the
 * Council desk buttons). Lucide only.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-sans text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--btn-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)]',
        secondary:
          'border border-[var(--btn-outline-border)] bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-fg)] hover:bg-[var(--btn-secondary-bg-hover)]',
        outline:
          'border border-[var(--btn-outline-border)] text-[var(--btn-secondary-fg)] hover:bg-[var(--btn-ghost-bg-hover)]',
        ghost: 'text-[var(--btn-secondary-fg)] hover:bg-[var(--btn-ghost-bg-hover)]',
        destructive:
          'bg-[var(--btn-destructive-bg)] text-[var(--btn-destructive-fg)] hover:opacity-90',
        link: 'text-[var(--btn-primary-bg)] underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 py-2',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';

  // Slot (asChild) requires a SINGLE child — a spinner would add a second and
  // break it — so the loading affordance only applies to a real <button>.
  if (asChild) {
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
      {children}
    </Comp>
  );
});
Button.displayName = 'Button';

export { Button, buttonVariants };
