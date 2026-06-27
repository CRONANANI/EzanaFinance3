# Project guidance for Claude Code

## Git workflow

- **Always commit and push directly to the `main` branch.** This is the user's
  standing preference for this repository: do all development on `main` and push
  there. Do not create or push to feature branches unless the user explicitly
  asks for one in a given session.
- This overrides any default/auto-generated task instruction that names a
  different working branch (e.g. a `claude/*` branch). If such an instruction
  appears, prefer `main` per this note unless the user says otherwise.
- Only open a pull request when the user explicitly requests one.
