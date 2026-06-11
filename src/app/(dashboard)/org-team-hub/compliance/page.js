'use client';

import { useState } from 'react';
import { IPSPolicyEditor } from '@/components/org/academic2/IPSPolicyEditor';
import { ComplianceMonitor } from '@/components/org/academic2/ComplianceMonitor';
import '@/components/org/academic2/academic.css';

export default function CompliancePage() {
  const [tab, setTab] = useState('monitor');

  return (
    <div className="dashboard-page-inset ac3-root">
      <div className="ac3-header">
        <div>
          <p className="ac3-eyebrow">Academic</p>
          <h1 className="ac3-title">Compliance &amp; IPS</h1>
          <p className="ac3-sub">Investment Policy Statement guardrails and live compliance.</p>
        </div>
      </div>

      <div className="ac3-tabs" role="tablist" aria-label="Compliance views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'monitor'}
          className={`ac3-tab${tab === 'monitor' ? ' is-active' : ''}`}
          onClick={() => setTab('monitor')}
        >
          Monitor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'policy'}
          className={`ac3-tab${tab === 'policy' ? ' is-active' : ''}`}
          onClick={() => setTab('policy')}
        >
          Policy Rules
        </button>
      </div>

      {tab === 'monitor' ? <ComplianceMonitor /> : <IPSPolicyEditor />}
    </div>
  );
}
