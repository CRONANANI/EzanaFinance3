---
name: sonar-analysts
description: How to add, change or debug a Sonar analyst (registry profile, methodology skill, dataset contract, routing, evaluation cases). Use whenever work touches src/lib/sonar/analysts/** or sonar-skills/**.
---

# Working on Sonar's analyst team

Sonar answers research questions with a team: a Research Director routes each question to one lead specialist and up to three supporting specialists (18 specialists in total), a Methodology Auditor checks every report, and a Red Team challenges deep research. This is a coordinated pipeline inside the existing research engine, not a set of free-running agents.

## Where things live

| Piece                                         | Path                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Analyst profiles (21)                         | `src/lib/sonar/analysts/registry.js`                                                 |
| Dataset contracts (capability -> real source) | `src/lib/sonar/analysts/dataset-capabilities.js`                                     |
| Router (lead, supporting, controls)           | `src/lib/sonar/analysts/analyst-router.js`                                           |
| Methodology skills (runtime, one per analyst) | `sonar-skills/<skill>/SKILL.md`                                                      |
| Skill evaluation cases                        | `sonar-skills/<skill>/tests/evaluation-cases.json`                                   |
| Generated skill bundle (do not edit)          | `src/lib/sonar/analysts/skills.generated.js` (from `scripts/build-sonar-skills.mjs`) |
| Quantitative engine                           | `src/lib/sonar/analysts/quant.js`                                                    |
| Orchestrator                                  | `src/lib/sonar/analysts/orchestrator.js`                                             |
| Deterministic audit checks                    | `src/lib/sonar/analysts/audit.js`                                                    |
| Tests                                         | `scripts/check-sonar-analysts.mjs`, `scripts/check-sonar-analyst-evals.mjs`          |

`.claude/skills/` is for Claude Code at development time. Sonar's runtime never reads it; it reads the generated bundle built from `sonar-skills/`.

## Adding or changing an analyst

1. Profile in `registry.js`: id, skill, domains (spec domain ids with weights), objectives, operations, themes and secondaryThemes, subjectKinds, required and preferred capabilities, modes, model tier, output token caps, and rules (testable, enforced by the auditor).
2. Every capability must exist in `dataset-capabilities.js` with a verified source, units, period semantics, freshness and failure behaviour. Never point a capability at a table you have not confirmed exists in production.
3. Skill in `sonar-skills/<skill>/SKILL.md` using the standard section template. Original wording only; no textbook text or author names; the "Methodology basis" section is never sent to the model.
4. Add or update 12+ evaluation cases (lead, supporting, boundary, adversarial) and the routing table in `check-sonar-analysts.mjs`.
5. Run `npm run build:sonar-skills && npm run test:sonar-analysts`.

## Non-negotiables

- Code computes every number (`quant.js`); models restate computed values with their metric ids.
- Every figure keeps its observation period; mixed dates are disclosed, never merged.
- Analysts read evidence only through the shared retrieval pass and approved engine sources. Organization data is tenant-scoped (active org, membership, RLS). No direct table access, no unrestricted service-role queries from analyst code.
- Findings only: no advice, no price targets in Ezana's voice, no motive or misconduct inferred from disclosures.
- Specialists agreeing is not verification when they read the same source; the auditor checks evidence diversity.
- Respect budgets: tokens per analyst, deadline per mode, cost cap per run.
