import { cn } from '@/lib/utils';

/** Preset column layouts — all class strings are static for Tailwind JIT. */
const PRESETS = {
  /** One column on all viewports. */
  stack: 'grid-cols-1',
  /** 1 col mobile → 2 sm → 3 lg (card grids, feature lists). */
  cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  /** 1 col → 2 on md (forms + sidebar). */
  split: 'grid-cols-1 md:grid-cols-2',
  /** 12-col at lg only; mobile stacks (used with col-span children). */
  '12': 'grid-cols-1 lg:grid-cols-12',
};

const GAP = {
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
};

/**
 * Mobile-first grid: defaults to a single column so content stacks on narrow viewports.
 *
 * @param {{ preset?: keyof typeof PRESETS, gap?: keyof typeof GAP, className?: string, children?: React.ReactNode }} props
 */
export function AppGrid({ children, className, preset = 'stack', gap = 4, ...rest }) {
  const cols = PRESETS[preset] ?? PRESETS.stack;
  const gapClass = GAP[gap] ?? GAP[4];
  return (
    <div className={cn('grid min-w-0', cols, gapClass, className)} {...rest}>
      {children}
    </div>
  );
}

export default AppGrid;
