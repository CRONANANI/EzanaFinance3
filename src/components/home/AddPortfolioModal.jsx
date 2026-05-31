'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase-browser';
import { BrandMark, brandColor } from './brokerage-brand-marks';
import './add-portfolio-modal.css';

const EZANA_LOGO = '/ezana-nav-logo.png';

const BROKERAGES = [
  { id: 'WEALTHSIMPLE', name: 'Wealthsimple', region: 'CA' },
  { id: 'QUESTRADE', name: 'Questrade', region: 'CA' },
  { id: 'WEBULL_CA', name: 'Webull (Canada)', region: 'CA' },
  { id: 'SCHWAB', name: 'Charles Schwab', region: 'US' },
  { id: 'ETRADE', name: 'E*TRADE', region: 'US' },
  { id: 'PUBLIC', name: 'Public', region: 'US' },
  { id: 'WEBULL_US', name: 'Webull (US)', region: 'US' },
  { id: 'TASTYTRADE', name: 'Tastytrade', region: 'US' },
  { id: 'TRADESTATION', name: 'TradeStation', region: 'US' },
  { id: 'TRADIER', name: 'Tradier', region: 'US' },
  { id: 'MOOMOO', name: 'moomoo', region: 'US' },
  { id: 'ALPACA', name: 'Alpaca', region: 'US' },
  { id: 'ALPACA_PAPER', name: 'Alpaca Paper', region: 'US', paper: true },
  { id: 'TRADESTATION_PAPER', name: 'TradeStation Paper', region: 'US', paper: true },
  { id: 'TRADING212', name: 'Trading 212', region: 'UK' },
  { id: 'TRADING212_PRACTICE', name: 'Trading 212 Practice', region: 'UK', paper: true },
  { id: 'STAKE_AU', name: 'Stake (Australia)', region: 'AU' },
  { id: 'KRAKEN', name: 'Kraken', region: 'INTL', kind: 'crypto' },
  { id: 'COINBASE', name: 'Coinbase', region: 'INTL', kind: 'crypto' },
  { id: 'BINANCE', name: 'Binance', region: 'INTL', kind: 'crypto' },
];

function BrokerLogo({ broker, size = 56 }) {
  return <BrandMark id={broker.id} size={size} />;
}

export function AddPortfolioModal({ open, onClose, onConnected }) {
  const [step, setStep] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  useEffect(() => {
    if (open) {
      setStep('grid');
      setSelected(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const pickBroker = (b) => {
    setSelected(b);
    setStep('disclosure');
  };

  const handleManual = () => {
    onConnected?.({ manual: true });
    onClose?.();
  };

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to connect a brokerage.');
      const res = await fetch('/api/snaptrade/connect-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ broker: selected.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirectURI) {
        const code = data?.code;
        if (code === 'broker_not_supported') {
          throw new Error(
            `${selected.name} isn't available right now. Please pick a different brokerage.`,
          );
        }
        if (code === 'auth_required') {
          throw new Error('Your session expired. Please sign in again.');
        }
        throw new Error("We couldn't open the connection portal. Please try again in a moment.");
      }
      window.location.href = data.redirectURI;
    } catch (e) {
      const safe =
        e?.message && e.message.length < 200 && !e.message.includes('status code')
          ? e.message
          : "We couldn't open the connection portal. Please try again in a moment.";
      setError(safe);
      setLoading(false);
    }
  };

  return (
    <div className="apm-overlay" onClick={onClose}>
      {step === 'grid' && (
        <div className="apm-card apm-card--grid" onClick={(e) => e.stopPropagation()}>
          <div className="apm-grid-head">
            <button type="button" className="apm-close" onClick={onClose} aria-label="Close">
              ×
            </button>
            <h2 className="apm-grid-title">Connect your brokerage</h2>
          </div>
          <div className="apm-broker-grid">
            {BROKERAGES.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`apm-broker-tile ${selected?.id === b.id ? 'apm-broker-tile--active' : ''}`}
                onClick={() => pickBroker(b)}
                style={{ '--brand-accent': brandColor(b.id) }}
              >
                <BrokerLogo broker={b} size={56} />
                <span className="apm-broker-name">{b.name}</span>
                {b.paper ? <span className="apm-broker-tag">Paper</span> : null}
                {b.region ? <span className="apm-broker-region">{b.region}</span> : null}
              </button>
            ))}
          </div>
          <button type="button" className="apm-manual-btn" onClick={handleManual}>
            Add investments manually
          </button>
        </div>
      )}

      {step === 'disclosure' && (
        <div className="apm-card apm-card--disclosure" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="apm-close apm-close--disclosure"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>

          <div className="apm-disc-logos">
            <span className="apm-disc-logo apm-disc-logo--ezana">
              <Image src={EZANA_LOGO} alt="Ezana" width={48} height={48} />
            </span>
            <span className="apm-disc-arrow">⇄</span>
            <span className="apm-disc-logo apm-disc-logo--broker">
              {selected ? <BrokerLogo broker={selected} size={48} /> : null}
            </span>
          </div>

          <h2 className="apm-disc-title">
            Ezana connects securely to your {selected?.name || 'brokerage'} account
          </h2>

          <div className="apm-disc-block">
            <div className="apm-disc-icon">
              <i className="bi bi-key" />
            </div>
            <div>
              <div className="apm-disc-block-title">Your data belongs to you</div>
              <p className="apm-disc-block-text">
                Ezana never sells your personal information and only uses it with your permission.
              </p>
            </div>
          </div>

          <div className="apm-disc-block">
            <div className="apm-disc-icon">
              <i className="bi bi-lock" />
            </div>
            <div>
              <div className="apm-disc-block-title">Connect securely via SnapTrade</div>
              <p className="apm-disc-block-text">
                We use SnapTrade — an SOC 2 Type II certified connectivity provider — to handle the
                OAuth handshake with {selected?.name || 'your brokerage'}. Ezana never sees your
                login credentials.
              </p>
            </div>
          </div>

          {error ? <p className="apm-disc-error">{error}</p> : null}

          <p className="apm-disc-terms">
            By continuing, you agree to the{' '}
            <a href="/legal/terms" target="_blank" rel="noopener noreferrer">
              Ezana Terms &amp; Conditions
            </a>
            .
          </p>

          <button
            type="button"
            className="apm-continue-btn"
            onClick={handleContinue}
            disabled={loading}
          >
            {loading ? 'Opening secure portal…' : 'Continue'}
          </button>

          <button type="button" className="apm-back-link" onClick={() => setStep('grid')}>
            ← Choose a different brokerage
          </button>
        </div>
      )}
    </div>
  );
}
