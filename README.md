# AR Fashion Try-On

[![Engineering foundation](https://github.com/nawodyaishan/ar-fashion-tryon/actions/workflows/engineering-foundation.yml/badge.svg?branch=main&event=push)](https://github.com/nawodyaishan/ar-fashion-tryon/actions/workflows/engineering-foundation.yml)

Preview clothing with live camera overlays or generate a photo try-on from person and garment images. The application combines a Next.js interface, a FastAPI garment-processing API, and CatVTON inference through a hosted Gradio service.

[Product specification](docs/PROJECT_SPEC.md) · [Contributor guide](CONTRIBUTING.md) · [Roadmap](docs/ROADMAP.md) · [Security reporting](SECURITY.md)

![Person photo and garment inputs with generated try-on results for normal, full outfit, and reference modes](docs/assets/try-on-modes.png)

<sub>Input pairs (top) and generated CatVTON results (bottom) for the three photo try-on modes.</sub>

## What you can do

| Experience           | Workflow                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Live AR preview**  | Use browser camera input and MediaPipe pose tracking to position, scale, and rotate garment overlays.       |
| **Normal mode**      | Upload a person and garment image, classify the garment, remove its background, and request a photo try-on. |
| **Full outfit mode** | Combine separate upper and lower garments, preview the constructed outfit, and generate a try-on.           |
| **Reference mode**   | Use a reference image with manual garment-type selection for an experimental photo workflow.                |

Photo workflows expose inference controls and a result viewer with download options. Live AR overlays and generated photo results are separate experiences; their behavior is detailed in the [product specification](docs/PROJECT_SPEC.md).

## Architecture

![AR Fashion Try-On system architecture: Next.js frontend, FastAPI backend on Railway, Cloudinary storage, and CatVTON inference on a Hugging Face GPU Space](docs/assets/architecture/ar_fashion_architecture.png)

The system has four layers: a **Next.js frontend** (with a client-side MediaPipe + Three.js AR preview), a **FastAPI backend** on Railway, **Cloudinary** for storage and delivery, and **CatVTON** inference on a Hugging Face GPU Space.

A photo try-on request follows the numbered steps in the diagram:

1. The shopper opens the Next.js app. AR mode stays in the browser: MediaPipe Pose landmarks drive a Three.js garment overlay.
2. The frontend uploads the person and garment images to Cloudinary.
3. The frontend calls the FastAPI gateway.
4. The API classifies the garment (TensorFlow CNN), removes its background (`rembg` / U²-Net), and stores the cutout.
5. For full outfits, OpenCV merges upper and lower cutouts and the API stores the outfit.
6. The try-on client calls the Gradio API `predict()` on the Hugging Face Space.
7. The Space fetches the inputs, runs DensePose + SCHP preprocessing, then CatVTON diffusion.
8. The result is uploaded to Cloudinary.
9. The frontend receives the result URL and displays it.

The diagram is generated from code with [`diagrams`](https://diagrams.mingrammer.com/); edit [`architecture.py`](docs/assets/architecture/architecture.py) and run `python architecture.py` from `docs/assets/architecture/` (requires Graphviz) to regenerate it.

| Component                | Location                                                      | Role                                                                                                         |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Frontend                 | [`web-frontend/`](web-frontend/README.md)                     | Next.js, TypeScript, and Tailwind UI; local development on port **3000**.                                    |
| Garment API              | [`garment-processing-api/`](garment-processing-api/README.md) | FastAPI orchestration, classification, cutouts, and outfit construction; local development on port **5000**. |
| Inference implementation | [`catvton-gradio/`](catvton-gradio/README.md)                 | CatVTON and Gradio model pipeline; requires separate GPU setup for local inference.                          |
| Image service            | Cloudinary                                                    | Uploads, persisted results, and image delivery.                                                              |

The API currently selects a hosted Hugging Face Space. Starting a local Gradio server does not automatically switch the API's provider. The root `docker-compose.yml` contains supporting PostgreSQL/Redis experiments and does not launch this application. Historical services live in [`deprecated-backends/`](deprecated-backends/README.md).

## Getting started

### 1. Select the tools

Use macOS or Linux with Git, Bash 3.2+, and make. The reproducible tool versions are:

| Tool    | Version                                                    |
| ------- | ---------------------------------------------------------- |
| Node.js | **22.23.3**, declared in [`.nvmrc`](.nvmrc)                |
| pnpm    | **10.13.1**                                                |
| Python  | **3.11**, declared in [`.python-version`](.python-version) |
| uv      | **0.11.1**                                                 |

See [CONTRIBUTING.md](CONTRIBUTING.md#prerequisites-and-current-setup) for installation instructions and [shared tool versions](scripts/tool-versions.env) for verification tooling. `make setup-api` provisions Python through uv when needed.

### 2. Install locked dependencies

From the repository root:

```bash
make help       # List all commands; no application dependencies required
make doctor     # Check installed tools
make setup      # Install frontend and API dependencies from their lockfiles
```

Setup uses frozen pnpm and uv locks. Model restoration, browser installation, and Git hook installation are explicit, separate steps.

Copy environment examples without overwriting existing configuration:

```bash
[ -e web-frontend/.env.local ] || cp web-frontend/.env.example web-frontend/.env.local
[ -e garment-processing-api/.env ] || cp garment-processing-api/.env.example garment-processing-api/.env
```

### 3. Start the application

```bash
make dev-frontend
```

Open **http://localhost:3000**. For live API operations, configure the API environment and restore the required TensorFlow weights using the [model guide](garment-processing-api/README.md#model-files). Then, in another terminal:

```bash
make dev-api
```

Interactive API documentation is available at **http://localhost:5000/docs**.

Live upload and inference require Cloudinary credentials and access to the configured CatVTON provider. The frontend can start before those are ready, but photo generation needs the live services. Keep credentials in private environment files; `NEXT_PUBLIC_` values are visible in the browser. See the contributor guide for model-download prerequisites and provider configuration.

## Engineering workflow

The root **Makefile** is the command interface for development and CI. Run `make help` to discover individual service commands and prerequisites.

| Command                | Purpose                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `make verify`          | Lint, formatting, TypeScript, lock freshness, isolated tests, and current tracked-text secret checks. |
| `make build`           | Build the frontend for production.                                                                    |
| `make browser-install` | Explicitly install Playwright Chromium.                                                               |
| `make test-e2e`        | Run the mocked photo journey with managed local servers.                                              |
| `make workflow-check`  | Validate GitHub Actions and workflow shell syntax.                                                    |
| `make hooks-install`   | Install Lefthook precommit checks after installing the required tools.                                |
| `make check-staged`    | Check staged content for secrets, whitespace, formatting, and lint.                                   |
| `make format`          | Explicitly rewrite owned source and configuration formatting.                                         |

After installing the verification tools described in [CONTRIBUTING.md](CONTRIBUTING.md), run:

```bash
make workflow-check
make verify
make build
make browser-install  # Once per browser installation; Linux also needs system libraries
make test-e2e
```

The [GitHub Actions workflow](.github/workflows/engineering-foundation.yml) runs equivalent checks, the build, and the browser journey. Hooks inspect staged content without formatting, staging, or stashing changes. Formatting and linting cover owned application and workflow code; vendored and deprecated runtimes have separate scope.

### What verification proves

Frontend state/client tests, API route tests, and the Chromium photo journey use synthetic inputs and replaced model/provider boundaries. They run without cloud credentials, inference weights, or hosted inference calls. Live model quality, camera behavior, and provider integration require separate validation.

Dependency installation and browser downloads need network access. An uncached frontend build also fetches Google Fonts. See the [foundation execution record](specs/001-engineering-foundation/tasks.md) for completed verification evidence.

## Contributing with Agentic SDD

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Coding agents should read [AGENTS.md](AGENTS.md) and use the **Agentic SDD router** to select the appropriate workflow:

1. Draft a feature's **specification, plan, and tasks** together.
2. Obtain one combined human approval before implementation.
3. Implement one authorized batch, verify it, and stop for review.
4. Use focused implementation and verification for clearly scoped direct fixes.

The workflow is defined by [Agentic SDD](https://github.com/nawodyaishan/agentic-sdd). In an indexed checkout, use **CodeGraph** first for code discovery, as directed in AGENTS.md.

## Roadmap and current scope

The engineering foundation is implemented and reviewed: reproducible setup, Makefile commands, contributor and agent guidance, staged checks, isolated tests, and CI.

The next proposed outcomes are:

1. Reproducible application containers and artifact supply-chain controls.
2. Headless asynchronous inference with measured GPU-provider tradeoffs.
3. Declarative infrastructure and GitOps.
4. Observability, reliability targets, and recovery evidence.
5. Reproducible portfolio demonstrations and model regression evidence.

These are future stages requiring their own feature review. Provider selection, cloud budget, and deployment dates remain undecided. Read the [canonical roadmap](docs/ROADMAP.md) for scope and completion criteria.

## Documentation

| Document                                                                     | Use it for                                                                    |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Product specification](docs/PROJECT_SPEC.md)                                | Detailed capabilities, architecture, and product workflows.                   |
| [Contributor guide](CONTRIBUTING.md)                                         | Tool installation, environments, verification, hooks, and contribution rules. |
| [Agent instructions](AGENTS.md)                                              | Repository guidance, SDD routing, and CodeGraph usage.                        |
| [API reference](garment-processing-api/docs/api/API_DOCUMENTATION.md)        | Routes and request/response contracts.                                        |
| [API deployment guide](garment-processing-api/docs/deployment/DEPLOYMENT.md) | Service-specific deployment guidance.                                         |
| [Engineering foundation](specs/001-engineering-foundation/spec.md)           | Approved foundation scope and acceptance criteria.                            |
| [Roadmap](docs/ROADMAP.md)                                                   | Ordered engineering and platform outcomes.                                    |

## License

Repository code is licensed under the [MIT License](LICENSE). Third-party models, weights, and datasets have their own terms; review their licenses before use or redistribution.
