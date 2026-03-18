'use client';

import { useState } from 'react';

const STEPS = ['Personal Info', 'Address', 'Disclosures', 'Review'];
const FUNDING_SOURCES = [
  { value: 'employment_income', label: 'Employment Income' },
  { value: 'investments', label: 'Investments' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'business_income', label: 'Business Income' },
  { value: 'savings', label: 'Savings' },
  { value: 'family', label: 'Family' },
];

export function AccountOpeningForm({ onSuccess, getToken }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', taxId: '', phone: '',
    streetAddress: '', city: '', state: '', postalCode: '',
    fundingSource: 'employment_income',
    isControlPerson: false, isAffiliated: false, isPoliticallyExposed: false,
    agreedToTerms: false,
  });

  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const canAdvance = () => {
    if (step === 0) return form.firstName && form.lastName && form.dateOfBirth && form.taxId && form.phone;
    if (step === 1) return form.streetAddress && form.city && form.state && form.postalCode;
    if (step === 2) return true;
    if (step === 3) return form.agreedToTerms;
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/alpaca/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Account creation failed');
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trd-form-card">
      <div className="trd-form-header">
        <h2>Open Brokerage Account</h2>
        <p>SIPC insured up to $500,000. Powered by Alpaca Securities.</p>
      </div>
      <div className="trd-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`trd-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <div className="trd-step-dot">{i < step ? <i className="bi bi-check" /> : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>
      {error && <div className="trd-error"><i className="bi bi-exclamation-triangle" /> {error}</div>}
      {step === 0 && (
        <div className="trd-form-body">
          <div className="trd-row">
            <div className="trd-field"><label>First Name</label><input className="trd-input" value={form.firstName} onChange={(e) => u('firstName', e.target.value)} placeholder="John" /></div>
            <div className="trd-field"><label>Last Name</label><input className="trd-input" value={form.lastName} onChange={(e) => u('lastName', e.target.value)} placeholder="Doe" /></div>
          </div>
          <div className="trd-row">
            <div className="trd-field"><label>Date of Birth</label><input className="trd-input" type="date" value={form.dateOfBirth} onChange={(e) => u('dateOfBirth', e.target.value)} /></div>
            <div className="trd-field"><label>SSN</label><input className="trd-input" type="password" value={form.taxId} onChange={(e) => u('taxId', e.target.value)} placeholder="XXX-XX-XXXX" maxLength={11} /></div>
          </div>
          <div className="trd-row single">
            <div className="trd-field"><label>Phone</label><input className="trd-input" type="tel" value={form.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+15555555555" /></div>
          </div>
          <div className="trd-row single">
            <div className="trd-field"><label>Source of Funds</label>
              <select className="trd-input" value={form.fundingSource} onChange={(e) => u('fundingSource', e.target.value)}>
                {FUNDING_SOURCES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="trd-form-body">
          <div className="trd-row single"><div className="trd-field"><label>Street Address</label><input className="trd-input" value={form.streetAddress} onChange={(e) => u('streetAddress', e.target.value)} placeholder="123 Main St" /></div></div>
          <div className="trd-row">
            <div className="trd-field"><label>City</label><input className="trd-input" value={form.city} onChange={(e) => u('city', e.target.value)} placeholder="New York" /></div>
            <div className="trd-field"><label>State</label><input className="trd-input" value={form.state} onChange={(e) => u('state', e.target.value)} placeholder="NY" maxLength={2} /></div>
          </div>
          <div className="trd-row single"><div className="trd-field"><label>ZIP Code</label><input className="trd-input" value={form.postalCode} onChange={(e) => u('postalCode', e.target.value)} placeholder="10001" maxLength={5} /></div></div>
        </div>
      )}
      {step === 2 && (
        <div className="trd-form-body">
          <div className="trd-disclosure">
            <label><input type="checkbox" checked={form.isControlPerson} onChange={(e) => u('isControlPerson', e.target.checked)} /> I am a control person of a publicly traded company</label>
          </div>
          <div className="trd-disclosure">
            <label><input type="checkbox" checked={form.isAffiliated} onChange={(e) => u('isAffiliated', e.target.checked)} /> I am affiliated with a FINRA member firm or stock exchange</label>
          </div>
          <div className="trd-disclosure">
            <label><input type="checkbox" checked={form.isPoliticallyExposed} onChange={(e) => u('isPoliticallyExposed', e.target.checked)} /> I am a politically exposed person</label>
          </div>
          <div className="trd-info-box">
            <i className="bi bi-shield-check" />
            <span>Your information is encrypted and securely transmitted to Alpaca Securities LLC. Ezana never stores your SSN.</span>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="trd-form-body">
          <div className="trd-review-grid">
            <div className="trd-review-item"><span className="trd-review-label">Name</span><span>{form.firstName} {form.lastName}</span></div>
            <div className="trd-review-item"><span className="trd-review-label">DOB</span><span>{form.dateOfBirth}</span></div>
            <div className="trd-review-item"><span className="trd-review-label">Phone</span><span>{form.phone}</span></div>
            <div className="trd-review-item"><span className="trd-review-label">Address</span><span>{form.streetAddress}, {form.city}, {form.state} {form.postalCode}</span></div>
            <div className="trd-review-item"><span className="trd-review-label">Funding Source</span><span>{FUNDING_SOURCES.find(f => f.value === form.fundingSource)?.label}</span></div>
          </div>
          <div className="trd-disclosure" style={{ marginTop: '1rem' }}>
            <label><input type="checkbox" checked={form.agreedToTerms} onChange={(e) => u('agreedToTerms', e.target.checked)} /> I agree to the Account Agreement, Margin Agreement, and Customer Agreement</label>
          </div>
        </div>
      )}
      <div className="trd-form-nav">
        {step > 0 && <button className="trd-btn-secondary" onClick={() => setStep(step - 1)}>Back</button>}
        <div style={{ flex: 1 }} />
        {step < 3 ? (
          <button className="trd-btn-primary" onClick={() => setStep(step + 1)} disabled={!canAdvance()}>Continue</button>
        ) : (
          <button className="trd-btn-primary" onClick={handleSubmit} disabled={!canAdvance() || loading}>
            {loading ? 'Creating Account...' : 'Open Account'}
          </button>
        )}
      </div>
    </div>
  );
}
