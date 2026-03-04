'use client';

import Link from 'next/link';

export default function FinancialAnalyticsPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-4">Financial Analytics</h1>
      <p className="text-muted-foreground mb-6">Financial analytics - React migration in progress.</p>
      <Link href="/" className="text-primary hover:underline">Back to Home</Link>
    </div>
  );
}
