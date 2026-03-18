'use client';

import { useState, useEffect, useCallback } from 'react';

const STATUS_COLORS = {
  filled: 'green', partially_filled: 'gold', new: 'blue', accepted: 'blue',
  pending_new: 'blue', canceled: 'gray', expired: 'gray', rejected: 'red', suspended: 'red',
};

export function OrderHistory({ getToken, refreshTrigger }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const statusParam = filter === 'open' ? 'open' : filter === 'closed' ? 'closed' : 'all';
      const res = await fetch(`/api/alpaca/order?status=${statusParam}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders, refreshTrigger]);

  const cancelOrder = async (orderId) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/alpaca/order?orderId=${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to cancel order');
      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  const isOpen = (status) => ['new', 'accepted', 'pending_new', 'partially_filled'].includes(status);

  return (
    <div className="trd-form-card">
      <div className="trd-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Order History</h2>
        <div className="trd-filter-row">
          {['all', 'open', 'closed'].map((f) => (
            <button key={f} className={`trd-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Filled/Closed'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="trd-error"><i className="bi bi-exclamation-triangle" /> {error}</div>}

      {loading ? (
        <div className="trd-loading">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="trd-empty"><i className="bi bi-receipt" /><p>No orders found</p></div>
      ) : (
        <div className="trd-orders-list">
          {orders.map((o) => (
            <div key={o.id} className="trd-order-row">
              <div className="trd-order-left">
                <div className="trd-order-symbol-row">
                  <span className={`trd-order-side ${o.side}`}>{o.side?.toUpperCase()}</span>
                  <span className="trd-order-symbol">{o.symbol}</span>
                </div>
                <span className="trd-order-detail">
                  {o.type} · {o.qty ? `${o.qty} shares` : `$${parseFloat(o.notional || 0).toFixed(2)}`}
                  {o.filledAvgPrice ? ` @ $${parseFloat(o.filledAvgPrice).toFixed(2)}` : ''}
                </span>
              </div>
              <div className="trd-order-mid">
                <span className="trd-order-date">
                  {o.submittedAt ? new Date(o.submittedAt).toLocaleDateString() : ''} {o.submittedAt ? new Date(o.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div className="trd-order-right">
                <span className={`trd-status ${STATUS_COLORS[o.status] || 'gray'}`}>{o.status?.replace(/_/g, ' ')}</span>
                {isOpen(o.status) && (
                  <button className="trd-btn-cancel" onClick={() => cancelOrder(o.id)} title="Cancel order">
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
