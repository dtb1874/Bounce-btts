from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "_stabilization-source"


def changed_paths() -> list[Path]:
    result = subprocess.run(
        ["git", "diff", "--name-only", "HEAD"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    paths: list[Path] = []
    for raw in result.stdout.splitlines():
        path = Path(raw.strip())
        if not raw.strip() or not (ROOT / path).is_file():
            continue
        paths.append(path)
    return paths


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, str]] = []
    for relative in changed_paths():
        source = ROOT / relative
        try:
            source.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        capture_relative = Path(f"{relative.as_posix()}.txt")
        target = OUT / capture_relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        manifest.append({
            "source": relative.as_posix(),
            "capture": capture_relative.as_posix(),
        })

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Captured {len(manifest)} build-patched source files for stabilisation review")


if __name__ == "__main__":
    main()
