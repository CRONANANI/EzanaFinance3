'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';

export function TradeTicket({ getToken, onOrderPlaced }) {
  const { toast } = useToast();
  const [side, setSide] = useState('buy');
  const [symbol, setSymbol] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [orderType, setOrderType] = useState('market');
  const [amountType, setAmountType] = useState('shares');
  const [qty, setQty] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [timeInForce, setTimeInForce] = useState('day');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (symbol.length < 1) { setSearchResults([]); return; }
    if (selectedAsset?.symbol === symbol) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/alpaca/assets?search=${encodeURIComponent(symbol)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.assets || []);
        }
      } catch {} finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [symbol, selectedAsset]);

  const selectAsset = (asset) => {
    setSelectedAsset(asset);
    setSymbol(asset.symbol);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedAsset || !qty) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      const payload = {
        symbol: selectedAsset.symbol,
        side,
        type: orderType,
        timeInForce: timeInForce === 'gtc' ? 'gtc' : 'day',
      };
      if (amountType === 'dollars') payload.notional = parseFloat(qty);
      else payload.qty = parseFloat(qty);
      if (orderType === 'limit' && limitPrice) payload.limitPrice = parseFloat(limitPrice);

      const res = await fetch('/api/alpaca/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error);

      toast.success(`${side === 'buy' ? 'Buy' : 'Sell'} order for ${selectedAsset.symbol} submitted`);
      setQty('');
      setLimitPrice('');
      onOrderPlaced?.(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trd-form-card trd-ticket">
      <div className="trd-form-header"><h2>Trade</h2></div>
      <div className="trd-side-toggle">
        <button className={`trd-side-btn buy ${side === 'buy' ? 'active' : ''}`} onClick={() => setSide('buy')}>Buy</button>
        <button className={`trd-side-btn sell ${side === 'sell' ? 'active' : ''}`} onClick={() => setSide('sell')}>Sell</button>
      </div>
      {error && <div className="trd-error" role="alert"><i className="bi bi-exclamation-triangle" /> {error}</div>}
      <div className="trd-form-body">
        <div className="trd-field" style={{ position: 'relative' }}>
          <label>Stock / ETF</label>
          <input className="trd-input" value={symbol} onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setSelectedAsset(null); }} placeholder="Search AAPL, NVDA, SPY..." />
          {searching && <div className="trd-search-hint">Searching...</div>}
          {searchResults.length > 0 && !selectedAsset && (
            <div className="trd-search-dropdown">
              {searchResults.map((a) => (
                <button key={a.symbol} className="trd-search-item" onClick={() => selectAsset(a)}>
                  <span className="trd-search-symbol">{a.symbol}</span>
                  <span className="trd-search-name">{a.name}</span>
                  {a.fractionable && <span className="trd-search-frac">Fractional</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedAsset && (
          <>
            <div className="trd-selected-asset">
              <span className="trd-selected-symbol">{selectedAsset.symbol}</span>
              <span className="trd-selected-name">{selectedAsset.name}</span>
              <span className="trd-selected-exchange">{selectedAsset.exchange}</span>
            </div>
            <div className="trd-field">
              <label>Order Type</label>
              <div className="trd-option-row">
                {['market', 'limit'].map((t) => (
                  <button key={t} className={`trd-option-btn ${orderType === t ? 'active' : ''}`} onClick={() => setOrderType(t)}>{t === 'market' ? 'Market' : 'Limit'}</button>
                ))}
              </div>
            </div>
            <div className="trd-field">
              <label>Amount In</label>
              <div className="trd-option-row">
                <button className={`trd-option-btn ${amountType === 'shares' ? 'active' : ''}`} onClick={() => setAmountType('shares')}>Shares</button>
                {selectedAsset.fractionable && (
                  <button className={`trd-option-btn ${amountType === 'dollars' ? 'active' : ''}`} onClick={() => setAmountType('dollars')}>Dollars</button>
                )}
              </div>
            </div>
            <div className="trd-field">
              <label>{amountType === 'shares' ? 'Shares' : 'Dollar Amount'}</label>
              <div className="trd-amount-input-wrap">
                {amountType === 'dollars' && <span className="trd-amount-prefix">$</span>}
                <input className="trd-input trd-amount-input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={amountType === 'shares' ? '1' : '50.00'} min="0" step={amountType === 'shares' ? '1' : '0.01'} />
              </div>
            </div>
            {orderType === 'limit' && (
              <div className="trd-field">
                <label>Limit Price</label>
                <div className="trd-amount-input-wrap">
                  <span className="trd-amount-prefix">$</span>
                  <input className="trd-input trd-amount-input" type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
            )}
            <div className="trd-field">
              <label>Duration</label>
              <div className="trd-option-row">
                {[{ v: 'day', l: 'Day' }, { v: 'gtc', l: 'Good til Canceled' }].map((t) => (
                  <button key={t.v} className={`trd-option-btn ${timeInForce === t.v ? 'active' : ''}`} onClick={() => setTimeInForce(t.v)}>{t.l}</button>
                ))}
              </div>
            </div>
            <button className={`trd-btn-primary trd-submit-${side}`} style={{ width: '100%', marginTop: '1rem' }} onClick={handleSubmit} disabled={!qty || loading || parseFloat(qty) <= 0}>
              {loading ? 'Submitting...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedAsset.symbol}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
