"""Builder class for constructing muwanx applications.

This module provides the main Builder class which serves as the entry point
for programmatically creating interactive MuJoCo simulations.
"""

from __future__ import annotations

import inspect
import json
import shutil
import warnings
from pathlib import Path
from typing import Any

import mujoco
import onnx

from ._build_client import ClientBuilder
from .app import MuwanxApp
from .project import ProjectConfig, ProjectHandle


class Builder:
    """Builder for creating muwanx applications.

    The Builder class provides a fluent API for programmatically constructing
    interactive MuJoCo simulations with ONNX policies. It handles projects, scenes, and policies hierarchically.

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
        >>> app = builder.build("my_app")
        >>> app.launch()
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
        """
        if metadata is None:
            metadata = {}

        project_config = ProjectConfig(name=name, id=id, metadata=metadata)
        self._projects.append(project_config)
        return ProjectHandle(project_config, self)

    def build(self, output_dir: str | Path | None = None) -> MuwanxApp:
        """Build the application from the configured projects.

        This method finalizes the configuration and creates a MuwanxApp
        instance. If output_dir is provided, it also saves the application
        to that directory. If output_dir is not provided, it defaults to
        'dist' in the caller's directory.

        Args:
            output_dir: Optional directory to save the application files.
                       If None, defaults to 'dist' in the caller's directory.

        Returns:
            MuwanxApp instance ready to be launched.

        Example:
            >>> builder = mwx.Builder()
            >>> project = builder.add_project("My Project")
            >>> # ... configure scenes and policies ...
            >>> app = builder.build() # Saves to ./dist
            >>> app.launch()
        """
        if not self._projects:
            warnings.warn(
                "Building an empty application with no projects. "
                "Use add_project() to add content.",
                category=UserWarning,
                stacklevel=2,
            )

        # Get caller's file path
        frame = inspect.stack()[1]
        caller_file = frame.filename
        # Handle REPL or interactive mode where filename might be <stdin> or similar
        if caller_file.startswith("<") and caller_file.endswith(">"):
            base_dir = Path.cwd()
        else:
            base_dir = Path(caller_file).parent

        if output_dir is None:
            output_path = base_dir / "dist"
        else:
            # Resolve relative paths against the caller's directory
            output_path = base_dir / Path(output_dir)

        self._save_web(output_path)

        return MuwanxApp(output_path)

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
        if output_path.exists():
            # Clean up existing directory if needed, or just overwrite
            # For now we just overwrite, but maybe we should warn?
            # The previous implementation had an overwrite flag.
            pass

        output_path.mkdir(parents=True, exist_ok=True)

        # Copy template directory
        template_dir = Path(__file__).parent / "template"
        if template_dir.exists():
            # Build TypeScript/JavaScript client first
            package_json = template_dir / "package.json"
            if package_json.exists():
                print("Building TypeScript/JavaScript client...")
                try:
                    builder = ClientBuilder(template_dir)
                    builder.build()
                except Exception as e:
                    warnings.warn(
                        f"Client build failed: {e}. Continuing with template files.",
                        category=RuntimeWarning,
                        stacklevel=2,
                    )

            # Copy all files from template to output_path
            # We use shutil.copytree with dirs_exist_ok=True (Python 3.8+)
            shutil.copytree(template_dir, output_path, dirs_exist_ok=True)
        else:
            warnings.warn(
                f"Template directory not found at {template_dir}.",
                category=RuntimeWarning,
            )

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

    def get_projects(self) -> list[ProjectConfig]:
        """Get a copy of all project configurations.

        Returns:
            List of ProjectConfig objects.
        """
        return self._projects.copy()


__all__ = ["Builder"]
