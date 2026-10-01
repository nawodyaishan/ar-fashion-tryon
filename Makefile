SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help doctor setup setup-frontend setup-api dev-frontend dev-api build lock-check lock-check-frontend lock-check-api

help: ## List available commands and prerequisites (no application dependencies needed)
	@printf 'AR Fashion Try-On — available commands\n\n'
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf '\nPrerequisites: Node 22.12+ (see .nvmrc), pnpm 10.13.1, uv 0.11.1, Bash 3.2+ and make.\n'
	@printf 'setup-api provisions Python 3.11 through uv if needed. Models and credentials are separate.\n'

doctor: ## Check runtime/tool versions; report optional live prerequisites without secrets
	@bash scripts/check-tools.sh doctor

setup: setup-frontend setup-api ## Install both services from existing locks; no model downloads

setup-frontend: ## Install frontend dependencies with a frozen lockfile
	@bash scripts/check-tools.sh frontend
	pnpm --dir web-frontend install --frozen-lockfile

setup-api: ## Install API dependencies with a locked Python 3.11 environment
	@bash scripts/check-tools.sh api
	cd garment-processing-api && uv sync --locked --python 3.11

dev-frontend: ## Start Next.js on port 3000 (requires setup-frontend)
	@bash scripts/check-tools.sh frontend-ready
	pnpm --dir web-frontend dev

dev-api: ## Start local API on port 5000 (requires setup-api, .env and live prerequisites)
	@bash scripts/check-tools.sh api-ready
	@test -f garment-processing-api/.env || { printf 'Missing API .env; copy .env.example and configure live prerequisites.\n' >&2; exit 1; }
	cd garment-processing-api && uv run --no-sync uvicorn app:app --env-file .env --reload --host 127.0.0.1 --port 5000

build: ## Build the frontend for production; does not install dependencies
	@bash scripts/check-tools.sh frontend-ready
	pnpm --dir web-frontend build

lock-check: lock-check-frontend lock-check-api ## Check lock freshness without changing source or installing dependencies

lock-check-frontend: ## Validate frontend lock in an isolated temporary directory, offline
	@bash scripts/check-tools.sh frontend
	@bash scripts/check-frontend-lock.sh

lock-check-api: ## Validate uv.lock freshness offline without synchronization
	@bash scripts/check-tools.sh api
	cd garment-processing-api && uv lock --check --offline --no-python-downloads --python 3.11

.PHONY: lint lint-frontend lint-api format-check format-check-frontend format-check-api format-check-repo format format-frontend format-api format-repo typecheck hooks-install check-staged secret-check

lint: lint-frontend lint-api ## Lint owned frontend, API and workflow Python code without fixes

lint-frontend: ## Run ESLint on owned frontend code (warnings fail)
	@bash scripts/check-tools.sh frontend-ready
	pnpm --dir web-frontend lint

lint-api: ## Run Ruff on owned API and workflow Python code
	@bash scripts/check-tools.sh api-ready
	cd garment-processing-api && uv run --no-sync ruff check . ../scripts --config pyproject.toml

format-check: format-check-frontend format-check-api format-check-repo ## Check owned formatting without rewriting files

format-check-frontend: ## Check frontend source/config formatting with Prettier
	@bash scripts/check-tools.sh frontend-ready
	pnpm --dir web-frontend format:check

format-check-api: ## Check owned API and workflow Python formatting with Ruff
	@bash scripts/check-tools.sh api-ready
	cd garment-processing-api && uv run --no-sync ruff format --check . ../scripts --config pyproject.toml

format-check-repo: ## Check repository guides and workflow configuration formatting
	@bash scripts/check-tools.sh frontend-ready
	@bash scripts/check-tools.sh api-ready
	garment-processing-api/.venv/bin/python scripts/check-files.py format-check

format: format-frontend format-api format-repo ## Explicitly format owned source/configuration (writes files)

format-frontend: ## Format frontend source/configuration explicitly
	@bash scripts/check-tools.sh frontend-ready
	pnpm --dir web-frontend format

format-api: ## Format owned API and workflow Python source explicitly
	@bash scripts/check-tools.sh api-ready
	cd garment-processing-api && uv run --no-sync ruff format . ../scripts --config pyproject.toml

format-repo: ## Format repository guides and workflow configuration explicitly
	@bash scripts/check-tools.sh frontend-ready
	@bash scripts/check-tools.sh api-ready
	garment-processing-api/.venv/bin/python scripts/check-files.py format

typecheck: ## Check frontend TypeScript without writing build caches
	@bash scripts/check-tools.sh frontend-ready
	pnpm --dir web-frontend typecheck

hooks-install: ## Explicitly install committed Lefthook precommit configuration
	@bash scripts/check-tools.sh hooks
	@bash scripts/check-tools.sh frontend-ready
	@bash scripts/check-tools.sh api-ready
	lefthook install

check-staged: ## Check staged index content for secrets, whitespace, formatting and lint
	@bash scripts/check-tools.sh hooks
	@bash scripts/check-tools.sh frontend-ready
	@bash scripts/check-tools.sh api-ready
	garment-processing-api/.venv/bin/python scripts/check-files.py staged

secret-check: ## Scan the current tracked text tree with redacted Gitleaks output
	@bash scripts/check-tools.sh secrets
	@bash scripts/check-tools.sh api-ready
	garment-processing-api/.venv/bin/python scripts/check-files.py secrets

.PHONY: test test-frontend test-api browser-install test-e2e verify

test: test-frontend test-api ## Run isolated frontend and API tests without live providers

test-frontend: ## Run Vitest state and HTTP client tests
	@bash scripts/check-tools.sh frontend-ready
	pnpm --dir web-frontend test

test-api: ## Run pytest route tests with provider/model boundaries replaced
	@bash scripts/check-tools.sh api-ready
	cd garment-processing-api && uv run --no-sync pytest

browser-install: ## Explicitly download Playwright Chromium (Linux CI also needs system libraries)
	@bash scripts/check-tools.sh frontend-ready
	pnpm --dir web-frontend browser:install

test-e2e: ## Run mocked photo journey with a managed local frontend server
	@bash scripts/check-tools.sh frontend-ready
	pnpm --dir web-frontend test:e2e

verify: lint format-check typecheck lock-check test secret-check ## Run full source checks and isolated tests; build/browser are separate

.PHONY: ci-tools-install workflow-check

ci-tools-install: ## Explicitly install checksum-pinned actionlint/Gitleaks into TOOLS_DIR (absolute)
	@bash scripts/install-ci-tools.sh "$(TOOLS_DIR)"

workflow-check: ## Validate GitHub Actions syntax, expressions and workflow shell commands
	@bash scripts/check-workflows.sh
