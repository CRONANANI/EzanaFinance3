-- ============================================================================
-- Research Library redesign (1a Typed library / 1b Ticker dossier / 1c Coverage
-- lineage) — Phase 1. ADDITIVE ONLY. NOT yet applied — written for review (the
-- handoff gates Phase 1 on migration approval).
--
-- org_research_notes is genuinely Supabase-backed already (unlike Pitch
-- Pipeline). This extends it + adds six child tables. The `vector` and `pg_trgm`
-- extensions are already enabled on this project, so the CREATE EXTENSION /
-- index lines are safe no-ops. Embeddings use gte-small (384-dim) to match the
-- existing embedViaSupabase() pattern. RLS mirrors org_research_notes and
-- respects visibility (private/team/org). Existing consumers keep working
-- (additive only — no drops/renames).
-- ============================================================================

-- ── Extend org_research_notes ───────────────────────────────────────────────
ALTER TABLE public.org_research_notes
  ADD COLUMN IF NOT EXISTS doc_type            text DEFAULT 'note',
     -- note | pitch_memo | model | primer | post_mortem | ic_minutes | reading | competition | external
  ADD COLUMN IF NOT EXISTS status              text DEFAULT 'published',
     -- draft | under_review | published | archived | superseded
  ADD COLUMN IF NOT EXISTS abstract            text,          -- REQUIRED TL;DR (enforced on publish)
  ADD COLUMN IF NOT EXISTS version             integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS superseded_by       uuid REFERENCES public.org_research_notes(id),
  ADD COLUMN IF NOT EXISTS term                text,          -- e.g. 'Fall 2026'
  ADD COLUMN IF NOT EXISTS author_role_at_time text,          -- role snapshot → survives rollover
  ADD COLUMN IF NOT EXISTS is_alum_authored    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_exemplar         boolean DEFAULT false,  -- faculty flag → Learning Center
  ADD COLUMN IF NOT EXISTS pitch_id            uuid,          -- link → org_pitches
  ADD COLUMN IF NOT EXISTS assignment_id       uuid,          -- link → org_assignments
  ADD COLUMN IF NOT EXISTS position_id         uuid,
  ADD COLUMN IF NOT EXISTS view_count          integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS citations           text,
  ADD COLUMN IF NOT EXISTS published_at        timestamptz,
  ADD COLUMN IF NOT EXISTS embedding           vector(384);   -- gte-small, matches existing pattern

-- Full-text search (design asks for pg_trgm/tsvector; both extensions present).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS org_research_notes_fts
  ON public.org_research_notes USING gin (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'') || ' ' || coalesce(body,''))
  );
-- Vector index (mirror the prediction-markets setup).
CREATE INDEX IF NOT EXISTS org_research_notes_embedding_idx
  ON public.org_research_notes USING ivfflat (embedding vector_cosine_ops);

-- ── New child tables ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_research_versions (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id  uuid NOT NULL REFERENCES public.org_research_notes(id) ON DELETE CASCADE,
  org_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version  integer NOT NULL,
  title    text, body text, abstract text,
  edited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_versions_note ON public.org_research_versions(note_id, version);

CREATE TABLE IF NOT EXISTS public.org_research_attachments (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id  uuid NOT NULL REFERENCES public.org_research_notes(id) ON DELETE CASCADE,
  org_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL, storage_path text NOT NULL,
  kind text, size_bytes bigint,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_attachments_note ON public.org_research_attachments(note_id);

CREATE TABLE IF NOT EXISTS public.org_research_comments (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id  uuid NOT NULL REFERENCES public.org_research_notes(id) ON DELETE CASCADE,
  org_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  body     text NOT NULL,
  anchor   text,                          -- section/quote the comment is attached to
  is_review_block boolean DEFAULT false,  -- blocks publish until resolved
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_comments_note ON public.org_research_comments(note_id, created_at);

CREATE TABLE IF NOT EXISTS public.org_research_templates (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name     text NOT NULL, doc_type text NOT NULL,
  required_sections jsonb DEFAULT '[]'::jsonb,
  body_scaffold text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_templates_org ON public.org_research_templates(org_id);

CREATE TABLE IF NOT EXISTS public.org_research_collections (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  name     text NOT NULL,
  kind     text NOT NULL CHECK (kind IN ('saved_search','collection')),
  query    jsonb,
  note_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_collections_owner ON public.org_research_collections(owner_id);

CREATE TABLE IF NOT EXISTS public.org_coverage_lineage (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticker   text NOT NULL,
  from_member_id uuid, to_member_id uuid,
  handoff_note_id uuid REFERENCES public.org_research_notes(id) ON DELETE SET NULL,
  term     text, created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coverage_lineage_org ON public.org_coverage_lineage(org_id, ticker);

-- ── RLS — mirror org_research_notes (org-scoped, visibility-aware) ───────────
ALTER TABLE public.org_research_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_research_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_research_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_research_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_research_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_coverage_lineage     ENABLE ROW LEVEL SECURITY;

-- Note-linked tables read iff the parent note is readable (respects visibility).
-- versions
DROP POLICY IF EXISTS "read research versions" ON public.org_research_versions;
CREATE POLICY "read research versions" ON public.org_research_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.org_research_notes n WHERE n.id = note_id
          AND n.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
          AND (n.visibility <> 'private' OR n.author_id = auth.uid())));
DROP POLICY IF EXISTS "write research versions" ON public.org_research_versions;
CREATE POLICY "write research versions" ON public.org_research_versions FOR ALL USING (
  edited_by = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  edited_by = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- attachments
DROP POLICY IF EXISTS "read research attachments" ON public.org_research_attachments;
CREATE POLICY "read research attachments" ON public.org_research_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.org_research_notes n WHERE n.id = note_id
          AND n.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
          AND (n.visibility <> 'private' OR n.author_id = auth.uid())));
DROP POLICY IF EXISTS "write research attachments" ON public.org_research_attachments;
CREATE POLICY "write research attachments" ON public.org_research_attachments FOR ALL USING (
  uploaded_by = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  uploaded_by = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- comments
DROP POLICY IF EXISTS "read research comments" ON public.org_research_comments;
CREATE POLICY "read research comments" ON public.org_research_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.org_research_notes n WHERE n.id = note_id
          AND n.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
          AND (n.visibility <> 'private' OR n.author_id = auth.uid())));
DROP POLICY IF EXISTS "write research comments" ON public.org_research_comments;
CREATE POLICY "write research comments" ON public.org_research_comments FOR ALL USING (
  author_id = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  author_id = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- templates (org-scoped: members read, managers write)
DROP POLICY IF EXISTS "read research templates" ON public.org_research_templates;
CREATE POLICY "read research templates" ON public.org_research_templates FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write research templates" ON public.org_research_templates;
CREATE POLICY "managers write research templates" ON public.org_research_templates FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- collections (personal saved searches / pinned sets — owner only)
DROP POLICY IF EXISTS "owner rw collections" ON public.org_research_collections;
CREATE POLICY "owner rw collections" ON public.org_research_collections FOR ALL USING (
  owner_id = auth.uid()
) WITH CHECK (
  owner_id = auth.uid()
  AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

-- coverage lineage (org-scoped: members read, managers write)
DROP POLICY IF EXISTS "read coverage lineage" ON public.org_coverage_lineage;
CREATE POLICY "read coverage lineage" ON public.org_coverage_lineage FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write coverage lineage" ON public.org_coverage_lineage;
CREATE POLICY "managers write coverage lineage" ON public.org_coverage_lineage FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);
