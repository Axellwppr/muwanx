"""Scene configuration and management.

This module defines the SceneConfig dataclass and SceneHandle class for
managing MuJoCo scenes and their associated policies.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import mujoco
import onnx

from .policy import PolicyConfig

if TYPE_CHECKING:
    from .project import ProjectHandle


@dataclass
class SceneConfig:
    """Configuration for a MuJoCo scene."""

    name: str
    """Name of the scene."""

    model: mujoco.MjModel
    """MuJoCo model for the scene."""

    source_path: str | None = None
    """Optional source XML path for the scene."""

    policies: list[PolicyConfig] = field(default_factory=list)
    """List of policies available for this scene."""

    metadata: dict[str, Any] = field(default_factory=dict)
    """Additional metadata for the scene."""


class SceneHandle:
    """Handle for adding policies and configuring a scene.

    This class provides methods for adding policies and customizing scene properties.
    Similar to viser's client handles, this allows for a fluent API pattern.
    """

    def __init__(self, scene_config: SceneConfig, project: ProjectHandle) -> None:
        self._config = scene_config
        self._project = project

    @property
    def name(self) -> str:
        """Name of the scene."""
        return self._config.name

    @property
    def model(self) -> mujoco.MjModel:
        """MuJoCo model for the scene."""
        return self._config.model

    def add_policy(
        self,
        policy: onnx.ModelProto,
        name: str,
        *,
        metadata: dict[str, Any] | None = None,
        source_path: str | None = None,
    ) -> PolicyConfig:
        """Add an ONNX policy to this scene.

        Args:
            policy: ONNX model containing the policy.
            name: Name for the policy (displayed in the UI).
            metadata: Optional metadata dictionary for the policy.

        Returns:
            PolicyConfig object representing the added policy.
        """
        if metadata is None:
            metadata = {}

        policy_config = PolicyConfig(
            name=name, model=policy, metadata=metadata, source_path=source_path
        )
        self._config.policies.append(policy_config)
        return policy_config

    def set_metadata(self, key: str, value: Any) -> SceneHandle:
        """Set metadata for this scene.

        Args:
            key: Metadata key.
            value: Metadata value.

        Returns:
            Self for method chaining.
        """
        self._config.metadata[key] = value
        return self


__all__ = ["SceneConfig", "SceneHandle"]
