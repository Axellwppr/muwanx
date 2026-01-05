"""Policy configuration and management.

This module defines the PolicyConfig dataclass for ONNX policy configuration.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import onnx


@dataclass
class PolicyConfig:
    """Configuration for an ONNX policy."""

    name: str
    """Name of the policy."""

    model: onnx.ModelProto
    """ONNX model for the policy."""

    metadata: dict[str, Any] = field(default_factory=dict)
    """Additional metadata for the policy."""

    source_path: str | None = None
    """Optional source path for the policy ONNX file."""


__all__ = ["PolicyConfig"]
