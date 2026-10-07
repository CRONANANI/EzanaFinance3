'use client';

/**
 * Settings, API tab: your Ezana API keys. Create up to two self-serve
 * Developer keys (the key is shown once), see prefix, created, last used and
 * 30-day usage, and revoke. Higher tiers come through an access request.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LedgerRow, LedgerField, LedgerButton, LedgerBadge } from '../primitives';
import { TIERS, SELF_SERVE_KEY_LIMIT } from '@/lib/ezana-api/tiers';
import './api-keys-ledger.css';

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Never';

function UsageBars({ days }) {
  const max = Math.max(1, ...days.map((d) => d.requests));
  return (
    <div className="akl-bars" role="img" aria-label="Requests per day, last 30 days">
      {days.map((d) => (
        <span
          key={d.day}
          className="akl-bar"
          style={{ height: `${Math.max(2, (d.requests / max) * 100)}%` }}
          title={`${d.day}: ${d.requests.toLocaleString()} requests`}
        />
      ))}
    </div>
  );
}

export function ApiKeysLedger() {
  const [keys, setKeys] = useState(null);
  const [usage, setUsage] = useState([]);
  const [name, setName] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/ezana-api/keys', { credentials: 'include', cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || 'Could not load your keys.');
      setKeys([]);
      return;
    }
    setKeys(d.keys || []);
    setUsage(d.usage || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const developerCount = (keys || []).filter(
    (k) => k.tier === 'developer' && k.status !== 'revoked',
  ).length;

  const create = async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    const res = await fetch('/api/ezana-api/keys', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.key) {
      setError(d.error || 'Could not create the key.');
      return;
    }
    setCreated(d.key);
    setName('');
    load();
  };

  const revoke = async (k) => {
    if (!window.confirm(`Revoke "${k.name}"? Requests with it stop working immediately.`)) return;
    const res = await fetch(`/api/ezana-api/keys/${k.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) setError('Could not revoke the key.');
    load();
  };

  const usageByKey = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 30 }, (_, i) =>
      new Date(today.getTime() - (29 - i) * 86400000).toISOString().slice(0, 10),
    );
    const m = new Map();
    for (const k of keys || []) {
      const per = new Map(days.map((d) => [d, 0]));
      usage
        .filter((u) => u.key_id === k.id)
        .forEach((u) => per.set(u.day, (per.get(u.day) || 0) + Number(u.requests || 0)));
      const list = days.map((d) => ({ day: d, requests: per.get(d) || 0 }));
      m.set(k.id, { list, total: list.reduce((s, x) => s + x.requests, 0) });
    }
    return m;
  }, [keys, usage]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <LedgerRow
        title="Create a Developer key"
        helper={`Free, ${TIERS.developer.ratePerMin} requests per minute, data delayed ${TIERS.developer.delayDays} days. Up to ${SELF_SERVE_KEY_LIMIT} keys.`}
      >
        {created ? (
          <div className="akl-created">
            <p className="akl-warn">
              <i className="bi bi-exclamation-triangle" aria-hidden="true" /> Store this now. We
              cannot show it again.
            </p>
            <div className="akl-key">
              <code>{created}</code>
              <LedgerButton
                variant="out"
                icon={copied ? 'bi-check2' : 'bi-clipboard'}
                onClick={copy}
              >
                {copied ? 'Copied' : 'Copy'}
              </LedgerButton>
            </div>
            <LedgerButton variant="out" onClick={() => setCreated(null)}>
              Done
            </LedgerButton>
          </div>
        ) : (
          <div className="akl-create">
            <LedgerField
              label="Key name"
              placeholder="For example, research notebook"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
            <LedgerButton
              variant="pri"
              icon="bi-key"
              onClick={create}
              disabled={busy || developerCount >= SELF_SERVE_KEY_LIMIT}
            >
              {busy ? 'Creating' : 'Create key'}
            </LedgerButton>
          </div>
        )}
        {error ? <p className="akl-error">{error}</p> : null}
        <p className="akl-help">
          Need live data or more throughput?{' '}
          <Link href="/ezana-api#getting-access">Request access</Link> to the Trader, Quant Firm or
          Institution tiers. Docs and the <a href="/v1/openapi.json">OpenAPI spec</a> are on the{' '}
          <Link href="/ezana-api">API page</Link>.
        </p>
      </LedgerRow>

      <LedgerRow
        title="Your keys"
        helper="Send a key as Authorization: Bearer from your server only."
      >
        {keys == null ? (
          <p className="akl-help">Loading</p>
        ) : !keys.length ? (
          <p className="akl-help">No keys yet.</p>
        ) : (
          <ul className="akl-list">
            {keys.map((k) => {
              const u = usageByKey.get(k.id) || { list: [], total: 0 };
              return (
                <li key={k.id} className="akl-item">
                  <div className="akl-item-head">
                    <strong>{k.name}</strong>
                    <LedgerBadge
                      variant={
                        k.status === 'active' ? 'pos' : k.status === 'revoked' ? 'neg' : 'warn'
                      }
                    >
                      {k.status.replace('_', ' ')}
                    </LedgerBadge>
                    <span className="akl-tier">{TIERS[k.tier]?.name || k.tier}</span>
                  </div>
                  <dl className="akl-meta">
                    <div>
                      <dt>Prefix</dt>
                      <dd className="akl-mono">{k.prefix || 'unclaimed'}</dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd className="akl-mono">{fmt(k.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Last used</dt>
                      <dd className="akl-mono">{fmt(k.lastUsedAt)}</dd>
                    </div>
                    <div>
                      <dt>Requests, 30 days</dt>
                      <dd className="akl-mono">{u.total.toLocaleString()}</dd>
                    </div>
                  </dl>
                  <UsageBars days={u.list} />
                  {k.status !== 'revoked' ? (
                    <LedgerButton variant="out" icon="bi-x-circle" onClick={() => revoke(k)}>
                      Revoke
                    </LedgerButton>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </LedgerRow>
    </>
  );
}
