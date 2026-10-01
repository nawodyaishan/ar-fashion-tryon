# Engineering Foundation — Tasks and Batches

Revision: R1, 2026-10-01. Inputs: [spec R1](spec.md), [plan R1](plan.md).
Approval reference: [sole approval record](spec.md#combined-approval--sole-approval-record).
Specialist/tool assignments are defined once in plan.md; no task exceptions.

## Ordered tasks

T01–T04 are reviewed and complete; T05/T06 are reviewed and complete; T07–T10 are reviewed and complete; T11/T12 are reviewed and complete. Dependencies identify implementation order; all changes
must stay within the spec and preserve existing untracked user work.

| ID  | Objective and likely paths                                                                                  | Depends on | Acceptance result                                                                              | Focused verification                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| T01 | Establish CONTRIBUTING.md, AGENTS.md, README/CLAUDE pointers and SDD conventions                            | —          | AC7; source, approval and batch locations are unambiguous; supplied CodeGraph text preserved   | Resolve Markdown links; compare guidance to installed Agentic SDD policy                                            |
| T02 | Correct active setup/smoke documentation and add safe frontend environment example                          | T01        | AC7/AC8; correct fields/ports and explicit live model requirements                             | Compare docs to active routes/config through CodeGraph or uncovered-file reads; ensure placeholders only            |
| T03 | Declare compatible runtimes/tools and implement Makefile help/doctor/setup/dev targets                      | T02        | AC1; frozen setup with no paid or destructive side effects                                     | Clean checkout installation; lockfiles unchanged; make help/doctor on supported hosts                               |
| T04 | Expose service command scripts, build and lock validation targets                                           | T03        | AC2; read-only gates fail clearly for missing prerequisites                                    | Make dry-run plus actual build/lock check; inspect working tree for unintended mutation                             |
| T05 | Add Ruff and frontend static check configuration/scripts and fix bounded owned violations                   | T04        | AC2; scoped lint/format/typecheck pass with genuine failures detectable                        | Run gates; targeted temporary violation in disposable checkout fails                                                |
| T06 | Add Lefthook/Gitleaks config, hooks-install and generated/index ignore rules                                | T05        | AC5/AC8; staged-only non-mutating hooks and independent full-tree scan                         | Disposable staged valid/invalid files, synthetic secret detection and unstaged-file preservation                    |
| T07 | Add API test harness and minimal external-resource isolation seams if necessary                             | T05        | AC3; invalid type/image, oversized input, success and dependency failure tested                | pytest with absent cloud secrets; fail test on altered expected response; prohibit external model/provider requests |
| T08 | Add frontend state/client tests using Vitest                                                                | T05        | AC3; reset/navigation and success/error contracts asserted                                     | Unit tests offline after dependency installation; targeted changed behavior fails                                   |
| T09 | Add mocked Playwright photo journey, synthetic fixture and explicit browser setup                           | T07, T08   | AC4; representative interaction and result verified without live services                      | Run journey; targeted broken interaction fails; no live Cloudinary/Gradio calls                                     |
| T10 | Complete test/e2e/verify targets and contributor test guidance                                              | T06, T09   | AC2–AC5; commands and prerequisites match implemented behavior                                 | make verify and make test-e2e; confirm read-only source behavior                                                    |
| T11 | Add SHA-pinned GitHub Actions jobs calling Makefile gates with frozen installs and current-tree secret scan | T10        | AC6; fork-safe events, minimum permissions, timeouts and explicit caches                       | Validate YAML/workflows with actionlint; verify action commits/tool checksums; inspect event and permission paths   |
| T12 | Validate fresh-checkout Linux workflow and macOS smoke; finalize contributor maintenance/PR guidance        | T11        | AC1–AC9; evidence and job names are accurate; branch protection is a documented recommendation | make verify, make build, make test-e2e; frozen-lock diff; documentation link/command check                          |

## Execution batches

| Batch | Tasks   | Outcome and completion conditions                                                                                 | Required verification                                            | State    | Next action                      |
| ----- | ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------- | -------------------------------- |
| B1    | T01–T02 | Contributors/agents can identify active services, canonical sources and correct setup; documentation-only changes | Links, Agentic SDD conventions, active route/config comparison   | Reviewed | Completed; B2 authorized         |
| B2    | T03–T04 | Portable Makefile and frozen reproducible setup/build entry points work                                           | Fresh setup, unchanged locks, help/doctor, frontend build        | Reviewed | Completed; B3 authorized         |
| B3    | T05–T06 | Static gates and staged hooks pass; disposable violations fail without rewriting files                            | Lint/format/typecheck, hook and secret-scan controls             | Reviewed | Completed; B4 authorized         |
| B4    | T07–T10 | Meaningful service/browser tests and aggregate verification run without external resources                        | Unit/API/browser tests, targeted negative controls, make verify  | Reviewed | Completed; B5 authorized         |
| B5    | T11–T12 | CI defines the same checks and fresh-checkout evidence supports documented workflow                               | actionlint, immutable pin checks, Linux gates, macOS smoke, docs | Reviewed | Complete; commit/push authorized |

Every implemented batch ends with recorded evidence and **awaiting human review**.
Passing checks never starts another batch. If fixing inherited violations or
introducing API test seams materially changes scope/design, reconcile the
three documents and request review of the affected change before proceeding.

## Acceptance coverage

AC1: T03/T04/T12. AC2: T04/T05/T10/T12. AC3: T07/T08.
AC4: T09. AC5: T06/T10. AC6: T11/T12. AC7: T01/T02/T12.
AC8: T02/T06. AC9: T12 and the evidence recorded at each batch boundary.

## Verification ledger

Drafting evidence only: baseline main 049f355; inspected package/lock metadata,
active documentation/config/API validation and existing model-load smoke script.
Agentic SDD router selected the combined-approval checkpoint after spec/plan/tasks
drafting. The subsequent user message “i approve all” approved R1 and authorized B1. Exa and Context7 validated CI
security and uv lock/sync decisions (sources in plan.md). Used CodeGraph MCP in the assessment; active API coverage was incomplete and
those files were inspected directly. Application tests and future gates have
not been run or implemented. No hosted workflow success is claimed.

For each completed batch, record: commit/revision and uncommitted diff identity,
changed paths, tool versions, commands, exit outcomes, omissions, acceptance
criteria covered, and deviations. Summarize ordinary results here; link CI
runs/artifacts when they actually exist. Avoid secret values in evidence.

## B1 verification and review

Baseline: f91febe9dc6b8caee3aadc0f4aa66fc007a6dc64 (the repository advanced
with user commits after drafting). Implementation: working-tree B1 documentation
changes and frontend environment template; no application code/dependencies changed.

Changed paths: AGENTS.md, CONTRIBUTING.md, README.md, CLAUDE.md,
docs/PROJECT_SPEC.md, docs/ROADMAP.md, garment-processing-api/README.md,
web-frontend/README.md, web-frontend/.env.example, web-frontend/.gitignore,
and spec.md/tasks.md approval and continuation records.

Scope adjustment: the frontend's existing .env\* ignore rule hid the new safe
template. Added only !.env.example so T02's template can be committed; private
.env.local remains ignored. Other generated/index ignore changes stay in B3.

Verified: local documentation links, preserved supplied CodeGraph guidance,
Agentic SDD approval/batch conventions, Python AST route fields and query/form
binding, local frontend base, safe public template and Git ignore behavior.
git diff --check passes. Evidence was produced with Python 3.12.0 against the
B1 working tree; verification commands were local static checks, not live calls.
Application tests, dependency setup, hosted CI and real inference were not run
because B1 changes documentation/environment guidance only.

Contract finding for B4: the frontend currently appends inference options as
multipart fields, while active API scalar options bind as query parameters.
Documentation now reflects the API behavior; tests should expose this mismatch.
Any public contract redesign needs review rather than an implicit B1 code fix.

Verification content SHA256 (the named B1 paths excluding this ledger):
`b85f29ab394f68213dd597a71de674ca501d681578d43852fff99c026d2fdb77`.

Technical review verdict: Ready for B1 human review. T01/T02 complete; AC7 and
AC8 documentation portions delivered. The remaining commands, hooks, tests,
ignore rules and CI acceptance portions belong to subsequent batches.

## B2 verification and review

Authorization: user message “go ahead”, following B1 completion and B2 request.
Additional authorized correction: remove personal source details from ROADMAP.md.
Baseline commit: f91febe9dc6b8caee3aadc0f4aa66fc007a6dc64 plus the reviewed B1 diff.

Implemented: root Makefile with dependency-free help, doctor, frozen setup,
per-service setup/dev, build and offline lock targets; .nvmrc/.python-version;
shared tool declarations; Bash 3.2-compatible prerequisite and frontend lock
scripts. Contributor/agent/root guidance now identifies B2 commands as available.
Roadmap now states architecture direction without personal title/location or
conversation provenance. No application behavior or dependency locks changed.

Verification on macOS ARM using system GNU Make 3.81, Node 22.23.3,
pnpm 10.13.1, uv 0.11.1 and uv-provisioned Python 3.11.15:

- bash -n passed for both helper scripts; make dry-runs show explicit installs
  only in setup and --no-sync for API development.
- make help passed on a PATH containing only system binaries (no Node/pnpm/uv).
- Wrong Node major and wrong pnpm version were rejected with actionable errors;
  package-manager auto-download is disabled during version inspection.
- make setup passed in a fresh staged source copy with no dependencies or
  private environment files; Python was provisioned explicitly by setup-api.
  Dependency installation downloaded packages, not model weights.
- make doctor and make lock-check passed in staging. An outdated frontend
  specifier failed frozen/offline lock checking; an impossible API dependency
  failed offline without modifying uv.lock. A missing-dependency build failed
  with setup guidance and installed nothing.
- make build passed with native Next.js lint and type checks enabled. It emitted
  eight existing unused-variable warnings in GarmentOverlay, pose-utils and
  gradioApi; these remain visible for B3. An initial sandbox run could not
  resolve Google Fonts; rerunning with network approval completed normally.
- Both source/staging lockfiles remained byte-identical after setup/build/checks.
- 45 local Markdown links resolved; roadmap privacy check and git diff --check
  passed. No hosted CI, Linux execution, model inference or deployment claimed.

Existing build network dependency (uncached Google Fonts) is documented; no
lint/type gate was disabled. Runtime setup was validated in staging rather than
changing the contributor's default Node/pnpm or installing workspace environments.
Linux fresh-checkout execution remains the explicit B5 verification gate.

Lock SHA256 values:

- web-frontend/pnpm-lock.yaml: 419cc8ba7bb67558b848eea8dd35a2e6482f0f5effb68a3a034c58c7a5b35f53
- garment-processing-api/uv.lock: 725c4230904b763ab6f88a9f488d7015d990c3e526eec6830174bb69e5175d8c

B2 verification content SHA256 (Makefile, runtime declarations/scripts and
updated contributor/agent/root/roadmap/plan documents, excluding this ledger):
`80c1fe8af5f0cd5198b301ce5ca100aa6c1c5f70e989d795a3604fbcc215bae3`.

Technical review verdict: Ready for B2 human review. T03/T04 complete. AC1 and
B2 build/lock portions of AC2 verified; later static/test/hook/CI gates remain
T05–T12. No material design departure or new approval flag.

## B3 verification and review

Authorization: user message “proceed” after B2 completion. T05/T06 delivered:
strict ESLint, scoped Prettier and Ruff, TypeScript checks, explicit formatting,
Lefthook index checks, redacted Gitleaks scanning and generated-data ignores.
Ruff 0.16.9 is the only new API development dependency; runtime dependencies
and the frontend lock are unchanged. Owned code was formatted and unused
imports, variables and uncalled Gradio helpers were removed.

Verified with the pinned B2 runtimes, Lefthook 2.1.15 and Gitleaks 8.30.1:

- make lint format-check typecheck lock-check passed; ESLint has zero warnings.
- make build passed with Next.js lint and type gates enabled. Next.js warns
  about an unrelated parent package-lock.json when inferring its workspace.
- Current tracked-tree secret scan passed after removing a legacy documentation
  badge query token and replacing a sample basic-auth placeholder with environment
  references. No history scan or credential rotation is claimed.
- Disposable installed-hook controls check valid staged TypeScript/Python despite
  invalid unstaged text, reject formatting/lint violations and a synthetic token,
  redact scanner output, and preserve the index and working files.
- Pinned Lefthook source inspection established that --no-stage-fixed also disables
  implicit stashing. The committed executable wrapper supplies this flag to the
  installed hook; stage_fixed: false alone does not disable stashing in 2.1.15.

Hook installation is verified in a disposable repository. Main repository hooks
and index were not changed. Local dependencies were installed for verification;
no model weights or hosted inference calls were required. Existing concurrent
user documentation edits were preserved. B4/B5 have not started.

Technical verdict: Ready for B3 human review, with AC5/AC8 hook/ignore portions
and T05 static checks delivered. Test and CI acceptance remains T07–T12.

## B4 verification and review

Authorization: user message “approve” after B3 completion. Baseline remains
f91febe9dc6b8caee3aadc0f4aa66fc007a6dc64 plus reviewed B1–B3 changes.
T07–T10 delivered: pytest route isolation, Vitest state/client tests, Playwright
photo journey, explicit browser-install and test/test-e2e/verify Makefile targets.

API tests execute real routes and normal startup with the model loader replaced.
They use generated PNG bytes, mock classifier/Cloudinary/rembg/Gradio boundaries,
clear private provider environment variables and reject outbound socket connects.
Pytest collects tests/unit only; the existing TensorFlow validation script is
an explicit live operation. Background-removal tooling now imports at first use,
preserving the production function while avoiding heavyweight test imports.

The existing API query contract is preserved. A bounded frontend correction
moves inference options and process_garment to query parameters; files and
cloth_type stay multipart. API and client tests assert custom values are carried
through. No inference defaults, runtime dependency declarations or public API
shape changed. No additional approval flag or material design departure.

Test tools: Vitest 5.0.3, Playwright 1.63.0/its Chromium, pytest 9.1.1 and
HTTPX 0.28.1 (already present transitively, now explicit in the dev group).
Frontend Node types move to 22.20.4 for Vitest compatibility. Both locks include
only test tooling additions and their dependency/peer graph changes. The runtime
checker now rejects Node 22 patches below 22.12, as required by Vitest's engine
metadata; reference Node 22.23.3 remains unchanged.

Verification with macOS ARM, Node 22.23.3, pnpm 10.13.1, Python 3.11.15,
uv 0.11.1 and Gitleaks 8.30.1:

- make verify passed: lint, owned format checks, TypeScript, both lock freshness
  checks, 9 frontend tests, 12 API tests and tracked-tree secret scan.
- make test-e2e passed: one Chromium photo journey uploads synthetic images,
  checks classification/file field contracts, generates a result and opens the
  result viewer with its download affordance. It asserts one generation request
  and zero unexpected browser requests; external traffic is blocked. Initial
  mode is photo via normal persisted preferences, avoiding unrelated AR CDN use.
- A disposable provider-503 response fails the browser result assertion.
  Disposable incorrect classification and reset-navigation expectations fail
  the API and store tests, respectively. These controls leave source tests intact.
- make build passed with all Next.js lint/type gates enabled and 12 static pages.
- The final make verify/test-e2e run preserved the SHA256 of owned B4 source,
  lock/config/helper/contributor files:
  a29614bde5332ecbc245db04cd767f1b622fe995ddfd0ee0dbac7c1aebd46d61.
- make help works with only system PATH; bash syntax and git diff --check passed.
  Both services' runtime dependency declarations match HEAD.

Limitations: actual image saving is not asserted; the current UI opens a viewer
with a download button. Mocked results do not verify inference quality or hosted
providers. No Linux/hosted CI claimed. FastAPI startup-event and Starlette HTTPX
integration deprecation warnings remain visible, along with the existing Next.js
parent-lockfile warning. Node/pnpm defaults and main Git index/hooks were not
changed; no commit or publication was performed. B5 has not started.

Technical verdict: Ready for B4 human review. AC3/AC4 and the test/aggregate
portions of AC2/AC5 delivered; CI/fresh-Linux verification remains T11/T12.

## B5 verification and review

Authorization: user message “approved” after B4 completion. Baseline main
commit remains f91febe9dc6b8caee3aadc0f4aa66fc007a6dc64 plus reviewed B1–B4 work.
T11/T12 delivered: Engineering foundation GitHub Actions workflow, shared-version
outputs, explicit checksum-verified CI tool installation, workflow-check target,
workflow formatting coverage and contributor CI/maintenance/branch guidance.
T11 uses the assigned github-actions-templates guidance; the existing
bash-defensive-patterns guidance also applies to its new shell helpers.

The sole job **Foundation checks** runs on ubuntu-24.04 for pull_request and
main pushes, with contents:read, a 35-minute timeout and cancellation by ref.
Checkout disables persistent credentials and model LFS downloads. The workflow
calls make workflow-check, setup, verify, build and test-e2e, with a separate
explicit Chromium/system-library installation. No secrets, deployment or write
permissions. Only pnpm downloads and pruned uv downloads are cached; no workspace
environments, credentials, models or application build outputs are cached.

All external action commits were resolved from official release metadata:

- actions/checkout v7.0.1: 3d3c42e5aac5ba805825da76410c181273ba90b1
- actions/setup-node v7.0.0: 820762786026740c76f36085b0efc47a31fe5020
- actions/cache v6.1.0: 55cc8345863c7cc4c66a329aec7e433d2d1c52a9
- astral-sh/setup-uv v10.2.0: c18668ad3cf93ea998bef934396af7bb5c839dc7

Official release archive SHA256 values for actionlint 1.7.12 and Gitleaks 8.30.1
are committed in scripts/tool-checksums.txt. Both installers passed on macOS
ARM64 and Ubuntu x64. A corrupted disposable archive was rejected before any
executable extraction/installation. actionlint rejects a disposable invalid
expression. Static workflow inspection confirms event, token, timeout, cache
scope, immutable pins, blank public provider settings and Makefile delegation.
ShellCheck and Bash syntax checks passed for the new shell helpers.

Fresh Linux verification used Ubuntu 24.04 x64 in an isolated local container:
image digest sha256:008173c23f95b170204355c12626cb5a965d779a7e1283b09e9cffbb1bf33ca3.
A Git checkout of the approved working-source snapshot was created without
private environments, node_modules, .venv, generated caches or restored model
weights. Snapshot commit: 56621b84338f7d1a61f871181754a088bef74fb8
(a disposable local verification commit; the main index was not staged).

- Node 22.23.3 and uv 0.11.1 archives were verified with official SHA256 metadata;
  pnpm 10.13.1 and uv-provisioned Python 3.11.15 were used.
- Fresh make setup passed with both frozen locks. CPU service dependencies were
  installed, but no model restoration or hosted inference was performed.
- make workflow-check and make verify passed: lint, owned formatting, TypeScript,
  offline lock freshness, 9 frontend tests, 12 API tests and current-tree scan.
  The snapshot includes authored files as tracked inputs, so new workflow/tests
  were also covered by the full-tree secret scan.
- make build passed with all normal Next.js lint/type gates and 12 static pages.
- After explicit Chromium/Linux-library installation, make test-e2e passed:
  one mocked photo upload/classification/generation/result-viewer journey.
- git diff --exit-code passed after all Linux gates: tracked source and locks
  remained unchanged. An initial snapshot contained an unformatted tasks ledger;
  it failed correctly, was corrected, and a new clean checkout passed all gates.
- macOS make verify and make workflow-check passed with the pinned B2/B4 runtimes.
  B4 macOS build/browser evidence remains applicable: application/test dependency
  and browser configuration inputs are unchanged by B5.
- make help remains dependency-free; 46 local documentation links resolved and
  git diff --check passed. No existing user draft files were copied/staged in main.

B5 source/config/contributor fingerprint matches the passing Linux snapshot:
b3e16e041701883194f9b687db8d9d259bea2d14a098c4c7ab5695e4f2ca5abb.
This excludes the post-verification task/plan/roadmap evidence updates, which
receive their own formatting/link checks.

Limitations: this executes the workflow's commands in local Ubuntu, not hosted
GitHub action/caching lifecycle code. Hosted PR jobs have not run; remote branch
protection has not been changed. Confirm **Foundation checks** on an actual PR
before requiring it. Existing FastAPI/Starlette deprecation warnings remain
visible. No publication, merge, deployment or main-repository commit is claimed.

Technical verdict: Ready for B5/final human review. T11/T12 complete; the approved
engineering foundation's AC1–AC9 implementation/verification is delivered, with
hosted execution and remote settings explicitly left to publication/administration.

## Publication verification correction

The full staged publication gate exposed two helper discrepancies: direct Node
ESLint execution omitted pnpm's plugin module environment, and Ruff stdin checks
for root scripts discovered default formatting rather than API configuration.
The helper now runs pnpm exec eslint and passes the API Ruff configuration
explicitly for staged Python lint/format. Application and browser inputs remain
unchanged. Focused Ruff lint/format and all seven disposable partially staged hook
controls passed without NODE_PATH overrides before publication; the earlier B5 snapshot fingerprint is historical.
Four concurrent API documentation formatting edits are excluded from publication.

## Continuation state

B5 final review/publication authorization: user message “commit and push” after
B5 completion. B1–B5 are reviewed and complete. Commit/push of the engineering
foundation to the current main branch is authorized; remote administration and
deployment remain separate. Combined R1 approval remains in spec.md.
