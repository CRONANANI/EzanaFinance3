'use client';

import { useOrg } from '@/contexts/OrgContext';
import { GradeBook } from '@/components/org/academic2/GradeBook';
import { MyGrades } from '@/components/org/academic2/MyGrades';

export default function GradesPage() {
  const { orgRole, isLoading } = useOrg();
  // Executives (incl. faculty advisors) grade; everyone else sees only their own.
  const canGrade = orgRole === 'executive';

  return (
    <div className="dashboard-page-inset">
      {isLoading ? (
        <div className="ac3-state" style={{ color: 'var(--text-muted)', padding: '2.5rem', textAlign: 'center' }}>
          Loading…
        </div>
      ) : canGrade ? (
        <GradeBook />
      ) : (
        <MyGrades />
      )}
    </div>
  );
}
