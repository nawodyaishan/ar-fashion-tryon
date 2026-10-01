# Repository Agent Guidance

## Canonical sources

- [Project specification](docs/PROJECT_SPEC.md): product intent and active architecture.
- [Roadmap](docs/ROADMAP.md): ordered engineering/platform outcomes and feature index.
- [Contributor guide](CONTRIBUTING.md): setup, commands and verification status.
- [Engineering foundation](specs/001-engineering-foundation/spec.md): selected feature.

Active services: web-frontend (Next.js), garment-processing-api (FastAPI), and
catvton-gradio (CatVTON inference). Use pnpm for the frontend and uv for the API.
Preserve their lockfiles; do not introduce an API requirements.txt.
Deprecated backends and vendored model dependencies are outside ordinary active
application work. Preserve unrelated user changes and local files.

## Agentic SDD

Use the installed agentic-sdd-router skill when starting or resuming feature
work. Read the relevant canonical sections and current feature state first.
Use specs/<number>-<feature>/spec.md, plan.md and tasks.md for one coherent
feature. Draft them in order and obtain one combined human approval.
The sole approval record lives in spec.md; plan.md and tasks.md reference it.
Record the actual human message and the revisions/scope it covers.

Execute one authorized batch, verify it, record awaiting human review and the
next action in tasks.md, then stop for review. Approval and passing tests do
not automatically authorize another batch. A clearly bounded direct fix can
use the direct-fix path without feature documents. Review-only requests return
findings without edits. Cloud deployment, publication and remote administration
require their own authorization.

The engineering foundation uses Makefile only. Use make help to discover implemented targets and
CONTRIBUTING.md for their prerequisites. Do not claim planned checks exist
before their batch delivers them. Never hide model downloads, hosted inference or credential
setup inside routine checks. Exa and Context7 are available for concrete
research/documentation questions; prefer primary sources and record evidence.

<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.

<!-- CODEGRAPH_END -->
