'use client';

import { useState, useEffect } from 'react';

export function DepositFlow({ getToken }) {
  const [activeTab, setActiveTab] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [relationships, setRelationships] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const QUICK_AMOUNTS = [100, 500, 1000, 5000];

  useEffect(() => {
    fetchFundingData();
  }, []);

  const fetchFundingData = async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/alpaca/fund', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRelationships(data.relationships || []);
        setTransfers(data.transfers || []);
        if (data.relationships?.length > 0) setSelectedBank(data.relationships[0].id);
      }
    } catch {}
  };

  const handleTransfer = async () => {
    if (!amount || !selectedBank) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/alpaca/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'transfer',
          relationshipId: selectedBank,
          amount: parseFloat(amount),
          direction: activeTab === 'deposit' ? 'INCOMING' : 'OUTGOING',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error);
      setSuccess(`${activeTab === 'deposit' ? 'Deposit' : 'Withdrawal'} of $${parseFloat(amount).toLocaleString()} initiated successfully`);
      setAmount('');
      fetchFundingData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trd-form-card">
      <div className="trd-form-header">
        <h2>Fund Your Account</h2>
        <p>Transfer money to and from your brokerage account</p>
      </div>

      <div className="trd-tab-row">
        <button className={`trd-tab ${activeTab === 'deposit' ? 'active' : ''}`} onClick={() => setActiveTab('deposit')}>
          <i className="bi bi-arrow-down-circle" /> Deposit
        </button>
        <button className={`trd-tab ${activeTab === 'withdraw' ? 'active' : ''}`} onClick={() => setActiveTab('withdraw')}>
          <i className="bi bi-arrow-up-circle" /> Withdraw
        </button>
        <button className={`trd-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <i className="bi bi-clock-history" /> History
        </button>
      </div>

      {error && <div className="trd-error"><i className="bi bi-exclamation-triangle" /> {error}</div>}
      {success && <div className="trd-success"><i className="bi bi-check-circle" /> {success}</div>}

      {(activeTab === 'deposit' || activeTab === 'withdraw') && (
        <div className="trd-form-body">
          {relationships.length > 0 ? (
            <div className="trd-field">
              <label>{activeTab === 'deposit' ? 'From' : 'To'} Bank Account</label>
              <select className="trd-input" value={selectedBank || ''} onChange={(e) => setSelectedBank(e.target.value)}>
                {relationships.map((r) => (
                  <option key={r.id} value={r.id}>{r.bank_name || 'Bank Account'} ••{r.account_mask || '****'}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="trd-info-box">
              <i className="bi bi-bank" />
              <span>No bank account linked. Connect your bank via Settings → Integrations first.</span>
            </div>
          )}

          <div className="trd-field">
            <label>Amount</label>
            <div className="trd-amount-input-wrap">
              <span className="trd-amount-prefix">$</span>
              <input className="trd-input trd-amount-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="1" step="0.01" />
            </div>
          </div>

          <div className="trd-quick-amounts">
            {QUICK_AMOUNTS.map((a) => (
              <button key={a} className={`trd-quick-btn ${parseFloat(amount) === a ? 'active' : ''}`} onClick={() => setAmount(a.toString())}>
                ${a.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="trd-info-box" style={{ marginTop: '1rem' }}>
            <i className="bi bi-info-circle" />
            <span>ACH transfers typically take 1–3 business days. Your buying power will update once funds settle.</span>
          </div>

          <button className="trd-btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleTransfer} disabled={!amount || !selectedBank || loading || parseFloat(amount) <= 0}>
            {loading ? 'Processing...' : `${activeTab === 'deposit' ? 'Deposit' : 'Withdraw'} $${amount || '0'}`}
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="trd-form-body">
          {transfers.length === 0 ? (
            <div className="trd-empty"><i className="bi bi-clock" /><p>No transfers yet</p></div>
          ) : (
            <table className="trd-table">
              <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {transfers.slice(0, 15).map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>{t.direction === 'INCOMING' ? 'Deposit' : 'Withdrawal'}</td>
                    <td className={t.direction === 'INCOMING' ? 'positive' : 'negative'}>
                      {t.direction === 'INCOMING' ? '+' : '-'}${parseFloat(t.amount).toLocaleString()}
                    </td>
                    <td><span className={`trd-status ${t.status?.toLowerCase()}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
