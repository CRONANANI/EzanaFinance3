'use client';

import { useState, useCallback } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { ManualEntryForm } from './ManualEntryForm';
import { CsvUploadForm } from './CsvUploadForm';
import { BrokerageConnectForm } from './BrokerageConnectForm';
import './add-position-modal.css';

const MODES = [
  {
    key: 'manual',
    label: 'Manual Entry',
    icon: 'bi-pencil-square',
    desc: 'Enter a single position by hand',
  },
  { key: 'csv', label: 'Upload CSV', icon: 'bi-filetype-csv', desc: 'Bulk import from a spreadsheet' },
  { key: 'brokerage', label: 'Connect Brokerage', icon: 'bi-bank2', desc: 'Sync from Plaid or SnapTrade' },
];

export function AddPositionModal({ open, onClose, teamId, onAdded }) {
  const { canManagePositions, orgData } = useOrg();
  const [mode, setMode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const orgId = orgData?.org?.id;

  const handleClose = useCallback(() => {
    if (submitting) return;
    setMode(null);
    setError(null);
    setResult(null);
    onClose?.();
  }, [submitting, onClose]);

  if (!open) return null;

  if (!canManagePositions) {
    return (
      <div className="apm-org-overlay" onClick={handleClose}>
        <div className="apm-org-card" onClick={(e) => e.stopPropagation()}>
          <div className="apm-org-header">
            <h2>Permission required</h2>
            <button className="apm-org-close" onClick={handleClose} aria-label="Close">
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="apm-org-body">
            <p className="apm-org-empty">
              Adding positions requires the <b>manage_positions</b> permission. Contact a portfolio
              manager or an executive to be granted access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="apm-org-overlay" onClick={handleClose}>
      <div className="apm-org-card" onClick={(e) => e.stopPropagation()}>
        <div className="apm-org-header">
          <div>
            <h2>Add Position</h2>
            {mode && (
              <button
                className="apm-org-back"
                onClick={() => {
                  setMode(null);
                  setError(null);
                  setResult(null);
                }}
              >
                <i className="bi bi-arrow-left" /> Back
              </button>
            )}
          </div>
          <button className="apm-org-close" onClick={handleClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="apm-org-body">
          {!mode && (
            <div className="apm-org-mode-grid">
              {MODES.map((m) => (
                <button key={m.key} className="apm-org-mode-tile" onClick={() => setMode(m.key)}>
                  <i className={`bi ${m.icon}`} />
                  <div className="apm-org-mode-label">{m.label}</div>
                  <div className="apm-org-mode-desc">{m.desc}</div>
                </button>
              ))}
            </div>
          )}

          {mode === 'manual' && (
            <ManualEntryForm
              orgId={orgId}
              teamId={teamId}
              onSubmitting={setSubmitting}
              onError={setError}
              onSuccess={(p) => {
                setResult({ kind: 'manual', position: p });
                onAdded?.();
              }}
            />
          )}
          {mode === 'csv' && (
            <CsvUploadForm
              orgId={orgId}
              teamId={teamId}
              onSubmitting={setSubmitting}
              onError={setError}
              onSuccess={(r) => {
                setResult({ kind: 'csv', ...r });
                onAdded?.();
              }}
            />
          )}
          {mode === 'brokerage' && (
            <BrokerageConnectForm
              orgId={orgId}
              teamId={teamId}
              onSubmitting={setSubmitting}
              onError={setError}
              onSuccess={(r) => {
                setResult({ kind: 'brokerage', ...r });
                onAdded?.();
              }}
            />
          )}

          {error && (
            <div className="apm-org-error" role="alert">
              {error}
            </div>
          )}
          {result && (
            <div className="apm-org-success">
              {result.kind === 'manual' && (
                <>
                  Added <b>{result.position.ticker}</b> to the team portfolio.
                </>
              )}
              {result.kind === 'csv' && (
                <>
                  Imported <b>{result.inserted}</b> rows ({result.skipped} skipped).
                </>
              )}
              {result.kind === 'brokerage' && (
                <>
                  Imported <b>{result.inserted}</b> positions from {result.source}.
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
