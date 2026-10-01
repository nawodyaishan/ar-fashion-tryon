# AR Fashion Try-On

[![Engineering foundation](https://img.shields.io/github/actions/workflow/status/nawodyaishan/ar-fashion-tryon/engineering-foundation.yml?branch=main&event=push&label=CI&logo=githubactions&logoColor=white)](https://github.com/nawodyaishan/ar-fashion-tryon/actions/workflows/engineering-foundation.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Hugging Face Space](https://img.shields.io/badge/demo-Hugging%20Face%20Space-FFD21E?logo=huggingface&logoColor=black)](https://huggingface.co/spaces/nawodyaishan/ar-fashion-tryon)
[![Last commit](https://img.shields.io/github/last-commit/nawodyaishan/ar-fashion-tryon/main)](https://github.com/nawodyaishan/ar-fashion-tryon/commits/main)

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r178-000000?logo=threedotjs&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Pose-0097A7?logo=mediapipe&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-FF6F00?logo=tensorflow&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-CatVTON-EE4C2C?logo=pytorch&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?logo=cloudinary&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?logo=railway&logoColor=white)

Preview clothing with live camera overlays or generate a photo try-on from person and garment images. The application combines a Next.js interface, a FastAPI garment-processing API, and CatVTON inference through a hosted Gradio service.

[Product specification](docs/PROJECT_SPEC.md) · [Contributor guide](CONTRIBUTING.md) · [Roadmap](docs/ROADMAP.md) · [Security reporting](SECURITY.md)

## Architecture

![AR Fashion Try-On reference architecture: Next.js frontend, FastAPI microservices on Railway, Cloudinary storage and delivery, and CatVTON inference on a Hugging Face GPU Space](docs/assets/architecture.png)

The system has four layers:

- **Frontend (Next.js):** photo try-on in normal, full outfit, and reference modes, plus an on-device AR preview where MediaPipe Pose landmarks drive a Three.js garment overlay.
- **Backend (FastAPI on Railway):** a gateway in front of the garment classifier (TensorFlow CNN), garment extraction (U²-Net background removal), outfit constructor (OpenCV), and the Gradio try-on client.
- **Storage and delivery (Cloudinary):** `originals/`, `garments/`, `outfits/`, and `results/` folders served over the CDN.
- **AI inference (Hugging Face Space, GPU):** CatVTON pre-processing (DensePose and SCHP) followed by latent diffusion (VAE encode, UNet2D masked inpainting, VAE decode).

A photo try-on request follows the numbered steps in the diagram:

1. The shopper opens the app and picks a try-on mode.
2. Photos upload directly to Cloudinary (`originals/`).
3. The frontend calls the FastAPI gateway with the image URLs.
4. U²-Net cut-outs are stored in `garments/`.
5. Merged upper and lower outfits are stored in `outfits/`.
6. The try-on client calls the CatVTON Space through Gradio `predict()`.
7. The Space pulls the person and garment images by URL.
8. The generated image is uploaded to `results/`.
9. The result is served to the browser over the CDN.

| Component                | Location                                                      | Role                                                                                                         |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Frontend                 | [`web-frontend/`](web-frontend/README.md)                     | Next.js, TypeScript, and Tailwind UI; local development on port **3000**.                                    |
| Garment API              | [`garment-processing-api/`](garment-processing-api/README.md) | FastAPI orchestration, classification, cutouts, and outfit construction; local development on port **5000**. |
| Inference implementation | [`catvton-gradio/`](catvton-gradio/README.md)                 | CatVTON and Gradio model pipeline; requires separate GPU setup for local inference.                          |
| Image service            | Cloudinary                                                    | Uploads, persisted results, and image delivery.                                                              |

The API currently selects a hosted Hugging Face Space. Starting a local Gradio server does not automatically switch the API's provider. The root `docker-compose.yml` contains supporting PostgreSQL/Redis experiments and does not launch this application. Historical services live in [`deprecated-backends/`](deprecated-backends/README.md).

## What you can do

![Person photo and garment inputs with generated try-on results for normal, full outfit, and reference modes](docs/assets/try-on-modes.png)

<sub>Input pairs (top) and generated CatVTON results (bottom) for the three photo try-on modes.</sub>

| Experience           | Workflow                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Live AR preview**  | Use browser camera input and MediaPipe pose tracking to position, scale, and rotate garment overlays.       |
| **Normal mode**      | Upload a person and garment image, classify the garment, remove its background, and request a photo try-on. |
| **Full outfit mode** | Combine separate upper and lower garments, preview the constructed outfit, and generate a try-on.           |
| **Reference mode**   | Use a reference image with manual garment-type selection for an experimental photo workflow.                |

Photo workflows expose inference controls and a result viewer with download options. Live AR overlays and generated photo results are separate experiences; their behavior is detailed in the [product specification](docs/PROJECT_SPEC.md).

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

The [GitHub Actions workflow](.github/workflows/engineering-foundation.yml) runs equivalent checks and the build. The browser journey is temporarily disabled in CI; run `make test-e2e` locally. Hooks inspect staged content without formatting, staging, or stashing changes. Formatting and linting cover owned application and workflow code; vendored and deprecated runtimes have separate scope.

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

## Repository map

Start here when navigating the code. Each link points to the file that owns the behavior.

### Frontend (`web-frontend/`)

| Concern                        | Entry point                                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Try-on page                    | [`app/try-on/page.tsx`](web-frontend/app/try-on/page.tsx)                                                                                                                                               |
| Photo try-on wizard            | [`components/tryon/PhotoWizard.tsx`](web-frontend/components/tryon/PhotoWizard.tsx)                                                                                                                     |
| Live AR preview                | [`ARStage.tsx`](web-frontend/components/tryon/ARStage.tsx), [`GarmentOverlay.tsx`](web-frontend/components/tryon/GarmentOverlay.tsx), [`ARPanel.tsx`](web-frontend/components/tryon/ARPanel.tsx)        |
| MediaPipe pose detection       | [`lib/hooks/usePoseDetection.ts`](web-frontend/lib/hooks/usePoseDetection.ts), [`lib/pose-utils.ts`](web-frontend/lib/pose-utils.ts)                                                                    |
| Try-on state                   | [`lib/store/useVtonStore.ts`](web-frontend/lib/store/useVtonStore.ts), [`lib/tryon-store.ts`](web-frontend/lib/tryon-store.ts)                                                                          |
| Garment API and try-on clients | [`lib/services/garmentApi.ts`](web-frontend/lib/services/garmentApi.ts), [`lib/services/vtonApi.ts`](web-frontend/lib/services/vtonApi.ts), [`lib/services/http.ts`](web-frontend/lib/services/http.ts) |
| Shared types                   | [`lib/types.ts`](web-frontend/lib/types.ts)                                                                                                                                                             |
| Tests                          | [`tests/unit/`](web-frontend/tests/unit), [`tests/e2e/photo.spec.ts`](web-frontend/tests/e2e/photo.spec.ts)                                                                                             |

### Garment API (`garment-processing-api/`)

| Concern                     | Entry point                                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FastAPI app and routes      | [`app.py`](garment-processing-api/app.py): `/health`, `/classify_garment`, `/classify_garment_by_url`, `/detect_garment_type`, `/construct_outfit`, `/virtual_tryon` |
| Configuration and providers | [`config.py`](garment-processing-api/config.py)                                                                                                                      |
| Request/response models     | [`models.py`](garment-processing-api/models.py)                                                                                                                      |
| Garment classification      | [`services/classifier.py`](garment-processing-api/services/classifier.py)                                                                                            |
| Cutouts and outfit merging  | [`services/image_processing.py`](garment-processing-api/services/image_processing.py)                                                                                |
| Cloudinary storage          | [`services/cloudinary_service.py`](garment-processing-api/services/cloudinary_service.py)                                                                            |
| CatVTON Gradio client       | [`services/gradio_service.py`](garment-processing-api/services/gradio_service.py)                                                                                    |
| Model label mapping         | [`models/README.md`](garment-processing-api/models/README.md)                                                                                                        |
| Railway deployment          | [`nixpacks.toml`](garment-processing-api/nixpacks.toml)                                                                                                              |
| Tests                       | [`tests/unit/test_routes.py`](garment-processing-api/tests/unit/test_routes.py)                                                                                      |

### Inference (`catvton-gradio/`)

| Concern          | Entry point                                             |
| ---------------- | ------------------------------------------------------- |
| Gradio app       | [`app.py`](catvton-gradio/app.py)                       |
| CatVTON pipeline | [`model/pipeline.py`](catvton-gradio/model/pipeline.py) |

### Tooling

| Concern               | Entry point                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Command interface     | [`Makefile`](Makefile)                                                                         |
| CI workflow           | [`.github/workflows/engineering-foundation.yml`](.github/workflows/engineering-foundation.yml) |
| Pinned tool versions  | [`scripts/tool-versions.env`](scripts/tool-versions.env)                                       |
| Pull request template | [`.github/pull_request_template.md`](.github/pull_request_template.md)                         |

## Documentation

| Document                                                                             | Use it for                                                                    |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [Product specification](docs/PROJECT_SPEC.md)                                        | Detailed capabilities, architecture, and product workflows.                   |
| [Contributor guide](CONTRIBUTING.md)                                                 | Tool installation, environments, verification, hooks, and contribution rules. |
| [Agent instructions](AGENTS.md)                                                      | Repository guidance, SDD routing, and CodeGraph usage.                        |
| [API reference](garment-processing-api/docs/api/API_DOCUMENTATION.md)                | Routes and request/response contracts.                                        |
| [API deployment guide](garment-processing-api/docs/deployment/DEPLOYMENT.md)         | Service-specific deployment guidance.                                         |
| [Engineering foundation](specs/001-engineering-foundation/spec.md)                   | Approved foundation scope and acceptance criteria.                            |
| [Roadmap](docs/ROADMAP.md)                                                           | Ordered engineering and platform outcomes.                                    |
| [Engineering foundation plan](specs/001-engineering-foundation/plan.md)              | Technical plan behind the foundation specification.                           |
| [API architecture](garment-processing-api/docs/architecture/ARCHITECTURE.md)         | Garment API module layout and responsibilities.                               |
| [Model compatibility](garment-processing-api/docs/deployment/MODEL_COMPATIBILITY.md) | TensorFlow model format and runtime compatibility.                            |
| [AR documentation index](web-frontend/docs/AR/DOCUMENTATION_INDEX.md)                | Live AR preview architecture and implementation notes.                        |
| [AR MediaPipe guide](web-frontend/docs/ar-mediapipe-docs/README.md)                  | Pose detection, overlay positioning algorithms, and AR components.            |
| [CatVTON technical docs](catvton-gradio/TECHNICAL_DOCUMENTATION.md)                  | Inference pipeline, preprocessing, and Gradio service internals.              |
| [Security remediation record](docs/SECURITY_REMEDIATION.md)                          | Reviewed Dependabot alerts and dependency fixes.                              |
| [Claude Code guidance](CLAUDE.md)                                                    | Service-level commands and architecture notes for coding agents.              |

## License

Repository code is licensed under the [MIT License](LICENSE). Third-party models, weights, and datasets have their own terms; review their licenses before use or redistribution.
