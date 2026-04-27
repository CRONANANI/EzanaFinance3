-- ════════════════════════════════════════════════════════════
-- Enable Realtime UPDATE events for the messages table
-- so read receipts (read_at column changes) propagate to the
-- sender's client in real time.
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
