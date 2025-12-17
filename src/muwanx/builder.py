"""Builder class for constructing muwanx applications.

This module provides the main Builder class which serves as the entry point
for programmatically creating interactive MuJoCo simulations.
"""

from __future__ import annotations

import warnings
from typing import Any

from .app import MuwanxApp
from .project import ProjectConfig, ProjectHandle


class Builder:
    """Builder for creating muwanx applications.

    The Builder class provides a fluent API for programmatically constructing
    interactive MuJoCo simulations with ONNX policies. It follows a structure
    inspired by viser, with hierarchical handles for projects, scenes, and policies.

    Example:
        >>> import muwanx as mwx
        >>> import mujoco
        >>> import onnx
        >>>
        >>> builder = mwx.Builder()
        >>>
        >>> # Create a project
        >>> project = builder.add_project(name="My Robot")
        >>>
        >>> # Add a scene to the project
        >>> scene = project.add_scene(
        ...     model=mujoco.MjModel.from_xml_path("robot.xml"),
        ...     name="Walking"
        ... )
        >>>
        >>> # Add policies to the scene
        >>> scene.add_policy(
        ...     policy=onnx.load("walk.onnx"),
        ...     name="Walk Forward"
        ... )
        >>>
        >>> # Build and save
        >>> app = builder.build()
        >>> app.save("my_app")
    """

    def __init__(self) -> None:
        """Initialize a new Builder instance."""
        self._projects: list[ProjectConfig] = []

    def add_project(
        self,
        name: str,
        *,
        id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ProjectHandle:
        """Add a new project to the builder.

        Projects serve as top-level containers for organizing related scenes.
        Each project can contain multiple scenes, and scenes can contain
        multiple policies.

        Args:
            name: Name for the project (displayed in the UI).
            id: Optional ID for URL routing (e.g., 'menagerie' creates /#/menagerie/).
                If not provided, the project is part of the main route.
            metadata: Optional metadata dictionary for the project.

        Returns:
            ProjectHandle for adding scenes and further configuration.

        Example:
            >>> builder = mwx.Builder()
            >>> demo = builder.add_project(name="Demo Robots")
            >>> menagerie = builder.add_project(name="MuJoCo Menagerie", id="menagerie")
        """
        if metadata is None:
            metadata = {}

        project_config = ProjectConfig(name=name, id=id, metadata=metadata)
        self._projects.append(project_config)
        return ProjectHandle(project_config, self)

    def build(self) -> MuwanxApp:
        """Build the application from the configured projects.

        This method finalizes the configuration and creates a MuwanxApp
        instance that can be saved or launched.

        Returns:
            MuwanxApp instance ready to be saved or launched.

        Example:
            >>> builder = mwx.Builder()
            >>> project = builder.add_project("My Project")
            >>> # ... configure scenes and policies ...
            >>> app = builder.build()
            >>> app.save("output")
        """
        if not self._projects:
            warnings.warn(
                "Building an empty application with no projects. "
                "Use add_project() to add content.",
                category=UserWarning,
                stacklevel=2,
            )

        return MuwanxApp(self._projects)

    def get_projects(self) -> list[ProjectConfig]:
        """Get a copy of all project configurations.

        Returns:
            List of ProjectConfig objects.
        """
        return self._projects.copy()


__all__ = ["Builder"]
