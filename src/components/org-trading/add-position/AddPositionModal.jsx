'use client';

import { useState, useCallback } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { ManualEntryForm } from './ManualEntryForm';
import { CsvUploadForm } from './CsvUploadForm';
import { BrokerageConnectForm } from './BrokerageConnectForm';
import './add-position-modal.css';

const MODES = [
  {
    key: 'manual',
    label: 'Manual entry',
    icon: 'bi-pencil-square',
    desc: 'Enter a single position by hand',
  },
  {
    key: 'csv',
    label: 'Upload a spreadsheet',
    icon: 'bi-filetype-csv',
    desc: 'Import many positions from a CSV file',
  },
  {
    key: 'brokerage',
    label: 'Linked brokerage account',
    icon: 'bi-bank2',
    desc: 'Import the holdings of an account you have linked',
  },
];

/**
 * Add position: record a holding the fund already owns. Nothing is bought.
 *
 * `sample` ({ onAdd }) is set while the Trading Desk shows sample content:
 * a hand-entered position is added to the page only, and the two import
 * modes are not offered because they write to the council's real book.
 */
export function AddPositionModal({ open, onClose, teamId, onAdded, sample = null }) {
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

  const dialogRef = useDialogA11y(open, handleClose);

  if (!open) return null;

  if (!canManagePositions && !sample) {
    return (
      <div className="apm-org-overlay" onClick={handleClose}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="apm-perm-title"
          tabIndex={-1}
          className="apm-org-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="apm-org-header">
            <h2 id="apm-perm-title">Permission required</h2>
            <button className="apm-org-close" onClick={handleClose} aria-label="Close">
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="apm-org-body">
            <p className="apm-org-empty">
              Adding positions needs the right to manage positions. A portfolio manager or an
              executive can grant it to you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="apm-org-overlay" onClick={handleClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apm-title"
        tabIndex={-1}
        className="apm-org-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apm-org-header">
          <div>
            <h2 id="apm-title">Add position</h2>
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
            <p className="apm-org-note">
              Record a holding the fund already owns. Nothing is bought or sold here.
              {sample
                ? ' Sample content is showing: a manual entry is added to the page only and is not saved, and imports are not available.'
                : ''}
            </p>
          )}
          {!mode && (
            <div className="apm-org-mode-grid">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  className="apm-org-mode-tile"
                  disabled={Boolean(sample) && m.key !== 'manual'}
                  onClick={() => setMode(m.key)}
                >
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
              sample={sample}
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
                  Added <b>{result.position.ticker}</b> to the{' '}
                  {sample ? 'sample book' : 'fund book'}. It is carried at cost until it is priced.
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
