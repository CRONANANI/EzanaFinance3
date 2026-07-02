'use client';

/**
 * Shared four-category dropdown bar for the dataset pages (Government Contracts,
 * Congressional trading, …). One component, used on every dataset page in the
 * family — do NOT fork it. Pass `active` to mark the current category + item:
 *   <CategoryBar active="gov" activeItem="Government Contracts" />
 *   <CategoryBar active="congress" activeItem="Congressional trading" />
 *
 * Items route to the real existing dataset pages; where a dedicated sub-page
 * doesn't exist yet, they route to that category's hub.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './category-bar.css';

export const DATASET_CATEGORIES = [
  {
    key: 'congress',
    label: 'Congressional & Political',
    items: [
      ['Congressional trading', '/datasets/political'],
      ['Government contracts', '/datasets/government/contracts'],
      ['Lobbying activity', '/datasets/government'],
      ['Committee assignments', '/datasets/political'],
    ],
  },
  {
    key: 'gov',
    label: 'Government Activity',
    items: [
      ['Government Contracts', '/datasets/government/contracts'],
      ['Corporate Lobbying', '/datasets/government'],
      ['Patents', '/datasets/government'],
    ],
  },
  {
    key: 'sec',
    label: 'SEC & Institutional Filings',
    items: [
      ['Insider Trading', '/datasets/sec-filings'],
      ['Executive Compensation', '/datasets/sec-filings'],
      ['Institutional Holdings', '/datasets/sec-filings'],
      ['Whale Moves', '/datasets/sec-filings'],
      ['ETF Holdings', '/datasets/sec-filings'],
    ],
  },
  {
    key: 'markets',
    label: 'Markets & Signals',
    items: [
      ['Markets & Equities', '/datasets/markets'],
      ['Prediction Markets', '/datasets/prediction-markets'],
      ['Alternative Signals', '/datasets/alternative'],
      ['Global & Macro', '/datasets/global'],
    ],
  },
];

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
      {DATASET_CATEGORIES.map((cat) => (
        <div className="dscat" key={cat.key}>
          <button
            type="button"
            className={`dscat-trigger ${cat.key === active ? 'is-active' : ''}`}
            onClick={() => setOpenCat((o) => (o === cat.key ? null : cat.key))}
          >
            {cat.label} <ChevronDown size={13} />
          </button>
          {openCat === cat.key && (
            <div className="dscat-menu">
              {cat.items.map(([name, href]) => (
                <a
                  key={name}
                  href={href}
                  className={`dscat-item ${name === activeItem ? 'is-active' : ''}`}
                >
                  {name}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
