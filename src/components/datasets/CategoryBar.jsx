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
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import './category-bar.css';

export default function CategoryBar({ active, activeItem }) {
  const [openCat, setOpenCat] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenCat(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <nav className="dscat-bar" ref={ref}>
      {DATASET_TAXONOMY.map((cat) => (
        <div className="dscat" key={cat.id}>
          <button
            type="button"
            className={`dscat-trigger ${cat.id === active ? 'is-active' : ''}`}
            style={
              cat.id === active
                ? { boxShadow: `inset 0 -2px 0 ${cat.color}`, color: cat.color }
                : undefined
            }
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
    </nav>
  );
}
