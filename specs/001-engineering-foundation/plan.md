# Engineering Foundation — Plan

Revision: R1, 2026-10-01. Input: [spec R1](spec.md).
Approval reference: [spec.md combined approval](spec.md#combined-approval--sole-approval-record).
Sources: [roadmap](../../docs/ROADMAP.md), existing frontend package/lock,
API pyproject/uv.lock, and PROJECT_SPEC development/testing sections.

## Architecture and design decisions

Keep the current Next.js/FastAPI/CatVTON application architecture. Build a
repository workflow around the two owned CPU application services. Tests
exercise real frontend and API logic with external boundaries replaced.

| Decision | Proposed implementation and reason |
| --- | --- |
| Command interface | Root Makefile only, compatible with macOS system make and Linux GNU make. Service scripts hold tool details; no Taskfile or duplicate command graph. |
| Runtime baseline | Node 22 LTS and Python 3.11, subject to frozen-lock compatibility verification in B2. Preserve pnpm 10.13.1. Pin uv, Lefthook and other CI tooling to tested versions during implementation; do not guess hashes. An incompatible major baseline returns for review. |
| Python tooling | uv development group with Ruff, pytest and HTTPX; Ruff lint/format on owned API modules. Defer mypy until API typing is a separately bounded improvement. |
| Frontend tooling | Existing ESLint, Prettier and TypeScript; add read-only format/typecheck scripts. Use Vitest for state/client tests and Playwright for one browser journey. |
| Hooks | Lefthook installed explicitly; staged scoped format/lint/secret checks, no automatic fixes. Use a pinned Gitleaks version for staged and CI scans. |
| CI | GitHub Actions for PRs and pushes to main, read-only tokens, timeouts, concurrency cancellation and pinned actions. No deployment, registry push, write tokens or repository secrets. |
| Source scope | web-frontend owned application sources, garment-processing-api owned Python modules, and repository workflow/documentation. Exclude generated assets, binary models, vendored CatVTON and deprecated backends. Document exact excludes. |
| Setup safety | pnpm install --frozen-lockfile and uv sync --locked; explicit browser dependency step. Environment templates contain placeholders; never overwrite a contributor's .env or install agent skills automatically. |

Only dependency additions necessary for this feature update lockfiles. Runtime
service dependencies stay in their existing project declarations. CI supplies
non-secret environment placeholders and local URLs for mocked checks.

## Command contract

| Target | Behavior |
| --- | --- |
| help | List public commands and prerequisites; requires no installed service dependencies. |
| doctor | Report required tools, versions and optional live-model prerequisites without exposing environment values. |
| setup | Frozen frontend/API dependency installation; no model restoration or hook installation. |
| dev-frontend / dev-api | Start the named local service in foreground; API live use still requires documented credentials/models. |
| lint / format-check / typecheck / lock-check | Read-only checks; TypeScript check applies to frontend; lock check must not resolve/update locks. |
| format | Explicit source formatting in owned scope. |
| test | Frontend unit/client tests and isolated API tests. |
| test-e2e | Browser smoke with mocked external calls and managed local frontend server. |
| build | Frontend production build, using documented non-secret build configuration. |
| verify | Aggregate lint, format-check, typecheck, lock-check and test; stop on failures. |
| hooks-install | Install committed Lefthook hooks explicitly. |

Use service-specific subtargets where useful; public aggregates delegate to
those commands. CI invokes these targets rather than reconstructing them.
Check targets must not run uv's implicit sync; use the installed environment
or uv run --no-sync. Use uv lock --check for freshness: --frozen alone does
not validate whether project metadata and the lock agree. Separate browser installation from test execution.

## Test isolation and behavior

API tests use FastAPI TestClient/HTTPX with controlled startup and replacements
at classifier, Cloudinary, rembg and Gradio boundaries. Assert request validation,
status/body and externally visible orchestration, including failure propagation.
If current module imports initialize costly resources, introduce the smallest
injection/lifecycle seam while preserving normal production initialization.
Do not mock the route handler under test or silently disable normal startup.

Frontend tests exercise existing state reset/navigation and the client request/
response contract. Browser routes return representative API responses for a
small synthetic image; assert upload, submit, result and download affordance.
No real camera, CDN, GPU or provider credentials. Derive fixtures from current
API contracts, including the garment multipart field, and keep them synthetic.
A test-double success is not evidence that live inference works.

## Affected components

Planned new root files: Makefile, CONTRIBUTING.md, AGENTS.md, lefthook.yml and
small runtime/tool declarations as needed. Planned new workflows under .github/
workflows. Modify active service package/config/locks for checks and test tools;
add service test/config fixtures. Update README, CLAUDE pointers, environment
examples, .gitignore and contradictory setup/smoke documentation narrowly.
Exact test files and any API seams follow CodeGraph discovery before edits.
Do not absorb the existing untracked image-extraction-backend or other drafts.

## Specialists and tools

- Principal specialist: **github-actions-templates**, available in this client,
  loaded for B5 to guide workflow permissions, caching and event behavior.
- **bash-defensive-patterns**, available, loaded only if B2/B3 require helper
  shell scripts; prefer short make recipes and existing package commands.
- No additional specialist needed for documentation and tests: existing
  TypeScript/FastAPI patterns plus primary tool documentation are sufficient.
- CodeGraph MCP for indexed code discovery; earlier queries missed requested
  active API files, so use narrow raw reads where the index does not cover them.
- Local Make/pnpm/uv/Lefthook/Gitleaks and service tools for actual gates;
  Playwright for browser evidence. Load versioned official documentation via
  web tools for concrete compatibility/security questions and pin verification.
- Exa MCP (`mcp__exa__web_search_exa`) is available for targeted external
  research; Context7 (`mcp__context7__resolve_library_id` and
  `mcp__context7__query_docs`) is available for current/versioned library docs.
  Use them when a concrete unresolved choice requires evidence; prefer primary
  documentation and record sources. Both were used to validate this draft.
- No cloud MCP, provider account, deployment or separate agents are required.

Skill assignments are loaded when their batch needs them. Future roadmap
specialists are selected in their own feature plans, not this foundation.

## Security, compatibility and rollout

Scan staged changes and the current tracked tree for secrets; avoid printing
matched secret values. Findings trigger rotation/removal decisions rather than
fabricated pass results. Historical secret scanning and incident remediation
are separate scope if evidence warrants them. User untracked files are not
included in scanners or commits automatically.

Keep hooks cheap and non-mutating. Excludes must distinguish owned code from
vendor/generated content, not hide failures. Resolve existing formatting and
lint issues only in bounded owned scope; no dependency-major upgrade or broad
application refactor is implicit. Tool version selection and installation are
recorded in contributor instructions. Recommend branch protection requiring
actual final job names, but do not change remote settings.

Stage the workflow in five batches so each remains reviewable. Revert a failed
batch through a reviewed patch, preserving user changes; no destructive reset.
No application rollout occurs in this feature.

## Verification and completion

B1 validates documentation links and conventions. B2 proves setup with frozen
locks, portable make help/doctor and a frontend build. B3 runs static gates and
checks hook failure behavior on disposable fixtures. B4 proves isolated tests
and browser smoke, including targeted negative controls. B5 validates workflow
syntax/events/permissions/pins, runs make verify/build/test-e2e and fresh-checkout
Linux validation with secrets absent. macOS receives a local command smoke;
Linux is the CI reference. Do not claim hosted GitHub jobs ran before publication.

Record tools, revision and outputs in tasks.md. If a check cannot run, retain
its incomplete status and evidence; no skipped required gate counts as passed.

## Draft research evidence

Context7 confirmed uv's explicit sync controls and lock freshness semantics:
[uv locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync).
Exa located primary GitHub guidance supporting read-only tokens, full commit
SHA action pins and unprivileged PR execution:
[secure use reference](https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/security-hardening-for-github-actions)
and [fork secret behavior](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).
Use pull_request on GitHub-hosted runners; avoid privileged pull_request_target
execution of untrusted contributions. Cache downloads, not secret-bearing
environments or arbitrary executable build outputs.
