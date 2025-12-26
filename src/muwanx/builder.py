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

    def __init__(self, base_path: str = "/") -> None:
        """Initialize a new Builder instance.

        Args:
            base_path: Base path for the application (e.g., '/muwanx/reorg/').
                      This is used for deployment to subdirectories.
        """
        self._projects: list[ProjectConfig] = []
        self._base_path = base_path

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
            raise ValueError(
                "Cannot build an empty application. "
                "You must add at least one project using builder.add_project() before building.\n"
                "Example:\n"
                "  builder = mwx.Builder()\n"
                "  project = builder.add_project(name='My Project')\n"
                "  scene = project.add_scene(model=mujoco_model, name='Scene 1')\n"
                "  app = builder.build()"
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
        """Save configuration as JSON.

        Creates root assets/config.json with project metadata and structure information.
        Individual project assets (scenes/policies) are saved under project-id/assets/.
        """
        # Create root config with project metadata and structure info
        root_config = {
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

        # Save root config.json in assets directory
        assets_dir = output_path / "assets"
        assets_dir.mkdir(exist_ok=True)
        root_config_file = assets_dir / "config.json"
        with open(root_config_file, "w") as f:
            json.dump(root_config, f, indent=2)

    def _save_web(self, output_path: Path) -> None:
        """Save as a complete web application with hybrid structure.

        Structure:
        dist/
        ├── index.html (main app for all projects)
        ├── assets/ (shared JS/CSS and root config.json)
        └── project-id/ (or 'main' for projects without ID)
            └── assets/
                ├── scene/
                └── policy/
        """
        if output_path.exists():
            shutil.rmtree(output_path)

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
                    builder.build(base_path=self._base_path)
                except Exception as e:
                    warnings.warn(
                        f"Client build failed: {e}. Continuing with template files.",
                        category=RuntimeWarning,
                        stacklevel=2,
                    )

            # Copy all files from template to output_path
            shutil.copytree(
                template_dir,
                output_path,
                dirs_exist_ok=True,
                ignore=shutil.ignore_patterns(".nodeenv", "__pycache__", "*.pyc"),
            )

            # Move built files from nested dist/ to output_path root
            built_dist = output_path / "dist"
            if built_dist.exists() and built_dist.is_dir():
                # Move all files from dist/ to output_path
                for item in built_dist.iterdir():
                    dest = output_path / item.name
                    if dest.exists():
                        if dest.is_dir():
                            shutil.rmtree(dest)
                        else:
                            dest.unlink()
                    shutil.move(str(item), str(output_path))
                # Remove the now-empty dist directory
                built_dist.rmdir()

                # Clean up development files that shouldn't be in production
                dev_files = [
                    "src",
                    "node_modules",
                    ".nodeenv",
                    "package.json",
                    "package-lock.json",
                    "tsconfig.json",
                    "vite.config.ts",
                    "eslint.config.cjs",
                    ".browserslistrc",
                    ".gitignore",
                ]
                for dev_file in dev_files:
                    dev_path = output_path / dev_file
                    if dev_path.exists():
                        if dev_path.is_dir():
                            shutil.rmtree(dev_path)
                        else:
                            dev_path.unlink()

                # Remove public directory after build
                public_dir = output_path / "public"
                if public_dir.exists():
                    shutil.rmtree(public_dir)
        else:
            warnings.warn(
                f"Template directory not found at {template_dir}.",
                category=RuntimeWarning,
            )

        # Create root assets directory for shared config
        assets_dir = output_path / "assets"
        assets_dir.mkdir(exist_ok=True)

        # Save root configuration (project metadata and structure)
        self._save_json(output_path)

        # Save MuJoCo models and ONNX policies per project
        for project in self._projects:
            # Use 'main' for projects without ID, otherwise use the project ID
            project_dir_name = project.id if project.id else "main"
            project_dir = output_path / project_dir_name
            project_assets_dir = project_dir / "assets"
            scene_dir = project_assets_dir / "scene"
            policy_dir = project_assets_dir / "policy"

            # Create directories
            project_assets_dir.mkdir(parents=True, exist_ok=True)
            scene_dir.mkdir(exist_ok=True)
            policy_dir.mkdir(exist_ok=True)

            # Copy index.html to each project directory so direct navigation works
            root_index = output_path / "index.html"
            if root_index.exists():
                shutil.copy(str(root_index), str(project_dir / "index.html"))

            # Copy static root assets
            for static_name in ["manifest.json", "favicon.svg", "logo.svg"]:
                src_static = output_path / static_name
                if src_static.exists():
                    shutil.copy(str(src_static), str(project_dir / static_name))

            # Save scenes and policies
            for scene in project.scenes:
                scene_name = self._sanitize_name(scene.name)
                scene_path = scene_dir / scene_name
                scene_path.mkdir(parents=True, exist_ok=True)

                # Save MuJoCo model
                scene_xml_path = str(scene_path / "scene.xml")
                mujoco.mj_saveLastXML(scene_xml_path, scene.model)

                # Save policies
                for policy in scene.policies:
                    policy_name = self._sanitize_name(policy.name)
                    policy_path = policy_dir / scene_name
                    policy_path.mkdir(parents=True, exist_ok=True)

                    onnx.save(policy.model, str(policy_path / f"{policy_name}.onnx"))

        print(f"✓ Saved muwanx application to: {output_path}")
        print("  Structure: Hybrid (shared app, per-project assets)")
        print(f"  Root config: {assets_dir / 'config.json'}")
        for project in self._projects:
            project_dir_name = project.id if project.id else "main"
            print(f"  Project assets: {output_path / project_dir_name / 'assets'}")

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
