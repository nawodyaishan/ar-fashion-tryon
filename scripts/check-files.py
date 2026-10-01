"""Non-mutating staged checks and current tracked-tree secret scanning."""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "web-frontend"
API = ROOT / "garment-processing-api"
REPO_FORMAT_FILES = {
    "AGENTS.md",
    "CLAUDE.md",
    "CONTRIBUTING.md",
    "README.md",
    "SECURITY.md",
    ".github/pull_request_template.md",
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    ".github/ISSUE_TEMPLATE/config.yml",
    "docs/PROJECT_SPEC.md",
    "docs/ROADMAP.md",
    "docs/SECURITY_REMEDIATION.md",
    "lefthook.yml",
    ".github/workflows/engineering-foundation.yml",
}
FRONTEND_CONFIG_FILES = {
    "vitest.config.mts",
    "playwright.config.ts",
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "components.json",
    ".prettierrc",
}
JS_SUFFIXES = {".js", ".jsx", ".mjs", ".ts", ".tsx"}
FRONTEND_SUFFIXES = JS_SUFFIXES | {".css", ".json"}
ENV = {**os.environ, "npm_config_manage_package_manager_versions": "false"}


def run(args, *, cwd=ROOT, data=None, capture=False):
    return subprocess.run(
        [str(arg) for arg in args],
        cwd=cwd,
        env=ENV,
        input=data,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        check=False,
    )


def git_paths(staged):
    args = (
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
        if staged
        else ["git", "ls-files", "--cached", "-z"]
    )
    result = run(args, capture=True)
    if result.returncode:
        raise RuntimeError("Cannot enumerate Git index paths.")
    return [os.fsdecode(path) for path in result.stdout.split(b"\0") if path]


def contents(name, staged):
    if Path(name).suffix.lower() in {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".ico",
        ".mp4",
        ".h5",
        ".keras",
        ".pt",
        ".onnx",
        ".safetensors",
        ".zip",
        ".pdf",
    }:
        return None
    if staged:
        result = run(["git", "show", f":{name}"], capture=True)
        if result.returncode:
            raise RuntimeError(f"Cannot read staged file: {name}")
        data = result.stdout
    else:
        path = ROOT / name
        if path.is_symlink() or not path.is_file():
            return None
        data = path.read_bytes()
    # Binary assets are not text-source secret-scan inputs.
    if b"\0" in data:
        return None
    try:
        data.decode("utf-8")
    except UnicodeDecodeError:
        return None
    return data


def python_owned(name):
    path = Path(name)
    return path.suffix == ".py" and (
        name.startswith("scripts/")
        or (
            name.startswith("garment-processing-api/")
            and not name.startswith(
                ("garment-processing-api/legacy/", "garment-processing-api/notebooks/")
            )
        )
    )


def frontend_owned(name):
    if not name.startswith("web-frontend/") or name.endswith(".d.ts"):
        return False
    local = name.removeprefix("web-frontend/")
    return local in FRONTEND_CONFIG_FILES or (
        local.startswith(("app/", "components/", "lib/", "tests/"))
        and Path(local).suffix in FRONTEND_SUFFIXES
    )


def repo_formatted(name):
    return name in REPO_FORMAT_FILES or (
        name.startswith("specs/001-engineering-foundation/") and name.endswith(".md")
    )


def workflow_owned(name):
    return name in {
        "Makefile",
        ".nvmrc",
        ".python-version",
        ".gitignore",
        ".gitleaks.toml",
        "garment-processing-api/pyproject.toml",
        "web-frontend/.gitignore",
        "web-frontend/.prettierignore",
        "web-frontend/.env.example",
    } or name.startswith("scripts/")


def prettier_args(name):
    return [
        "node",
        FRONTEND / "node_modules/prettier/bin/prettier.cjs",
        "--config",
        FRONTEND / ".prettierrc",
        "--stdin-filepath",
        ROOT / name,
    ]


def scan_secrets(paths, staged):
    # Scan a disposable text snapshot: no untracked user files, history, caches,
    # or unstaged content in a staged check. Never modify the source or index.
    with tempfile.TemporaryDirectory(prefix="ar-fashion-secrets-") as directory:
        snapshot = Path(directory)
        count = 0
        for name in paths:
            data = contents(name, staged)
            if data is None:
                continue
            target = snapshot / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            count += 1
        if not count:
            return 0
        return run(
            [
                "gitleaks",
                "dir",
                snapshot,
                "--config",
                ROOT / ".gitleaks.toml",
                "--redact=100",
                "--no-banner",
                "--no-color",
                "--ignore-gitleaks-allow",
            ]
        ).returncode


def check_staged():
    paths = git_paths(True)
    if scan_secrets(paths, True):
        return 1
    failed = False
    for name in paths:
        if not (
            python_owned(name)
            or frontend_owned(name)
            or repo_formatted(name)
            or workflow_owned(name)
        ):
            continue
        data = contents(name, True)
        if data is None:
            continue
        # Check index content instead of worktree text, including partial stages.
        lines = data.decode("utf-8").splitlines()
        if any(
            line.rstrip() != line
            and not (name.endswith(".md") and line.endswith("  ") and not line.endswith("   "))
            for line in lines
        ):
            print(f"Trailing whitespace: {name}", file=sys.stderr)
            failed = True
        if not (python_owned(name) or frontend_owned(name) or repo_formatted(name)):
            continue
        if python_owned(name):
            formatter = run(
                [
                    API / ".venv/bin/ruff",
                    "format",
                    "--config",
                    API / "pyproject.toml",
                    "--stdin-filename",
                    ROOT / name,
                    "-",
                ],
                cwd=API,
                data=data,
                capture=True,
            )
            lint = run(
                [
                    API / ".venv/bin/ruff",
                    "check",
                    "--config",
                    API / "pyproject.toml",
                    "--stdin-filename",
                    ROOT / name,
                    "-",
                ],
                cwd=API,
                data=data,
            )
            failed |= lint.returncode != 0
        else:
            formatter = run(prettier_args(name), data=data, capture=True)
            if frontend_owned(name) and Path(name).suffix in JS_SUFFIXES:
                lint = run(
                    [
                        "pnpm",
                        "exec",
                        "eslint",
                        "--stdin",
                        "--stdin-filename",
                        name.removeprefix("web-frontend/"),
                        "--max-warnings",
                        "0",
                    ],
                    cwd=FRONTEND,
                    data=data,
                )
                failed |= lint.returncode != 0
        if formatter.returncode or formatter.stdout != data:
            print(f"Formatting required: {name} (run make format explicitly)", file=sys.stderr)
            failed = True
    return int(failed)


def format_repo(write):
    paths = sorted(REPO_FORMAT_FILES)
    paths.extend(
        str(path.relative_to(ROOT))
        for path in (ROOT / "specs/001-engineering-foundation").glob("*.md")
    )
    failed = False
    for name in paths:
        path = ROOT / name
        if not path.is_file():
            continue
        data = path.read_bytes()
        result = run(prettier_args(name), data=data, capture=True)
        if result.returncode:
            print(f"Cannot format {name}", file=sys.stderr)
            failed = True
        elif write:
            path.write_bytes(result.stdout)
        elif result.stdout != data:
            print(f"Formatting required: {name}", file=sys.stderr)
            failed = True
    return int(failed)


def main():
    mode = sys.argv[1] if len(sys.argv) == 2 else ""
    if mode == "staged":
        return check_staged()
    if mode == "secrets":
        return scan_secrets(git_paths(False), False)
    if mode in {"format", "format-check"}:
        return format_repo(mode == "format")
    print("Usage: check-files.py [staged|secrets|format|format-check]", file=sys.stderr)
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, RuntimeError) as exc:
        print(f"Check failed: {exc}. Run make setup and check tool versions.", file=sys.stderr)
        sys.exit(1)
