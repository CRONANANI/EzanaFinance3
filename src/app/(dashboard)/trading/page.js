'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AccountOpeningForm, DepositFlow, TradeTicket, PositionsDashboard, OrderHistory } from '@/components/trading';
import { supabase } from '@/lib/supabase';
import './trading.css';

export default function TradingPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('positions');
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountData, setAccountData] = useState(null);
  const [orderRefresh, setOrderRefresh] = useState(0);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const checkAccount = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/alpaca/account', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (!data.hasAccount) {
        setAccountStatus('none');
      } else if (data.status === 'APPROVED' || data.status === 'ACTIVE') {
        setAccountStatus('active');
        setAccountData(data);
      } else {
        setAccountStatus('pending');
        setAccountData(data);
      }
    } catch {
      setAccountStatus('none');
    }
  }, [getToken]);

  useEffect(() => {
    if (!user) return;
    checkAccount();
  }, [user, checkAccount]);

  const handleAccountCreated = (data) => {
    setAccountStatus('pending');
    setAccountData(data);
    setTimeout(checkAccount, 2000);
  };

  const handleOrderPlaced = () => {
    setOrderRefresh((p) => p + 1);
    setTimeout(() => setActiveView('positions'), 500);
  };

  if (accountStatus === 'none') {
    return (
      <div className="trd-page">
        <div className="trd-page-center">
          <AccountOpeningForm onSuccess={handleAccountCreated} getToken={getToken} />
        </div>
      </div>
    );
  }

  if (accountStatus === 'pending') {
    return (
      <div className="trd-page">
        <div className="trd-page-center">
          <div className="trd-form-card">
            <div className="trd-form-header">
              <h2>Account Under Review</h2>
              <p>Your brokerage account is being verified. This usually takes a few moments in sandbox.</p>
            </div>
            <div className="trd-pending-body">
              <div className="trd-pending-spinner" />
              <p>Status: <strong>{accountData?.status || 'SUBMITTED'}</strong></p>
              <button className="trd-btn-primary" onClick={checkAccount}>Check Status</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!accountStatus) {
    return <div className="trd-page"><div className="trd-loading">Loading trading account...</div></div>;
  }

  return (
    <div className="trd-page">
      <div className="trd-nav">
        {[
          { key: 'positions', label: 'Positions', icon: 'bi-wallet2' },
          { key: 'trade', label: 'Trade', icon: 'bi-lightning-charge' },
          { key: 'orders', label: 'Orders', icon: 'bi-receipt' },
          { key: 'fund', label: 'Fund Account', icon: 'bi-bank' },
        ].map((t) => (
          <button key={t.key} className={`trd-nav-btn ${activeView === t.key ? 'active' : ''}`} onClick={() => setActiveView(t.key)}>
            <i className={`bi ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      <div className="trd-content">
        {activeView === 'positions' && <PositionsDashboard getToken={getToken} />}
        {activeView === 'trade' && (
          <div className="trd-trade-layout">
            <TradeTicket getToken={getToken} onOrderPlaced={handleOrderPlaced} />
          </div>
        )}
        {activeView === 'orders' && <OrderHistory getToken={getToken} refreshTrigger={orderRefresh} />}
        {activeView === 'fund' && <DepositFlow getToken={getToken} />}
      </div>

      <div className="trd-disclosure-footer">
        <p>Brokerage services provided by Alpaca Securities LLC, member <a href="https://www.finra.org" target="_blank" rel="noopener noreferrer">FINRA</a> / <a href="https://www.sipc.org" target="_blank" rel="noopener noreferrer">SIPC</a>. Accounts are SIPC insured up to $500,000. Commission-free trading of US-listed securities.</p>
      </div>
    </div>
  );
}
