'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase-browser';
import './add-portfolio-modal.css';

const EZANA_LOGO = '/ezana-nav-logo.png';

const BROKERAGES = [
  {
    id: 'WEALTHSIMPLE',
    name: 'Wealthsimple',
    logo: '/logos/brokerages/wealthsimple.png',
    region: 'CA',
  },
  { id: 'QUESTRADE', name: 'Questrade', logo: '/logos/brokerages/questrade.png', region: 'CA' },
  { id: 'WEBULL_CA', name: 'Webull (Canada)', logo: '/logos/brokerages/webull.png', region: 'CA' },
  { id: 'SCHWAB', name: 'Charles Schwab', logo: '/logos/brokerages/schwab.png', region: 'US' },
  { id: 'ETRADE', name: 'E*TRADE', logo: '/logos/brokerages/etrade.png', region: 'US' },
  { id: 'PUBLIC', name: 'Public', logo: '/logos/brokerages/public.png', region: 'US' },
  { id: 'WEBULL_US', name: 'Webull (US)', logo: '/logos/brokerages/webull.png', region: 'US' },
  { id: 'TASTYTRADE', name: 'Tastytrade', logo: '/logos/brokerages/tastytrade.png', region: 'US' },
  {
    id: 'TRADESTATION',
    name: 'TradeStation',
    logo: '/logos/brokerages/tradestation.png',
    region: 'US',
  },
  { id: 'TRADIER', name: 'Tradier', logo: '/logos/brokerages/tradier.png', region: 'US' },
  { id: 'MOOMOO', name: 'moomoo', logo: '/logos/brokerages/moomoo.png', region: 'US' },
  { id: 'ALPACA', name: 'Alpaca', logo: '/logos/brokerages/alpaca.png', region: 'US' },
  {
    id: 'ALPACA_PAPER',
    name: 'Alpaca Paper',
    logo: '/logos/brokerages/alpaca.png',
    region: 'US',
    paper: true,
  },
  {
    id: 'TRADESTATION_PAPER',
    name: 'TradeStation Paper',
    logo: '/logos/brokerages/tradestation.png',
    region: 'US',
    paper: true,
  },
  { id: 'TRADING212', name: 'Trading 212', logo: '/logos/brokerages/trading212.png', region: 'UK' },
  {
    id: 'TRADING212_PRACTICE',
    name: 'Trading 212 Practice',
    logo: '/logos/brokerages/trading212.png',
    region: 'UK',
    paper: true,
  },
  { id: 'STAKE_AU', name: 'Stake (Australia)', logo: '/logos/brokerages/stake.png', region: 'AU' },
  {
    id: 'KRAKEN',
    name: 'Kraken',
    logo: '/logos/brokerages/kraken.png',
    region: 'INTL',
    kind: 'crypto',
  },
  {
    id: 'COINBASE',
    name: 'Coinbase',
    logo: '/logos/brokerages/coinbase.png',
    region: 'INTL',
    kind: 'crypto',
  },
  {
    id: 'BINANCE',
    name: 'Binance',
    logo: '/logos/brokerages/binance.png',
    region: 'INTL',
    kind: 'crypto',
  },
];

function BrokerLogo({ broker, size = 48 }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="apm-broker-fallback">{broker.name}</span>;
  }

  return (
    <Image
      src={broker.logo}
      alt={broker.name}
      width={size === 48 ? 48 : 160}
      height={size === 48 ? 48 : 48}
      className="apm-broker-logo"
      onError={() => setFailed(true)}
    />
  );
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
        body: JSON.stringify({ broker: selected.id, connectionType: 'read' }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectURI) {
        throw new Error(data?.error || 'Failed to start connection');
      }
      window.location.href = data.redirectURI;
    } catch (e) {
      setError(e?.message || 'Failed to start the connection. Please try again.');
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
              >
                <BrokerLogo broker={b} size={160} />
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
