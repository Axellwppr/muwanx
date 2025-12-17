"""Muwanx: Browser-based MuJoCo Playground

Interactive MuJoCo simulations with ONNX policies running entirely in the browser.

Modules:
    config: Configuration dataclasses for projects, scenes, and policies
    handles: Handle classes for fluent API (SceneHandle, ProjectHandle)
    app: MuwanxApp class for exporting and running applications
    builder: Builder class for constructing muwanx applications
    muwanx: Main module that re-exports all public components
"""

__version__ = "0.0.0"

from .muwanx import (
    Builder,
    MuwanxApp,
    PolicyConfig,
    ProjectConfig,
    ProjectHandle,
    SceneConfig,
    SceneHandle,
)

__all__ = [
    "Builder",
    "MuwanxApp",
    "ProjectHandle",
    "SceneHandle",
    "ProjectConfig",
    "SceneConfig",
    "PolicyConfig",
]
