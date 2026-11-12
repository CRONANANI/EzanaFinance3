'use client';

import dynamic from 'next/dynamic';
import Loading from './loading';

/* The library is heavy and interactive: load it in the browser only. */
const ModelLibraryCard = dynamic(
  () =>
    import('@/components/quants/model-library/ModelLibraryCard').then((m) => ({
      default: m.ModelLibraryCard,
    })),
  { ssr: false, loading: () => <Loading /> },
);

export default function ModelLibraryPage() {
  return <ModelLibraryCard />;
}
