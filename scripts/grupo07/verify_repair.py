#!/usr/bin/env python3
"""Read-only preservation gate for this controlled repair (fixed audited base)."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = "e8388a994e7831516044e401e475c81044f874ef"
COLLECTION = "postman/grupo-07-carrito-ecommerce.postman_collection.json"
ALLOWED_MODIFIED = {
    COLLECTION,
    ".github/workflows/postman-grupo07-juan-regression.yml",
    "scripts/grupo07/newman_report.py",
}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def main():
    assert git("rev-parse", "HEAD").decode().strip() == BASE, "Repair base changed; reevaluate before proceeding"
    paths = git("ls-tree", "-r", "--name-only", "-z", BASE).decode().split("\0")[:-1]
    changed, evidence_hashes = [], {}
    for path in paths:
        target = ROOT / path
        assert target.is_file(), f"STOP: deleted or renamed file: {path}"
        # Apply Git's checkout filters so Windows CRLF files are compared byte
        # for byte with the expected worktree representation of the base blob.
        before = git("cat-file", "--filters", f"{BASE}:{path}")
        after = target.read_bytes()
        if before != after:
            # Git can retain a pre-existing mixed-EOL worktree file when its
            # blob is unchanged across checkout. Do not mistake that for an edit.
            blob = git("show", f"{BASE}:{path}")
            eol_only = after.replace(b"\r\n", b"\n") == blob.replace(b"\r\n", b"\n")
            if not eol_only:
                assert path in ALLOWED_MODIFIED, f"STOP: unexpected existing-file change: {path}"
                changed.append(path)
        if "/evidence/" in path or "EVIDENCIA" in path:
            assert before == after, f"STOP: historical evidence changed: {path}"
            evidence_hashes[path] = hashlib.sha256(after).hexdigest()
    before = json.loads(git("show", f"{BASE}:{COLLECTION}"))
    after = json.loads((ROOT / COLLECTION).read_bytes())
    assert len(before["item"]) == 20 and len(after["item"]) == 21
    assert before["item"] == after["item"][:20], "STOP: original request objects changed"
    folder = after["item"][20]
    assert folder["name"] == "Semana 3 - SQL dinamico" and len(folder["item"]) == 2
    historical = json.loads(git("show", "355de72dbc54034157c008cb91b33fa637970da7:" + COLLECTION))
    assert folder == next(x for x in historical["item"] if x["name"] == folder["name"])
    assert after["event"] == historical["event"]
    assert after["variable"][:-1] == before["variable"]
    assert after["variable"][-1] == next(x for x in historical["variable"] if x["key"] == "g7Cantidad")
    for key in before.keys() - {"item", "variable", "event"}:
        assert after[key] == before[key], f"STOP: unexpected collection metadata change: {key}"
    print(json.dumps({"base": BASE, "base_files_checked": len(paths),
                      "existing_files_modified": changed, "deleted": 0, "renamed": 0,
                      "original_requests_identical": 20, "sql_requests_added": 2,
                      "historical_evidence_sha256": evidence_hashes}, indent=2))


if __name__ == "__main__":
    main()
