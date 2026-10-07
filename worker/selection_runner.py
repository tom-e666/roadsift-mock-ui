#!/usr/bin/env python3
"""RoadSift selection worker entry point.

Usage:
  python worker/selection_runner.py --spec selection-job-spec.json \
      --adapter my_project.roadsift_adapter:WorkerAdapter

This file runs the orchestration and invariants. The adapter must implement actual
pool I/O, selection, privacy detection, masking, independent verification and export.
It intentionally FAILS if no real adapter is supplied. The mock UI cannot perform
Kaggle inference by itself.
"""
from __future__ import annotations

import argparse
import importlib
import json
from pathlib import Path
from typing import Any, Protocol, Sequence


class WorkerAdapter(Protocol):
    def load_candidates(self, source: dict[str, Any]) -> Sequence[Any]: ...
    def select(self, candidates: Sequence[Any], pipeline: dict[str, Any]) -> Sequence[Any]: ...
    def anonymize(self, samples: Sequence[Any], privacy: dict[str, Any]) -> Sequence[Any]: ...
    def verify(self, samples: Sequence[Any], privacy: dict[str, Any]) -> Sequence[Any]: ...
    def export(self, samples: Sequence[Any], spec: dict[str, Any]) -> str: ...


def validate(spec: dict[str, Any]) -> int:
    source = spec.get("source") or {}
    pipeline = spec.get("pipeline") or {}
    privacy = pipeline.get("privacy") or {}
    n = pipeline.get("budget")
    if type(n) is not int or n <= 0 or pipeline.get("exactN") is not True:
        raise ValueError("A positive integer EXACT-N budget is required")
    if not source.get("snapshotId") or not source.get("manifestUri"):
        raise ValueError("A versioned pool snapshot and manifest URI are required")
    if privacy.get("required") is not True or privacy.get("verification") != "fail-closed":
        raise ValueError("Privacy verification must be required and fail-closed")
    detector = privacy.get("detectorRef") or {}
    if not all(detector.get(key) for key in ("id", "version", "artifactUri")):
        raise ValueError("A registered privacy detector artifact is required")
    if privacy.get("method") not in ("gaussian-blur", "pixelation", "solid-mask"):
        raise ValueError("Unsupported privacy masking method")
    if not privacy.get("targets"):
        raise ValueError("Privacy detection targets are required")
    if privacy.get("onFailure") != "block-export":
        raise ValueError("Unsafe privacy failure policy")
    return n


def load_adapter(locator: str) -> WorkerAdapter:
    if ":" not in locator:
        raise ValueError("Adapter must use 'module:ClassName' format")
    module_name, class_name = locator.split(":", 1)
    module = importlib.import_module(module_name)
    return getattr(module, class_name)()


def run(spec: dict[str, Any], adapter: WorkerAdapter) -> str:
    """Enforce selection and privacy gates before export.

    Implementations MUST make verify() independently check sensitive regions;
    returning samples unchanged without verification is not compliant.
    """
    n = validate(spec)
    candidates = adapter.load_candidates(spec["source"])
    selected = list(adapter.select(candidates, spec["pipeline"]))
    if len(selected) != n:
        raise RuntimeError(f"Selection yielded {len(selected)} samples; expected {n}")
    sample_ids = [item["sample_id"] for item in selected]
    if len(set(sample_ids)) != n:
        raise RuntimeError("Duplicate sample_id in selected batch")

    privacy = spec["pipeline"]["privacy"]
    redacted = list(adapter.anonymize(selected, privacy))
    if len(redacted) != n:
        raise RuntimeError("Anonymization did not return EXACT-N outputs")
    if [item["sample_id"] for item in redacted] != sample_ids:
        raise RuntimeError("Privacy stage altered sample membership/order")
    verified = list(adapter.verify(redacted, privacy))
    if len(verified) != n:
        raise RuntimeError("Privacy verification failed; export blocked")
    if [item["sample_id"] for item in verified] != sample_ids:
        raise RuntimeError("Verification changed batch membership; export blocked")
    for sample in verified:
        if sample.get("privacy_status") != "verified":
            raise RuntimeError("Unverified sample; export blocked")
        if not sample.get("anonymized_uri") or sample.get("anonymized_uri") == sample.get("raw_uri"):
            raise RuntimeError("Missing isolated anonymized asset; export blocked")
    return adapter.export(verified, spec)


def main() -> None:
    parser = argparse.ArgumentParser(description="RoadSift selection worker")
    parser.add_argument("--spec", required=True, type=Path, help="Exported JSON job specification")
    parser.add_argument("--adapter", required=True, help="Production adapter module:Class")
    args = parser.parse_args()
    spec = json.loads(args.spec.read_text(encoding="utf-8"))
    output_uri = run(spec, load_adapter(args.adapter))
    print(json.dumps({"status": "completed", "outputUri": output_uri}))


if __name__ == "__main__":
    main()
