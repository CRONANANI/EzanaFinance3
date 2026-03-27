-- Create sentinel_reports table for storing AI-generated weekly reports
CREATE TABLE IF NOT EXISTS sentinel_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_text TEXT NOT NULL,
  report_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sentinel_reports_user_id ON sentinel_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_reports_report_date ON sentinel_reports(report_date DESC);

-- Enable RLS
ALTER TABLE sentinel_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own sentinel reports
CREATE POLICY "Users view own sentinel reports" 
  ON sentinel_reports 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create sentinel reports (for future automation)
CREATE POLICY "Users create sentinel reports" 
  ON sentinel_reports 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
