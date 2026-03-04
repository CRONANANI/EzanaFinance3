'use client';

import { cn } from '@/lib/utils';

export function ComponentCard({ className, children, ...props }) {
  return (
    <div className={cn('component-card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('card-header', className)} {...props}>
      {children}
    </div>
  );
}

export function CardActionBtn({ className, children, ...props }) {
  return (
    <button type="button" className={cn('card-action-btn', className)} {...props}>
      {children}
    </button>
  );
}
