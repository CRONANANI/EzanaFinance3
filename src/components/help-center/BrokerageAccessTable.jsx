'use client';

import { useEffect, useState } from 'react';

/**
 * Live read-only vs read-and-write brokerage table for the help center.
 * Sourced from our SnapTrade brokerage cache (allows_trading per brokerage),
 * so the article stays correct as SnapTrade expands trading coverage.
 *
 * Note on the maintenance column: GET /api/snaptrade/brokerages already
 * filters maintenance_mode rows out, so the badge is effectively dormant
 * today. It is kept because the flag is what the cache stores, and a future
 * endpoint that surfaces paused brokerages should not need a UI change.
 */
function CapabilityTable({ rows, writeAccess }) {
  return (
    <div className="hc-broker-scroll">
      <table className="hc-broker-table">
        <thead>
          <tr>
            <th>Brokerage</th>
            <th>Read holdings</th>
            <th>Place trades</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.slug}>
              <td>{b.display_name || b.name}</td>
              <td>
                <i className="bi bi-check-lg hc-cap-yes" aria-label="Yes" role="img" />
              </td>
              <td>
                {writeAccess ? (
                  <i className="bi bi-check-lg hc-cap-yes" aria-label="Yes" role="img" />
                ) : (
                  <i className="bi bi-dash-lg hc-cap-no" aria-label="No" role="img" />
                )}
              </td>
              <td>
                {b.maintenance_mode ? (
                  <span className="hc-cap-maint">Maintenance</span>
                ) : (
                  <span className="hc-cap-live">Available</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BrokerageAccessTable() {
  const [state, setState] = useState({ loading: true, error: false, brokerages: [] });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    fetch('/api/snaptrade/brokerages', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.brokerages)
          ? data.brokerages
          : Array.isArray(data)
            ? data
            : [];
        setState({
          loading: false,
          error: false,
          brokerages: list.filter((b) => b.enabled !== false),
        });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: true, brokerages: [] });
      })
      .finally(() => clearTimeout(t));
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (state.loading) return <p className="hc-faint">Loading live brokerage capabilities...</p>;

  const tradable = state.brokerages.filter((b) => b.allows_trading);
  const readOnly = state.brokerages.filter((b) => !b.allows_trading);

  return (
    <div className="hc-broker-tables">
      <h3>Read and write: Ezana native</h3>
      <div className="hc-broker-scroll">
        <table className="hc-broker-table">
          <thead>
            <tr>
              <th>Brokerage</th>
              <th>Read holdings</th>
              <th>Place trades</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ezana Brokerage (Alpaca Securities)</td>
              <td>
                <i className="bi bi-check-lg hc-cap-yes" aria-label="Yes" role="img" />
              </td>
              <td>
                <i className="bi bi-check-lg hc-cap-yes" aria-label="Yes" role="img" />
              </td>
              <td>
                <span className="hc-cap-live">Available</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {state.error ? (
        <div className="hc-callout hc-callout--tip">
          <strong>Live list unavailable</strong>
          The connected-brokerage capability list could not be loaded right now. As a rule: your
          Ezana brokerage account is always read and write, Plaid connections are always read-only,
          and SnapTrade connections are read-only unless the brokerage supports trading and you
          authorized trading during connection. Reload the page to retry.
        </div>
      ) : (
        <>
          <h3>Read and write: connected via SnapTrade ({tradable.length})</h3>
          <CapabilityTable rows={tradable} writeAccess />
          <h3>Read-only: connected via SnapTrade ({readOnly.length})</h3>
          <CapabilityTable rows={readOnly} writeAccess={false} />
        </>
      )}

      <h3>Read-only: connected via Plaid</h3>
      <p>
        Every account linked through Plaid is read-only, always. Plaid connections import balances,
        holdings, and transactions for analysis and never carry trading permissions.
      </p>
    </div>
  );
}

export default BrokerageAccessTable;
