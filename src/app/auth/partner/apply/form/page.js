'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../partner-apply.css';

export default function PartnerApplicationForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', country: '', city: '',
    partnerType: '', yearsExperience: '', currentRole: '', companyName: '',
    linkedinUrl: '', websiteUrl: '',
    aum: '', tradingStyle: '', marketsTraded: [], certifications: [],
    whyPartner: '', contentPlan: '', referralSource: '',
  });

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const toggleArray = (key, val) => {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/partner-application/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/auth/partner/apply/submitted');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="partner-form-page">
      <div className="partner-form-container">
        <Link href="/auth/partner/apply" className="partner-apply-back">
          <i className="bi bi-arrow-left" /> Back
        </Link>

        <h1>Partner Application</h1>
        <p className="partner-form-subtitle">Step {step} of 3</p>

        <div className="partner-form-progress">
          <div className="partner-form-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {error && <div className="partner-form-error">{error}</div>}

        {step === 1 && (
          <div className="partner-form-step">
            <h2>Personal Information</h2>
            <label>Full Legal Name *</label>
            <input value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="John Smith" />
            <label>Email Address *</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@example.com" />
            <label>Phone Number</label>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
            <div className="partner-form-row">
              <div>
                <label>Country</label>
                <input value={form.country} onChange={e => update('country', e.target.value)} placeholder="United States" />
              </div>
              <div>
                <label>City</label>
                <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="New York" />
              </div>
            </div>
            <button className="partner-form-next" onClick={() => setStep(2)} disabled={!form.fullName || !form.email}>
              Continue <i className="bi bi-arrow-right" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="partner-form-step">
            <h2>Professional Background</h2>
            <label>Partner Type *</label>
            <div className="partner-form-options">
              {[
                { key: 'trader', label: 'Trader', desc: 'Publish copy-trading strategies' },
                { key: 'creator', label: 'Content Creator', desc: 'Courses, articles, education' },
                { key: 'affiliate', label: 'Affiliate', desc: 'Refer users, earn commissions' },
                { key: 'advisor', label: 'Financial Advisor', desc: 'Licensed professional' },
              ].map(opt => (
                <button key={opt.key} type="button" className={`partner-form-option ${form.partnerType === opt.key ? 'active' : ''}`} onClick={() => update('partnerType', opt.key)}>
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
            <label>Years of Experience</label>
            <select value={form.yearsExperience} onChange={e => update('yearsExperience', e.target.value)}>
              <option value="">Select...</option>
              <option value="1">1-2 years</option>
              <option value="3">3-5 years</option>
              <option value="6">6-10 years</option>
              <option value="11">10+ years</option>
            </select>
            <label>Current Role</label>
            <input value={form.currentRole} onChange={e => update('currentRole', e.target.value)} placeholder="Portfolio Manager, Independent Trader, etc." />
            <label>Company / Firm (if applicable)</label>
            <input value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Company name" />
            <label>LinkedIn Profile</label>
            <input value={form.linkedinUrl} onChange={e => update('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
            <label>Trading Style</label>
            <select value={form.tradingStyle} onChange={e => update('tradingStyle', e.target.value)}>
              <option value="">Select...</option>
              <option value="day_trading">Day Trading</option>
              <option value="swing">Swing Trading</option>
              <option value="long_term">Long-term</option>
              <option value="quantitative">Quantitative</option>
              <option value="mixed">Mixed</option>
            </select>
            <label>Assets Under Management</label>
            <select value={form.aum} onChange={e => update('aum', e.target.value)}>
              <option value="">Select...</option>
              <option value="0-50K">$0 - $50K</option>
              <option value="50K-250K">$50K - $250K</option>
              <option value="250K-1M">$250K - $1M</option>
              <option value="1M-5M">$1M - $5M</option>
              <option value="5M+">$5M+</option>
            </select>
            <label>Markets Traded</label>
            <div className="partner-form-chips">
              {['stocks', 'options', 'forex', 'crypto', 'commodities', 'bonds', 'etfs'].map(m => (
                <button key={m} type="button" className={`partner-form-chip ${form.marketsTraded.includes(m) ? 'active' : ''}`} onClick={() => toggleArray('marketsTraded', m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <label>Certifications</label>
            <div className="partner-form-chips">
              {['CFA', 'CFP', 'FRM', 'Series 7', 'Series 65', 'CPA', 'None'].map(c => (
                <button key={c} type="button" className={`partner-form-chip ${form.certifications.includes(c) ? 'active' : ''}`} onClick={() => toggleArray('certifications', c)}>
                  {c}
                </button>
              ))}
            </div>
            <div className="partner-form-nav">
              <button type="button" className="partner-form-back-btn" onClick={() => setStep(1)}>Back</button>
              <button className="partner-form-next" onClick={() => setStep(3)} disabled={!form.partnerType}>
                Continue <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="partner-form-step">
            <h2>Your Plans</h2>
            <label>Why do you want to become an Ezana Partner? *</label>
            <textarea value={form.whyPartner} onChange={e => update('whyPartner', e.target.value)} placeholder="Tell us about your goals and what you hope to achieve..." rows={4} />
            <label>What content or strategies do you plan to share?</label>
            <textarea value={form.contentPlan} onChange={e => update('contentPlan', e.target.value)} placeholder="Describe the type of strategies, courses, or articles you would publish..." rows={4} />
            <label>How did you hear about Ezana?</label>
            <select value={form.referralSource} onChange={e => update('referralSource', e.target.value)}>
              <option value="">Select...</option>
              <option value="social_media">Social Media</option>
              <option value="friend">Friend / Referral</option>
              <option value="search">Google / Search</option>
              <option value="news">News Article</option>
              <option value="podcast">Podcast</option>
              <option value="other">Other</option>
            </select>
            <div className="partner-form-nav">
              <button type="button" className="partner-form-back-btn" onClick={() => setStep(2)}>Back</button>
              <button className="partner-form-submit" onClick={handleSubmit} disabled={submitting || !form.whyPartner}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
