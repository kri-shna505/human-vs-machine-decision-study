from __future__ import annotations

import copy
import importlib.util
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = (
    Path(__file__).resolve().parents[1] / "benchmark_protocol.py"
)
SPEC = importlib.util.spec_from_file_location(
    "benchmark_protocol",
    SCRIPT_PATH,
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load benchmark_protocol.py")

benchmark_protocol = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = benchmark_protocol
SPEC.loader.exec_module(benchmark_protocol)


class BenchmarkProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.repository_root = Path(__file__).resolve().parents[2]

    def copy_protocol_fixture(self) -> Path:
        temporary_directory = Path(
            tempfile.mkdtemp(prefix="benchmark-protocol-")
        )
        for relative_path in (
            "benchmark/protocol.json",
            "benchmark/applications.json",
            "benchmark/shared-prompt.md",
            "benchmark/rubric.json",
            "benchmark/evidence/our-application.json",
            "benchmark/evidence/lovable.json",
            "benchmark/evidence/replit.json",
            "benchmark/evidence/bolt-new.json",
        ):
            source = self.repository_root / relative_path
            destination = temporary_directory / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)

        self.addCleanup(
            lambda: shutil.rmtree(
                temporary_directory,
                ignore_errors=True,
            )
        )
        return temporary_directory

    def validate(self, repository_root: Path):
        return benchmark_protocol.validate_protocol(
            repository_root=repository_root,
            protocol_path=repository_root / "benchmark/protocol.json",
            applications_path=repository_root
            / "benchmark/applications.json",
        )

    def test_frozen_repository_protocol_is_valid(self) -> None:
        result = self.validate(self.repository_root)

        self.assertEqual(
            result["protocol_id"],
            "human-vs-machine-four-application-protocol-v1",
        )
        self.assertEqual(result["protocol_version"], "1.0.0")
        self.assertEqual(len(result["prompt_sha256"]), 64)
        self.assertEqual(len(result["protocol_sha256"]), 64)

    def test_prompt_drift_is_rejected(self) -> None:
        repository_root = self.copy_protocol_fixture()
        prompt_path = repository_root / "benchmark/shared-prompt.md"
        prompt_path.write_text(
            prompt_path.read_text(encoding="utf-8")
            + "\nUnapproved requirement change.\n",
            encoding="utf-8",
        )

        with self.assertRaisesRegex(
            benchmark_protocol.ProtocolError,
            "Frozen prompt hash mismatch",
        ):
            self.validate(repository_root)

    def test_rubric_drift_is_rejected(self) -> None:
        repository_root = self.copy_protocol_fixture()
        rubric_path = repository_root / "benchmark/rubric.json"
        rubric = json.loads(rubric_path.read_text(encoding="utf-8"))
        rubric["categories"][0]["weight"] = 17
        rubric_path.write_text(
            json.dumps(rubric, indent=2) + "\n",
            encoding="utf-8",
        )

        with self.assertRaisesRegex(
            benchmark_protocol.ProtocolError,
            "Frozen rubric hash mismatch",
        ):
            self.validate(repository_root)

    def test_manifest_protocol_hash_drift_is_rejected(self) -> None:
        repository_root = self.copy_protocol_fixture()
        applications_path = repository_root / "benchmark/applications.json"
        applications = json.loads(
            applications_path.read_text(encoding="utf-8")
        )
        applications["protocol"]["normalized_sha256"] = "0" * 64
        applications_path.write_text(
            json.dumps(applications, indent=2) + "\n",
            encoding="utf-8",
        )

        with self.assertRaisesRegex(
            benchmark_protocol.ProtocolError,
            "applications.protocol.normalized_sha256",
        ):
            self.validate(repository_root)

    def test_complete_evidence_requires_protocol_conformance(self) -> None:
        repository_root = self.copy_protocol_fixture()
        evidence_path = (
            repository_root
            / "benchmark/evidence/our-application.json"
        )
        evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
        evidence["evaluation"]["protocol_conformance"] = "pending"
        evidence_path.write_text(
            json.dumps(evidence, indent=2) + "\n",
            encoding="utf-8",
        )

        with self.assertRaisesRegex(
            benchmark_protocol.ProtocolError,
            "complete evidence requires complete protocol conformance",
        ):
            self.validate(repository_root)

    def test_source_changes_remain_prohibited(self) -> None:
        repository_root = self.copy_protocol_fixture()
        protocol_path = repository_root / "benchmark/protocol.json"
        protocol = json.loads(protocol_path.read_text(encoding="utf-8"))
        protocol["allowed_fixes"]["source_code_changes"] = [
            "one small source change"
        ]
        protocol_path.write_text(
            json.dumps(protocol, indent=2) + "\n",
            encoding="utf-8",
        )

        applications_path = repository_root / "benchmark/applications.json"
        applications = json.loads(
            applications_path.read_text(encoding="utf-8")
        )
        applications["protocol"][
            "normalized_sha256"
        ] = benchmark_protocol.normalized_sha256(protocol_path)
        applications_path.write_text(
            json.dumps(applications, indent=2) + "\n",
            encoding="utf-8",
        )

        for application in applications["applications"]:
            evidence_path = repository_root / application["evidence_file"]
            evidence = json.loads(
                evidence_path.read_text(encoding="utf-8")
            )
            evidence["evaluation"][
                "protocol_sha256"
            ] = applications["protocol"]["normalized_sha256"]
            evidence_path.write_text(
                json.dumps(evidence, indent=2) + "\n",
                encoding="utf-8",
            )

        with self.assertRaisesRegex(
            benchmark_protocol.ProtocolError,
            "source code changes must remain prohibited",
        ):
            self.validate(repository_root)

    def test_required_screenshot_count_is_frozen(self) -> None:
        repository_root = self.copy_protocol_fixture()
        protocol_path = repository_root / "benchmark/protocol.json"
        protocol = json.loads(protocol_path.read_text(encoding="utf-8"))
        protocol["required_screenshots"].pop()
        protocol_path.write_text(
            json.dumps(protocol, indent=2) + "\n",
            encoding="utf-8",
        )

        applications_path = repository_root / "benchmark/applications.json"
        applications = json.loads(
            applications_path.read_text(encoding="utf-8")
        )
        applications["protocol"][
            "normalized_sha256"
        ] = benchmark_protocol.normalized_sha256(protocol_path)
        applications_path.write_text(
            json.dumps(applications, indent=2) + "\n",
            encoding="utf-8",
        )

        for application in applications["applications"]:
            evidence_path = repository_root / application["evidence_file"]
            evidence = json.loads(
                evidence_path.read_text(encoding="utf-8")
            )
            evidence["evaluation"][
                "protocol_sha256"
            ] = applications["protocol"]["normalized_sha256"]
            evidence_path.write_text(
                json.dumps(evidence, indent=2) + "\n",
                encoding="utf-8",
            )

        with self.assertRaisesRegex(
            benchmark_protocol.ProtocolError,
            "exactly 9 required screenshots",
        ):
            self.validate(repository_root)


if __name__ == "__main__":
    unittest.main()
