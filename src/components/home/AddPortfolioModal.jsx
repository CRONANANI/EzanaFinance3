'use client';

import { useState, useCallback, useEffect } from 'react';
import Script from 'next/script';
import Image from 'next/image';
import { supabase } from '@/lib/supabase-browser';
import { BrandMark, brandColor, resolveBrandKey } from './brokerage-brand-marks';
import { CountryFlag, inferCountry } from './brokerage-country-flags';
import './add-portfolio-modal.css';

const EZANA_LOGO = '/ezana-nav-logo.png';
const PLAID_LINK_SCRIPT = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

function InstitutionLogo({ inst, size = 56 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = inst.logoUrl;
  if (!logoUrl || imgFailed) {
    return <BrandMark inst={inst} size={size} />;
  }
  return (
    <img
      src={logoUrl}
      alt={inst.displayName}
      width={size}
      height={size}
      className="apm-broker-logo-img"
      onError={() => setImgFailed(true)}
      loading="lazy"
    />
  );
}

export function AddPortfolioModal({ open, onClose, onConnected }) {
  const [step, setStep] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [chosenProvider, setChosenProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');

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
    setChosenProvider(null);
    setError(null);
    setLoading(false);
    setSearch('');
    setLoadingList(true);
    let cancelled = false;
    fetch('/api/institutions/list', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { institutions: [] }))
      .then((data) => {
        if (cancelled) return;
        setInstitutions(data?.institutions || []);
      })
      .catch(() => {
        if (!cancelled) setInstitutions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const pickInstitution = (inst) => {
    setSelected(inst);
    setError(null);
    if (inst.providers.length === 1) {
      setChosenProvider(inst.providers[0]);
      setStep('disclosure');
    } else {
      setStep('provider-choice');
    }
  };

  const pickProvider = (provider) => {
    setChosenProvider(provider);
    setStep('disclosure');
  };

  const handleManual = () => {
    onConnected?.({ manual: true });
    onClose?.();
  };

  const handleContinue = async () => {
    if (!selected || !chosenProvider) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to connect a brokerage.');

      if (chosenProvider === 'snaptrade') {
        const res = await fetch('/api/snaptrade/connect-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            broker: selected.snaptradeSlug,
            allowsTrading: selected.snaptradeAllowsTrading,
            brokerageType: selected.snaptradeBrokerageType,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.redirectURI) {
          throw new Error(formatSnapTradeError(data, selected));
        }
        window.location.href = data.redirectURI;
        return;
      }

      if (chosenProvider === 'plaid') {
        await launchPlaidLink({
          token,
          institutionId: selected.plaidInstitutionId,
          institutionName: selected.displayName,
          onSuccess: () => {
            onConnected?.({ provider: 'plaid', institution: selected.displayName });
            onClose?.();
          },
          onError: (msg) => {
            setError(msg);
            setLoading(false);
          },
        });
        return;
      }

      throw new Error('Unsupported provider.');
    } catch (e) {
      const safe =
        e?.message && e.message.length < 280
          ? e.message
          : "We couldn't open the connection portal. Please try again in a moment.";
      setError(safe);
      setLoading(false);
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    if (!search) return true;
    return inst.displayName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <Script src={PLAID_LINK_SCRIPT} strategy="lazyOnload" />
      <div className="apm-overlay" onClick={onClose}>
        {step === 'grid' && (
          <div className="apm-card apm-card--grid" onClick={(e) => e.stopPropagation()}>
            <div className="apm-grid-head">
              <button type="button" className="apm-close" onClick={onClose} aria-label="Close">
                ×
              </button>
              <h2 className="apm-grid-title">Connect your brokerage</h2>
            </div>

            <input
              type="text"
              className="apm-search"
              placeholder={
                institutions.length > 100
                  ? `Search ${institutions.length.toLocaleString()} institutions…`
                  : 'Search institutions…'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {loadingList ? (
              <div className="apm-broker-grid-loading">Loading institutions…</div>
            ) : filteredInstitutions.length === 0 ? (
              <div className="apm-broker-grid-loading">
                {search
                  ? `No institutions match "${search}".`
                  : "We couldn't load institutions. Please refresh and try again."}
              </div>
            ) : (
              <div className="apm-broker-grid">
                {filteredInstitutions.slice(0, 60).map((inst) => {
                  const readOnly =
                    inst.snaptradeAllowsTrading === false ||
                    inst.category === 'crypto_exchange' ||
                    (!inst.snaptradeSlug && inst.plaidInstitutionId);
                  const country = inferCountry(inst);
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      className={`apm-broker-tile ${selected?.id === inst.id ? 'apm-broker-tile--active' : ''}`}
                      onClick={() => pickInstitution(inst)}
                      style={{ '--brand-accent': brandColor(resolveBrandKey(inst)) }}
                      title={`${inst.displayName}${readOnly ? ' (read-only)' : ''}${country ? ` · ${country}` : ''}`}
                    >
                      {inst.providers.length === 2 ? (
                        <span className="apm-broker-tag apm-broker-tag--multi">2 providers</span>
                      ) : readOnly ? (
                        <span className="apm-broker-tag apm-broker-tag--readonly">Read-only</span>
                      ) : null}
                      {country ? (
                        <span className="apm-broker-flag-wrap">
                          <CountryFlag code={country} size={18} />
                        </span>
                      ) : null}
                      <div className="apm-broker-logo-wrap">
                        <InstitutionLogo inst={inst} size={56} />
                      </div>
                      <div className="apm-broker-name" title={inst.displayName}>
                        {inst.displayName}
                      </div>
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

        {step === 'provider-choice' && selected && (
          <div className="apm-card apm-card--choice" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="apm-close" onClick={onClose} aria-label="Close">
              ×
            </button>
            <h2 className="apm-disc-title">
              How would you like to connect {selected.displayName}?
            </h2>
            <p className="apm-choice-sub">
              Both work. Pick the support team you&apos;d rather work with if something goes wrong.
            </p>

            <button
              type="button"
              className="apm-provider-btn"
              onClick={() => pickProvider('snaptrade')}
            >
              <div className="apm-provider-btn-head">
                <strong>SnapTrade</strong>
                <span className="apm-provider-btn-tag">Recommended</span>
              </div>
              <p>
                {selected.snaptradeAllowsTrading
                  ? 'Place trades from Ezana. Holdings update multiple times per day.'
                  : 'Read-only holdings. Updates throughout the day.'}
              </p>
            </button>

            <button
              type="button"
              className="apm-provider-btn"
              onClick={() => pickProvider('plaid')}
            >
              <div className="apm-provider-btn-head">
                <strong>Plaid</strong>
              </div>
              <p>
                Read-only holdings, updated once per day (end-of-day). Useful if you already trust
                Plaid from other apps.
              </p>
            </button>

            <button type="button" className="apm-back-link" onClick={() => setStep('grid')}>
              ← Choose a different institution
            </button>
          </div>
        )}

        {step === 'disclosure' && selected && chosenProvider && (
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
                <InstitutionLogo inst={selected} size={48} />
              </span>
            </div>

            <h2 className="apm-disc-title">
              Ezana connects securely to your {selected.displayName} account
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
                <div className="apm-disc-block-title">
                  {chosenProvider === 'snaptrade'
                    ? 'Connect securely via SnapTrade'
                    : 'Connect securely via Plaid'}
                </div>
                <p className="apm-disc-block-text">
                  {chosenProvider === 'snaptrade'
                    ? 'We use SnapTrade — an SOC 2 Type II certified connectivity provider — to handle the OAuth handshake. Ezana never sees your login credentials.'
                    : 'We use Plaid — used by 8,000+ financial apps including Venmo and Robinhood — to securely connect your account. Ezana never sees your login credentials.'}
                </p>
              </div>
            </div>

            <AccessLevelBlock provider={chosenProvider} selected={selected} />

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

            <button
              type="button"
              className="apm-back-link"
              onClick={() => {
                if (selected.providers.length > 1) setStep('provider-choice');
                else setStep('grid');
              }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function AccessLevelBlock({ provider, selected }) {
  const snaptradeReadOnly =
    selected.snaptradeAllowsTrading === false ||
    selected.snaptradeBrokerageType?.toLowerCase().includes('crypto') ||
    selected.snaptradeBrokerageType?.toLowerCase().includes('exchange');

  const trading = provider === 'snaptrade' && !snaptradeReadOnly;

  return (
    <div className="apm-disc-block">
      <div className="apm-disc-icon">
        <i className={trading ? 'bi bi-arrow-left-right' : 'bi bi-eye'} />
      </div>
      <div>
        <div className="apm-disc-block-title">
          {trading ? 'Trading and portfolio access' : 'Read-only access'}
        </div>
        <p className="apm-disc-block-text">
          {trading
            ? `${selected.displayName} via SnapTrade supports both portfolio sync and order placement. You can place trades from Ezana once connected.`
            : `${selected.displayName} via ${provider === 'snaptrade' ? 'SnapTrade' : 'Plaid'} connects in read-only mode. We can show your holdings, balances, and recent activity — but cannot place trades from Ezana.`}
        </p>
      </div>
    </div>
  );
}

function formatSnapTradeError(data, selected) {
  const code = data?.code;
  const detail = data?.detail;
  if (code === 'cross_provider_conflict') {
    return `${selected.displayName} is already connected via another provider. Disconnect that one in Settings before switching.`;
  }
  if (code === 'broker_not_supported') {
    return detail
      ? `${selected.displayName} isn't available right now: ${detail}`
      : `${selected.displayName} isn't available right now. Please pick a different institution.`;
  }
  if (code === 'rate_limited') return 'Too many requests. Wait a moment and try again.';
  if (code === 'snaptrade_not_configured') {
    return 'Brokerage connections are not configured. Contact support — reference: SNAPTRADE_CREDS_MISSING.';
  }
  if (code === 'network_unreachable') {
    return detail
      ? `Could not reach our connection provider: ${String(detail).slice(0, 140)}`
      : 'Could not reach our connection provider.';
  }
  if (code === 'auth_failed') {
    return detail
      ? `Connection provider rejected the request: ${String(detail).slice(0, 140)}`
      : 'Connection provider rejected the request.';
  }
  if (code === 'init_failed') {
    return detail
      ? `Could not initialize your secure connection: ${String(detail).slice(0, 140)}`
      : 'Could not initialize your secure connection.';
  }
  if (detail) return `We couldn't open the connection portal. (${String(detail).slice(0, 140)})`;
  return "We couldn't open the connection portal. Please try again in a moment.";
}

async function launchPlaidLink({ token, institutionId, institutionName, onSuccess, onError }) {
  if (typeof window.Plaid === 'undefined') {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (window.Plaid) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, 5000);
    });
  }
  if (typeof window.Plaid === 'undefined') {
    onError('Plaid is still loading. Please try again in a moment.');
    return;
  }

  const tokenRes = await fetch('/api/plaid/create-link-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ institutionId }),
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenData.link_token) {
    onError(
      `Could not start Plaid connection: ${tokenData?.details || tokenData?.error || 'unknown error'}`,
    );
    return;
  }

  const handler = window.Plaid.create({
    token: tokenData.link_token,
    onSuccess: async (public_token) => {
      try {
        const exRes = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ public_token, institutionName, institutionId }),
        });
        const exData = await exRes.json().catch(() => ({}));
        if (exRes.status === 409 && exData.code === 'cross_provider_conflict') {
          onError(
            `${institutionName} is already connected via SnapTrade. Disconnect that one in Settings before switching to Plaid.`,
          );
          return;
        }
        if (!exRes.ok) {
          onError(exData?.error || 'Failed to complete Plaid connection.');
          return;
        }
        onSuccess?.();
      } catch (e) {
        onError(`Connection completed but sync failed: ${e.message}`);
      }
    },
    onExit: (err) => {
      if (err) {
        onError(
          `Plaid Link exited with error: ${err.error_message || err.display_message || 'unknown'}`,
        );
      }
    },
  });

  if (institutionId) {
    handler.open({ institution_id: institutionId });
  } else {
    handler.open();
  }
}
