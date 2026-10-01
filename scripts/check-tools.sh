#!/bin/bash
# Bash 3.2-compatible; never install tools or print environment secrets.
set -Eeuo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo_dir="$(cd -- "$script_dir/.." && pwd -P)"
source "$script_dir/tool-versions.env"
cd "$repo_dir"
# Version checks must not let pnpm silently download a different manager.
export npm_config_manage_package_manager_versions=false

fail() { printf '%s\n' "$*" >&2; exit 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || fail "Missing $1. See CONTRIBUTING.md for installation."; }
check_frontend() {
    require_command node
    actual_node="$(node --version)"
    expected_node_major="${NODE_VERSION%%.*}"
    [[ "$actual_node" == v"$expected_node_major".* ]] || fail "Node 22 required (pinned $NODE_VERSION); found $actual_node. Run nvm install && nvm use, or use the declared runtime."
    actual_node_minor="${actual_node#v22.}"
    actual_node_minor="${actual_node_minor%%.*}"
    [[ "$actual_node_minor" -ge 12 ]] || fail "Node 22.12+ required by Vitest; found $actual_node. Run nvm install && nvm use."
    require_command pnpm
    actual_pnpm="$(pnpm --version)"
    [[ "$actual_pnpm" == "$PNPM_VERSION" ]] || fail "pnpm $PNPM_VERSION required; found $actual_pnpm. Install the declared version explicitly."
    printf 'Frontend: Node %s; pnpm %s\n' "$actual_node" "$actual_pnpm"
}
check_api() {
    require_command uv
    actual_uv="$(uv --version)"
    [[ "$actual_uv" == "uv $UV_VERSION" || "$actual_uv" == "uv $UV_VERSION "* ]] || fail "uv $UV_VERSION required; found $actual_uv. Install the declared version explicitly."
    printf 'API tooling: uv %s; target Python %s\n' "$UV_VERSION" "$PYTHON_VERSION"
}
check_python_env() {
    [[ -x garment-processing-api/.venv/bin/python ]] || fail 'API environment missing. Run make setup-api.'
    actual_python="$(garment-processing-api/.venv/bin/python -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
    [[ "$actual_python" == "$PYTHON_VERSION" ]] || fail "API environment uses Python $actual_python; run make setup-api for $PYTHON_VERSION."
}
[[ "$(cat .nvmrc)" == "$NODE_VERSION" ]] || fail 'Node declarations disagree: .nvmrc and scripts/tool-versions.env.'
[[ "$(cat .python-version)" == "$PYTHON_VERSION" ]] || fail 'Python declarations disagree: .python-version and scripts/tool-versions.env.'
check_hook_tools() {
    require_command lefthook
    require_command gitleaks
    [[ "$(lefthook version)" == "$LEFTHOOK_VERSION" ]] || fail "Lefthook $LEFTHOOK_VERSION required. See CONTRIBUTING.md."
    [[ "$(gitleaks version)" == "$GITLEAKS_VERSION" ]] || fail "Gitleaks $GITLEAKS_VERSION required. See CONTRIBUTING.md."
}
case "${1:-doctor}" in
    frontend) check_frontend ;;
    hooks) check_hook_tools ;;
    secrets) require_command gitleaks; [[ "$(gitleaks version)" == "$GITLEAKS_VERSION" ]] || fail "Gitleaks $GITLEAKS_VERSION required." ;;
    api) check_api ;;
    frontend-ready)
        check_frontend
        [[ -x web-frontend/node_modules/.bin/next ]] || fail 'Frontend dependencies missing. Run make setup-frontend.'
        ;;
    api-ready)
        check_api
        check_python_env
        ;;
    doctor)
        # Report both sets of diagnostics even when one prerequisite fails.
        result=0
        (check_frontend) || result=1
        (check_api) || result=1
        if [[ -x garment-processing-api/.venv/bin/python ]]; then
            (check_python_env) || result=1
            garment-processing-api/.venv/bin/python --version
        else
            printf 'Python environment: absent; make setup-api provisions Python %s.\n' "$PYTHON_VERSION"
        fi
        printf 'Optional live prerequisites: API .env, TensorFlow weights, Cloudinary and hosted Gradio access.\n'
        printf 'No credentials or model downloads are required for dependency setup.\n'
        exit "$result"
        ;;
    *) fail 'Usage: check-tools.sh [doctor|frontend|api|frontend-ready|api-ready]' ;;
esac
