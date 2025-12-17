"""Project configuration and management.

This module defines the ProjectConfig dataclass and ProjectHandle class for
managing projects containing multiple scenes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import mujoco

from .scene import SceneConfig, SceneHandle

if TYPE_CHECKING:
    from .builder import Builder


@dataclass
class ProjectConfig:
    """Configuration for a project containing multiple scenes."""

    name: str
    """Name of the project."""

    id: str | None = None
    """Optional ID for the project used in URL routing (e.g., 'menagerie' for /#/menagerie/)."""

    scenes: list[SceneConfig] = field(default_factory=list)
    """List of scenes in the project."""

    metadata: dict[str, Any] = field(default_factory=dict)
    """Additional metadata for the project."""


class ProjectHandle:
    """Handle for adding scenes and configuring a project.

    This class provides methods for adding scenes and customizing project properties.
    Similar to viser's server handle, this allows for hierarchical configuration.
    """

    def __init__(self, project_config: ProjectConfig, builder: Builder) -> None:
        self._config = project_config
        self._builder = builder

    @property
    def name(self) -> str:
        """Name of the project."""
        return self._config.name

    @property
    def id(self) -> str | None:
        """Optional ID of the project for URL routing."""
        return self._config.id

    def add_scene(
        self,
        model: mujoco.MjModel,
        name: str,
        *,
        metadata: dict[str, Any] | None = None,
    ) -> SceneHandle:
        """Add a MuJoCo scene to this project.

        Args:
            model: MuJoCo model for the scene.
            name: Name for the scene (displayed in the UI).
            metadata: Optional metadata dictionary for the scene.

        Returns:
            SceneHandle for adding policies and further configuration.
        """
        if metadata is None:
            metadata = {}

        scene_config = SceneConfig(name=name, model=model, metadata=metadata)
        self._config.scenes.append(scene_config)
        return SceneHandle(scene_config, self)

    def set_metadata(self, key: str, value: Any) -> ProjectHandle:
        """Set metadata for this project.

        Args:
            key: Metadata key.
            value: Metadata value.

        Returns:
            Self for method chaining.
        """
        self._config.metadata[key] = value
        return self


__all__ = ["ProjectConfig", "ProjectHandle"]
