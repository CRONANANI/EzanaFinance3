'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './copy-request-inbox.css';

function profileHref(username, userId) {
  if (username) return `/profile/${encodeURIComponent(username)}`;
  return `/profile/${userId}`;
}

export default function CopyRequestInbox() {
  const [data, setData] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incoming');

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/community/copy-request');
      const d = await res.json();
      if (res.ok) setData({ incoming: d.incoming || [], outgoing: d.outgoing || [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAction = async (requestId, action) => {
    const res = await fetch('/api/community/copy-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, action }),
    });
    if (res.ok) refresh();
  };

  const incomingPending = data.incoming.filter((r) => r.status === 'pending');

  return (
    <div className="cri-card db-card" data-community-card aria-label="Copy requests inbox">
      <header className="cri-header">
        <h3>Copy Requests</h3>
        <div className="cri-tabs">
          <button
            type="button"
            className={`cri-tab ${activeTab === 'incoming' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('incoming')}
          >
            Incoming
            {incomingPending.length > 0 && <span className="cri-badge">{incomingPending.length}</span>}
          </button>
          <button
            type="button"
            className={`cri-tab ${activeTab === 'outgoing' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('outgoing')}
          >
            Outgoing
          </button>
        </div>
      </header>

      {loading && <div className="cri-loading">Loading…</div>}

      {!loading && activeTab === 'incoming' && (
        <ul className="cri-list">
          {data.incoming.length === 0 && <li className="cri-empty">No incoming requests yet</li>}
          {data.incoming.map((r) => (
            <li key={r.id} className="cri-row">
              <Link
                href={profileHref(r.requester_username, r.requester_id)}
                className="cri-row-name"
              >
                {r.requester_name}
              </Link>
              <span className="cri-row-status">{r.status}</span>
              {r.status === 'pending' && (
                <div className="cri-row-actions">
                  <button
                    type="button"
                    onClick={() => handleAction(r.id, 'approve')}
                    className="cri-btn cri-btn-approve"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(r.id, 'reject')}
                    className="cri-btn cri-btn-reject"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && activeTab === 'outgoing' && (
        <ul className="cri-list">
          {data.outgoing.length === 0 && <li className="cri-empty">You haven&apos;t sent any requests</li>}
          {data.outgoing.map((r) => (
            <li key={r.id} className="cri-row">
              <Link href={profileHref(r.target_username, r.target_user_id)} className="cri-row-name">
                {r.target_name}
              </Link>
              <span className="cri-row-status">{r.status}</span>
              {r.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleAction(r.id, 'withdraw')}
                  className="cri-btn cri-btn-withdraw"
                >
                  Withdraw
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
