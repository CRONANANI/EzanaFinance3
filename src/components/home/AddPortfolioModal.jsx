'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '@/lib/supabase-browser';
import './add-portfolio-modal.css';

const EZANA_LOGO = '/ezana-nav-logo.png';

const BROKERAGES = [
  { id: 'moomoo', name: 'moomoo', logo: '/logos/brokerages/moomoo.png' },
  { id: 'wealthsimple', name: 'Wealthsimple', logo: '/logos/brokerages/wealthsimple.png' },
  { id: 'questrade', name: 'Questrade', logo: '/logos/brokerages/questrade.png' },
  { id: 'td', name: 'TD Direct Investing', logo: '/logos/brokerages/td.png' },
  { id: 'rbc', name: 'RBC Direct Investing', logo: '/logos/brokerages/rbc.png' },
  {
    id: 'national-bank',
    name: 'National Bank Direct Brokerage',
    logo: '/logos/brokerages/national-bank.png',
  },
  { id: 'webull', name: 'Webull', logo: '/logos/brokerages/webull.png' },
  { id: 'bmo', name: 'BMO InvestorLine', logo: '/logos/brokerages/bmo.png' },
  { id: 'cibc', name: "CIBC Investor's Edge", logo: '/logos/brokerages/cibc.png' },
  { id: 'scotia', name: 'Scotia iTRADE', logo: '/logos/brokerages/scotia.png' },
  { id: 'desjardins', name: 'Desjardins', logo: '/logos/brokerages/desjardins.png' },
  { id: 'qtrade', name: 'Qtrade', logo: '/logos/brokerages/qtrade.png' },
  { id: 'ci', name: 'CI Direct Investing', logo: '/logos/brokerages/ci.png' },
  { id: 'canaccord', name: 'Canaccord Genuity', logo: '/logos/brokerages/canaccord.png' },
  { id: 'fidelity', name: 'Fidelity Investments', logo: '/logos/brokerages/fidelity.png' },
  { id: 'schwab', name: 'Charles Schwab', logo: '/logos/brokerages/schwab.png' },
  { id: 'public', name: 'Public', logo: '/logos/brokerages/public.png' },
  { id: 'etrade', name: 'E*TRADE', logo: '/logos/brokerages/etrade.png' },
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
  const [linkToken, setLinkToken] = useState(null);
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
      setLinkToken(null);
    }
  }, [open]);

  useEffect(() => {
    if (step !== 'disclosure' || linkToken) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError('Please sign in to connect a brokerage.');
          return;
        }
        const res = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to initialize connection');
        const data = await res.json();
        setLinkToken(data.link_token);
      } catch {
        setError('Failed to initialize connection. Please try again.');
      }
    })();
  }, [step, linkToken, getToken]);

  const handlePlaidSuccess = useCallback(
    async (public_token, metadata) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            public_token,
            metadata,
            brokerageHint: selected?.name,
          }),
        });
        if (!res.ok) throw new Error('Failed to connect account');
        const data = await res.json();
        onConnected?.(data);
        onClose?.();
      } catch {
        setError('Failed to connect account. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [getToken, selected, onConnected, onClose],
  );

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: (err) => {
      if (err) setError('Connection was cancelled or failed.');
    },
  });

  if (!open) return null;

  const pickBroker = (b) => {
    setSelected(b);
    setStep('disclosure');
  };

  const handleManual = () => {
    // TODO: manual entry flow
    onConnected?.({ manual: true });
    onClose?.();
  };

  const handleContinue = () => {
    if (plaidReady) openPlaid();
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
              <div className="apm-disc-block-title">Connect securely</div>
              <p className="apm-disc-block-text">
                We use bank-grade encryption to manage the connection between Ezana and your
                institution, ensuring reliable, read-only data transmission.
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
            disabled={!plaidReady || loading}
          >
            {loading ? 'Connecting…' : 'Continue'}
          </button>

          <button type="button" className="apm-back-link" onClick={() => setStep('grid')}>
            ← Choose a different brokerage
          </button>
        </div>
      )}
    </div>
  );
}
