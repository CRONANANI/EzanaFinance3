-- Assignees may update their own task rows (status progression on the
-- Team Hub task board). WITH CHECK keeps assigned_to immutable to self,
-- so an analyst can move pending -> in_progress -> completed but cannot
-- reassign the task. Managers already have full write via "Managers write tasks".
DROP POLICY IF EXISTS "Assignees update own tasks" ON public.org_tasks;
CREATE POLICY "Assignees update own tasks" ON public.org_tasks
  FOR UPDATE USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());
