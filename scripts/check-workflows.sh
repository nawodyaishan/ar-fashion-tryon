#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/tool-versions.env
source "$script_dir/tool-versions.env"
cd "$script_dir/.."
command -v actionlint >/dev/null 2>&1 || { printf 'Missing actionlint; run make ci-tools-install TOOLS_DIR=/absolute/path and add it to PATH.\n' >&2; exit 1; }
actual_version="$(actionlint -version)"
[[ "${actual_version%%$'\n'*}" == "$ACTIONLINT_VERSION" ]] || { printf 'actionlint %s required.\n' "$ACTIONLINT_VERSION" >&2; exit 1; }
actionlint
for script in scripts/*.sh; do bash -n "$script"; done
