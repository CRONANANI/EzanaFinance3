import { TermsBody, TERMS_LAST_UPDATED } from '@/components/legal/TermsBody';
import '../legal-pages.css';

export const metadata = {
  title: 'Terms of Service | Ezana Finance',
  description:
    'The terms and conditions that govern your access to and use of the Ezana Finance platform.',
};

export default function TermsOfServicePage() {
  return (
    <div className="legal-page">
      <main className="legal-container">
        <p className="legal-eyebrow">Legal</p>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-meta">Last updated: {TERMS_LAST_UPDATED}</p>
        <TermsBody />
      </main>
    </div>
  );
}
