'use client';

/**
 * Flag inbox (/org-trading/inbox): the flag queue on its own page, with the
 * list and the selected flag side by side. The same queue sits on the Trading
 * Desk. This address is kept so notification links and bookmarks keep working.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import { useTradingDeskData } from './useTradingDeskData';
import { FlagQueue } from './FlagQueue';
import { DeskNotice, useSlowFlag } from './TradingDesk';
import '@/components/org/command-center/command-center.css';
import './trading-desk.css';
import '@/styles/home-canvas.css';

export function FlagInboxPage() {
  const { isOrgUser, orgRole, orgData, isLoading, canManage, canFlagPositions } = useOrg();
  const data = useTradingDeskData({
    enabled: Boolean(isOrgUser && !isLoading),
    member: orgData?.member || null,
    role: orgRole,
    canFlag: Boolean(canFlagPositions),
    accuracyScope: canManage ? 'council' : 'self',
  });
  const slow = useSlowFlag();
  const [tab, setTab] = useState('inbox');
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    setSelected(null);
    setTab('inbox');
  }, [data.sampleActive]);

  if (isLoading) {
    return (
      <DeskNotice>
        {slow ? (
          <>
            <span>The flag inbox is taking longer than expected to load.</span>
            <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <span>Loading the flag inbox</span>
        )}
      </DeskNotice>
    );
  }
  if (!isOrgUser) {
    return (
      <DeskNotice>
        <span>This page is for organizational members only.</span>
        <Link href="/home" className="tcc-link">
          Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </DeskNotice>
    );
  }

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page otd-page">
      <VisuallyHidden>
        <h1>Flag inbox</h1>
      </VisuallyHidden>
      <div className="tcc-top otd-top">
        <Link href="/org-trading" className="tcc-link otd-back">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Back to Trading Desk
        </Link>
        {(data.sampleActive || data.sampleAvailable) && (
          <div className="tcc-actions">
            <div className="tcc-actions__context">
              {data.sampleActive && <span className="tcc-sample">Sample content</span>}
              <button
                type="button"
                className="tcc-textbtn"
                onClick={() => data.setShowSample((v) => !v)}
              >
                {data.sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="tcc-row tcc-row--single">
        <FlagQueue
          data={data}
          title="Flag inbox"
          layout="page"
          tab={tab}
          onTab={(t) => {
            setTab(t);
            setSelected(null);
          }}
          selectedId={selected}
          onSelect={setSelected}
        />
      </div>
    </div>
  );
}

export default FlagInboxPage;
