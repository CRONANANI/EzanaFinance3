'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';
import { TIER_LIST } from '@/lib/elo-tier-colors';
import { page, shape } from './elo-design-tokens';

const TIME_RANGES = ['1W', '1M', '3M', 'YTD', 'All'];

export const FilterBar = forwardRef(function FilterBar(
  { query, onQueryChange, range, onRangeChange, activeTier, onTierChange },
  searchRef,
) {
  const [localQuery, setLocalQuery] = useState(query);
  const debounceRef = useRef();

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (localQuery !== query) onQueryChange(localQuery);
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [localQuery, query, onQueryChange]);

  return (
    <div
      className="elo-filter-bar"
      style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 14,
      }}
    >
      <div style={{ position: 'relative', width: 220 }}>
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: page.inkMuted,
          }}
          aria-hidden
        >
          <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <input
          ref={searchRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search trader…"
          aria-label="Search trader by name"
          style={{
            width: '100%',
            padding: '8px 12px 8px 32px',
            border: `1.5px solid ${page.cardLine}`,
            borderRadius: shape.radius.input,
            background: page.card,
            fontSize: 13,
            fontWeight: 600,
            color: page.ink,
            boxShadow: shape.shadowSubtle,
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = page.brand;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = page.cardLine;
          }}
        />
      </div>

      <div
        role="group"
        aria-label="Time range"
        style={{
          display: 'flex',
          background: page.cardLine,
          padding: 3,
          borderRadius: 999,
          gap: 2,
        }}
      >
        {TIME_RANGES.map((r) => {
          const isActive = r === range;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              aria-pressed={isActive}
              style={{
                background: isActive ? page.brand : 'transparent',
                color: isActive ? '#fff' : page.inkSoft,
                border: 'none',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.4,
                cursor: 'pointer',
                transition: 'background 120ms ease, color 120ms ease',
                fontFamily: 'inherit',
              }}
            >
              {r}
            </button>
          );
        })}
      </div>

      <div
        role="radiogroup"
        aria-label="Filter by tier"
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
      >
        <TierFilterChip
          isActive={activeTier === 'all'}
          onClick={() => onTierChange('all')}
          label="ALL"
        />
        {TIER_LIST.map((t) => (
          <TierFilterChip
            key={t.key}
            isActive={activeTier === t.key}
            onClick={() => onTierChange(t.key)}
            label={t.label.toUpperCase()}
            tier={t}
          />
        ))}
      </div>
    </div>
  );
});

function TierFilterChip({ isActive, onClick, label, tier }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 11px',
        background: isActive && tier ? tier.soft : isActive ? page.brandSoft : page.card,
        color: isActive && tier ? tier.ink : isActive ? page.brand : page.inkSoft,
        border: isActive
          ? `1.5px solid ${tier ? tier.ring : page.brand}`
          : `1.5px solid ${page.cardLine}`,
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.4,
        cursor: 'pointer',
        boxShadow: isActive ? 'none' : `0 2px 0 ${page.shadow}`,
        transition: 'all 120ms ease',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {tier && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: tier.base,
          }}
        />
      )}
      {label}
    </button>
  );
}
