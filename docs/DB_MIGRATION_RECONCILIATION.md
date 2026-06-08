# Database Migration Reconciliation Runbook

One-time procedure to align the live Supabase migration history with the 102 migration files in `supabase/migrations/`. After this, `supabase db push` and `supabase migration list` will work correctly.

**Project:** `jhdzpadfzrhiekcfgtai` (CRONANANI's Project, us-west-2, Postgres 17)

---

## Background

The live database was built by applying migrations ad-hoc (MCP connector, Supabase dashboard, manual SQL). The `supabase_migrations.schema_migrations` table only records ~15 entries — the ones applied via the Supabase CLI or MCP this session. The remaining ~87 repo migrations have no history entry, even though their schema already exists in the DB.

This means:

- `supabase db push` tries to re-apply old migrations and fails
- `supabase migration list` shows most migrations as "not applied"
- Column-level drift goes undetected (e.g., `profiles.email NOT NULL` vs migration expecting nullable)

---

## Prerequisites

```bash
# 1. Install Supabase CLI (v2+)
brew install supabase/tap/supabase   # macOS
# or: npm i -g supabase

# 2. Link to the project
supabase link --project-ref jhdzpadfzrhiekcfgtai
# You'll need the DB password — find it in Supabase dashboard → Settings → Database
```

---

## Step 1: Snapshot the current live schema

Pull the actual schema from the live DB into a local file for diff comparison.

```bash
supabase db pull --schema public > live_schema_snapshot.sql
```

This gives you the ground truth of what Postgres actually has.

---

## Step 2: Audit migration history

Check which migrations the DB thinks have been applied:

```bash
supabase migration list
```

Expected output: ~15 entries show "applied", ~87 show "not applied".

Save the output for reference:

```bash
supabase migration list > migration_audit.txt
```

---

## Step 3: Mark existing migrations as applied (repair)

For every migration file that the DB already has the schema for but lacks a history entry, run `migration repair`:

```bash
supabase migration repair <version> --status applied
```

Where `<version>` is the timestamp prefix (e.g., `20260323120000`).

### Batch script

Run this from the repo root to mark ALL repo migrations as applied:

```bash
#!/bin/bash
# repair_all_migrations.sh
set -euo pipefail

for f in supabase/migrations/*.sql; do
  version=$(basename "$f" | cut -d'_' -f1)
  echo "Marking $version as applied..."
  supabase migration repair "$version" --status applied 2>&1 || echo "  ⚠ failed for $version"
done

echo "Done. Run 'supabase migration list' to verify."
```

```bash
chmod +x repair_all_migrations.sh
./repair_all_migrations.sh
```

---

## Step 4: Verify all migrations show as applied

```bash
supabase migration list
```

Every migration should now show "applied". If any still show "not applied", investigate — the file may have a malformed timestamp or the repair command may have errored.

---

## Step 5: Detect schema drift

Compare the live schema against what the migrations would produce on a clean DB.

```bash
supabase db diff --schema public
```

This outputs SQL statements representing the delta between your migration files and the live DB. Common drift you may see:

| Drift type                     | Example                                                        | Action                                           |
| ------------------------------ | -------------------------------------------------------------- | ------------------------------------------------ |
| Extra columns                  | `profiles.email NOT NULL` exists live but no migration adds it | Create a new migration adding it                 |
| Missing columns                | `profiles.risk_score` in migration but not live                | Already fixed this session — verify              |
| Different defaults/constraints | `DEFAULT true` vs `DEFAULT false`                              | Create a corrective migration                    |
| Extra tables                   | Tables created via dashboard but no migration file             | Run `supabase db pull` to generate the migration |
| Missing indexes                | Index in migration but not live                                | Re-apply the specific migration                  |

### For each drift item:

1. **If the live DB is correct** (feature works, data exists): create a new migration file that matches reality.

   ```bash
   supabase migration new fix_<description>
   # Edit the generated file in supabase/migrations/
   # Then repair it as applied:
   supabase migration repair <new_version> --status applied
   ```

2. **If the migration file is correct** (live DB is missing something): apply just that statement.

   ```bash
   # Apply the specific SQL fix
   supabase db execute --sql "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_score INTEGER;"
   ```

---

## Step 6: Validate with a fresh diff

After fixing all drift:

```bash
supabase db diff --schema public
```

Should return empty (no drift). If it still shows differences, repeat Step 5 for each remaining item.

---

## Step 7: Confirm `db push` works

Test that future migrations will apply cleanly:

```bash
# Create a no-op test migration
supabase migration new reconciliation_test

# Add a harmless statement
echo "-- reconciliation test" > supabase/migrations/<timestamp>_reconciliation_test.sql

# Push it
supabase db push

# Clean up
rm supabase/migrations/<timestamp>_reconciliation_test.sql
supabase migration repair <timestamp> --status reverted
```

---

## Known Issues from This Codebase

These were discovered and fixed during the June 2026 sync session:

| Issue                                                     | Migration file                                  | Fix applied                                  |
| --------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| `partner_applications` table never created                | `20240315000000_partner_applications.sql`       | Quoted `"current_role"` (reserved keyword)   |
| `profiles.risk_score` / `risk_category` missing           | `20260504130000_user_risk_profile.sql`          | Columns added to live DB via MCP             |
| `demo_investors` seed failed on `profiles.email NOT NULL` | `20260508120000_demo_investors.sql`             | Added `p_email` to seed function             |
| 27 tables missing from live DB                            | Various                                         | Applied all missing-table migrations via MCP |
| `waitlist`, `badge_definitions`, `badges` had no RLS      | `20260617000300_enable_rls_waitlist_badges.sql` | New migration created and applied            |
| Performance indexes referenced nonexistent tables         | `20260617000000_perf_indexes.sql`               | Applied in dependency order                  |

---

## Going Forward

After reconciliation, maintain the workflow:

1. **All schema changes go through migration files** — never use the Supabase dashboard SQL editor for DDL
2. **Apply via CLI**: `supabase db push` (or `supabase migration up` for local)
3. **Before deploying**: run `supabase db diff` to catch drift early
4. **CI check** (optional): add `supabase db diff --schema public` to CI — fail the build if it produces output

```yaml
# .github/workflows/schema-check.yml (example)
- name: Check for schema drift
  run: |
    supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    output=$(supabase db diff --schema public 2>&1)
    if [ -n "$output" ]; then
      echo "Schema drift detected:"
      echo "$output"
      exit 1
    fi
```
