'use client';

import { useEffect, useState } from 'react';
import { LedgerRow } from '@/components/settings/ledger/primitives';
import './moderation.css';

/** Settings: the members you have blocked, with Unblock. */
export function BlockedMembersSetting() {
  const [list, setList] = useState(null);

  useEffect(() => {
    fetch('/api/moderation/block', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { blocked: [] }))
      .then((d) => setList(d.blocked || []))
      .catch(() => setList([]));
  }, []);

  const unblock = async (userId) => {
    const res = await fetch(`/api/moderation/block/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) setList((l) => l.filter((x) => x.userId !== userId));
  };

  return (
    <LedgerRow
      title="Blocked members"
      helper="You do not see their posts, comments or messages, and neither of you can message the other."
    >
      {list == null ? (
        <p className="modm-msg">Loading</p>
      ) : !list.length ? (
        <p className="modm-msg">You have not blocked anyone.</p>
      ) : (
        <ul className="modb-list">
          {list.map((m) => (
            <li key={m.userId} className="modb-row">
              <span>{m.name}</span>
              <button type="button" className="modb-unblock" onClick={() => unblock(m.userId)}>
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </LedgerRow>
  );
}
