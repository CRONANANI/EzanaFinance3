# Security sweep reports

Automated security-sweep findings, written by the scheduled `/security-sweep`
job (see `.claude/commands/security-sweep.md`).

- One `YYYY-MM-DD-HHMM.md` report per sweep that finds something or is the first
  run. "No findings" reports are kept too — they're the audit trail.
- `.last-sweep` holds the `main` commit SHA swept last, so a 4-hourly schedule
  no-ops when nothing changed instead of churning reports/PRs.

These files are committed deliberately (the "make a report" half of the job).
