#!/usr/bin/env python3
"""Bind test evidence to the exact files consumed by a documented test profile.

The local profile covers runtime, build, test, and CI inputs. Documentation,
research notes, reports, releases, toolchains, caches, and extracted copies are
excluded. File modes are not part of this content digest. A snapshot must be
captured BEFORE a test and verified AFTER it; adding hashes to an old report
does not establish that the current files were tested.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
ALGORITHM = "sha256-path-nul-hash-newline-v1"
INPUT_DIRECTORIES = ("bin", "core", "dist", "examples", "tests", "tools", "web", ".github")
INPUT_ROOT_FILES = ("package.json", "moon.mod", "moon.mod.json", "moon.pkg", "moon.pkg.json", "toolchain.lock.json")
EXCLUDED = {".git", ".tools", "_build", ".acceptance", "node_modules", "__pycache__", ".DS_Store"}
PROFILES = ("local", "crosscheck", "oracle", "oracle-generated", "interfaces", "browser", "performance")


class EvidenceError(ValueError):
    pass


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def digest_files(files: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for name, value in sorted(files.items()):
        digest.update(name.encode("utf-8") + b"\0" + value.encode("ascii") + b"\n")
    return digest.hexdigest()


def _selected(root: Path, patterns) -> set[Path]:
    selected = set()
    for pattern in patterns:
        for path in root.glob(pattern):
            relative = path.relative_to(root)
            if any(part in EXCLUDED for part in relative.parts) or path.suffix in {".pyc", ".pyo"}:
                continue
            if path.is_symlink():
                raise EvidenceError(f"Evidence inputs cannot be symlinks: {relative}")
            if path.is_file():
                selected.add(path)
    return selected


def profile_files(root: Path, profile: str) -> list[Path]:
    root = root.resolve()
    if profile not in PROFILES:
        raise EvidenceError(f"Unknown evidence profile: {profile}")
    if profile == "local":
        patterns = list(INPUT_ROOT_FILES) + [f"{directory}/**/*" for directory in INPUT_DIRECTORIES]
    else:
        patterns = list(INPUT_ROOT_FILES) + ["core/**/*", "dist/*.mjs", "tools/build.sh", "tools/moon",
                                            "tools/engine-wrapper.mjs", "tools/evidence.py"]
        if profile == "crosscheck":
            patterns += ["tools/reference.py", "tools/crosscheck.py", "tests/test_reference.py"]
        elif profile == "oracle":
            patterns += ["tools/oracle-compare.mjs", "tools/oracle-run.py", "tests/oracle/**/*",
                         "research/sources/herd-*.cat", "reports/oracle-herd7.json"]
        elif profile == "oracle-generated":
            patterns += ["tools/oracle-generated*", "tools/oracle-run.py", "tests/oracle-generated/**/*",
                         "research/sources/herd-*.cat"]
        elif profile == "interfaces":
            patterns += ["bin/**/*", "web/**/*", "examples/**/*", "tools/serve.mjs", "tools/check-interfaces.mjs"]
        elif profile == "browser":
            patterns += ["bin/**/*", "web/**/*", "examples/**/*", "tools/serve.mjs", "tools/*browser*", "tests/*browser*"]
        elif profile == "performance":
            patterns += ["tools/benchmark.py", "tests/performance-baseline/**/*"]
    selected = _selected(root, patterns)
    if not selected:
        raise EvidenceError(f"No files found for evidence profile {profile}")
    return sorted(selected, key=lambda path: path.relative_to(root).as_posix())


def snapshot(root: Path = ROOT, profile: str = "local") -> dict:
    root = Path(root).resolve()
    files = {path.relative_to(root).as_posix(): sha256(path) for path in profile_files(root, profile)}
    return {"schemaVersion": 1, "profile": profile, "algorithm": ALGORITHM,
            "digest": digest_files(files), "files": files}


def verify_snapshot(root: Path, recorded: dict, profile: str | None = None) -> dict:
    if not isinstance(recorded, dict) or recorded.get("schemaVersion") != 1 or recorded.get("algorithm") != ALGORITHM:
        raise EvidenceError("Missing or unsupported input evidence; rerun the producer")
    expected_profile = profile or recorded.get("profile")
    if recorded.get("profile") != expected_profile or expected_profile not in PROFILES:
        raise EvidenceError(f"Unexpected evidence profile; expected {expected_profile}")
    files = recorded.get("files")
    if not isinstance(files, dict) or not files or any(
            not isinstance(name, str) or not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{64}", value)
            for name, value in files.items()):
        raise EvidenceError("Malformed evidence file hashes")
    if digest_files(files) != recorded.get("digest"):
        raise EvidenceError("Evidence digest does not match its recorded file hashes")
    current = snapshot(root, expected_profile)
    if current["files"] != files:
        added = sorted(current["files"].keys() - files.keys())
        removed = sorted(files.keys() - current["files"].keys())
        changed = sorted(name for name in files.keys() & current["files"].keys() if files[name] != current["files"][name])
        raise EvidenceError(f"Stale {expected_profile} evidence: added={added}, removed={removed}, changed={changed}; rerun the producer")
    return current


def project_version(root: Path = ROOT) -> str:
    value = json.loads((Path(root) / "package.json").read_text())["version"]
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?", value):
        raise EvidenceError("package.json must contain a path-safe semantic version")
    return value


def acceptance_binding(root: Path, report: dict | None, archive: Path | None = None) -> dict:
    """Separate current input-tree evidence from an exact archive attestation."""
    result = {"sourceTreeVerified": False, "exactArchiveVerified": False, "reason": "not-run"}
    if not report or report.get("status") != "passed":
        result["reason"] = "not-run" if not report else "acceptance-failed"
        return result
    try:
        verify_snapshot(root, report.get("inputTree"), "local")
    except EvidenceError as error:
        result["reason"] = str(error)
        return result
    result["sourceTreeVerified"] = True
    archive = archive or Path(root) / "release" / f"LitmusLab-{project_version(root)}.zip"
    result["exactArchiveVerified"] = (archive.is_file() and report.get("archive") == archive.name
                                        and report.get("archiveSha256") == sha256(archive))
    result["reason"] = "current-archive" if result["exactArchiveVerified"] else "input-tree-current-archive-not-attested"
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["snapshot", "verify"])
    parser.add_argument("profile", nargs="?", choices=PROFILES)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--snapshot-file", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "snapshot":
            result = snapshot(args.root, args.profile or "local")
        else:
            if args.snapshot_file is None:
                recorded = json.load(sys.stdin)
            else:
                recorded = json.loads(args.snapshot_file.read_text())
            result = verify_snapshot(args.root, recorded, args.profile)
        print(json.dumps(result, sort_keys=True))
        return 0
    except (EvidenceError, OSError, KeyError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
