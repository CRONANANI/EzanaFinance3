export const metadata = {
  title: 'Terms of Service | Ezana Finance',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-800">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p>
          Our complete Terms of Service are being finalized. For questions in the meantime, contact{' '}
          <a href="mailto:contact@ezana.world" className="text-emerald-700 underline">
            contact@ezana.world
          </a>
          .
        </p>
      </main>
    </div>
  );
}
