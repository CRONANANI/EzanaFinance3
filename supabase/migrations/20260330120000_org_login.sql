-- ═══════════════════════════════════════════════════════════
-- ORGANIZATIONAL LOGIN — University Investment Council System
-- Tables: organizations, org_members, org_teams, org_tasks,
--         org_team_portfolios, org_learning_content
-- ═══════════════════════════════════════════════════════════

-- Organizations (partner universities)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  university_name TEXT NOT NULL,
  email_domain TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_email_domain ON public.organizations(email_domain);

-- Teams / sectors within the organization (before org_members — FK)
CREATE TABLE IF NOT EXISTS public.org_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

-- Organization members (links users to org + role)
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('executive', 'portfolio_manager', 'analyst')),
  team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_team ON public.org_members(team_id);

-- Team portfolio holdings
CREATE TABLE IF NOT EXISTS public.org_team_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.org_teams(id) ON DELETE CASCADE,
  ticker_symbol TEXT NOT NULL,
  shares NUMERIC DEFAULT 0,
  avg_cost NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  sector TEXT,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_portfolio_team ON public.org_team_portfolios(team_id);

-- Tasks
CREATE TABLE IF NOT EXISTS public.org_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.org_teams(id),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_tasks_assigned_to ON public.org_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_org_tasks_team ON public.org_tasks(team_id);

-- Org events
CREATE TABLE IF NOT EXISTS public.org_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.org_teams(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'presentation', 'deadline', 'review', 'other')),
  event_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org learning content
CREATE TABLE IF NOT EXISTS public.org_learning_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.org_teams(id),
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT DEFAULT 'document' CHECK (content_type IN ('document', 'video', 'presentation', 'article', 'quiz')),
  content_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning assignments
CREATE TABLE IF NOT EXISTS public.org_learning_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.org_learning_content(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_learning_assign_to ON public.org_learning_assignments(assigned_to);

-- Org community posts
CREATE TABLE IF NOT EXISTS public.org_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.org_teams(id),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'announcement', 'update', 'question')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_team_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_learning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_learning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_posts ENABLE ROW LEVEL SECURITY;

-- Allow domain lookup on the login page before session exists; only active orgs
CREATE POLICY "Anyone can read active organizations" ON public.organizations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org members read members" ON public.org_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Org members read teams" ON public.org_teams
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Org members read portfolios" ON public.org_team_portfolios
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM public.org_teams t
      JOIN public.org_members m ON m.org_id = t.org_id
      WHERE m.user_id = auth.uid() AND m.is_active = true
    )
  );

CREATE POLICY "Members read tasks" ON public.org_tasks
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true
    )
    OR org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'portfolio_manager' AND is_active = true
    )
  );

CREATE POLICY "Managers write tasks" ON public.org_tasks
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
    )
  );

CREATE POLICY "Members read events" ON public.org_events
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Managers write events" ON public.org_events
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
    )
  );

CREATE POLICY "Members read learning" ON public.org_learning_content
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Managers write learning" ON public.org_learning_content
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('executive', 'portfolio_manager') AND is_active = true
    )
  );

CREATE POLICY "Members read assignments" ON public.org_learning_assignments
  FOR SELECT USING (
    assigned_to = auth.uid() OR assigned_by = auth.uid()
  );

CREATE POLICY "Members read posts" ON public.org_posts
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Members write posts" ON public.org_posts
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
    AND author_id = auth.uid()
  );
