from __future__ import annotations

import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = (
    Path(__file__).resolve().parents[1] / "benchmark_apps.py"
)
SPEC = importlib.util.spec_from_file_location(
    "benchmark_apps",
    SCRIPT_PATH,
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load benchmark_apps.py")

benchmark_apps = importlib.util.module_from_spec(SPEC)
import sys

sys.modules[SPEC.name] = benchmark_apps
SPEC.loader.exec_module(benchmark_apps)


class BenchmarkAppsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.repository_root = Path(__file__).resolve().parents[2]
        cls.rubric = benchmark_apps.load_json(
            cls.repository_root / "benchmark" / "rubric.json"
        )
        cls.applications = benchmark_apps.load_json(
            cls.repository_root / "benchmark" / "applications.json"
        )

    def evaluate(
        self,
        *,
        rubric: dict | None = None,
        applications: dict | None = None,
        evidence_mutator=None,
    ):
        with tempfile.TemporaryDirectory() as temporary_directory:
            evidence_dir = Path(temporary_directory)

            for application in (
                applications or self.applications
            )["applications"]:
                source = (
                    self.repository_root
                    / application["evidence_file"]
                )
                data = json.loads(source.read_text(encoding="utf-8"))

                if evidence_mutator is not None:
                    evidence_mutator(application["id"], data)

                (evidence_dir / source.name).write_text(
                    json.dumps(data),
                    encoding="utf-8",
                )

            return benchmark_apps.evaluate_benchmark(
                rubric=rubric or self.rubric,
                applications=applications or self.applications,
                evidence_dir=evidence_dir,
            )

    def test_rubric_weights_total_one_hundred(self) -> None:
        _, categories = benchmark_apps.build_criterion_index(
            self.rubric
        )

        self.assertEqual(
            sum(category["weight"] for category in categories),
            100,
        )

    def test_manifest_requires_exactly_four_applications(self) -> None:
        applications = copy.deepcopy(self.applications)
        applications["applications"].pop()

        with self.assertRaisesRegex(
            benchmark_apps.BenchmarkError,
            "Exactly four applications",
        ):
            self.evaluate(applications=applications)

    def test_current_baseline_is_valid_and_unranked(self) -> None:
        results, categories = self.evaluate()

        our_result = next(
            result
            for result in results
            if result.application_id == "our-application"
        )

        self.assertEqual(our_result.status, "complete")
        self.assertEqual(our_result.total_score, 88.25)
        self.assertEqual(
            [result.status for result in results].count("pending"),
            3,
        )

        report = benchmark_apps.render_report(
            rubric=self.rubric,
            applications=self.applications,
            results=results,
            categories=categories,
        )

        self.assertIn(
            "Incomplete. No final ranking is permitted.",
            report,
        )
        self.assertNotIn("## Final ranking", report)

    def test_positive_score_requires_evidence(self) -> None:
        def mutate(application_id: str, data: dict) -> None:
            if application_id == "our-application":
                data["criteria"]["visual-hierarchy"]["evidence"] = []

        with self.assertRaisesRegex(
            benchmark_apps.BenchmarkError,
            "score above zero requires evidence",
        ):
            self.evaluate(evidence_mutator=mutate)

    def test_score_four_requires_strong_evidence(self) -> None:
        def mutate(application_id: str, data: dict) -> None:
            if application_id == "our-application":
                data["criteria"]["core-study-flow"]["evidence"] = [
                    {
                        "type": "documentation",
                        "reference": "README.md",
                        "claim": "Claim without strong evidence.",
                    }
                ]

        with self.assertRaisesRegex(
            benchmark_apps.BenchmarkError,
            "score 4 requires",
        ):
            self.evaluate(evidence_mutator=mutate)

    def test_pending_application_cannot_contain_scores(self) -> None:
        def mutate(application_id: str, data: dict) -> None:
            if application_id == "lovable":
                data["criteria"] = {
                    "core-study-flow": {
                        "score": 4,
                        "evidence": [],
                    }
                }

        with self.assertRaisesRegex(
            benchmark_apps.BenchmarkError,
            "pending evidence must not contain scores",
        ):
            self.evaluate(evidence_mutator=mutate)

    def test_missing_criterion_is_rejected(self) -> None:
        def mutate(application_id: str, data: dict) -> None:
            if application_id == "our-application":
                del data["criteria"]["comparison-clarity"]

        with self.assertRaisesRegex(
            benchmark_apps.BenchmarkError,
            "missing criteria",
        ):
            self.evaluate(evidence_mutator=mutate)


if __name__ == "__main__":
    unittest.main()
