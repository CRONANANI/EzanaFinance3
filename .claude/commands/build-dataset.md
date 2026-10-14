Build the Ezana dataset page for slug `$ARGUMENTS` to the Politician Tracker
and Government Contracts standard. You are the orchestrator; delegate every
phase to the named subagent and wait for each to finish.

1. Claim the row: in `docs/datasets/BUILD_QUEUE.md` change the status of
   `$ARGUMENTS` from `todo` to `in-progress (<date>)` and commit that one line
   on branch `ds/$ARGUMENTS` (create the branch from `main` if needed).
2. Launch `dataset-source-scout` with the slug, its taxonomy entry from
   `src/lib/datasets/taxonomy.js`, and its roadmap row from
   `docs/DATASETS_ROADMAP.md`. Wait for `docs/datasets/sourcing/$ARGUMENTS.md`.
3. If the brief lists an "Open questions for Noah" item that blocks the
   primary source (licence unclear, key required that we do not have), stop
   and print the questions. Otherwise continue.
4. Launch `dataset-page-builder` with the slug. Wait for
   `docs/datasets/build-notes/$ARGUMENTS.md`.
5. Launch `dataset-page-reviewer` with the slug. If it returns any FAIL,
   relaunch `dataset-page-builder` with the reviewer's three ranked fixes as
   the task, then review again. Maximum two review loops.
6. On PASS: set the queue row to `review-ready`, commit, and print a five
   line summary: branch name, files changed count, attribution line, cron
   cadence, and the reviewer's remaining notes. Do not push. Do not merge.
   Noah reviews the diff.
