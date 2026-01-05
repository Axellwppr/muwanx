"""Muwanx: Browser-based MuJoCo Playground

Interactive MuJoCo simulations with ONNX policies running entirely in the browser.
"""

__version__ = "0.0.3"

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
