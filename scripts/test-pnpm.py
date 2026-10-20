"""Check the unpinned pnpm policy and portable security override configuration."""

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PnpmPolicyTests(unittest.TestCase):
    def test_manager_tracks_major_eleven_not_an_exact_pin(self):
        package = json.loads((ROOT / "web-frontend/package.json").read_text())
        self.assertNotIn("packageManager", package)
        self.assertEqual(package["engines"]["pnpm"], ">=11.0.0 <12")
        self.assertNotIn("pnpm", package)

    def test_security_override_is_shared_with_isolated_lock_check(self):
        workspace = ROOT / "web-frontend/pnpm-workspace.yaml"
        self.assertTrue(workspace.is_file(), "Missing modern pnpm settings")
        self.assertIn("'@tailwindcss/oxide>tar': '7.5.19'", workspace.read_text())
        self.assertIn("verifyDepsBeforeRun: false", workspace.read_text())
        script = (ROOT / "scripts/check-frontend-lock.sh").read_text()
        self.assertIn('"$repo_dir/web-frontend/pnpm-workspace.yaml"', script)

    def test_ci_tracks_latest_eleven_with_matching_local_bounds(self):
        versions = (ROOT / "scripts/tool-versions.env").read_text()
        self.assertIn("PNPM_VERSION=latest-11\n", versions)
        self.assertIn("PNPM_MIN_VERSION=11.0.0\n", versions)
        self.assertIn("PNPM_MAX_VERSION=12.0.0\n", versions)
        checks = (ROOT / "scripts/check-tools.sh").read_text()
        self.assertIn('require_min_version pnpm "$actual_pnpm" "$PNPM_MIN_VERSION"', checks)

    def test_ci_cache_uses_the_resolved_manager_version(self):
        workflow = (ROOT / ".github/workflows/engineering-foundation.yml").read_text()
        self.assertIn('"$(pnpm --version)" >> "$GITHUB_OUTPUT"', workflow)
        self.assertIn("steps.pnpm-cache.outputs.version", workflow)

    def test_known_install_scripts_are_explicitly_declined(self):
        settings = (ROOT / "web-frontend/pnpm-workspace.yaml").read_text()
        self.assertIn("strictDepBuilds: true", settings)
        self.assertIn("allowBuilds:", settings)
        for package in (
            "@tailwindcss/oxide@4.1.11",
            "bufferutil@4.0.9",
            "msw@2.10.4",
            "sharp@0.34.3",
            "unrs-resolver@1.11.1",
        ):
            self.assertIn(f"'{package}': false", settings)
        self.assertNotIn("dangerouslyAllowAllBuilds", settings)


if __name__ == "__main__":
    unittest.main()
