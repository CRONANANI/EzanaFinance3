'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, Check } from 'lucide-react';
import { searchTickers } from '@/lib/tickerSearchData';

/**
 * @param {{
 *   query: string;
 *   onQueryChange: (q: string) => void;
 *   mockWatchlists: import('@/lib/mockWatchlists').MockWatchlist[];
 *   onAddStock: (ticker: string, watchlistId: string) => void;
 * }} props
 */
export function WatchlistSearch({ query, onQueryChange, mockWatchlists, onAddStock }) {
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingTicker, setAddingTicker] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setResults(searchTickers(query));
    setShowDropdown(true);
  }, [query]);

  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        setAddingTicker(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function clearSearch() {
    onQueryChange('');
    setResults([]);
    setShowDropdown(false);
    setAddingTicker(null);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="wl-search-wrap">
      <div className="wl-side-search wl-side-search--wide">
        <Search size={14} className="wl-search-icon" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search ticker or company…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => query.trim().length > 0 && setShowDropdown(true)}
        />
        {query.length > 0 && (
          <button type="button" className="wl-search-clear" onClick={clearSearch} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && query.trim().length > 0 && (
        <div className="wl-search-dropdown">
          {results.length === 0 ? (
            <div className="wl-search-empty">No results for &quot;{query}&quot;</div>
          ) : (
            results.map((result) => (
              <div key={result.ticker} className="wl-search-result-block">
                <div className="wl-search-row">
                  <div className="wl-search-row-main">
                    <span className="wl-search-tk">{result.ticker}</span>
                    <span className="wl-search-nm">{result.name}</span>
                    <span className="wl-search-sec">{result.sector}</span>
                  </div>
                  {addSuccess === result.ticker ? (
                    <span className="wl-search-added">
                      <Check size={12} /> Added
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="wl-search-plus"
                      title={`Add ${result.ticker}`}
                      onClick={() => setAddingTicker(result.ticker)}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                {addingTicker === result.ticker && (
                  <div className="wl-search-pick">
                    <p className="wl-search-pick-label">
                      Add <span className="wl-search-tk-inline">{result.ticker}</span> to:
                    </p>
                    <div className="wl-search-pick-btns">
                      {mockWatchlists.map((list) => (
                        <button
                          key={list.id}
                          type="button"
                          className="wl-search-pick-btn"
                          onClick={() => {
                            onAddStock(result.ticker, list.id);
                            setAddSuccess(result.ticker);
                            setAddingTicker(null);
                            setTimeout(() => setAddSuccess(null), 2000);
                          }}
                        >
                          {list.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
