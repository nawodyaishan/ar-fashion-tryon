# Contributing

Read [PROJECT_SPEC.md](docs/PROJECT_SPEC.md) for product behavior and
[ROADMAP.md](docs/ROADMAP.md) for planned work. The active runtime is Next.js
frontend → FastAPI garment API → CatVTON/Gradio, with the API using Cloudinary
for image storage. PostgreSQL/Redis in the current Compose file are supporting
experiments; Compose does not start the active application.

## Prerequisites and current setup

Use macOS or Linux, Git, Bash 3.2+, make, Node 22.12+ (reference .nvmrc), pnpm 10.13.1 and uv 0.11.1.
The pinned Node patch is in .nvmrc; shared tool declarations are in
scripts/tool-versions.env. Python 3.11 is declared in .python-version and
make setup-api provisions it through uv if needed. Linux will be the CI
reference platform. Setup compatibility has been exercised on macOS ARM;
Linux CI validation is delivered in B5.

Select the runtime and install package tooling explicitly (example with nvm):

```bash
nvm install
nvm use
npm install --global pnpm@10.13.1
# With an existing uv installation, select the pinned version explicitly:
uv self update 0.11.1
```

For a fresh uv installation or a package-manager-managed uv, use
[uv installation guidance](https://docs.astral.sh/uv/getting-started/installation/)
to install version 0.11.1; uv self update does not update every installation
method. Tool installation changes your environment and is separate from setup.

From the repository root:

```bash
make help
make doctor
make setup
```

make help lists every currently implemented target without application
dependencies. make setup uses pnpm --frozen-lockfile and uv sync --locked with
Python 3.11. Neither command rewrites dependency locks. setup-frontend and
setup-api can be run independently. doctor checks tool versions without
installing them or printing environment values. A different Node 22 patch is
accepted locally; .nvmrc declares the reproducible reference patch.

These commands install dependencies and may use the network. They do not
restore inference weights. Copy the environment examples only if the destination
does not exist:

```bash
[ -e web-frontend/.env.local ] || cp web-frontend/.env.example web-frontend/.env.local
[ -e garment-processing-api/.env ] || cp garment-processing-api/.env.example garment-processing-api/.env
```

The frontend example points to the local API on port 5000. Leave optional public
Cloudinary values empty for direct API upload, or use your own cloud name and
restricted unsigned upload preset to enable browser uploads. NEXT*PUBLIC* values
are browser-visible; keep Cloudinary API secrets and HF tokens in the API's
private environment. The API example contains placeholders that must be filled
for live upload/inference. Never commit local environment files or real photos.

Run the frontend:

```bash
make dev-frontend
```

Open http://localhost:3000. In another terminal, start the API when its live
prerequisites are ready:

```bash
make dev-api
```

Open http://localhost:5000/docs. The --env-file flag explicitly loads the local
API environment. A frontend-only start does not demonstrate working inference.

## Optional live model operations

Restore TensorFlow weights using the [API model guide](garment-processing-api/README.md#model-files)
when you intend to exercise classification. The downloader requires Bash 4+
(associative arrays), GNU timeout, unzip and curl. macOS system Bash 3.2 cannot
run it; install modern Bash/coreutils and ensure bash/timeout resolve to those
tools, or follow the guide's manual model restoration path.

Model restoration downloads large files. CatVTON inference additionally needs
the configured hosted Space or a separately configured local GPU service;
current API configuration selects the hosted Space. Simply running Gradio on
port 7860 does not redirect the API to it. Hosted calls may consume quotas or
incur provider charges. Review upstream model licenses for your intended use.

## Checks available now

Run the frontend checks with installed dependencies:

```bash
pnpm --dir web-frontend lint
make build
make lock-check
```

The frontend format command writes files; use it only when intending to format:

```bash
pnpm --dir web-frontend format
```

The existing model-loading smoke script requires restored weights and exercises
real TensorFlow; it is an optional live check, not the isolated test suite:

```bash
(cd garment-processing-api && uv run --no-sync python tests/test_model_load.py)
```

These are existing commands, not a claim that all checks pass on every checkout.
Record what you ran and any failures in your PR. The current Next.js build
fetches Geist fonts from Google on an uncached build, so make build needs network
access for those assets. It does not require cloud credentials or live inference.
Lock checks are offline: frontend validation runs in a disposable directory to
avoid rewriting source; API validation uses uv lock --check without syncing.

## Foundation commands and hooks

The [approved feature tasks](specs/001-engineering-foundation/tasks.md) track
availability. Makefile is the sole root command interface.

| Batch | Commands/checks added                                                                         |
| ----- | --------------------------------------------------------------------------------------------- |
| B2    | make help, doctor, setup, dev-frontend, dev-api, build and lock-check                         |
| B3    | make lint, format-check, typecheck, format and hooks-install; staged Lefthook/Gitleaks checks |
| B4    | make test, test-e2e and verify; isolated API/frontend tests and mocked browser journey        |
| B5    | GitHub Actions running the same checks, build and browser journey                             |

B2–B5 commands and workflow files are implemented;
make help lists only available targets.
make setup installs locked dependencies; browser binaries and hooks are explicit
installation steps. make verify checks source without formatting it. Routine
checks must not download model weights or make hosted inference requests.
CI validates the full owned scope even when a contributor skips local hooks.
Hook bypass does not waive required verification.

### Static checks and precommit setup

After make setup, run make lint format-check typecheck lock-check and
make secret-check. Use make format only when you intend to rewrite formatting.
Install Lefthook 2.1.15 and Gitleaks 8.30.1 from their official releases, put
both on PATH, then run make hooks-install. Ruff 0.16.9 is installed by setup-api
from the development dependency lock. Version requirements live in
scripts/tool-versions.env; installation fails clearly when tools are missing.

The installed hook checks staged text from the Git index, including partially
staged files. It does not format, stage, or stash changes. Run the installed hook
through Git or bash .git/hooks/pre-commit; a direct lefthook run pre-commit must
include --no-stage-fixed to disable that version's implicit stash behavior.
make check-staged provides the same checks directly. Generated data, vendor code
and deprecated runtimes are outside owned lint/format scope.

make secret-check scans current tracked UTF-8 text, with redacted output and
no baseline exemptions. Hooks scan staged text; neither scans Git history,
untracked files, binary models/images, private ignored environments or caches.
CI independently runs the current-tree check.

### Isolated tests and browser journey

Run make test for Vitest state/client tests and pytest API route tests. API tests
execute normal startup with the model loader replaced, use synthetic PNG data,
replace classifier/upload/background-removal/Gradio boundaries and reject
outbound socket connections. No private environment files are loaded. The
optional tests/test_model_load.py script remains a separate live model check;
pytest discovers tests/unit only.

Run make browser-install once to download the pinned Playwright Chromium binary,
then make test-e2e. Linux also needs Chromium system libraries; CI installs them
explicitly with pnpm exec playwright install --with-deps chromium. Test execution
does not install browsers. The test owns port 3100 and will refuse an existing
server. It supplies local API URLs, blank Cloudinary public settings and mocked
responses; unexpected external browser requests are blocked. It exercises upload,
classification, generation and result viewer/download affordance without a camera or live provider.
The Next.js server may fetch Google Fonts on an uncached run, as build does.

make verify runs lint, format checks, type checking, lock freshness, isolated tests
and current tracked-tree secret scanning. Run make build and make test-e2e
separately for the complete local gate. Reports/traces and caches are ignored.
Mocked success validates orchestration, not inference quality or provider access.

### CI, workflow validation and tool maintenance

The [Engineering foundation workflow](.github/workflows/engineering-foundation.yml)
runs on pull requests and pushes to main. Its job is **Foundation checks** on
Ubuntu 24.04, with a 35-minute timeout, concurrency cancellation and contents:read
permissions. It runs make workflow-check, setup, verify, build and test-e2e.
Browser system libraries/downloads are installed explicitly before the smoke.
No repository secrets or private model weights are needed. Hosted job execution
starts only after the workflow is committed/published; local validation is
recorded in the feature task ledger.

To install local workflow validators explicitly:

```bash
make ci-tools-install TOOLS_DIR=/absolute/path/to/foundation-tools
export PATH="/absolute/path/to/foundation-tools:$PATH"
make workflow-check
```

The installer verifies committed SHA256 values before extracting actionlint and
Gitleaks. It supports Linux x64/ARM64 and macOS ARM64; other machines can use
the official release instructions. Hooks additionally require Lefthook 2.1.15.
make workflow-check runs pinned actionlint and Bash syntax checks; actionlint
uses ShellCheck when it is available. Ubuntu runners include ShellCheck.

Maintain action references as complete commit SHAs, retaining release comments.
Verify each commit against its official release before replacing a pin. Keep
scripts/tool-versions.env, runtime files and dependency package/lock declarations
consistent; CI reads shared declarations instead of duplicating tool versions.
For a validation-tool upgrade, obtain the official archive checksums, update
scripts/tool-checksums.txt and test the explicit installer and workflow-check.
Cache only package downloads: pnpm store and pruned uv cache. Do not cache .env,
.venv, node_modules, .next, model weights or application build artifacts.

Recommended complete local review gate:

```bash
make workflow-check
make verify
make build
make test-e2e
```

## Work with Agentic SDD

[Agentic SDD](https://github.com/nawodyaishan/agentic-sdd) installs a shared
workflow across supported coding agents. On a machine where you want it:

```bash
brew install nawodyaishan/tap/agentic-sdd
agentic-sdd preview
agentic-sdd apply
```

apply updates client skill directories and backs up replaced skills; it is
separate from repository setup. For other platforms, use the upstream Go CLI
instructions. Newly installed skills are available on the next agent turn.

Start with agentic-sdd-router and a concrete request. For a feature, draft
spec.md, plan.md and tasks.md under specs/<number>-<feature>/, review them
together, and record one combined approval in spec.md. Authorize one batch,
verify it, and review its result before starting the next. Small understood
fixes can use the direct-fix path. Review-only work reports findings.

Example requests:

- “Use agentic-sdd-router to draft the next feature from the roadmap; stop for combined review.”
- “I approve these document revisions. Implement B1, verify it, and stop for review.”
- “Review this diff against the approved spec; report findings only.”

See [AGENTS.md](AGENTS.md) for canonical pointers and CodeGraph instructions.

## Pull requests and maintenance

Keep the diff scoped to the authorized feature/batch or direct fix. Explain the
behavior or workflow change, the relevant acceptance criteria, checks actually
run, and remaining limitations. Preserve unrelated local work. Add tests when
behavior changes; documentation-only batches need focused link/contract checks.
Record batch evidence and continuation state in the existing tasks.md.

Use synthetic fixtures instead of user images or credentials. Report suspected
secrets without reproducing their values in logs or PR text. Follow existing
pnpm/uv locks; explain intentional dependency changes.

Maintainers should require **Foundation checks** for PR merges and prevent
direct protected-branch pushes. Confirm the check appears on an actual PR before
selecting it in branch protection or repository rulesets. Those settings must be
configured deliberately; this guide does not claim they are already enabled.
Deployment, publication, merges and remote settings require separate authority.
