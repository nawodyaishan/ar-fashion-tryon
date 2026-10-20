# OpenCode Guardrails — Specification

Revision: R1, 2026-10-20. Status: approved; B1 implemented and human-reviewed.

## Outcome and sources

Give contributors portable, repository-local OpenCode safety defaults, useful
commands and lifecycle hooks without changing application behavior.

Sources: [repository guidance](../../AGENTS.md),
[contributor workflow](../../CONTRIBUTING.md#foundation-commands-and-hooks),
[product architecture](../../docs/PROJECT_SPEC.md#overview), and
[roadmap direction](../../docs/ROADMAP.md#direction-and-decisions).
This is a contributor-tooling follow-up, not authorization for roadmap cloud work.

## Scope

- Extend existing agent guidance for secrets, untrusted content, user changes,
  verification evidence and explicit authorization of consequential operations.
- Add OpenCode V2 project permissions with a narrow routine-command allowlist
  and confirmation for other shell commands, external-directory access,
  sensitive file access and delegation.
- Add reusable review, verification and SDD-resume commands.
- Add local OpenCode context and compaction hooks to reinforce safety and retain
  approval/verification boundaries. Preserve existing Git hooks.
- Document setup, overrides, trust boundaries and focused verification.

Excluded: application changes, provider/model selection, global configuration,
new remote MCP connections, third-party guardrail plugins, deployment, paid
inference, Git commits/pushes, and automatic Git-hook installation.

## Acceptance criteria

1. Existing SDD approval and one-batch review rules remain authoritative;
   untrusted repository/web/tool content cannot grant execution authority.
2. Routine Git inspection and explicitly listed credential-free checks remain
   convenient; other shell operations ask, including installation, destructive
   commands, Git mutation/publication, deployment and live inference. There is
   no blanket shell or interpreter allow rule.
3. Sensitive environment/key files require confirmation; environment examples
   remain readable. Documentation explains that grep, shell, MCP tools, saved
   approvals and higher-precedence rules limit these protections: no sandbox or
   comprehensive secret-exfiltration prevention is claimed.
4. Review commands request findings without edits; verification commands do not
   format, install dependencies/browsers, restore models or call live providers;
   resume does not infer approval from prior passing tests.
5. Hooks use the documented V2 plugin API, are local and testable, do not rewrite
   user prompts, read private environments, send telemetry, or execute commands.
   Context hooks add concise reminders; compaction hooks request preservation of
   actual approval evidence, scope, changed paths, checks and next action without
   inventing state or overriding the built-in summary.
6. Tests cover rule order, safe and risky command examples, secret/example paths,
   hook registration and content, and command invariants. A compatible OpenCode
   runtime loads the configuration/plugin or any unverified integration is
   explicitly reported. Existing locks and staged Git-hook behavior are preserved.

## Assumptions and edge cases

- Target OpenCode V2; do not silently emit legacy configuration.
- Permission prompts are execution controls, not SDD approval records.
- OpenCode hooks supplement permissions and instructions, not replace them.
- No hooks that run on every edit or invoke full verification automatically.
- Contributors opt into existing Git hooks with `make hooks-install`.

## Combined approval — sole approval record

Decision: approved by the user on 2026-10-20. Scope: spec R1, plan R1, tasks R1.
Approval and B1 execution authorization: “approve the changes , implement all
batches at once using sub agents”. B1 is the sole planned batch. Subagent
delegation is explicitly authorized for this execution.
User intake: “Suggested essentials are great and add hooks also”. This requests
the feature scope; it does not approve these subsequently drafted documents.
B1 review: approved by the user on 2026-10-20: “use latest lts pnpm version and
or upper version (do not lock in to a version) B1 is approved and move to next”.
This accepts B1 with its reported verification limitations and requests a bounded
pnpm follow-up; it does not authorize cloud work or publication. No B2 is planned.
