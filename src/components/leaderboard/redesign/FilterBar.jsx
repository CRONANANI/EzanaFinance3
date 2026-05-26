'use client';

import { useState, useEffect, useRef } from 'react';
import { TIER_LIST } from '@/lib/elo-tier-colors';
import { type as typeTokens } from './elo-design-tokens';
import { useEloTheme } from './EloThemeContext';

const TIME_RANGES = ['1W', '1M', '3M', 'YTD', 'All'];

export function FilterBar({
  query,
  onQueryChange,
  range,
  onRangeChange,
  activeTier,
  onTierChange,
}) {
  const { page, brand, shape } = useEloTheme();
  const [localQuery, setLocalQuery] = useState(query);
  const debounceRef = useRef();
  const inputRef = useRef(null);

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

  useEffect(() => {
    const handler = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setLocalQuery('');
        onQueryChange('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onQueryChange]);

  return (
    <div
      className="elo-filter-bar"
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        fontFamily: typeTokens.sans,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 220,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: page.inkMuted,
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search trader…"
          aria-label="Search trader by name"
          style={{
            width: '100%',
            padding: '7px 32px 7px 30px',
            border: `1px solid ${page.border}`,
            borderRadius: shape.radius.button,
            background: page.surface,
            fontSize: 12,
            fontFamily: typeTokens.sans,
            color: page.ink,
            boxShadow: shape.shadow.card,
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = brand.base;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = page.border;
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: page.surfaceAlt,
            border: `1px solid ${page.border}`,
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 10,
            fontFamily: typeTokens.mono,
            color: page.inkMuted,
            lineHeight: 1,
          }}
        >
          /
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          background: page.surface,
          border: `1px solid ${page.border}`,
          borderRadius: shape.radius.button,
          overflow: 'hidden',
        }}
      >
        {TIME_RANGES.map((r, i) => {
          const isActive = r === range;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              aria-pressed={isActive}
              style={{
                background: isActive ? page.surfaceAlt : 'transparent',
                color: isActive ? page.ink : page.inkSoft,
                border: 'none',
                borderLeft: i > 0 ? `1px solid ${page.border}` : 'none',
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 500,
                fontFamily: typeTokens.mono,
                cursor: 'pointer',
                transition: 'background 120ms ease, color 120ms ease',
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
          label="All"
        />
        {TIER_LIST.map((t) => (
          <TierFilterChip
            key={t.key}
            isActive={activeTier === t.key}
            onClick={() => onTierChange(t.key)}
            label={t.label}
            tier={t}
          />
        ))}
      </div>
    </div>
  );
}

function TierFilterChip({ isActive, onClick, label, tier }) {
  const { page } = useEloTheme();

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
        padding: '5px 10px',
        background: isActive ? page.surfaceAlt : page.surface,
        color: isActive ? (tier ? tier.base : page.ink) : page.inkSoft,
        border: isActive
          ? `1px solid ${tier ? tier.ring : page.borderStrong}`
          : `1px solid ${page.border}`,
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: typeTokens.sans,
        cursor: 'pointer',
        transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
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
