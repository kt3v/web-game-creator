#!/usr/bin/env python3
"""Copy the plugin's bundled game template into an empty project directory."""

import argparse
import html
import json
import re
import shutil
import tempfile
from pathlib import Path


PLUGIN_ROOT = Path(__file__).resolve().parents[3]
TEMPLATE = PLUGIN_ROOT / "assets" / "project-template"
ALLOWED_EXISTING = {".git", ".DS_Store"}


def replace_exact(path: Path, old: str, new: str) -> None:
    content = path.read_text(encoding="utf-8")
    if content.count(old) != 1:
        raise RuntimeError(f"Expected one occurrence of {old!r} in {path}")
    path.write_text(content.replace(old, new), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", required=True, type=Path, help="Existing empty project directory")
    parser.add_argument("--slug", required=True, help="Lowercase kebab-case game identifier")
    parser.add_argument("--title", help="Player-facing title; defaults to the slug in title case")
    args = parser.parse_args()

    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.slug):
        parser.error("--slug must be lowercase kebab-case")
    title = args.title or args.slug.replace("-", " ").title()
    if not title.strip():
        parser.error("--title must not be empty")

    target = args.target.expanduser().resolve()
    if not target.is_dir():
        parser.error("--target must be an existing directory")
    unexpected = sorted(p.name for p in target.iterdir() if p.name not in ALLOWED_EXISTING)
    if unexpected:
        parser.error("target is not empty: " + ", ".join(unexpected))
    if not TEMPLATE.is_dir():
        parser.error(f"bundled template not found at {TEMPLATE}")

    with tempfile.TemporaryDirectory(prefix="game-init-") as staging_dir:
        staged = Path(staging_dir) / "project"
        shutil.copytree(TEMPLATE, staged)

        package_path = staged / "package.json"
        package = json.loads(package_path.read_text(encoding="utf-8"))
        package["name"] = args.slug
        package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

        lock_path = staged / "package-lock.json"
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
        lock["name"] = args.slug
        lock["packages"][""]["name"] = args.slug
        lock_path.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")

        config_path = staged / "src" / "app" / "config.ts"
        replace_exact(config_path, "id: 'poki-template'", f"id: {json.dumps(args.slug)}")
        replace_exact(config_path, "title: 'Game template'", f"title: {json.dumps(title, ensure_ascii=False)}")

        index_path = staged / "index.html"
        replace_exact(index_path, "<title>Game template</title>", f"<title>{html.escape(title)}</title>")
        replace_exact(index_path, 'aria-label="Game template"', f'aria-label="{html.escape(title, quote=True)}"')

        shutil.copytree(staged, target, dirs_exist_ok=True)

    print(f"Initialized {title} ({args.slug}) in {target}")


if __name__ == "__main__":
    main()
