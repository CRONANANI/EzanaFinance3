'use client';

import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

/**
 * Animated glowing search bar with green gradient border effect.
 * Full-width, accepts controlled value, onChange, and optional suggestions dropdown.
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
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch?.(value.trim());
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="relative flex items-center group w-full">
        {/* Glowing border layers - green theme */}
        <div className="absolute z-[-1] overflow-hidden h-full w-full min-h-[56px] rounded-xl blur-[3px]
          before:absolute before:content-[''] before:z-[-2] before:w-[999px] before:h-[999px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-60
          before:bg-[conic-gradient(#000,#10b981_5%,#000_38%,#000_50%,#059669_60%,#000_87%)] before:transition-all before:duration-2000
          group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]">
        </div>
        <div className="absolute z-[-1] overflow-hidden h-full w-full min-h-[54px] rounded-xl blur-[3px]
          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
          before:bg-[conic-gradient(rgba(0,0,0,0),#0d4d3a,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#047857,rgba(0,0,0,0)_60%)] before:transition-all before:duration-2000
          group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
        </div>
        <div className="absolute z-[-1] overflow-hidden h-full w-full min-h-[52px] rounded-lg blur-[2px]
          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
          before:bg-[conic-gradient(rgba(0,0,0,0)_0%,#6ee7b7,rgba(0,0,0,0)_8%,rgba(0,0,0,0)_50%,#34d399,rgba(0,0,0,0)_58%)] before:brightness-140
          before:transition-all before:duration-2000 group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]">
        </div>
        <div className="absolute z-[-1] overflow-hidden h-full w-full min-h-[50px] rounded-xl blur-[0.5px]
          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-70
          before:bg-[conic-gradient(#0a0f0a,#10b981_5%,#0a0f0a_14%,#0a0f0a_50%,#059669_60%,#0a0f0a_64%)] before:brightness-130
          before:transition-all before:duration-2000 group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]">
        </div>

        {/* Input container */}
        <div className="relative group w-full flex-1">
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
            className="bg-[#010201] border-none w-full h-[56px] rounded-lg text-white pl-12 pr-14 text-base focus:outline-none placeholder-gray-400"
          />
          <div className="pointer-events-none w-[120px] h-[20px] absolute bg-gradient-to-r from-transparent to-[#010201] top-[18px] left-12 group-focus-within:hidden" />
          <div className="pointer-events-none w-[30px] h-[20px] absolute bg-[#10b981] top-[10px] left-[5px] blur-2xl opacity-80 transition-all duration-2000 group-hover:opacity-0" />
          <div className="absolute h-[42px] w-[40px] overflow-hidden top-[7px] right-[7px] rounded-lg
            before:absolute before:content-[''] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-90
            before:bg-[conic-gradient(rgba(0,0,0,0),#0d4d3a,rgba(0,0,0,0)_50%,rgba(0,0,0,0)_50%,#0d4d3a,rgba(0,0,0,0)_100%)]
            before:brightness-135 before:animate-spin-slow">
          </div>
          <div className="absolute top-2 right-2 flex items-center justify-center z-[2] max-h-10 max-w-[38px] h-full w-full [isolation:isolate] overflow-hidden rounded-lg bg-gradient-to-b from-[#0d1f18] via-black to-[#0d2a1f] border border-transparent">
            <SlidersHorizontal className="w-5 h-5 text-[#6ee7b7]" strokeWidth={1.5} />
          </div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search className="w-5 h-5 text-gray-400" strokeWidth={2} />
          </div>
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
