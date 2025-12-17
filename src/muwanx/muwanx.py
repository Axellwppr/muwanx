"""Muwanx: Browser-based MuJoCo Playground

This module provides a builder interface for creating interactive MuJoCo simulations
with ONNX policies that run entirely in the browser. The API is inspired by viser's
clean and intuitive builder pattern.

This is the main module that re-exports all public components from the submodules.
"""

from __future__ import annotations

# Import and re-export all public components
from .app import MuwanxApp
from .builder import Builder
from .policy import PolicyConfig
from .project import ProjectConfig, ProjectHandle
from .scene import SceneConfig, SceneHandle

__all__ = [
    "Builder",
    "MuwanxApp",
    "ProjectHandle",
    "SceneHandle",
    "ProjectConfig",
    "SceneConfig",
    "PolicyConfig",
]
