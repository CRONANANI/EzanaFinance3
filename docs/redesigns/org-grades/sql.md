# Grades: proposed SQL (not run)

Written by the Grades build (branch `redesign/org-grades`). Nothing here has been run. Both parts are
independent; paste either into the Supabase SQL editor. They were written from `supabase/migrations`
in the repo (policy "students read own grades" in `20260727000000_fix_org_rls_recursion.sql`, the
helpers `auth_org_ids()` and `auth_executive_org_ids()`, and `org_governance_settings` from
`20260627000000_org_settings_phase3_audit_governance.sql`). Production may differ from the repo:
check the live policy name first.

## Part 1: enforce the visibility pause in the database

Today the pause ("grading_visible_to_students = false") is applied only by the grades route. The row
policy still lets a member read their own grades directly. This replaces the read policy so that a
member who is not an executive reads their own grades only while they are an active member of that
council and the council has not paused visibility. Executives are unchanged (they also read through
"advisors write grades", which is FOR ALL).

Owner choice inside this change: `org_id IN (SELECT public.auth_org_ids())` also stops a former member
from reading their old grades directly (they can still be sent their record through the logged
student record download). Drop that line to keep former members' read access.

```sql
DROP POLICY IF EXISTS "students read own grades" ON public.org_grades;
CREATE POLICY "students read own grades" ON public.org_grades FOR SELECT USING (
  org_id IN (SELECT public.auth_executive_org_ids())
  OR (
    student_id = auth.uid()
    AND org_id IN (SELECT public.auth_org_ids())
    AND NOT EXISTS (
      SELECT 1
      FROM public.org_governance_settings g
      WHERE g.org_id = org_grades.org_id
        AND g.grading_visible_to_students = false
    )
  )
);

NOTIFY pgrst, 'reload schema';
```

Check after applying (as an analyst in a paused council, through the app): the Grades page shows the
pause notice, and a direct select on `org_grades` returns no rows for that analyst.

## Part 2 (proposal): a history of grade changes

There is no record of grade changes today: a change overwrites the score and the grader. This adds an
append-only table filled by a trigger whenever a grade's score, maximum, letter, feedback or rubric
changes. Only executives of the council can read it; nobody can write to it except the trigger. The
page does not read it yet; once it exists, the record can show "Changed from 84/100 by ... on ...".

```sql
CREATE TABLE IF NOT EXISTS public.org_grade_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES public.org_grades(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_score NUMERIC,
  new_score NUMERIC,
  old_max_score NUMERIC,
  new_max_score NUMERIC,
  old_letter TEXT,
  new_letter TEXT,
  old_feedback TEXT,
  new_feedback TEXT,
  rubric_changed BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_grade_changes_grade ON public.org_grade_changes (grade_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_grade_changes_org ON public.org_grade_changes (org_id, changed_at DESC);

ALTER TABLE public.org_grade_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "executives read grade changes" ON public.org_grade_changes;
CREATE POLICY "executives read grade changes" ON public.org_grade_changes FOR SELECT USING (
  org_id IN (SELECT public.auth_executive_org_ids())
);
-- No insert, update or delete policies: rows are written only by the trigger below.

CREATE OR REPLACE FUNCTION public.org_grades_log_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.score IS DISTINCT FROM OLD.score
     OR NEW.max_score IS DISTINCT FROM OLD.max_score
     OR NEW.letter IS DISTINCT FROM OLD.letter
     OR NEW.feedback IS DISTINCT FROM OLD.feedback
     OR NEW.rubric IS DISTINCT FROM OLD.rubric THEN
    INSERT INTO public.org_grade_changes (
      grade_id, org_id, student_id, changed_by,
      old_score, new_score, old_max_score, new_max_score,
      old_letter, new_letter, old_feedback, new_feedback, rubric_changed
    ) VALUES (
      NEW.id, NEW.org_id, NEW.student_id, COALESCE(auth.uid(), NEW.graded_by),
      OLD.score, NEW.score, OLD.max_score, NEW.max_score,
      OLD.letter, NEW.letter, OLD.feedback, NEW.feedback,
      NEW.rubric IS DISTINCT FROM OLD.rubric
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.org_grades_log_change() FROM public;

DROP TRIGGER IF EXISTS trg_org_grades_log_change ON public.org_grades;
CREATE TRIGGER trg_org_grades_log_change
  AFTER UPDATE ON public.org_grades
  FOR EACH ROW EXECUTE FUNCTION public.org_grades_log_change();

NOTIFY pgrst, 'reload schema';
```

Check after applying: change a grade on the page as an executive; one row appears in
`org_grade_changes` with the old and new score; an analyst's select on the table returns nothing.
