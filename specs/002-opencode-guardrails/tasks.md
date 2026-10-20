# OpenCode Guardrails — Tasks

Revision: R1, 2026-10-20. Inputs: [spec R1](spec.md), [plan R1](plan.md).
Approval: [sole record](spec.md#combined-approval--sole-approval-record).
Specialists/tools: plan.md; no task-specific exceptions.

## Ordered tasks

| ID  | Objective / likely paths                                                                                           | Depends on | Acceptance    | Verification                                                                     | State                           |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ------------- | -------------------------------------------------------------------------------- | ------------------------------- |
| T01 | Inspect OpenCode runtime/plugin resolution and existing Makefile/check scopes; add failing focused guardrail tests | —          | AC2–AC6       | Negative tests demonstrate missing config/hooks and cover risky/safe cases       | Complete                        |
| T02 | Add V2 project permissions and review/verify/resume commands in opencode.json                                      | T01        | AC1–AC4       | Rule-order, path, command and prompt-invariant tests                             | Complete                        |
| T03 | Implement local context/compaction plugin and test callbacks                                                       | T01, T02   | AC5–AC6       | Registration/content tests; compatible runtime load smoke                        | Complete                        |
| T04 | Integrate focused Makefile check; update AGENTS.md, CONTRIBUTING.md and roadmap feature link                       | T02, T03   | AC1, AC4, AC6 | Make help/target, formatting and link checks; existing hooks preserved           | Complete                        |
| T05 | Verify complete diff, record evidence and stop for human review                                                    | T04        | AC1–AC6       | Focused tests, runtime smoke, affected gates, git diff --check and lockfile diff | Complete with limitations below |

## Execution batch

| Batch | Tasks   | Outcome and completion condition                                                     | Verification                                                                                        | State    | Next action                                                           |
| ----- | ------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| B1    | T01–T05 | Portable guardrails, commands, lifecycle hooks and contributor guidance meet AC1–AC6 | Focused positive/negative tests, hook callbacks, runtime load smoke, affected gates and diff checks | Reviewed | Complete; no B2 exists. User requested separate pnpm policy follow-up |

After B1, record `awaiting human review` with changed paths, actual check results,
runtime limitations and next action. Passing checks do not authorize further work.

## Drafting evidence

- Read existing AGENTS.md, contributor hook/check guidance, foundation task state,
  product overview and roadmap; existing Git hooks use Lefthook/Gitleaks.
- Consulted primary OpenCode V2 configuration, permissions and plugin references
  linked in plan.md. No CodeGraph index exists; local tools used instead.
- Working tree was clean before drafting; initial drafting changed only these
  three documents. Approval and execution authorization are recorded in spec.md.

## B1 implementation and verification — 2026-10-20

Changed paths: `opencode.json`, `.opencode/plugins/repo-guardrails/index.ts`,
`scripts/test-opencode-guardrails.mjs`, `scripts/test-check-files.py`,
`scripts/check-files.py`, `Makefile`, `AGENTS.md`, `CONTRIBUTING.md`,
`docs/ROADMAP.md`, and this feature's documents. No application source, locks,
Lefthook configuration or global configuration changed. No commits/publication.

Authorized subagents handled config/hooks/tests, documentation, and an independent
integration review. The main agent integrated Makefile/formatting scope, fixed the
reviewed ownership mismatch and a quote-style-sensitive hook test, and verified.

Red/green evidence:

- Missing config/plugin failed focused tests; empty plugin setup then failed hook
  registration. Missing exact `make test-opencode` allow rule failed before added.
- Formatting-scope assertion failed before adding owned paths. Review regression
  for unowned `.opencode/agents/unowned.ts` failed before narrowing ownership to
  `.opencode/plugins/`, matching enumeration.
- Final `make test-opencode`: 4 Node tests + 2 Python scope tests pass. Tests execute
  real hook callbacks with mocked package/registration boundaries; permission
  matching is a documented model, not an actual scanner enforcement test.

Other checks:

- `make help`, `make doctor`, `make lint-api format-check-api`,
  `make format-check-repo`, `make typecheck`, `make lock-check-api`: pass.
- `make test`: 15 frontend and 12 API tests pass; API reports 3 existing
  Starlette/FastAPI deprecation warnings.
- `make verify` initially stopped on new Python formatting, subsequently fixed;
  frontend lint and frontend format checks passed in that run. Aggregate success
  is not claimed: `make lock-check` fails with pnpm 12.9.1 ignoring the repository
  package.json overrides; no lock rewrite attempted. Node is v24.21.0, uv 0.12.23,
  Python 3.11.17; reference pnpm is 10.13.1.
- `make workflow-check`: blocked by missing actionlint. `make secret-check`:
  blocked by missing Gitleaks. No implicit tool installation performed. The
  current-tree secret check would exclude new untracked files until tracked.
- OpenCode v2.0.32: location-scoped read-only `GET /api/plugin` reports
  `repo-guardrails` active; `GET /api/command` discovers all three repo commands.
  Package resolution required no dependency declaration/install. Unscoped queries
  resolve the service's home location, not the repository; standalone queries did
  not provide the same registries. No real compaction/model generation invoked.
- Focused formatting and `git diff --check` pass. Existing lockfiles and Lefthook
  behavior preserved. No build/browser run: application behavior is unchanged;
  no live inference, private photos, credential reads or deployments performed.

Technical verdict: focused implementation ready for review; complete repository
gate remains environment-blocked. AC1–AC6 have focused evidence, with runtime
enforcement/real compaction limits stated rather than inferred from load success.
State: **Reviewed**. Human B1 approval is recorded in spec.md. No B2 exists in
this feature. The user separately requested a pnpm policy follow-up rather than
restoring the historical exact pin; missing verification tools remain blockers
to a full green gate. The evidence above describes the B1 verification state.
