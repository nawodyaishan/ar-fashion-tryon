# Engineering Foundation — Tasks and Batches

Revision: R1, 2026-10-01. Inputs: [spec R1](spec.md), [plan R1](plan.md).
Approval reference: [sole approval record](spec.md#combined-approval--sole-approval-record).
Specialist/tool assignments are defined once in plan.md; no task exceptions.

## Ordered tasks

All tasks are pending. Dependencies identify implementation order; all changes
must stay within the spec and preserve existing untracked user work.

| ID | Objective and likely paths | Depends on | Acceptance result | Focused verification |
| --- | --- | --- | --- | --- |
| T01 | Establish CONTRIBUTING.md, AGENTS.md, README/CLAUDE pointers and SDD conventions | — | AC7; source, approval and batch locations are unambiguous; supplied CodeGraph text preserved | Resolve Markdown links; compare guidance to installed Agentic SDD policy |
| T02 | Correct active setup/smoke documentation and add safe frontend environment example | T01 | AC7/AC8; correct fields/ports and explicit live model requirements | Compare docs to active routes/config through CodeGraph or uncovered-file reads; ensure placeholders only |
| T03 | Declare compatible runtimes/tools and implement Makefile help/doctor/setup/dev targets | T02 | AC1; frozen setup with no paid or destructive side effects | Clean checkout installation; lockfiles unchanged; make help/doctor on supported hosts |
| T04 | Expose service command scripts, build and lock validation targets | T03 | AC2; read-only gates fail clearly for missing prerequisites | Make dry-run plus actual build/lock check; inspect working tree for unintended mutation |
| T05 | Add Ruff and frontend static check configuration/scripts and fix bounded owned violations | T04 | AC2; scoped lint/format/typecheck pass with genuine failures detectable | Run gates; targeted temporary violation in disposable checkout fails |
| T06 | Add Lefthook/Gitleaks config, hooks-install and generated/index ignore rules | T05 | AC5/AC8; staged-only non-mutating hooks and independent full-tree scan | Disposable staged valid/invalid files, synthetic secret detection and unstaged-file preservation |
| T07 | Add API test harness and minimal external-resource isolation seams if necessary | T05 | AC3; invalid type/image, oversized input, success and dependency failure tested | pytest with absent cloud secrets; fail test on altered expected response; prohibit external model/provider requests |
| T08 | Add frontend state/client tests using Vitest | T05 | AC3; reset/navigation and success/error contracts asserted | Unit tests offline after dependency installation; targeted changed behavior fails |
| T09 | Add mocked Playwright photo journey, synthetic fixture and explicit browser setup | T07, T08 | AC4; representative interaction and result verified without live services | Run journey; targeted broken interaction fails; no live Cloudinary/Gradio calls |
| T10 | Complete test/e2e/verify targets and contributor test guidance | T06, T09 | AC2–AC5; commands and prerequisites match implemented behavior | make verify and make test-e2e; confirm read-only source behavior |
| T11 | Add SHA-pinned GitHub Actions jobs calling Makefile gates with frozen installs and current-tree secret scan | T10 | AC6; fork-safe events, minimum permissions, timeouts and explicit caches | Validate YAML/workflows with actionlint; verify action commits/tool checksums; inspect event and permission paths |
| T12 | Validate fresh-checkout Linux workflow and macOS smoke; finalize contributor maintenance/PR guidance | T11 | AC1–AC9; evidence and job names are accurate; branch protection is a documented recommendation | make verify, make build, make test-e2e; frozen-lock diff; documentation link/command check |

## Execution batches

| Batch | Tasks | Outcome and completion conditions | Required verification | State | Next action |
| --- | --- | --- | --- | --- | --- |
| B1 | T01–T02 | Contributors/agents can identify active services, canonical sources and correct setup; documentation-only changes | Links, Agentic SDD conventions, active route/config comparison | Not started | After combined approval and authorization, implement B1 |
| B2 | T03–T04 | Portable Makefile and frozen reproducible setup/build entry points work | Fresh setup, unchanged locks, help/doctor, frontend build | Not started | Wait for B1 review and B2 authorization |
| B3 | T05–T06 | Static gates and staged hooks pass; disposable violations fail without rewriting files | Lint/format/typecheck, hook and secret-scan controls | Not started | Wait for B2 review and B3 authorization |
| B4 | T07–T10 | Meaningful service/browser tests and aggregate verification run without external resources | Unit/API/browser tests, targeted negative controls, make verify | Not started | Wait for B3 review and B4 authorization |
| B5 | T11–T12 | CI defines the same checks and fresh-checkout evidence supports documented workflow | actionlint, immutable pin checks, Linux gates, macOS smoke, docs | Not started | Wait for B4 review and B5 authorization |

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
drafting; no implementation batch is authorized. Exa and Context7 validated CI
security and uv lock/sync decisions (sources in plan.md). Used CodeGraph MCP in the assessment; active API coverage was incomplete and
those files were inspected directly. Application tests and future gates have
not been run or implemented. No hosted workflow success is claimed.

For each completed batch, record: commit/revision and uncommitted diff identity,
changed paths, tool versions, commands, exit outcomes, omissions, acceptance
criteria covered, and deviations. Summarize ordinary results here; link CI
runs/artifacts when they actually exist. Avoid secret values in evidence.

## Continuation state

Current state: awaiting combined human approval of spec R1, plan R1, tasks R1
and roadmap R1. Current batch: none executing. First eligible batch: B1.
Current tasks: T01/T02 pending. Approval is recorded only in spec.md.
Changed paths in this drafting turn: docs/ROADMAP.md and this feature's three
Markdown documents. No implementation, hooks, dependencies or remote settings
have been changed as part of this draft.
Next action: user reviews the complete package; record their actual approval
and revisions in spec.md, then execute B1 only if authorized. Later stages
remain roadmap proposals and need their own feature drafting and approval.
