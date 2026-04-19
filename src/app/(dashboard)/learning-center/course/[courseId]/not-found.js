import Link from 'next/link';

export default function CourseNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-foreground mb-2">Course not found</h1>
        <p className="text-muted-foreground mb-6">
          This course may have been moved or renamed. Browse the rest of the Learning Center
          to find one that fits.
        </p>
        <Link
          href="/learning-center"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Browse courses
        </Link>
      </div>
    </div>
  );
}
