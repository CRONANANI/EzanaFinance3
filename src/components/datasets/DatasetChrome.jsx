'use client';

/**
 * Layout-level chrome for the standalone dataset pages.
 *
 * Rendered from src/app/datasets/layout.js OUTSIDE every page container, which
 * is the whole point: the green bar used to go full-bleed with
 * margin-inline: calc(50% - 50vw) from inside a page container, and those
 * containers set overflow-x: clip (deliberately, so grid children can shrink
 * and sticky descendants keep working). A negative margin cannot escape a
 * clipped, centred container, so the bar stopped at the content column and cut
 * the Sign up button off its right end. Above the container it is full width by
 * nature, and nothing has to fight its own overflow rules.
 *
 * The active dimension comes from the URL rather than from props, so pages no
 * longer pass any.
 */
import { usePathname } from 'next/navigation';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import CategoryBar from '@/components/datasets/CategoryBar';

/* LONGEST match, not the first. Several roadmap items point at an ancestor as
   their nearest live page ('/datasets' and '/datasets/government' are both in
   the taxonomy), so a plain startsWith would mark Patent Activity active on
   /datasets/government/contracts. Matching on an exact path or a true path
   segment, then keeping the longest hit, resolves to the real page. */
function resolveActive(pathname) {
  let best = null;
  for (const cat of DATASET_TAXONOMY) {
    for (const item of cat.items || []) {
      if (!item.href) continue;
      const isExact = pathname === item.href;
      const isChild = pathname.startsWith(`${item.href}/`);
      if (!isExact && !isChild) continue;
      if (!best || item.href.length > best.href.length) {
        best = { href: item.href, active: cat.id, activeItem: item.label };
      }
    }
  }
  return best;
}

export default function DatasetChrome() {
  const pathname = usePathname() || '';
  /* The overview is not one of the datasets, so no dimension is marked there,
     which is how it rendered before this moved to the layout. */
  const hit = pathname === '/datasets' ? null : resolveActive(pathname);
  return <CategoryBar active={hit?.active ?? null} activeItem={hit?.activeItem ?? null} />;
}
