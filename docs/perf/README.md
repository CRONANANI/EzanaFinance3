# Performance tooling

How to measure this repo. Three tools, none of which need a CI service.

## 1. Bundle analyzer

Already wired via `@next/bundle-analyzer`, gated behind an env var so normal
builds are unaffected:

```bash
ANALYZE=true npm run build
```

Writes interactive treemaps to `.next/analyze/`:

- `client.html` is the one that matters for first-load JS
- `nodejs.html` / `edge.html` cover the server bundles

Read it for two things: which modules land in the **shared** chunk (every route
pays for those), and whether a heavy package is being pulled in whole rather
than tree-shaken. If a package shows up as one large block, it is a candidate
for `experimental.optimizePackageImports` in `next.config.js`.

Note: the analyzer build is slow (several minutes) because it runs a full
production compile plus Sentry source-map processing. Sentry upload failures in
a sandbox are noise, not build errors; look for `Compiled successfully`.

## 2. Route budget checker

```bash
npm run lint:perf                              # check every route
node scripts/check-route-budgets.mjs --json    # machine-readable
node scripts/check-route-budgets.mjs --write   # re-seed budgets (deliberate!)
```

Computes per-route first-load JS from `.next/app-build-manifest.json` and
`.next/build-manifest.json` (route chunks plus the shared chunks every route
pays for), compares against `docs/perf/budgets.json`, and exits nonzero naming
every breach and by how much.

It reads the manifests rather than parsing build stdout on purpose: stdout
rounds to 0.1 kB and its formatting changes between Next versions, so a budget
built on it drifts silently.

**`--write` is not a fix.** It records current sizes as the new ceiling, which
is exactly how a regression gets blessed into the baseline. Use it when
deliberately re-baselining, and say so in the commit.

Requires a build first: the manifests come from `.next/`.

## 3. Lighthouse, locally

No CI Lighthouse yet, by design: this repo's routes are mostly authenticated,
so a CI run would measure the redirect rather than the page.

```bash
npm run build && npx next start -p 3111
npx lighthouse http://localhost:3111/ --preset=desktop --view
npx lighthouse http://localhost:3111/ --view          # mobile, the stricter one
```

For authenticated routes, run Lighthouse from Chrome DevTools against a
browser that is already signed in; the CLI has no session.

What to record: LCP element and its size, INP, CLS, total transfer, and the
request count. `docs/perf/BASELINE.md` holds the numbers this pass started
from.

## Files

| File                 | What it is                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| `BASELINE.md`        | Measured starting point: per-route first-load JS, shared chunks, module inventory |
| `PERFORMANCE_MAP.md` | Per-route audit: server cost, client share, opportunities ranked                  |
| `budgets.json`       | Per-route first-load JS ceilings, enforced by `lint:perf`                         |
