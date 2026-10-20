"""Regression checks for repository-owned guardrail formatting scope."""

import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "check_files", Path(__file__).with_name("check-files.py")
)
CHECKS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECKS)


class GuardrailScopeTests(unittest.TestCase):
    def test_guardrail_sources_are_formatted(self):
        for name in (
            "opencode.json",
            ".opencode/plugins/repo-guardrails/index.ts",
            ".opencode/plugins/repo-guardrails/reminders.mjs",
            "scripts/test-opencode.mjs",
            "specs/002-opencode-guardrails/spec.md",
        ):
            with self.subTest(name=name):
                self.assertTrue(CHECKS.repo_formatted(name))

    def test_vendor_and_private_files_are_not_added_to_scope(self):
        for name in (
            "deprecated-backends/example.ts",
            "catvton-gradio/model.py",
            ".opencode/.env",
            ".opencode/agents/unowned.ts",
        ):
            with self.subTest(name=name):
                self.assertFalse(CHECKS.repo_formatted(name))


if __name__ == "__main__":
    unittest.main()
