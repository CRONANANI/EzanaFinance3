Build the Ezana dataset page for slug `$ARGUMENTS` to the Politician Tracker
and Government Contracts standard. You are the orchestrator; delegate every
phase to the named subagent and wait for each to finish.

1. Claim the row: `git checkout main && git pull origin main`, then in
   `docs/datasets/BUILD_QUEUE.md` change the status of `$ARGUMENTS` from
   `todo` to `in-progress (<date>)`, commit that one line on main and
   `git push origin main` immediately so other terminals see the claim. If
   the push is rejected, pull, re-read the queue, and if the row is no
   longer `todo` stop and say another terminal took it. Then create branch
   `ds/$ARGUMENTS` from main.
2. Launch `dataset-source-scout` with the slug, its taxonomy entry from
   `src/lib/datasets/taxonomy.js`, and its roadmap row from
   `docs/DATASETS_ROADMAP.md`. Wait for `docs/datasets/sourcing/$ARGUMENTS.md`.
3. If the brief lists an "Open questions for Noah" item that blocks the
   primary source (licence unclear, key required that we do not have), set
   the queue row to `needs-noah`, commit and push that to main, print the
   questions, and stop. Otherwise continue.
4. Launch `dataset-page-builder` with the slug. Wait for
   `docs/datasets/build-notes/$ARGUMENTS.md`.
5. Launch `dataset-page-reviewer` with the slug. If it returns any FAIL,
   relaunch `dataset-page-builder` with the reviewer's three ranked fixes as
   the task, then review again. Maximum two review loops.
6. On PASS: `git checkout main && git pull origin main`,
   `git merge --no-ff ds/$ARGUMENTS`, set the queue row to `merged`, commit,
   `git push origin main`, `git branch -d ds/$ARGUMENTS`. Print a five line
   summary: commit SHA, files changed count, attribution line, cron cadence,
   and the migration file path Noah must run in the Supabase SQL Editor.
   If the reviewer still FAILS after two loops, do NOT merge; set the row to
   `needs-noah` on main, push, and print the failures instead.
