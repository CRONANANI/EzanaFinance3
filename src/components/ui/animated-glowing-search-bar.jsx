'use client';

import React from 'react';

/**
 * Search bar with controlled value, onChange, and optional suggestions dropdown.
 *
 * `trailing` renders inside the pill at the right edge, just left of the
 * filter icon (the research page puts its Company / Industry / Portfolio
 * toggle there). The right side is a flex cluster rather than absolutely
 * positioned, so the input text never runs underneath it.
 */
export function AnimatedGlowingSearchBar({
  value = '',
  onChange,
  onSearch,
  placeholder = 'Search company or ticker (e.g., NVDA, Apple Inc.)',
  suggestions = [],
  onSelectSuggestion,
  showSuggestions = false,
  onFocus,
  onBlur,
  inputRef,
  className = '',
  loading = false,
  trailing = null,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch?.(value.trim());
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="agsb-field relative flex items-center w-full">
        <i
          className="agsb-search-icon bi bi-search absolute left-4 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Search company or ticker"
          className="ds-search-input flex-1 min-w-0 h-[56px] rounded-lg pl-12 pr-3 text-base placeholder:text-gray-400"
          style={{ color: 'var(--text-primary)' }}
        />
        {loading && (
          <div className="flex-none mr-3" aria-hidden="true">
            <div className="w-5 h-5 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
        <div className="agsb-trailing flex flex-none items-center gap-3 pr-4 z-[2]">
          {trailing}
          <i className="agsb-filter-icon bi bi-sliders" aria-hidden="true" />
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0d1117] border border-emerald-500/30 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((item) => (
            <button
              key={item.symbol}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-[#161b22] transition-colors flex items-center justify-between gap-3"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectSuggestion?.(item);
              }}
            >
              <span className="font-medium text-white">{item.symbol}</span>
              <span className="text-sm text-gray-400 truncate">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AnimatedGlowingSearchBar;
