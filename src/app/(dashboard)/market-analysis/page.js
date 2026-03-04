'use client';

import Link from 'next/link';

export default function MarketAnalysisPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-4">Market Analysis</h1>
      <p className="text-muted-foreground mb-6">Market analysis - React migration in progress.</p>
      <Link href="/" className="text-primary hover:underline">Back to Home</Link>
    </div>
  );
}
