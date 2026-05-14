#!/usr/bin/env python3
"""
Extract CSS class names (or raw selector-ish tokens) from a CSS file to speed up
porting styles (e.g. theme/theme.css -> home-section scoped CSS).

Usage:
  python scripts/extract_theme_css_selectors.py
  python scripts/extract_theme_css_selectors.py --file theme/theme.css --contains media-wrapper,hd1,.highlight-text
  python scripts/extract_theme_css_selectors.py --file theme/theme.css --contains media-wrapper --selectors

Options:
  --file PATH       CSS file to read (default: theme/theme.css relative to repo root)
  --contains LIST   Comma-separated substrings; only lines containing any token are used (case-insensitive)
  --selectors       Print unique lines (trimmed) instead of only class names
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


CLASS_RE = re.compile(r"\.([a-zA-Z0-9_-]+)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract class names from a CSS file.")
    parser.add_argument(
        "--file",
        type=Path,
        default=None,
        help="Path to .css (default: <repo>/theme/theme.css)",
    )
    parser.add_argument(
        "--contains",
        type=str,
        default="",
        help="Comma-separated substrings to filter lines (optional)",
    )
    parser.add_argument(
        "--selectors",
        action="store_true",
        help="Print matching non-empty lines instead of deduped class names",
    )
    args = parser.parse_args()

    repo = Path(__file__).resolve().parent.parent
    css_path = args.file or (repo / "theme" / "theme.css")
    if not css_path.is_file():
        print(f"File not found: {css_path}", file=sys.stderr)
        return 1

    raw = css_path.read_text(encoding="utf-8", errors="replace").splitlines()
    needles = [n.strip().lower() for n in args.contains.split(",") if n.strip()]

    if needles:
        lines = [
            line
            for line in raw
            if any(n in line.lower() for n in needles)
        ]
    else:
        lines = raw

    if args.selectors:
        seen: set[str] = set()
        for line in lines:
            s = line.strip()
            if s and s not in seen:
                seen.add(s)
                print(s)
        return 0

    classes: set[str] = set()
    for line in lines:
        for m in CLASS_RE.finditer(line):
            classes.add(m.group(1))

    for name in sorted(classes):
        print(name)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
