import ErrorScreen from '@/components/errors/ErrorScreen';

/** An unknown course id: the branded 404 inside the app shell. */
export default function CourseNotFound() {
  return (
    <ErrorScreen
      variant="not-found"
      layout="inline"
      title={
        <>
          This course <em>wandered off</em>.
        </>
      }
      message="It may have been moved or renamed. Browse the rest of the Learning Center to find one that fits."
      homeHref="/learning-center"
      homeLabel="Browse the Learning Center"
      helpHref={null}
    />
  );
}
