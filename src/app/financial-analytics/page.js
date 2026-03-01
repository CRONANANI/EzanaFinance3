import Link from 'next/link';

export const metadata = {
  title: 'Financial Analytics - Ezana Finance',
  description: 'Personal financial analytics.',
};

export default function FinancialAnalyticsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Financial Analytics</h1>
        <p className="text-muted-foreground mb-6">
          Personal financial analytics - React migration in progress.
        </p>
        <Link href="/" className="text-primary hover:text-primary-hover">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
