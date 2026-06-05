'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';

export function MfaSetupPanel() {
  const [step, setStep] = useState('idle');
  const [factorId, setFactorId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState(null);
  const [factors, setFactors] = useState([]);

  const loadFactors = useCallback(async () => {
    const { data, error: listErr } = await supabase.auth.mfa.listFactors();
    if (!listErr && data?.totp) {
      setFactors(data.totp.filter((f) => f.status === 'verified'));
    }
  }, []);

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  async function startEnroll() {
    setError(null);
    setStep('enrolling');
    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Ezana Finance',
    });
    if (enrollErr) {
      setError(enrollErr.message);
      setStep('idle');
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep('verifying');
  }

  async function verifyEnrollment() {
    setError(null);
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeErr) {
      setError(challengeErr.message);
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode,
    });
    if (verifyErr) {
      setError(verifyErr.message);
      return;
    }
    setStep('done');
    setVerifyCode('');
    await loadFactors();
  }

  async function unenroll(id) {
    const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (unenrollErr) {
      setError(unenrollErr.message);
    } else {
      setStep('idle');
      await loadFactors();
    }
  }

  return (
    <div className="settings-mfa-panel">
      <h3 className="settings-section-title">
        <i className="bi bi-shield-lock" />
        Two-factor authentication
      </h3>
      <p className="settings-panel-desc" style={{ marginBottom: '1rem' }}>
        Add an extra layer of security with a time-based one-time password (TOTP) from an
        authenticator app like Google Authenticator, Authy, or 1Password.
      </p>

      {factors.length > 0 && (
        <div className="settings-mfa-active">
          <p className="settings-alert settings-alert--success" role="status">
            Two-factor authentication is active
          </p>
          {factors.map((f) => (
            <div key={f.id} className="settings-mfa-factor-row">
              <span>{f.friendly_name || 'TOTP'}</span>
              <button
                type="button"
                className="settings-btn-danger"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                onClick={() => {
                  if (confirm('Remove this MFA factor? You will need to set it up again.')) {
                    unenroll(f.id);
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {step === 'idle' && factors.length === 0 && (
        <button type="button" className="settings-btn-primary" onClick={startEnroll}>
          Set up two-factor authentication
        </button>
      )}

      {step === 'verifying' && qrCode && (
        <div className="settings-mfa-enroll">
          <p className="settings-label">Scan this QR code with your authenticator app:</p>
          <img src={qrCode} alt="MFA QR Code" className="settings-mfa-qr" />
          <p className="settings-toggle-desc">
            Or enter manually: <code className="settings-mfa-secret">{secret}</code>
          </p>
          <div className="settings-row" style={{ marginTop: '1rem' }}>
            <div className="settings-field">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                className="settings-input"
                autoComplete="one-time-code"
              />
            </div>
            <button
              type="button"
              className="settings-btn-primary"
              onClick={verifyEnrollment}
              disabled={verifyCode.length !== 6}
            >
              Verify
            </button>
          </div>
        </div>
      )}

      {step === 'done' && factors.length === 0 && (
        <p className="settings-alert settings-alert--success" role="status">
          Two-factor authentication is now active.
        </p>
      )}

      {error && (
        <p className="settings-alert settings-alert--error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
