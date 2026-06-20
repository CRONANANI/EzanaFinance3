-- Mux-hosted videos for courses/lessons. Rows are created on upload and
-- updated to 'ready' (with a playback id) once Mux finishes encoding — via the
-- webhook, or lazily reconciled on read. Public playback ids are not secret, so
-- ready videos are world-readable for embedding; writes go through the API.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.course_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  mux_upload_id TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'errored')),
  duration_seconds NUMERIC,
  aspect_ratio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_videos_owner ON public.course_videos(owner_id);
CREATE INDEX IF NOT EXISTS idx_course_videos_upload ON public.course_videos(mux_upload_id);
CREATE INDEX IF NOT EXISTS idx_course_videos_asset ON public.course_videos(mux_asset_id);

ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_videos' AND policyname = 'Ready videos are public') THEN
    CREATE POLICY "Ready videos are public" ON public.course_videos FOR SELECT USING (status = 'ready');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_videos' AND policyname = 'Owners read own videos') THEN
    CREATE POLICY "Owners read own videos" ON public.course_videos FOR SELECT USING (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_videos' AND policyname = 'Owners manage own videos') THEN
    CREATE POLICY "Owners manage own videos" ON public.course_videos FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
