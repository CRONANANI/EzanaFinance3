import { notFound } from 'next/navigation';
import { getCourseById } from '@/lib/learning-curriculum';

import '../../../../../../app-legacy/assets/css/theme.css';
import '../../../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../../../app-legacy/assets/css/pages-common.css';
import '../../../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../../../app-legacy/pages/home-dashboard.css';
import './learning-course.css';
import './course-visuals.css';
import { LearningCoursePage } from '@/components/learning/LearningCoursePage';

export default function Page({ params }) {
  const courseId = params?.courseId;
  // Server-side guard: bad URL → friendly 404 (renders not-found.js) instead
  // of letting the client-side boundary swallow it as a generic error.
  if (!courseId || !getCourseById(courseId)) {
    notFound();
  }
  return <LearningCoursePage />;
}
