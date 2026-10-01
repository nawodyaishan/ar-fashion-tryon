# AR Fashion Try-On Frontend

The active Next.js application provides live AR and photo try-on workflows.
Use pnpm 10.13.1, as declared in package.json.

## Local setup

From this directory:

```bash
pnpm install --frozen-lockfile
[ -e .env.local ] || cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. The environment example points the active garment
and photo try-on client to FastAPI at http://127.0.0.1:5000. That API owns
Cloudinary credentials and the hosted CatVTON connection. Port 7860 belongs to
a separately configured local Gradio service; it is not the active HTTP API.

Optional browser Cloudinary uploads use public cloud-name/upload-preset values.
Leave both empty for direct API uploads. Never place private API keys or HF
tokens in NEXT_PUBLIC_ variables. Legacy clients remain in the codebase and are
identified separately in .env.example; their endpoints are not active API routes.

## Current commands

```bash
pnpm lint
pnpm build
pnpm start
```

pnpm format writes source files. Repository Makefile, hooks and isolated tests
are implemented in the [engineering foundation](../specs/001-engineering-foundation/tasks.md).
See [CONTRIBUTING.md](../CONTRIBUTING.md) for current prerequisites, checks,
Agentic SDD workflow and the availability of planned commands.
