'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, TrendingUp, Building2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSymbolSearch } from '@/hooks/useFinnhub';

export function CompanySearch({
  onSelect,
  initialValue = '',
  placeholder = 'Search company or ticker (e.g., NVDA, Apple Inc.)',
  className = '',
}) {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const { results, isLoading } = useSymbolSearch(query);
  const filteredResults = results.slice(0, 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length]);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen || filteredResults.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        onSelect?.({ symbol: query.trim().toUpperCase(), description: query });
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (result) => {
    const item = {
      symbol: result.symbol || result.displaySymbol,
      name: result.description || result.symbol,
    };
    setQuery(item.symbol);
    setIsOpen(false);
    setIsFocused(false);
    inputRef.current?.blur();
    onSelect?.(item);
  };

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (query) setIsOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 200);
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative group" id="search-container">
        {/* Animated glow border */}
        <div
          className={`absolute -inset-[2px] rounded-2xl transition-all duration-500 ${
            isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
          }`}
          style={{
            background:
              'conic-gradient(from 0deg, #10b981, #059669, #047857, #10b981, #34d399, #6ee7b7, #10b981)',
            filter: 'blur(4px)',
            animation: isFocused ? 'spin-glow 4s linear infinite' : undefined,
          }}
        />
        <div
          className={`absolute -inset-[1px] rounded-2xl transition-all duration-500 ${
            isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'
          }`}
          style={{
            background:
              'conic-gradient(from 90deg, transparent, #10b981, transparent, transparent, #059669, transparent)',
            filter: 'blur(2px)',
            animation: isFocused ? 'spin-glow 3s linear infinite reverse' : undefined,
          }}
        />

        <div className="relative bg-[#0d1117] rounded-2xl">
          <div className="relative flex items-center">
            <div
              className={`absolute left-5 transition-colors duration-300 ${
                isFocused ? 'text-emerald-500' : 'text-gray-500'
              }`}
            >
              <Search className="w-5 h-5" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full h-14 pl-14 pr-14 bg-[#161b22] border border-gray-700/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-transparent transition-all text-lg font-medium"
              autoComplete="off"
              spellCheck="false"
            />

            {isLoading && (
              <div className="absolute right-14 text-emerald-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}

            {query && !isLoading && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-5 text-gray-500 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && query && (filteredResults.length > 0 || isLoading) && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-3 bg-[#161b22] border border-gray-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            <div className="py-2 max-h-[400px] overflow-y-auto">
              {filteredResults.map((result, index) => (
                <button
                  key={`${result.symbol}-${index}`}
                  type="button"
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-3 flex items-center gap-4 transition-all duration-150 ${
                    index === selectedIndex
                      ? 'bg-emerald-500/10'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                      index === selectedIndex ? 'bg-emerald-500/20' : 'bg-gray-800'
                    }`}
                  >
                    {result.type === 'ETF' ? (
                      <TrendingUp
                        className={`w-5 h-5 ${
                          index === selectedIndex ? 'text-emerald-400' : 'text-gray-400'
                        }`}
                      />
                    ) : (
                      <Building2
                        className={`w-5 h-5 ${
                          index === selectedIndex ? 'text-emerald-400' : 'text-gray-400'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold text-base ${
                          index === selectedIndex ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {result.symbol || result.displaySymbol}
                      </span>
                      {result.type && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md ${
                            index === selectedIndex
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {result.type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {result.description || result.symbol}
                    </p>
                  </div>
                </button>
              ))}
              {isLoading && filteredResults.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Searching...</p>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500 bg-[#0d1117]">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-400 font-mono text-[10px]">Enter</kbd>
                <span>select</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-400 font-mono text-[10px]">Esc</kbd>
                <span>close</span>
              </span>
            </div>
          </motion.div>
        )}

        {isOpen && query && !isLoading && filteredResults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-3 bg-[#161b22] border border-gray-700/50 rounded-2xl shadow-2xl p-8 text-center"
          >
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-300 font-medium">No results found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try searching for a different company name or ticker symbol
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
