"""CLI entry points for muwanx scripts."""

import subprocess
import sys
from pathlib import Path


def _run_script(script_path: str) -> None:
    """Run a script."""
    project_root = Path(__file__).parent.parent.parent
    script = project_root / script_path

    if not script.exists():
        print(f"Error: {script} not found", file=sys.stderr)
        sys.exit(1)

    result = subprocess.run(
        [sys.executable, str(script)],
        check=False,
        cwd=project_root,
    )
    sys.exit(result.returncode)


def demo() -> None:
    """Run examples/demo/demo.py"""
    _run_script("examples/demo/demo.py")


def simple() -> None:
    """Run examples/demo/simple.py"""
    _run_script("examples/demo/simple.py")


def mjlab() -> None:
    """Run examples/mjlab/mjlab_integration.py"""
    _run_script("examples/mjlab/mjlab_integration.py")


def hello_world() -> None:
    """Run examples/tutorial/hello_world.py"""
    _run_script("examples/tutorial/hello_world.py")
