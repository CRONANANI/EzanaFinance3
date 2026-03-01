import Link from 'next/link';

export const metadata = {
  title: 'Economic Indicators - Ezana Finance',
  description: 'Fed tracking and economic indicators.',
};

export default function EconomicIndicatorsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Economic Indicators</h1>
        <p className="text-muted-foreground mb-6">
          Fed tracking and economic indicators - React migration in progress.
        </p>
        <Link href="/" className="text-primary hover:text-primary-hover">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
