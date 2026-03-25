'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = [
  'Personal',
  'Address',
  'Employment & finances',
  'Investment profile',
  'Disclosures',
  'Review',
];

const FUNDING = [
  { value: 'employment_income', label: 'Employment income' },
  { value: 'investments', label: 'Investments' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'business_income', label: 'Business income' },
  { value: 'savings', label: 'Savings' },
  { value: 'family', label: 'Family' },
];

const INCOME = [
  { label: '$0 – $25,000', min: 0, max: 25000 },
  { label: '$25,000 – $50,000', min: 25000, max: 50000 },
  { label: '$50,000 – $100,000', min: 50000, max: 100000 },
  { label: '$100,000 – $200,000', min: 100000, max: 200000 },
  { label: '$200,000+', min: 200000, max: 1000000 },
];

const NET_WORTH = [
  { label: '$0 – $25,000', min: 0, max: 25000 },
  { label: '$25,000 – $100,000', min: 25000, max: 100000 },
  { label: '$100,000 – $500,000', min: 100000, max: 500000 },
  { label: '$500,000 – $1,000,000', min: 500000, max: 1000000 },
  { label: '$1,000,000+', min: 1000000, max: 10000000 },
];

const EXP = [
  { value: 'no_investment_experience', label: 'None' },
  { value: 'limited_investment_experience', label: 'Limited' },
  { value: 'good_investment_experience', label: 'Good' },
  { value: 'extensive_investment_experience', label: 'Extensive' },
];

const RISK = [
  { value: 'low_risk_tolerance', label: 'Low' },
  { value: 'moderate_risk_tolerance', label: 'Moderate' },
  { value: 'high_risk_tolerance', label: 'High' },
];

const OBJECTIVE = [
  { value: 'investment_objective_capital_preservation', label: 'Capital preservation' },
  { value: 'investment_objective_income', label: 'Income' },
  { value: 'investment_objective_growth', label: 'Growth' },
  { value: 'investment_objective_speculation', label: 'Speculation' },
];

const HORIZON = [
  { value: 'investment_time_horizon_less_than_1_year', label: 'Less than 1 year' },
  { value: 'investment_time_horizon_1_to_5_years', label: '1–5 years' },
  { value: 'investment_time_horizon_5_to_10_years', label: '5–10 years' },
  { value: 'investment_time_horizon_more_than_10_years', label: '10+ years' },
];

const initialForm = () => ({
  given_name: '',
  family_name: '',
  date_of_birth: '',
  tax_id: '',
  phone: '',
  street_address: '',
  unit: '',
  city: '',
  state: '',
  postal_code: '',
  funding_source: 'employment_income',
  incomeBracket: 2,
  netWorthBracket: 2,
  investment_experience: 'limited_investment_experience',
  risk_tolerance: 'moderate_risk_tolerance',
  investment_objective: 'investment_objective_growth',
  investment_time_horizon: 'investment_time_horizon_5_to_10_years',
  is_control_person: false,
  is_affiliated_exchange: false,
  is_politically_exposed: false,
  immediate_family_exposed: false,
  agreed_to_terms: false,
});

export function OpenBrokerageWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(initialForm);

  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const income = INCOME[form.incomeBracket] || INCOME[0];
  const netW = NET_WORTH[form.netWorthBracket] || NET_WORTH[0];

  const canNext = () => {
    switch (step) {
      case 0:
        return (
          form.given_name &&
          form.family_name &&
          form.date_of_birth &&
          form.tax_id?.length >= 9 &&
          form.phone?.length >= 10
        );
      case 1:
        return form.street_address && form.city && form.state && form.postal_code?.length >= 5;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return form.agreed_to_terms;
      default:
        return false;
    }
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        given_name: form.given_name,
        family_name: form.family_name,
        date_of_birth: form.date_of_birth,
        tax_id: form.tax_id.replace(/\D/g, ''),
        phone: form.phone.replace(/\D/g, ''),
        street_address: form.street_address,
        unit: form.unit,
        city: form.city,
        state: form.state,
        postal_code: form.postal_code,
        funding_source: form.funding_source,
        annual_income_min: income.min,
        annual_income_max: income.max,
        liquid_net_worth_min: netW.min,
        liquid_net_worth_max: netW.max,
        investment_experience: form.investment_experience,
        risk_tolerance: form.risk_tolerance,
        investment_objective: form.investment_objective,
        investment_time_horizon: form.investment_time_horizon,
        is_control_person: form.is_control_person,
        is_affiliated_exchange: form.is_affiliated_exchange,
        is_politically_exposed: form.is_politically_exposed,
        immediate_family_exposed: form.immediate_family_exposed,
      };

      const res = await fetch('/api/trading/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Account creation failed');

      router.push('/trading');
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trd-form-card trd-open-wizard">
      <div className="trd-form-header">
        <h2>Open brokerage account</h2>
        <p>Powered by Alpaca Securities LLC. SIPC member.</p>
      </div>

      <div className="trd-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`trd-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <div className="trd-step-dot">
              {i < step ? <i className="bi bi-check" /> : i + 1}
            </div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="trd-error" role="alert">
          <i className="bi bi-exclamation-triangle" /> {error}
        </div>
      )}

      <div className="trd-form-body">
        {step === 0 && (
          <>
            <div className="trd-row">
              <div className="trd-field">
                <label>Legal first name</label>
                <input className="trd-input" value={form.given_name} onChange={(e) => u('given_name', e.target.value)} autoComplete="given-name" />
              </div>
              <div className="trd-field">
                <label>Legal last name</label>
                <input className="trd-input" value={form.family_name} onChange={(e) => u('family_name', e.target.value)} autoComplete="family-name" />
              </div>
            </div>
            <div className="trd-row">
              <div className="trd-field">
                <label>Date of birth</label>
                <input className="trd-input" type="date" value={form.date_of_birth} onChange={(e) => u('date_of_birth', e.target.value)} />
              </div>
              <div className="trd-field">
                <label>SSN (digits only)</label>
                <input className="trd-input" type="password" value={form.tax_id} onChange={(e) => u('tax_id', e.target.value)} placeholder="9 digits" maxLength={11} autoComplete="off" />
              </div>
            </div>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Phone</label>
                <input className="trd-input" value={form.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+1..." autoComplete="tel" />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Street address</label>
                <input className="trd-input" value={form.street_address} onChange={(e) => u('street_address', e.target.value)} autoComplete="street-address" />
              </div>
            </div>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Apt / unit (optional)</label>
                <input className="trd-input" value={form.unit} onChange={(e) => u('unit', e.target.value)} />
              </div>
            </div>
            <div className="trd-row">
              <div className="trd-field">
                <label>City</label>
                <input className="trd-input" value={form.city} onChange={(e) => u('city', e.target.value)} autoComplete="address-level2" />
              </div>
              <div className="trd-field">
                <label>State</label>
                <input className="trd-input" value={form.state} onChange={(e) => u('state', e.target.value)} maxLength={2} placeholder="CA" autoComplete="address-level1" />
              </div>
            </div>
            <div className="trd-row single">
              <div className="trd-field">
                <label>ZIP code</label>
                <input className="trd-input" value={form.postal_code} onChange={(e) => u('postal_code', e.target.value)} autoComplete="postal-code" />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Primary funding source</label>
                <select className="trd-input" value={form.funding_source} onChange={(e) => u('funding_source', e.target.value)}>
                  {FUNDING.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Annual income range</label>
                <select className="trd-input" value={form.incomeBracket} onChange={(e) => u('incomeBracket', Number(e.target.value))}>
                  {INCOME.map((row, i) => (
                    <option key={row.label} value={i}>{row.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Liquid net worth range</label>
                <select className="trd-input" value={form.netWorthBracket} onChange={(e) => u('netWorthBracket', Number(e.target.value))}>
                  {NET_WORTH.map((row, i) => (
                    <option key={row.label} value={i}>{row.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Stock investing experience</label>
                <select className="trd-input" value={form.investment_experience} onChange={(e) => u('investment_experience', e.target.value)}>
                  {EXP.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Risk tolerance</label>
                <select className="trd-input" value={form.risk_tolerance} onChange={(e) => u('risk_tolerance', e.target.value)}>
                  {RISK.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Investment objective</label>
                <select className="trd-input" value={form.investment_objective} onChange={(e) => u('investment_objective', e.target.value)}>
                  {OBJECTIVE.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="trd-row single">
              <div className="trd-field">
                <label>Investment time horizon</label>
                <select className="trd-input" value={form.investment_time_horizon} onChange={(e) => u('investment_time_horizon', e.target.value)}>
                  {HORIZON.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <div className="trd-disclosure-list">
            {[
              ['is_control_person', 'I am a control person of a publicly traded company'],
              ['is_affiliated_exchange', 'I am affiliated with a stock exchange or FINRA'],
              ['is_politically_exposed', 'I am a politically exposed person (PEP)'],
              ['immediate_family_exposed', 'My immediate family is politically exposed'],
            ].map(([key, label]) => (
              <label key={key} className="trd-check-row">
                <input type="checkbox" checked={form[key]} onChange={(e) => u(key, e.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="trd-review">
            <p className="trd-review-intro">
              Review your information. By submitting, you agree to the customer, margin, and account agreements with Alpaca Securities LLC.
            </p>
            <ul className="trd-review-list">
              <li><strong>Name:</strong> {form.given_name} {form.family_name}</li>
              <li><strong>DOB:</strong> {form.date_of_birth}</li>
              <li><strong>Address:</strong> {form.street_address}, {form.city}, {form.state} {form.postal_code}</li>
              <li><strong>Funding:</strong> {FUNDING.find((f) => f.value === form.funding_source)?.label}</li>
            </ul>
            <label className="trd-check-row trd-check-row--emphasis">
              <input type="checkbox" checked={form.agreed_to_terms} onChange={(e) => u('agreed_to_terms', e.target.checked)} />
              <span>I agree to the account agreements and attest that the information provided is accurate.</span>
            </label>
          </div>
        )}
      </div>

      <div className="trd-form-nav">
        {step > 0 && (
          <button type="button" className="trd-btn-secondary" onClick={() => setStep((s) => s - 1)} disabled={loading}>
            Back
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <button type="button" className="trd-btn-primary" disabled={!canNext() || loading} onClick={() => setStep((s) => s + 1)}>
            Continue
          </button>
        ) : (
          <button type="button" className="trd-btn-primary" disabled={!canNext() || loading} onClick={submit}>
            {loading ? 'Submitting…' : 'Submit application'}
          </button>
        )}
      </div>
    </div>
  );
}
