'use client';

/**
 * Shared dataset category bar for the dataset pages (Government Contracts,
 * Congressional trading, Datasets overview, …). One component, used on every
 * dataset page in the family — do NOT fork it.
 *
 * The categories ARE the shared DATASET_TAXONOMY (src/lib/datasets/taxonomy.js) —
 * the same 7 dimensions as the landing-page orbital map. Pass `active` (a
 * dimension id) to mark the current dimension, and `activeItem` (an item label)
 * to mark the current dataset:
 *   <CategoryBar active="capitol" activeItem="Government Contracts" />
 *
 * Roadmap items (live:false) show a muted "Soon" badge and route to the
 * dimension's overview rather than presenting as live data.
 *
 * The bar is also the only chrome the STANDALONE dataset routes draw (they opt
 * out of the marketing shell in src/app/datasets/layout.js), so it carries the
 * page's Home link and its auth actions. Three zones with equal fixed sides keep
 * the dimension group optically centred on the page, not merely centred in the
 * space the sides leave over.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { useAuth } from '@/components/auth-context';
import './category-bar.css';

export default function CategoryBar({ active, activeItem }) {
  const [openCat, setOpenCat] = useState(null);
  const ref = useRef(null);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  // Send the visitor back to the dataset page they were reading. usePathname is
  // deliberate over useSearchParams: the latter forces the whole bar (and so
  // every dataset page) into a Suspense boundary under the App Router.
  const signInHref = pathname ? `/signin?next=${encodeURIComponent(pathname)}` : '/signin';
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenCat(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <nav className="dscat-bar" ref={ref}>
      <div className="dscat-side dscat-side--start">
        <Link href="/" className="dscat-home">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          <span>Home</span>
        </Link>
      </div>

      <div className="dscat-center">
        {DATASET_TAXONOMY.map((cat) => (
          <div className="dscat" key={cat.id}>
            <button
              type="button"
              className={`dscat-trigger ${cat.id === active ? 'is-active' : ''}`}
              /* No inline style for the active trigger any more. It used to
                 paint the dimension's own colour as ink and an underline, which
                 is unreadable on the green gradient the bar now wears — and an
                 inline style would have beaten the stylesheet's translucent
                 white pill. The dot still carries the dimension colour. */
              ref={cat.id === active ? activeRef : undefined}
              onClick={() => setOpenCat((o) => (o === cat.id ? null : cat.id))}
            >
              <span className="dscat-dot" style={{ background: cat.color }} />
              {cat.label} <ChevronDown size={13} />
            </button>
            {openCat === cat.id && (
              <div className="dscat-menu">
                {cat.items.map((it) =>
                  it.live ? (
                    <a
                      key={it.label}
                      href={it.href}
                      className={`dscat-item ${it.label === activeItem ? 'is-active' : ''}`}
                      style={{ '--dscat-item-color': cat.color }}
                    >
                      <span>{it.label}</span>
                    </a>
                  ) : (
                    // Non-live: a <span>, not an <a> — can't navigate; disabled to AT.
                    <span
                      key={it.label}
                      className="dscat-item dscat-item--soon"
                      aria-disabled="true"
                      tabIndex={-1}
                      title="Coming soon"
                      style={{ '--dscat-item-color': cat.color }}
                    >
                      <span>{it.label}</span>
                      <span className="dscat-soon">Soon</span>
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="dscat-side dscat-side--end">
        {isAuthenticated ? (
          <Link href="/home" className="dscat-btn dscat-btn--solid">
            Dashboard
          </Link>
        ) : (
          <>
            <Link href={signInHref} className="dscat-btn dscat-btn--ghost">
              Log in
            </Link>
            <Link href="/signup" className="dscat-btn dscat-btn--solid">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
