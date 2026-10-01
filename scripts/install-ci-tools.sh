#!/usr/bin/env bash
# Explicit tool download; never called implicitly by checks.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/tool-versions.env
source "$script_dir/tool-versions.env"
[[ $# -eq 1 && "$1" = /* ]] || { printf 'Usage: bash scripts/install-ci-tools.sh /absolute/tools/directory\n' >&2; exit 1; }
tools_dir="$1"
case "$(uname -s)/$(uname -m)" in
    Linux/x86_64) platform=linux; action_arch=amd64; leaks_arch=x64 ;;
    Linux/aarch64|Linux/arm64) platform=linux; action_arch=arm64; leaks_arch=arm64 ;;
    Darwin/arm64) platform=darwin; action_arch=arm64; leaks_arch=arm64 ;;
    *) printf 'Unsupported CI-tool platform; use the official release instructions.\n' >&2; exit 1 ;;
esac
work_dir="$(mktemp -d)"
trap 'rm -rf -- "$work_dir"' EXIT
mkdir -p -- "$tools_dir"
install_tool() {
    local repo="$1" tool="$2" version="$3" arch="$4" archive checksum actual
    archive="${tool}_${version}_${platform}_${arch}.tar.gz"
    checksum="$(awk -v file="$archive" '$2 == file {print $1}' "$script_dir/tool-checksums.txt")"
    [[ "$checksum" =~ ^[0-9a-f]{64}$ ]] || { printf 'Missing pinned checksum for %s\n' "$archive" >&2; exit 1; }
    curl --fail --silent --show-error --location --retry 3 --proto '=https' --tlsv1.2 \
        "https://github.com/$repo/releases/download/v$version/$archive" --output "$work_dir/$archive"
    actual="$(shasum -a 256 "$work_dir/$archive")"
    [[ "${actual%% *}" == "$checksum" ]] || { printf 'Checksum mismatch: %s\n' "$archive" >&2; exit 1; }
    tar -xzf "$work_dir/$archive" -C "$work_dir" "$tool"
    install -m 755 "$work_dir/$tool" "$tools_dir/$tool"
    printf 'Installed checksum-verified %s %s\n' "$tool" "$version"
}
install_tool rhysd/actionlint actionlint "$ACTIONLINT_VERSION" "$action_arch"
install_tool gitleaks/gitleaks gitleaks "$GITLEAKS_VERSION" "$leaks_arch"
