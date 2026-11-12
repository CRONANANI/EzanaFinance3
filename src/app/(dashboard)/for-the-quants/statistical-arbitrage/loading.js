import { Skeleton, SkeletonChart, SkeletonTable } from '@/components/ds';

/** Shown while the workspace loads: the shape of the page, no spinner. */
export default function Loading() {
  return (
    <div className="qlx-skeleton" aria-busy="true" aria-label="Loading">
      <Skeleton height={36} />
      <SkeletonChart />
      <SkeletonTable rows={5} />
    </div>
  );
}
