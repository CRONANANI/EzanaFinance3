-- Creator (partner) designation tiers.
--
-- Every approved partner is already a verified creator — the application is
-- vetted before approval — so we do NOT tier on verification. Instead these
-- tiers describe a creator's STANDING / REACH and drive how prominently they
-- are surfaced in the community:
--
--   creator   -> baseline for every approved partner (default on approval)
--   featured  -> elevated, high-engagement creators; shown in discovery rails
--   signature -> hand-selected marquee creators (e.g. headline influencers)
--
-- Kept deliberately separate from the ELO "skill" tiers (novice…grandmaster)
-- so a creator designation is never confused with a trader's performance rank.
-- Safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creator_tier TEXT;

COMMENT ON COLUMN public.profiles.creator_tier IS 'Creator standing tier for partners: creator | featured | signature. NULL for non-partners.';

-- Every existing partner without an explicit tier becomes a baseline "creator".
UPDATE public.profiles
SET creator_tier = 'creator'
WHERE is_partner = true
  AND (creator_tier IS NULL OR trim(creator_tier) = '');

-- Guard against typos / unknown tiers at the database level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_creator_tier_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_creator_tier_check
      CHECK (creator_tier IS NULL OR creator_tier IN ('creator', 'featured', 'signature'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
