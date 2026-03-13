import Link from 'next/link';

export const metadata = {
  title: 'Apply to Become a Partner | Ezana Finance',
  description: 'Apply to join the Ezana Finance partner program as a creator, affiliate, or professional money manager.',
};

export default function PartnerApplyPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 p-8 rounded-2xl border border-[#10b981]/20 bg-[#0f1419]/95 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Apply to Become a Partner</h1>
        <p className="text-[#9ca3af] mb-6">
          Join our partner program as a creator, affiliate, or professional money manager. Our team reviews applications within 1–2 business days.
        </p>
        <p className="text-sm text-[#9ca3af] mb-6">
          Partner application form coming soon. In the meantime, visit our{' '}
          <Link href="/help-center/partner" className="text-[#10b981] hover:underline">
            Partner Help Center
          </Link>{' '}
          to learn more about eligibility and the program.
        </p>
        <Link
          href="/help-center/partner"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 font-medium text-[#0d1117] transition-colors hover:bg-[#34d399]"
        >
          Learn More
        </Link>
      </div>
    </div>
  );
}
