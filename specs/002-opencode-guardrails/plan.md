# OpenCode Guardrails — Plan

Revision: R1, 2026-10-20. Input: [spec R1](spec.md).
Approval: [sole record](spec.md#combined-approval--sole-approval-record).

## Design

1. Add root `opencode.json` using the published schema and V2 `permissions`
   array. Set shell to ask by default; allow only Git status/diff/log inspection
   and exact credential-free Makefile checks confirmed against current targets.
   Do not allow `make *`, arbitrary scripts/interpreters or package managers.
   Later rules ask for sensitive file reads/edits and allow example files;
   external access and subagents ask. Keep ordinary source edits usable.
2. Define `repo-review`, `repo-verify`, and `repo-resume` in the configuration's
   `commands` map, avoiding new agents, model pins or command-shell interpolation.
3. Add one local `.opencode/plugins/repo-guardrails/index.ts` plugin using
   `Plugin.define` from `@opencode/plugin`. Register `session.hook("context")`
   and `session.hook("compaction")`. Append brief system reminders only; leave
   transcript, summary result, tool permissions and user prompts unchanged.
   Establish the supported runtime/package resolution through local inspection
   before selecting any plugin dependency declaration; never use an unpinned
   third-party guardrails package or alter application lockfiles.
4. Extend `AGENTS.md` instead of copying it into parallel rule files. Add an
   OpenCode section to `CONTRIBUTING.md`, including lifecycle-versus-Git hooks,
   permission precedence, saved approvals and limits. Link this feature from
   the existing roadmap feature index without reordering platform stages.
5. Add focused dependency-light tests for config/command invariants and hook
   callbacks; expose them through a Makefile target in keeping with repository
   conventions. No automatic check/format/install hook and no Git-hook changes
   unless needed solely to include the newly owned configuration in check scope.

## Verification and risks

- Write failing focused tests before implementation, then test representative
  safe/risky commands and environment/example paths with documented whole-value,
  last-match semantics. Distinguish this model from actual runtime enforcement.
- Capture hook registrations with a test context and exercise both callbacks;
  ensure no command execution, network calls or summary replacement.
- Check actual OpenCode version and available validation interfaces; perform a
  config/plugin-load smoke without model generation or provider inference.
  Report missing runtime verification rather than claiming success from JSON
  parsing or an emulated matcher alone.
- Run focused tests, affected formatting checks and `git diff --check`; run
  broader repository gates when their changed scope warrants them. Preserve
  unrelated work, existing locks and non-mutating Lefthook behavior.
- Permissions are defense in depth. Shell command inference is best effort;
  global/agent rules and saved approvals may change effective access. Do not
  promise isolation or universal secret filtering. Avoid broad allow-always.
- Local plugins execute trusted host code. Keep this plugin small and inspectable;
  document rollback by removing its directory and project config additions.

## Specialist and tools

- Installed `opencode` skill: principal specialist for native V2 config/hooks.
- Installed `test-driven-development` skill: focused implementation test workflow.
- Installed SDD implementation/verification skills for execution and review.
- Built-in Read/Glob/Grep/Patch/Shell for local work; no CodeGraph index exists.
- Webfetch for primary V2 API documentation; Exa only for a concrete unresolved
  research question. No subagents or additional MCP installation needed.

## Primary references

Consulted 2026-10-20:

- https://opencode.ai/v2/docs/config
- https://opencode.ai/v2/docs/permissions
- https://opencode.ai/v2/docs/build/plugins (session context/compaction hooks)

## Delivery

One bounded implementation batch, followed by verification and human review.
No global configuration changes, Git publication or live operations.
