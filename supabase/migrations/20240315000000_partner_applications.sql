-- Partner Application Table
-- Run in Supabase SQL Editor or via migration

CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Step 1: Screening form
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  country TEXT,
  city TEXT,

  -- Professional background
  partner_type TEXT NOT NULL,
  years_experience INTEGER,
  current_role TEXT,
  company_name TEXT,
  linkedin_url TEXT,
  website_url TEXT,

  -- Investment background
  assets_under_management TEXT,
  trading_style TEXT,
  markets_traded TEXT[],
  certifications TEXT[],

  -- Motivation
  why_partner TEXT,
  content_plan TEXT,
  referral_source TEXT,

  -- Step 2: Verification
  verification_token TEXT UNIQUE,
  verification_token_expires TIMESTAMPTZ,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,

  -- Step 3: Documents
  id_document_url TEXT,
  financial_document_url TEXT,
  documents_submitted BOOLEAN DEFAULT false,
  documents_submitted_at TIMESTAMPTZ,

  -- Status
  application_status TEXT DEFAULT 'pending_screening',
  reviewer_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_apps_email ON partner_applications(email);
CREATE INDEX IF NOT EXISTS idx_partner_apps_status ON partner_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_partner_apps_token ON partner_applications(verification_token);
