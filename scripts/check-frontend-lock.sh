#!/bin/bash
# Validate package/lock consistency without installing or rewriting source files.
set -Eeuo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo_dir="$(cd -- "$script_dir/.." && pwd -P)"
export npm_config_manage_package_manager_versions=false
check_dir="$(mktemp -d "${TMPDIR:-/tmp}/ar-fashion-lock.XXXXXX")"
trap 'rm -rf -- "$check_dir"' EXIT
cp "$repo_dir/web-frontend/package.json" "$repo_dir/web-frontend/pnpm-lock.yaml" "$check_dir/"
pnpm --dir "$check_dir" install --lockfile-only --frozen-lockfile --offline --ignore-scripts
printf 'Frontend lock agrees with package.json; source files unchanged.\n'
