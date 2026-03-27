-- Create debrief_items table for storing analyzed market events
CREATE TABLE IF NOT EXISTS debrief_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  event_body TEXT,
  event_country TEXT,
  event_url TEXT,
  event_time TIMESTAMPTZ,
  analysis TEXT,
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_debrief_items_user_id ON debrief_items(user_id);
CREATE INDEX IF NOT EXISTS idx_debrief_items_created_at ON debrief_items(created_at DESC);

-- Enable RLS
ALTER TABLE debrief_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own debrief items
CREATE POLICY "Users can view their own debrief items" 
  ON debrief_items 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own debrief items
CREATE POLICY "Users can create debrief items" 
  ON debrief_items 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own debrief items
CREATE POLICY "Users can update their own debrief items" 
  ON debrief_items 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own debrief items
CREATE POLICY "Users can delete their own debrief items" 
  ON debrief_items 
  FOR DELETE 
  USING (auth.uid() = user_id);
