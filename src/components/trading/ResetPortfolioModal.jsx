'use client';

import { useState, useRef, useEffect } from 'react';
import './reset-portfolio-modal.css';

export default function ResetPortfolioModal({
  open,
  onClose,
  onConfirm,
  portfolio,
  enrichedPositions = [],
}) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('100000');
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setAmount('100000');
      setSaved(false);
    }
  }, [open]);

  useEffect(() => {
    if (step === 2 && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [step]);

  if (!open) return null;

  const hasPositions =
    enrichedPositions.length > 0 ||
    (portfolio?.history && portfolio.history.length > 0);

  const generateCSV = () => {
    const rows = [
      ['Symbol', 'Side', 'Quantity', 'Avg Cost', 'Current Price', 'P&L ($)', 'P&L (%)', 'Opened At'],
    ];

    for (const pos of enrichedPositions) {
      rows.push([
        pos.symbol || '',
        'buy',
        String(pos.qty ?? ''),
        (pos.avgCost ?? 0).toFixed(2),
        (pos.currentPrice ?? 0).toFixed(2),
        (pos.pnl ?? 0).toFixed(2),
        `${(pos.pnlPct ?? 0).toFixed(2)}%`,
        pos.openedAt ? new Date(pos.openedAt).toLocaleDateString('en-US') : '',
      ]);
    }

    if (portfolio?.history?.length > 0) {
      rows.push([]);
      rows.push(['--- Trade History ---']);
      rows.push(['Symbol', 'Side', 'Quantity', 'Price', 'Total', '', '', 'Date']);
      for (const h of portfolio.history) {
        rows.push([
          h.symbol || '',
          h.side || '',
          String(h.qty ?? ''),
          (h.price ?? 0).toFixed(2),
          (h.total ?? 0).toFixed(2),
          '',
          '',
          h.ts ? new Date(h.ts).toLocaleDateString('en-US') : '',
        ]);
      }
    }

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ezana-mock-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSaved(true);
  };

  const parsedAmount = parseFloat(String(amount).replace(/,/g, ''));
  const isValidAmount =
    !Number.isNaN(parsedAmount) && parsedAmount >= 1000 && parsedAmount <= 10_000_000;

  const fmtAmount = (n) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="rpm-overlay" onClick={onClose} role="presentation">
      <div className="rpm-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="rpm-header">
          <i className="bi bi-arrow-counterclockwise rpm-header-icon" />
          <span className="rpm-header-title">Reset Portfolio</span>
          <button type="button" className="rpm-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="rpm-steps">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`rpm-step-dot ${step >= s ? 'active' : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="rpm-body">
            <h3 className="rpm-question">Save your current portfolio?</h3>
            <p className="rpm-desc">
              {hasPositions
                ? 'Download a CSV of your positions and trade history before resetting. You can access saved portfolios from your account settings.'
                : 'Your portfolio has no positions or trade history. Nothing to save.'}
            </p>
            <div className="rpm-actions">
              {hasPositions && (
                <button
                  type="button"
                  className="rpm-btn rpm-btn-outline"
                  onClick={generateCSV}
                  disabled={saved}
                >
                  <i className={`bi ${saved ? 'bi-check-lg' : 'bi-download'}`} />
                  {saved ? 'Saved!' : 'Save as CSV'}
                </button>
              )}
              <button type="button" className="rpm-btn rpm-btn-primary" onClick={() => setStep(2)}>
                {hasPositions ? (saved ? 'Continue' : 'Skip') : 'Continue'}
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rpm-body">
            <h3 className="rpm-question">Choose your starting balance</h3>
            <p className="rpm-desc">
              Enter the amount of virtual cash you would like to start with. The default is $100,000.
            </p>
            <div className="rpm-amount-wrap">
              <span className="rpm-dollar-sign">$</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                className="rpm-amount-input"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  setAmount(raw);
                }}
                placeholder="100000"
              />
            </div>
            {amount && !isValidAmount && (
              <p className="rpm-error">Enter a value between $1,000 and $10,000,000</p>
            )}
            <div className="rpm-preset-row">
              {[10000, 50000, 100000, 250000, 500000, 1000000].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`rpm-preset ${Number(amount.replace(/,/g, '')) === v ? 'active' : ''}`}
                  onClick={() => setAmount(String(v))}
                >
                  {fmtAmount(v)}
                </button>
              ))}
            </div>
            <div className="rpm-actions">
              <button type="button" className="rpm-btn rpm-btn-ghost" onClick={() => setStep(1)}>
                <i className="bi bi-arrow-left" /> Back
              </button>
              <button
                type="button"
                className="rpm-btn rpm-btn-primary"
                disabled={!isValidAmount}
                onClick={() => setStep(3)}
              >
                Continue <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rpm-body">
            <h3 className="rpm-question">Confirm reset</h3>
            <p className="rpm-desc">
              Your portfolio will be cleared and reset to{' '}
              <strong className="rpm-amount-highlight">{fmtAmount(parsedAmount)}</strong> in virtual cash.
              All current positions and trade history will be erased.
              {saved && ' A CSV backup was saved.'}
            </p>
            <p className="rpm-warning">
              <i className="bi bi-exclamation-triangle-fill" /> This action cannot be undone.
            </p>
            <div className="rpm-actions">
              <button type="button" className="rpm-btn rpm-btn-ghost" onClick={() => setStep(2)}>
                <i className="bi bi-arrow-left" /> Back
              </button>
              <button
                type="button"
                className="rpm-btn rpm-btn-danger"
                onClick={() => {
                  onConfirm(parsedAmount);
                  onClose();
                }}
              >
                <i className="bi bi-arrow-counterclockwise" /> Reset to {fmtAmount(parsedAmount)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
