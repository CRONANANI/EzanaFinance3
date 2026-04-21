'use client';

import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

/**
 * Search bar with controlled value, onChange, and optional suggestions dropdown.
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
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch?.(value.trim());
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="relative flex items-center w-full">
        {/* Input container */}
        <div className="relative w-full flex-1">
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
            className="bg-[#010201] border border-gray-700 w-full h-[56px] rounded-lg text-white pl-12 pr-14 text-base focus:outline-none focus:border-gray-500 placeholder:text-gray-400"
          />
          {/*
           * Filter icon: `top-1/2 -translate-y-1/2` vertically centers it
           * against the input's full height regardless of input size or
           * icon size — replaces the previous `top-2` which pinned it to
           * the top of the 56px input and left it visually too high.
           */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-[2]">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
          </div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search className="w-5 h-5 text-gray-400" strokeWidth={2} />
          </div>
          {loading && (
            <div className="absolute right-14 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}
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
