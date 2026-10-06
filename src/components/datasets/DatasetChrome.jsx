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
import DatasetTicker from '@/components/datasets/DatasetTicker';
import { useTickerSlot } from '@/components/datasets/ticker-slot';
import { dimensionForSlug } from '@/lib/datasets/hubs';

/* LONGEST match, not the first. Several roadmap items point at an ancestor as
   their nearest live page ('/datasets' and '/datasets/government' are both in
   the taxonomy), so a plain startsWith would mark Patent Activity active on
   /datasets/government/contracts. Matching on an exact path or a true path
   segment, then keeping the longest hit, resolves to the real page. */
function resolveActive(pathname) {
  /* A hub lights its own dimension (no item: the hub is the dimension). */
  const hub = dimensionForSlug(pathname.replace(/^\/datasets\//, ''));
  if (hub) return { href: pathname, active: hub, activeItem: null };
  let best = null;
  for (const cat of DATASET_TAXONOMY) {
    for (const item of cat.items || []) {
      if (!item.href) continue;
      const isExact = pathname === item.href;
      /* '/datasets' is the overview, not a dimension's page, and several
         roadmap items point at it as their nearest live route. Treated as a
         PREFIX it matches every dataset sub-route, so any page without its own
         taxonomy entry lit whichever dimension happened to own the first such
         item — The Hive, as it turned out. Contracts only escaped because its
         own longer entry outranked it. Exact match still counts. */
      const isChild = item.href !== '/datasets' && pathname.startsWith(`${item.href}/`);
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
  const { ticker } = useTickerSlot();
  /* The overview is not one of the datasets, so no dimension is marked there,
     which is how it rendered before this moved to the layout. */
  const hit = pathname === '/datasets' ? null : resolveActive(pathname);
  /* One green block, one set of rounded bottom corners, one bottom margin. The
     wrapper's overflow: hidden is what clips the ticker's track to those
     corners; it does NOT affect the bar's dimension menus, which render through
     a portal to document.body precisely so no ancestor can clip them. A page
     that publishes no ticker gets the bar alone, still rounded. */
  return (
    <div className="dscat-chrome">
      <CategoryBar active={hit?.active ?? null} activeItem={hit?.activeItem ?? null} />
      {ticker ? (
        <DatasetTicker
          items={ticker.items}
          onSelect={ticker.onSelect}
          ariaLabel={ticker.ariaLabel}
        />
      ) : null}
    </div>
  );
}
