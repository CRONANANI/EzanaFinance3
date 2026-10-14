Work through `docs/datasets/BUILD_QUEUE.md` until no `todo` rows remain.
Optional argument `$ARGUMENTS` is a wave heading to restrict to (for example
`Wave 1`); with no argument, take rows in file order across all waves except
Wave 5 (hub pages are never built by this command).

Loop:

1. `git checkout main && git pull origin main`. Read the queue. Find the
   first row whose status is exactly `todo` (within the wave if one was
   given). If none, print "Queue empty" plus a table of every row and its
   status, and stop.
2. Run the full `/build-dataset <slug>` procedure for that row, exactly as
   written in `.claude/commands/build-dataset.md`, including the claim push
   in its step 1 and the merge in its step 6.
3. If that run ended in `needs-noah` or in a stop because another terminal
   claimed the row, do not retry it; go back to step 1 and take the next row.
4. After each merged page, print one line: `<slug> merged <sha>`, then go
   back to step 1.

Never build two pages at once in this session. Never touch a row that is
`in-progress`, `needs-noah`, or `merged`. Never edit `taxonomy.js`.
