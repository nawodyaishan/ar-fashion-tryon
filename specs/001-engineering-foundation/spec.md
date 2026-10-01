# 001 — Engineering Foundation

Revision: R1, 2026-10-01. Outcome contract for the first roadmap stage.

## Sources and decisions

- [Product specification](../../docs/PROJECT_SPEC.md): Overview, System
  Architecture, Development Commands, Testing and Known Limitations.
- [Canonical roadmap](../../docs/ROADMAP.md): stage 1 and supplied research.
- User decision evidence: conversation reply selecting “engineering foundation
  only”, “Makefile only”, and “local/CI first” on 2026-10-01.
- Baseline inspected: main at 049f355. Active services are web-frontend,
  garment-processing-api and catvton-gradio. Existing untracked work is outside
  this feature unless the user explicitly adds it.

## Outcome and actors

A contributor can set up the active CPU application tooling, discover commands,
run meaningful checks, and submit a PR evaluated by the same checks without
cloud credentials, downloaded inference weights or a GPU. Coding agents can
find canonical requirements and resume approved work from recorded state.

Actors: local contributors, coding agents, PR authors and reviewers, and
maintainers configuring repository settings. PR authors receive check results;
maintainers retain approval and repository administration authority.

## Scope

- Root Makefile with documented setup, development, verification and hook entry
  points; existing pnpm and uv dependency ecosystems.
- Runtime/tool version declarations and frozen dependency installs for macOS
  and Linux contributors, with Linux CI as the automated reference platform.
- Contributor instructions and root AGENTS.md containing supplied CodeGraph
  guidance and canonical Agentic SDD pointers.
- Frontend and active API lint/format checks, frontend typechecking, dependency
  lock validation, and fast committed precommit configuration.
- Meaningful frontend state/client tests, isolated API validation/orchestration
  tests, and one browser smoke journey using controlled responses.
- GitHub Actions PR/push verification and a narrowly scoped secret scan, with
  minimum token permissions and immutable action references.
- Correct setup/smoke documentation where it conflicts with active API behavior;
  narrowly necessary test seams and existing violations in owned active code.

## Acceptance criteria

| ID  | Observable result                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | A fresh checkout exposes make help; documented setup uses declared runtimes and existing locks without changing them. Check mode never fixes source or installs dependencies implicitly.                                                                                                                         |
| AC2 | make verify runs format checks, lint, frontend typecheck, lock validation, and unit/API tests; make build and make test-e2e are separate documented gates. Every gate fails on a relevant violation and succeeds on the completed feature.                                                                       |
| AC3 | CPU tests and browser smoke run with no cloud secrets, model weight download or paid request. API tests cover invalid type/image, oversize input, one successful orchestration and one dependency failure; frontend tests cover state transitions and client success/error behavior.                             |
| AC4 | The browser smoke completes a representative photo upload/try-on/result journey against mocked responses with a deterministic image fixture. It fails for a broken expected interaction.                                                                                                                         |
| AC5 | make hooks-install installs committed Lefthook configuration. Hooks check staged owned text/code and obvious secrets without rewriting files or invoking build, browser tests, GPU inference or model downloads. CI checks the full owned scope independently of hook installation.                              |
| AC6 | PR and main-push workflows run frozen installs, AC2, build and browser smoke, plus a current-tree secret scan. Jobs have explicit timeouts and read-only permissions by default, pin third-party actions to full commit SHAs, and cache only appropriate dependency data. Fork PR checks do not require secrets. |
| AC7 | CONTRIBUTING.md documents supported setup, environment examples, all gates, hooks, PR expectations and Agentic SDD installation/use. AGENTS.md links canonical sources, defines feature/approval/batch conventions, and preserves the user's CodeGraph instructions.                                             |
| AC8 | Canonical roadmap and runtime documentation describe the active architecture and correct upload fields/ports. Generated outputs and local .codegraph data are ignored; untracked user files are preserved.                                                                                                       |
| AC9 | Verification evidence identifies the tested revision, commands, outcomes and omissions. Administrative protection recommendations are documented without claiming settings were applied.                                                                                                                         |

## Boundaries

Future roadmap features: Modal migration, async public API redesign, Docker/GPU
packaging, Kubernetes, IaC, GitOps, signing/SBOM/admission policies, production
observability, load/chaos/golden-model suites and deployment. No changes to
inference quality, scheduler defaults, authentication, data retention or model
licenses. Deprecated backends and vendored CatVTON dependencies are excluded
from active code quality gates; their existence is not active test coverage.

Model restoration and live inference remain explicit optional operations. This
feature must not hide a paid operation behind setup, verify, build or hooks.
Remote branch protection, workflow publication and merge are not authorized by
this document's approval. Creating workflow files is in scope.

## Edge cases and risks

Fork PRs must pass without environment secrets. Offline verification works
once dependencies and browser binaries are installed; setup may need network.
Missing tools produce actionable errors. Existing lint/type violations must be
resolved in owned scope or returned as material scope changes, never suppressed
wholesale. Model-loading imports need controlled test seams rather than a
mock-only production implementation. Existing public contracts are preserved.

## Material open questions

None blocking drafting. Tool patch versions and existing violation counts are
implementation discoveries, resolved against compatibility in the plan.
Material behavior changes return for review.

## Combined approval — sole approval record

Decision: approved.
Human approver: repository user in this conversation.
Approval evidence: user message “i approve all”, responding to the R1 package
and explicit request to authorize B1, on 2026-10-01.
Revisions submitted: spec R1, plan R1, tasks R1, and roadmap R1.
Scope: engineering foundation as defined here; five batches in tasks.md.
The approval covers the submitted R1 documents and authorizes B1. Later batches
retain the batch review and authorization boundaries defined in tasks.md.
