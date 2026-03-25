-- Friend requests + increment parent post comment count on reply insert

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sender_id, receiver_id),
  CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'friend_requests' AND policyname = 'Users can read own requests'
  ) THEN
    CREATE POLICY "Users can read own requests" ON public.friend_requests
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'friend_requests' AND policyname = 'Users can send requests'
  ) THEN
    CREATE POLICY "Users can send requests" ON public.friend_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'friend_requests' AND policyname = 'Users can update received requests'
  ) THEN
    CREATE POLICY "Users can update received requests" ON public.friend_requests
    FOR UPDATE USING (auth.uid() = receiver_id);
  END IF;
END $$;

-- When a reply row is inserted, bump parent's comments_count
CREATE OR REPLACE FUNCTION public.trg_community_posts_reply_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_post_id IS NOT NULL THEN
    UPDATE public.community_posts
    SET comments_count = COALESCE(comments_count, 0) + 1
    WHERE id = NEW.parent_post_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_posts_reply_ai ON public.community_posts;
CREATE TRIGGER community_posts_reply_ai
  AFTER INSERT ON public.community_posts
  FOR EACH ROW
  WHEN (NEW.parent_post_id IS NOT NULL)
  EXECUTE PROCEDURE public.trg_community_posts_reply_insert();
