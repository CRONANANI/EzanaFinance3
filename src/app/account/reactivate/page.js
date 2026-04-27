import { Suspense } from 'react';
import { ReactivateClient } from './ReactivateClient';
import './reactivate.css';

export default function ReactivatePage() {
  return (
    <Suspense
      fallback={
        <div className="reactivate-page">
          <div className="reactivate-card">
            <div className="reactivate-spinner" />
            <h1>Loading…</h1>
          </div>
        </div>
      }
    >
      <ReactivateClient />
    </Suspense>
  );
}
