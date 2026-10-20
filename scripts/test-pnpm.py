"""Check the unpinned pnpm policy and portable security override configuration."""

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PnpmPolicyTests(unittest.TestCase):
    def test_manager_is_minimum_only_not_an_exact_pin(self):
        package = json.loads((ROOT / "web-frontend/package.json").read_text())
        self.assertNotIn("packageManager", package)
        self.assertEqual(package["engines"]["pnpm"], ">=12.0.0")
        self.assertNotIn("pnpm", package)

    def test_security_override_is_shared_with_isolated_lock_check(self):
        workspace = ROOT / "web-frontend/pnpm-workspace.yaml"
        self.assertTrue(workspace.is_file(), "Missing modern pnpm settings")
        self.assertIn("'@tailwindcss/oxide>tar': '7.5.19'", workspace.read_text())
        self.assertIn("verifyDepsBeforeRun: false", workspace.read_text())
        script = (ROOT / "scripts/check-frontend-lock.sh").read_text()
        self.assertIn('"$repo_dir/web-frontend/pnpm-workspace.yaml"', script)

    def test_ci_tracks_latest_while_local_checks_accept_newer(self):
        versions = (ROOT / "scripts/tool-versions.env").read_text()
        self.assertIn("PNPM_VERSION=latest\n", versions)
        self.assertIn("PNPM_MIN_VERSION=12.0.0\n", versions)
        checks = (ROOT / "scripts/check-tools.sh").read_text()
        self.assertIn('require_min_version pnpm "$actual_pnpm" "$PNPM_MIN_VERSION"', checks)

    def test_ci_cache_uses_the_resolved_manager_version(self):
        workflow = (ROOT / ".github/workflows/engineering-foundation.yml").read_text()
        self.assertIn('"$(pnpm --version)" >> "$GITHUB_OUTPUT"', workflow)
        self.assertIn("steps.pnpm-cache.outputs.version", workflow)


if __name__ == "__main__":
    unittest.main()
