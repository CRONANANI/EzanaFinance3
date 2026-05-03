'use client';

import { DATASETS } from '@/lib/for-the-quants-mock-data';

const PLAN_COLORS = {
  personal: '#8b949e',
  advanced: '#6366f1',
  family: '#f59e0b',
  pro: '#10b981',
};

export function DatasetRegistryCard() {
  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3 className="ftq-section-title">
          <i className="bi bi-database" aria-hidden />
          Dataset Registry
        </h3>
      </div>
      <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
        <p className="ftq-ds-subtitle">Available datasets for strategy conditions. Access depends on your plan.</p>
        <div className="ftq-ds-list">
          {DATASETS.map((ds) => (
            <div key={ds.id} className="ftq-ds-row">
              <div className="ftq-ds-icon-wrap">
                <i className={`bi ${ds.icon}`} />
              </div>
              <div className="ftq-ds-info">
                <div className="ftq-ds-name">{ds.name}</div>
                <div className="ftq-ds-desc">{ds.description}</div>
                <div className="ftq-ds-meta">
                  {ds.source} · {ds.updateFreq} · {ds.historyRange}
                </div>
              </div>
              <div className="ftq-ds-plans">
                {Object.entries(ds.planAccess).map(([plan, access]) => (
                  <span
                    key={plan}
                    className={`ftq-ds-plan-pill ${access ? '' : 'locked'}`}
                    style={{
                      borderColor: access ? PLAN_COLORS[plan] : undefined,
                      color: access ? PLAN_COLORS[plan] : undefined,
                    }}
                    title={access || 'Not available on this plan'}
                  >
                    {access ? (
                      <>
                        {plan.charAt(0).toUpperCase() + plan.slice(1)}: {access}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-lock" /> {plan.charAt(0).toUpperCase() + plan.slice(1)}
                      </>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
