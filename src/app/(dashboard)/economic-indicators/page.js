'use client';

import Link from 'next/link';

export default function EconomicIndicatorsPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-4">Economic Indicators</h1>
      <p className="text-muted-foreground mb-6">Economic indicators - React migration in progress.</p>
      <Link href="/" className="text-primary hover:underline">Back to Home</Link>
    </div>
  );
}
