-- Write policies for org pitch pipeline (members act within their org)

CREATE POLICY "members insert pitches" ON public.org_pitches FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  AND analyst_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "members update pitches in org" ON public.org_pitches FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "members insert pitch history" ON public.org_pitch_stage_history FOR INSERT WITH CHECK (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "members insert deliverables" ON public.org_pitch_deliverables FOR INSERT WITH CHECK (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "members insert votes" ON public.org_pitch_votes FOR INSERT WITH CHECK (
  voter_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "members insert discussion" ON public.org_pitch_discussion_messages FOR INSERT WITH CHECK (
  author_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
