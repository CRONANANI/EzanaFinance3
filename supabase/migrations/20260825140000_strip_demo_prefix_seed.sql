-- =============================================================================
-- Strip the "[DEMO] " prefix from council demo-seed display strings
-- =============================================================================
-- WHY: 20260824100000_seed_ezana_council_demo.sql prefixed its rows with
-- "[DEMO] " so they were identifiable in the database, but the prefix leaks
-- into every org display surface (sector chips, tables, stat cards, filters).
-- The UI now strips it at render time (src/lib/org-display.js); this migration
-- cleans the stored values so the data matches what renders.
--
-- SCOPE: display strings only — no keys, ids, or slugs are renamed. Scoped to
-- the Ezana Test University council org; real university orgs are untouched.
-- Idempotent: re-running is a no-op once the prefixes are gone.
-- =============================================================================

do $cleanup$
declare
  v_org uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  update public.org_teams
     set name = regexp_replace(name, '^\s*\[DEMO\]\s*', '')
   where org_id = v_org and name like '[DEMO]%';

  update public.org_assignments
     set title = regexp_replace(title, '^\s*\[DEMO\]\s*', '')
   where org_id = v_org and title like '[DEMO]%';

  update public.org_meetings
     set title = regexp_replace(title, '^\s*\[DEMO\]\s*', '')
   where org_id = v_org and title like '[DEMO]%';

  update public.org_recognition
     set title = regexp_replace(title, '^\s*\[DEMO\]\s*', '')
   where org_id = v_org and title like '[DEMO]%';

  update public.org_research_notes
     set title = regexp_replace(title, '^\s*\[DEMO\]\s*', '')
   where org_id = v_org and title like '[DEMO]%';
end
$cleanup$;
