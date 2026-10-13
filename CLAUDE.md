# Project guidance for Claude Code

## Read first

- **`docs/ENGINEERING.md`** — the standing engineering rules (layer boundaries,
  the single `@/lib/supabase` data-access surface, trust model, quality gates).
  **`docs/CTO_ONBOARDING.md`** — repo map and where every domain lives. Load
  both as context before non-trivial changes; the lint/depcruise gates enforce
  the boundaries they describe.

## Git workflow

- **Always commit and push directly to the `main` branch.** This is the user's
  standing preference for this repository: do all development on `main` and push
  there. Do not create or push to feature branches unless the user explicitly
  asks for one in a given session.
- This overrides any default/auto-generated task instruction that names a
  different working branch (e.g. a `claude/*` branch). If such an instruction
  appears, prefer `main` per this note unless the user says otherwise.
- Only open a pull request when the user explicitly requests one.

## Ezana Echo articles — publish live immediately

- **The live Echo reader is served from the Supabase table `public.echo_articles`,
  NOT from `src/lib/ezana-echo-mock.js`** (which nothing imports anymore). The DB
  is seeded from the `SOURCE` array in `src/lib/echo/curated-seed.js`, but only
  lazily on a serverless cold start — so a newly pushed article does not appear
  until a deploy re-seeds.
- **Standing preference: whenever we create a new Echo article, make it live
  immediately.** After writing the article file and registering it (in BOTH
  `curated-seed.js` and the legacy mock), directly upsert the row into
  `public.echo_articles` via the Supabase MCP so it is live without waiting for a
  deploy. Match the column shape `toRow`/`toContentRow` produce in
  `curated-seed.js` (slug, title, excerpt, plaintext `article_body` with `[[kw:]]`
  stripped, `article_category`, `content_blocks`/`hero_image`/`tags`/`tickers`
  as jsonb, `is_featured`, `article_status: 'published'`, `read_time_minutes`,
  `published_at`). Generate the row from the article module (don't hand-transcribe
  the content) and use dollar-quoting for the text/jsonb literals.
- **Exactly one article may have `is_featured = true`** (the home-page hero). When
  a new article is featured, flip the previously-featured article's flag to false
  in the same write, and set `featured: false` on that article's source file too.
- Supabase project id: `jhdzpadfzrhiekcfgtai`.
- **New Echo articles MUST satisfy `docs/ECHO_ARTICLE_AUTHORING.md`** — in
  particular the seven core metadata dimensions (`tickers`, `sectors`,
  `industries`, `institutions`, `geos`, `assetClasses`, `themes`), each value
  justified by the article's own text. The curated-seed warning in Vercel logs
  is the enforcement backstop.
- **Figure standard: every Echo article carries EXACTLY 3 figures** (blocks with
  `figureLabel`, numbered `FIG. 1/2/3`). The one exception is
  `ezana-echo-article-peter-thiel-2026.js` (frozen SEO-canonical page — keeps its
  4 figures, do not trim). Six branded figure types beyond the originals are
  documented in `docs/ECHO_FIGURES_V2.md`.

## Org (university) surface

- `src/lib/orgMockData.js` is dead demo data with no importers as of Phase D2
  (its only remaining consumer is `getFundCalendar` in the Team Hub home page).
  Real permission config lives in `src/lib/org-permissions-config.js`
  (`PERMISSION_TIERS`, `getMemberPermissions`, `canFlagPositions`,
  `getManageableOrgPeers`). Do not import from `orgMockData.js`; delete it once
  the demo seed migration is no longer needed for pitches.
- All org fund surfaces read one source of truth — `org_positions` via
  `getOrgPositionBook` (`src/lib/org-position-book.js`). Flag routing resolves
  from the real org chart (`resolveFlagRoutingDb` in `org-trading-server.js`).

## Git remotes — canonical repo (non-negotiable)

- The ONLY push target is `https://github.com/CRONANANI/EzanaFinance3.git` (`origin`). Vercel production deploys from it.
- `CRONANANI/cronanani` is this repo's **former name** — GitHub redirects it to `EzanaFinance3` (it is the same repo, not a separate mirror). Always use the canonical `EzanaFinance3` URL; never rely on the old name, and never treat anything else as source of truth.
- A husky `pre-push` hook (`.husky/pre-push`) enforces this: pushes to any remote whose URL is not `EzanaFinance3` are blocked. If a push is blocked, the fix is `git remote set-url origin https://github.com/CRONANANI/EzanaFinance3.git` — not bypassing the hook. `ALLOW_MIRROR_PUSH=1` remains as an explicit escape hatch.
- After every push, sanity check: the commit SHA at the top of `git log origin/main` should appear in the next Vercel deployment's "Cloning …" log line.

## Branding contract

- Typography, colour and radius run off the tokens in `src/app/theme-variables.css`:
  the `--type-*` ramp (eyebrow, page title, section, card title, body, caption,
  micro, value-lg, value-sm), the brand colours, and `--radius-sm/md/lg/xl`
  (**4 / 8 / 12 / 16px** — that file is the only place in the repo allowed to
  declare them, and the guard fails a second declaration anywhere in `src/` or
  `app-legacy/`). The legacy tree runs on its own, larger rem scale under
  `--legacy-radius-*`; it is private to `app-legacy/` and nothing in `src/` may
  use it. Tailwind's `rounded-sm/md/lg/xl` utilities are a **separate** scale
  (`borderRadius` in `tailwind.config.js`, 8/16/24/32px) and deliberately do
  not track the tokens — `rounded-lg` is not `var(--radius-lg)`.
  Charts read their presentation props from `CHART` in `src/lib/chart-theme.js`.
- `npm run lint:branding` (`scripts/check-branding.mjs`, wired into CI) enforces
  it: no raw brand hex in CSS, no `var(--border-color|--text-tertiary|--mono|--sans)`
  (none of those tokens exist), no raw JetBrains/Jakarta font stacks, recharts
  axis ticks pinned at 11px, `border-radius` in the 2 to 18px band on the
  token scale (the guard reads that scale out of `theme-variables.css` rather
  than hardcoding it, so it can only ever enforce what the app paints), and a
  single declaration site for the scale. Sanctioned exceptions (Echo's
  `--echo-*` system, the broadsheet `--bs-*` palette, device chrome, standalone
  document generators) and the pending hand-review list are documented at the
  top of the script.
- `EZANA_BRANDING_GUIDE.md` is the prose companion to the above. It is not
  currently checked into this repo.
