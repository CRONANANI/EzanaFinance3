'use client';

import { cn } from '@/lib/utils';

export function StatCard({ iconClass, iconBg, value, label, change, changePositive, className, ...props }) {
  return (
    <div className={cn('stat-card', className)} {...props}>
      {(iconClass || iconBg) && (
        <div className={cn('stat-icon', iconBg)}>
          <i className={iconClass || 'bi bi-graph-up'} />
        </div>
      )}
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {change != null && (
          <div className={cn('stat-change', changePositive === true && 'positive', changePositive === false && 'negative')}>
            {change}
          </div>
        )}
      </div>
    </div>
  );
}
