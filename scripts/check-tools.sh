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
# Extract the first dotted version number from tool output (strips "v", names, build info).
extract_version() { printf '%s\n' "$1" | grep -oE '[0-9]+(\.[0-9]+)+' | head -n 1; }
# version_ge ACTUAL MINIMUM: succeed when ACTUAL >= MINIMUM, comparing numeric components.
version_ge() {
    local IFS=.
    local -a a=($1) m=($2)
    local i n=${#m[@]}
    (( ${#a[@]} > n )) && n=${#a[@]}
    for (( i = 0; i < n; i++ )); do
        (( 10#${a[i]:-0} > 10#${m[i]:-0} )) && return 0
        (( 10#${a[i]:-0} < 10#${m[i]:-0} )) && return 1
    done
    return 0
}
# require_min_version NAME RAW_OUTPUT MINIMUM: fail unless the reported version meets the minimum.
require_min_version() {
    local actual
    actual="$(extract_version "$2")"
    [[ -n "$actual" ]] || fail "Could not determine $1 version from: $2"
    version_ge "$actual" "$3" || fail "$1 $3 or newer required; found $actual. See CONTRIBUTING.md."
}
require_command() { command -v "$1" >/dev/null 2>&1 || fail "Missing $1. See CONTRIBUTING.md for installation."; }
check_frontend() {
    require_command node
    actual_node="$(node --version)"
    # Vitest needs 22.12+; .nvmrc ($NODE_VERSION) is the reference version, not an upper bound.
    require_min_version Node "$actual_node" "$NODE_MIN_VERSION"
    require_command pnpm
    actual_pnpm="$(pnpm --version)"
    require_min_version pnpm "$actual_pnpm" "$PNPM_VERSION"
    printf 'Frontend: Node %s; pnpm %s\n' "$actual_node" "$actual_pnpm"
}
check_api() {
    require_command uv
    actual_uv="$(uv --version)"
    require_min_version uv "$actual_uv" "$UV_VERSION"
    printf 'API tooling: %s; target Python %s\n' "$actual_uv" "$PYTHON_VERSION"
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
    require_min_version Lefthook "$(lefthook version)" "$LEFTHOOK_VERSION"
    require_min_version Gitleaks "$(gitleaks version)" "$GITLEAKS_VERSION"
}
case "${1:-doctor}" in
    frontend) check_frontend ;;
    hooks) check_hook_tools ;;
    secrets) require_command gitleaks; require_min_version Gitleaks "$(gitleaks version)" "$GITLEAKS_VERSION" ;;
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
