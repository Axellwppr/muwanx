"""MuwanxApp class for exporting and running applications.

This module defines the MuwanxApp class which represents a built application
that can be saved to disk or launched in a web browser.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path
from typing import Literal

import mujoco
import onnx

from .project import ProjectConfig


class MuwanxApp:
    """A built muwanx application ready to be saved or launched.

    This class encapsulates the final configuration and provides methods
    for exporting and running the application.
    """

    def __init__(self, projects: list[ProjectConfig]) -> None:
        self._projects = projects

    def save(
        self,
        output_dir: str | Path,
        *,
        format: Literal["web", "json"] = "web",
        overwrite: bool = True,
    ) -> Path:
        """Save the application to disk.

        Args:
            output_dir: Directory to save the application files.
            format: Output format - 'web' creates a complete web application,
                   'json' exports just the configuration.
            overwrite: Whether to overwrite existing files.

        Returns:
            Path to the saved application directory.
        """
        output_path = Path(output_dir)

        if output_path.exists() and not overwrite:
            raise FileExistsError(
                f"Output directory {output_path} already exists. "
                "Set overwrite=True to overwrite."
            )

        output_path.mkdir(parents=True, exist_ok=True)

        if format == "json":
            self._save_json(output_path)
        elif format == "web":
            self._save_web(output_path)
        else:
            raise ValueError(f"Unknown format: {format}")

        return output_path

    def _save_json(self, output_path: Path) -> None:
        """Save configuration as JSON."""
        config = {
            "version": "0.0.0",
            "projects": [
                {
                    "name": project.name,
                    "id": project.id,
                    "metadata": project.metadata,
                    "scenes": [
                        {
                            "name": scene.name,
                            "metadata": scene.metadata,
                            "policies": [
                                {
                                    "name": policy.name,
                                    "metadata": policy.metadata,
                                }
                                for policy in scene.policies
                            ],
                        }
                        for scene in project.scenes
                    ],
                }
                for project in self._projects
            ],
        }

        config_file = output_path / "config.json"
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)

    def _save_web(self, output_path: Path) -> None:
        """Save as a complete web application."""
        # Create directory structure
        assets_dir = output_path / "assets"
        scene_dir = assets_dir / "scene"
        policy_dir = assets_dir / "policy"

        assets_dir.mkdir(exist_ok=True)
        scene_dir.mkdir(exist_ok=True)
        policy_dir.mkdir(exist_ok=True)

        # Save configuration
        self._save_json(output_path)

        # Save MuJoCo models and ONNX policies
        for project in self._projects:
            project_name = self._sanitize_name(project.name)

            for scene in project.scenes:
                scene_name = self._sanitize_name(scene.name)
                scene_path = scene_dir / project_name / scene_name
                scene_path.mkdir(parents=True, exist_ok=True)

                # Save MuJoCo model
                # mj_saveLastXML writes directly to file, so we provide the full path
                scene_xml_path = str(scene_path / "scene.xml")
                mujoco.mj_saveLastXML(scene_xml_path, scene.model)

                # Save policies
                for policy in scene.policies:
                    policy_name = self._sanitize_name(policy.name)
                    policy_path = policy_dir / project_name / scene_name
                    policy_path.mkdir(parents=True, exist_ok=True)

                    onnx.save(policy.model, str(policy_path / f"{policy_name}.onnx"))

        print(f"✓ Saved muwanx application to: {output_path}")

    def _sanitize_name(self, name: str) -> str:
        """Sanitize a name for use as a filename."""
        return name.lower().replace(" ", "_").replace("-", "_")

    def launch(
        self,
        *,
        host: str = "localhost",
        port: int = 8080,
        open_browser: bool = True,
    ) -> None:
        """Launch the application in a local web server.

        Args:
            host: Host to bind the server to.
            port: Port to run the server on.
            open_browser: Whether to automatically open a browser.
        """
        warnings.warn(
            "launch() is not yet implemented. Use save() to export your application "
            "and serve it with your preferred web server.",
            category=UserWarning,
            stacklevel=2,
        )


__all__ = ["MuwanxApp"]
