"""
generate_index
====================

Recursively collect every file dependency referenced by a MuJoCo MJCF file. The
script walks through <include> elements and asset references (meshes, textures,
heightfields, etc.) and emits a JSON list of the files that should be available
before loading the model in a browser.

Usage:
    python generate_index.py ../../config.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import DefaultDict, Dict, Iterable, List, Optional, Sequence, Set
from urllib.parse import unquote, urlparse

# Attributes that may reference external resources. They are treated uniformly so
# that any new MJCF elements using these attributes are picked up automatically.
REFERENCE_ATTRS: Set[str] = {"file", "href", "src"}

# Map MJCF tags to compiler attributes that provide directory hints for their
# assets. The hints greatly reduce false negatives when assets live outside the
# file's directory tree.
TAG_DIRECTORY_HINTS: Dict[str, Sequence[str]] = {
    "include": ("includedir",),
    "mesh": ("meshdir",),
    "texture": ("texturedir",),
    "heightfield": ("heightfielddir",),
    "skin": ("skindir",),
}


@dataclass
class Reference:
    """Container describing a resolved reference."""

    path: Optional[Path] = None
    text: Optional[str] = None

    @property
    def is_local(self) -> bool:
        return self.path is not None


def log_warning(message: str) -> None:
    """Print warnings to stderr so stdout remains valid JSON."""

    print(f"[warn] {message}", file=sys.stderr)


def strip_namespace(tag: str) -> str:
    """MuJoCo XML does not use namespaces, but strip them defensively."""

    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def unique_paths(paths: Iterable[Path]) -> List[Path]:
    """Deduplicate paths while preserving order."""

    seen: Set[str] = set()
    ordered: List[Path] = []
    for path in paths:
        key = str(path)
        if key in seen:
            continue
        seen.add(key)
        ordered.append(path)
    return ordered


def parse_compiler_directories(
    root: ET.Element, base_dir: Path
) -> Dict[str, List[Path]]:
    """Extract compiler directory hints and normalise them to absolute paths."""

    directories: DefaultDict[str, List[Path]] = defaultdict(list)
    for compiler in root.findall(".//compiler"):
        for attr, value in compiler.attrib.items():
            attr_lower = attr.lower()
            if not (attr_lower.endswith("dir") or attr_lower.endswith("path")):
                continue
            value = value.strip()
            if not value:
                continue
            candidate = normalise_to_path(value, base_dir)
            if candidate is None:
                continue
            directories[attr_lower].append(candidate)
    return {key: unique_paths(paths) for key, paths in directories.items()}


def normalise_to_path(raw_value: str, base_dir: Path) -> Optional[Path]:
    """Convert a string reference into a Path, handling URIs and relatives."""

    value = raw_value.strip()
    if not value:
        return None

    lower = value.lower()
    if lower.startswith("file://"):
        parsed = urlparse(value)
        path_str = unquote(parsed.path)
        if parsed.netloc:
            path_str = f"/{parsed.netloc}{path_str}"
        return Path(path_str).resolve(strict=False)

    candidate = Path(value)
    if candidate.is_absolute():
        return candidate.resolve(strict=False)
    return (base_dir / candidate).resolve(strict=False)


def merge_directory_hints(
    parent_hints: Dict[str, List[Path]], local_hints: Dict[str, List[Path]]
) -> Dict[str, List[Path]]:
    """Merge parent hints with local hints, appending local to parent for each key."""
    merged: Dict[str, List[Path]] = {k: v.copy() for k, v in parent_hints.items()}
    for key, paths in local_hints.items():
        if key in merged:
            merged[key].extend(paths)
        else:
            merged[key] = paths
    return {key: unique_paths(paths) for key, paths in merged.items()}


def build_search_order(
    tag: str,
    directory_hints: Dict[str, List[Path]],
    base_dir: Path,
    root_dir: Optional[Path] = None,
) -> List[Path]:
    """Construct the ordered list of directories to search for an asset."""

    order: List[Path] = []
    for hint in TAG_DIRECTORY_HINTS.get(tag, ()):  # tag-specific hints first
        order.extend(directory_hints.get(hint, []))
    # Fall back to every known compiler directory and finally the file's folder.
    for _, paths in directory_hints.items():
        order.extend(paths)
    order.append(base_dir)
    # As a last resort, also search relative to the original root file's directory
    # (the top-level model start location). This helps resolve include paths that
    # reference files relative to the scenes root rather than the current file.
    if root_dir is not None:
        order.append(root_dir)
    return unique_paths(order)


def resolve_local_file(
    value: str,
    base_dir: Path,
    search_dirs: Sequence[Path],
) -> Optional[Path]:
    """Resolve a local filesystem reference using MuJoCo's search rules."""

    # Empty strings are ignored; MuJoCo would treat them as missing assets too.
    if not value.strip():
        return None

    candidate = Path(value)
    if candidate.is_absolute():
        resolved = Path(os.path.realpath(candidate))
        if not resolved.exists():
            log_warning(f"Missing absolute asset: {resolved}")
            return None
        return resolved

    for directory in search_dirs:
        resolved = Path(os.path.realpath(directory / candidate))
        if resolved.exists():
            return resolved

    log_warning(f"Missing asset: {value} (searched {len(search_dirs)} locations)")
    return None


def resolve_reference(
    raw_value: str,
    *,
    tag: str,
    attr: str,
    base_dir: Path,
    root_dir: Path,
    directory_hints: Dict[str, List[Path]],
) -> Optional[Reference]:
    """Resolve a single attribute reference into a local path or plain string."""

    value = raw_value.strip()
    if not value:
        return None

    lower = value.lower()
    if lower.startswith("http://") or lower.startswith("https://"):
        return Reference(text=value)

    if lower.startswith("file://"):
        path = normalise_to_path(value, base_dir)
        if path is None or not path.exists():
            log_warning(f"Missing file URI: {value}")
            return None
        return Reference(path=Path(os.path.realpath(path)))

    if "@" in value and not value.startswith("@"):
        prefix, member = value.split("@", 1)
        if not member:
            log_warning(f"Invalid archive reference (empty member): {value}")
            return None
        search_dirs = build_search_order(tag, directory_hints, base_dir, root_dir)
        archive_path = resolve_local_file(prefix, base_dir, search_dirs)
        if archive_path is None:
            return None
        archive_rel = to_relative_string(archive_path, root_dir)
        return Reference(text=f"{archive_rel}@{member}")

    search_dirs = build_search_order(tag, directory_hints, base_dir, root_dir)
    resolved = resolve_local_file(value, base_dir, search_dirs)
    if resolved is None:
        return None
    return Reference(path=resolved)


def to_relative_string(path: Path, root_dir: Path) -> str:
    """Represent *path* relative to *root_dir* when possible."""

    try:
        return path.relative_to(root_dir).as_posix()
    except ValueError:
        # Compute a relative path even when outside the root_dir
        return os.path.relpath(path, start=root_dir).replace(os.sep, "/")


def collect_assets(root_file: Path) -> List[str]:
    """Return the sorted list of required asset files."""

    root_file = Path(os.path.realpath(root_file))
    if not root_file.exists():
        raise FileNotFoundError(root_file)

    root_dir = root_file.parent.resolve()
    visited: Set[Path] = set()
    collected: Set[str] = set()

    def walk(file_path: Path, parent_hints: Dict[str, List[Path]] = {}) -> None:
        real_path = Path(os.path.realpath(file_path))
        if real_path in visited:
            return
        visited.add(real_path)
        collected.add(to_relative_string(real_path, root_dir))

        if not real_path.exists():
            log_warning(f"Missing MJCF include: {real_path}")
            return

        try:
            tree = ET.parse(real_path)
        except ET.ParseError as exc:
            log_warning(f"Failed to parse {real_path}: {exc}")
            return

        base_dir = real_path.parent.resolve()
        root_element = tree.getroot()
        local_hints = parse_compiler_directories(root_element, base_dir)
        directory_hints = merge_directory_hints(parent_hints, local_hints)

        for element in root_element.iter():
            tag_name = strip_namespace(element.tag)
            for attr_name in REFERENCE_ATTRS:
                if attr_name not in element.attrib:
                    continue
                reference = resolve_reference(
                    element.attrib[attr_name],
                    tag=tag_name,
                    attr=attr_name,
                    base_dir=base_dir,
                    root_dir=root_dir,
                    directory_hints=directory_hints,
                )
                if reference is None:
                    continue
                if reference.is_local and reference.path is not None:
                    collected.add(to_relative_string(reference.path, root_dir))
                    if tag_name == "include" and attr_name == "file":
                        walk(reference.path, directory_hints)
                elif reference.text:
                    collected.add(reference.text)

    walk(root_file)
    return sorted(collected)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect MJCF assets for all models listed in config.json"
    )
    parser.add_argument("config", type=Path, help="Path to config.json")
    parser.add_argument(
        "--indent", type=int, default=2, help="JSON indent level (default: 2)"
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    config_path = args.config.resolve()  # Resolve to absolute path

    if not config_path.exists():
        print(f"[warn] Config file not found: {config_path}", file=sys.stderr)
        return 1

    # Get the directory containing the config file
    config_dir = config_path.parent

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    if "tasks" not in config:
        print("[warn] Invalid config: missing 'tasks'", file=sys.stderr)
        return 1

    for task in config["tasks"]:
        model_xml = task.get("model_xml")
        name = task.get("name", "Unnamed")
        if not model_xml:
            print(
                f"[warn] Skipping task '{name}' (no model_xml found)", file=sys.stderr
            )
            continue

        # Resolve model_xml path relative to the config directory
        xml_path = config_dir / model_xml
        try:
            dependencies = collect_assets(xml_path)
        except FileNotFoundError as exc:
            print(f"[warn] Model XML not found for '{name}': {exc}", file=sys.stderr)
            continue

        output_path = xml_path.parent / "index.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(dependencies, indent=args.indent), encoding="utf-8"
        )

        print(f"[info] Wrote {output_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
