'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase-browser';
import { BrandMark, brandColor } from './brokerage-brand-marks';
import './add-portfolio-modal.css';

const EZANA_LOGO = '/ezana-nav-logo.png';

function BrokerLogo({ broker, size = 56 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = broker.square_logo_url || broker.logo_url;
  if (!logoUrl || imgFailed) {
    return <BrandMark id={broker.slug} size={size} />;
  }
  return (
    <img
      src={logoUrl}
      alt={broker.display_name || broker.name}
      width={size}
      height={size}
      className="apm-broker-logo-img"
      onError={() => setImgFailed(true)}
      loading="lazy"
    />
  );
}

function isPaper(broker) {
  const slug = (broker.slug || '').toLowerCase();
  const name = (broker.display_name || broker.name || '').toLowerCase();
  return (
    slug.includes('paper') ||
    slug.includes('practice') ||
    name.includes('paper') ||
    name.includes('practice')
  );
}

export function AddPortfolioModal({ open, onClose, onConnected }) {
  const [step, setStep] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [brokerages, setBrokerages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep('grid');
    setSelected(null);
    setError(null);
    setLoading(false);
    setLoadingList(true);
    let cancelled = false;
    fetch('/api/snaptrade/brokerages', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { brokerages: [] }))
      .then((data) => {
        if (cancelled) return;
        setBrokerages(data?.brokerages || []);
      })
      .catch(() => {
        if (!cancelled) setBrokerages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
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
        body: JSON.stringify({
          broker: selected.slug,
          allowsTrading: selected.allows_trading,
          brokerageType: selected.brokerage_type,
          connectionType: undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirectURI) {
        const code = data?.code;
        const detail = data?.detail;
        if (code === 'broker_not_supported') {
          throw new Error(
            detail
              ? `${selected.display_name || selected.name} isn't available right now: ${detail}`
              : `${selected.display_name || selected.name} isn't available right now. Please pick a different brokerage.`,
          );
        }
        if (code === 'auth_required') {
          throw new Error('Your session expired. Please sign in again.');
        }
        if (code === 'rate_limited') {
          throw new Error('Too many requests. Wait a moment and try again.');
        }
        const baseMsg = "We couldn't open the connection portal.";
        if (detail) {
          const trimmed = String(detail).slice(0, 140);
          throw new Error(`${baseMsg} (${trimmed})`);
        }
        throw new Error(`${baseMsg} Please try again in a moment.`);
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

          {loadingList ? (
            <div className="apm-broker-grid-loading">Loading brokerages…</div>
          ) : brokerages.length === 0 ? (
            <div className="apm-broker-grid-loading">
              We couldn&apos;t load the brokerage list. Please refresh and try again.
            </div>
          ) : (
            <div className="apm-broker-grid">
              {brokerages.map((b) => {
                const paper = isPaper(b);
                const type = String(b.brokerage_type || '').toLowerCase();
                const readOnly =
                  b.allows_trading === false ||
                  type.includes('crypto') ||
                  type.includes('exchange');
                return (
                  <button
                    key={b.slug}
                    type="button"
                    className={`apm-broker-tile ${selected?.slug === b.slug ? 'apm-broker-tile--active' : ''}`}
                    onClick={() => pickBroker(b)}
                    style={{ '--brand-accent': brandColor(b.slug) }}
                    title={`${b.display_name || b.name}${readOnly ? ' (read-only)' : ''}`}
                  >
                    <div className="apm-broker-logo-wrap">
                      <BrokerLogo broker={b} size={64} />
                    </div>
                    {paper ? <span className="apm-broker-tag">Paper</span> : null}
                    {readOnly && !paper ? (
                      <span className="apm-broker-tag apm-broker-tag--readonly">Read-only</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          <button type="button" className="apm-manual-btn" onClick={handleManual}>
            Add investments manually
          </button>
        </div>
      )}

      {step === 'disclosure' && selected && (
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
              <BrokerLogo broker={selected} size={48} />
            </span>
          </div>

          <h2 className="apm-disc-title">
            Ezana connects securely to your {selected.display_name || selected.name} account
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
                OAuth handshake with {selected.display_name || selected.name}. Ezana never sees your
                login credentials.
              </p>
            </div>
          </div>

          {(() => {
            const type = String(selected.brokerage_type || '').toLowerCase();
            const isReadOnly =
              selected.allows_trading === false ||
              type.includes('crypto') ||
              type.includes('exchange');
            return (
              <div className="apm-disc-block">
                <div className="apm-disc-icon">
                  <i className={isReadOnly ? 'bi bi-eye' : 'bi bi-arrow-left-right'} />
                </div>
                <div>
                  <div className="apm-disc-block-title">
                    {isReadOnly ? 'Read-only access' : 'Trading and portfolio access'}
                  </div>
                  <p className="apm-disc-block-text">
                    {isReadOnly ? (
                      <>
                        {selected.display_name || selected.name} connects in read-only mode. We can
                        show your holdings, balances, and recent activity — but cannot place trades
                        from Ezana.
                      </>
                    ) : (
                      <>
                        {selected.display_name || selected.name} supports both portfolio sync and
                        order placement through SnapTrade. You can place trades from Ezana once
                        connected.
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
          })()}

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
