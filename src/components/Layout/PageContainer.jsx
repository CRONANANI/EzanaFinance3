import { cn } from '@/lib/utils';

const MAX_W = {
  md: 'max-w-md',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  container: 'max-w-container',
  none: 'max-w-none',
};

/**
 * Mobile-first page shell: horizontal padding, optional max width, vertical rhythm.
 * Dashboard routes that already get padding from `.dashboard-main` can pass
 * `className="px-0 py-0 max-w-none"` to opt out of outer spacing.
 */
export function PageContainer({
  children,
  className,
  maxWidth = '7xl',
  as: Component = 'div',
  ...rest
}) {
  const cap = MAX_W[maxWidth] ?? MAX_W['7xl'];
  return (
    <Component
      className={cn(
        'mx-auto w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10',
        cap,
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

export default PageContainer;
