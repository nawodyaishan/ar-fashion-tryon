"""Expose non-secret, committed tool declarations as GitHub step outputs."""

from pathlib import Path

for line in (Path(__file__).parent / "tool-versions.env").read_text().splitlines():
    if line and not line.startswith("#"):
        key, value = line.split("=", 1)
        print(f"{key.removesuffix('_VERSION').lower()}={value}")
