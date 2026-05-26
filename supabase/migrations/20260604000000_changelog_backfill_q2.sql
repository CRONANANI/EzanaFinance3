-- ═══════════════════════════════════════════════════════════════════
-- Platform changelog backfill — entries for work shipped May 11–May 26
--
-- Idempotent: re-running this migration is a no-op because the inserts
-- check for an existing entry with the same title + released_at date.
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_author TEXT := 'platform@ezana.com';
BEGIN

  -- 2026-05-13 — Echo tag taxonomy + ML tracking
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'Ezana Echo tag taxonomy and ML topic tracking'
      AND released_at::date = '2026-05-13'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'Ezana Echo tag taxonomy and ML topic tracking',
      'Echo articles now carry a structured tag taxonomy across four primary categories (Markets, Companies, Policy, Crypto) plus ~30 secondary tags. Reader engagement on tagged articles feeds the ML persona pipeline so future article recommendations get smarter the more you read.',
      'feature',
      false,
      true,
      '2026-05-13T15:00:00Z',
      v_author
    );
  END IF;

  -- 2026-05-15 — ELO live updates + ladder progress
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'ELO live updates and Learning Center ladder refinements'
      AND released_at::date = '2026-05-15'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'ELO live updates and Learning Center ladder refinements',
      'Your ELO rating now updates in real time across the platform without a page refresh. The Learning Center towers also show smoother tier progression with clearer visual cues when you''re close to ranking up. Tab away and back, and the leaderboard catches up automatically.',
      'improvement',
      false,
      true,
      '2026-05-15T16:00:00Z',
      v_author
    );
  END IF;

  -- 2026-05-16 — Fiber optic trim
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'Centaur Intelligence hero animation polish'
      AND released_at::date = '2026-05-16'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'Centaur Intelligence hero animation polish',
      'Trimmed the fiber-optic opening animation on the Centaur Intelligence page so the page becomes interactive faster. Same visual feel, less waiting.',
      'fix',
      false,
      true,
      '2026-05-16T14:30:00Z',
      v_author
    );
  END IF;

  -- 2026-05-18 — Public Echo CTA system
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'Ezana Echo now public with article-specific CTAs'
      AND released_at::date = '2026-05-18'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'Ezana Echo now public with article-specific CTAs',
      'Echo articles are now readable without an account, with contextual signup prompts tailored to what you''re reading. No more generic interstitials — if you''re reading about congressional trading, the CTA invites you to explore the Inside the Capitol dashboard. Existing signed-in readers see the article exactly as before.',
      'feature',
      false,
      true,
      '2026-05-18T13:00:00Z',
      v_author
    );
  END IF;

  -- 2026-05-19 — Echo article layout polish
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'Echo article layout: centered, lighter, signal/noise sentiment'
      AND released_at::date = '2026-05-19'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'Echo article layout: centered, lighter, signal/noise sentiment',
      'Article pages are now properly centered with reduced card heights. The reader sentiment widget uses signal/noise terminology consistently across the platform, replacing the old bullish/bearish framing. Visual polish across every Echo article surface.',
      'design',
      false,
      true,
      '2026-05-19T17:00:00Z',
      v_author
    );
  END IF;

  -- 2026-05-20 — Global Power Map card outline
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'Global Power Map card refined to outlined style'
      AND released_at::date = '2026-05-20'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'Global Power Map card refined to outlined style',
      'The Global Power Map layer card on Market Analysis now uses a clean outlined style — gold border, gold globe icon, gold text on a transparent background. More premium aesthetic, less visual weight on the page.',
      'design',
      false,
      true,
      '2026-05-20T12:00:00Z',
      v_author
    );
  END IF;

  -- 2026-05-21 — ELO Leaderboard tier coloring
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'ELO Leaderboard polish + tier-colored usernames across the platform'
      AND released_at::date = '2026-05-21'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'ELO Leaderboard polish + tier-colored usernames across the platform',
      'The ELO leaderboard is now properly centered with column alignment fixed. The empty Status column is removed and tier filter pills are centered. Every user''s name now displays in their tier color — on the leaderboard, on community posts, and across other surfaces. A Grandmaster shows in gold, a Tactician in emerald, a Strategist in violet, so platform status is legible at a glance.',
      'improvement',
      false,
      true,
      '2026-05-21T14:00:00Z',
      v_author
    );
  END IF;

  -- 2026-05-22 — Learning Center dark mode flat cards
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'Learning Center dark mode: flat cards with subtle outlines'
      AND released_at::date = '2026-05-22'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'Learning Center dark mode: flat cards with subtle outlines',
      'In dark mode, all Learning Center cards now blend with the page background and use subtle outlines to define their shape. The "Your Learning ELO" card keeps its signature emerald glow but blends naturally rather than feeling like a separate panel. Cleaner, less stacked-boxes appearance.',
      'design',
      false,
      true,
      '2026-05-22T15:30:00Z',
      v_author
    );
  END IF;

  -- 2026-05-23 — Stock Pitch Pipeline + Archive (org)
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'Stock Pitch Pipeline and Pitch Archive for investment councils'
      AND released_at::date = '2026-05-23'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'Stock Pitch Pipeline and Pitch Archive for investment councils',
      'University investment councils on Ezana Org can now manage stock pitches through a complete workflow: idea → research → PM review → committee vote → decision. Every accepted and rejected pitch is preserved in a searchable archive, with hindsight performance tracking that shows whether the council''s decisions held up. Institutional memory that survives member turnover.',
      'feature',
      false,
      true,
      '2026-05-23T16:00:00Z',
      v_author
    );
  END IF;

  -- 2026-05-24 — ELO Leaderboard "Sweet Spot" rebuild
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'ELO Leaderboard rebuilt: sleek fintech direction'
      AND released_at::date = '2026-05-24'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'ELO Leaderboard rebuilt: sleek fintech direction',
      'The ELO Leaderboard has a new visual direction — clean white surfaces, hairline borders, JetBrains Mono numbers throughout, and tighter density. The Kanban-style zone partitioning is replaced by subtle dividers so the table reads as one coherent surface. Same scoring system, same rankings, sleeker presentation.',
      'design',
      false,
      true,
      '2026-05-24T17:00:00Z',
      v_author
    );
  END IF;

  -- 2026-05-25 — Echo article footer "The Marquee"
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'Ezana Echo article footer: editorial closing spread'
      AND released_at::date = '2026-05-25'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'Ezana Echo article footer: editorial closing spread',
      'The stack of cards at the bottom of every Echo article (save, sentiment, community, newsletter, like-share row) is now a single magazine-style closing spread. Sentiment is the hero — a 21-bar histogram of where every reader voted on the noise-to-signal spectrum, with a tactile slider for casting your own vote. "Was this worth your time?" replaces generic like/save/share. Comments use serif type for considered responses, not quick takes.',
      'feature',
      false,
      true,
      '2026-05-25T18:00:00Z',
      v_author
    );
  END IF;

  -- 2026-05-26 — Footer compression
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_changelog_entries
    WHERE title = 'Compressed article footer for tighter article-end experience'
      AND released_at::date = '2026-05-26'
  ) THEN
    INSERT INTO public.platform_changelog_entries
      (title, body, category, is_pinned, is_published, released_at, author_email)
    VALUES (
      'Compressed article footer for tighter article-end experience',
      'Tightened the new Echo article footer — smaller typography, shorter histogram, less padding between modules. The footer now takes up roughly half the vertical space it did before without losing any of its functionality. Mobile users see more above the fold, and the article-end transition feels more natural.',
      'improvement',
      false,
      true,
      '2026-05-26T19:00:00Z',
      v_author
    );
  END IF;

END $$;
