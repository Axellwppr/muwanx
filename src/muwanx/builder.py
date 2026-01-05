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

import mujoco
import onnx

from . import __version__
from ._build_client import ClientBuilder
from .app import MuwanxApp
from .project import ProjectConfig, ProjectHandle
from .scene import SceneConfig
from .utils import name2id


class Builder:
    """Builder for creating muwanx applications.

    The Builder class provides a fluent API for programmatically constructing
    interactive MuJoCo simulations with ONNX policies. It handles projects, scenes, and policies hierarchically.
    """

    def __init__(self, base_path: str = "/") -> None:
        """Initialize a new Builder instance.

        Args:
            base_path: Base path for the application (e.g., '/muwanx/').
                      This is used for deployment to subdirectories.
        """
        self._projects: list[ProjectConfig] = []
        self._base_path = base_path

    def add_project(self, name: str, *, id: str | None = None) -> ProjectHandle:
        """Add a new project to the builder.

        Args:
            name: Name for the project (displayed in the UI).
            id: Optional ID for URL routing. If not provided, the first project
                defaults to None (main route), and subsequent projects default to sanitized name.

        Returns:
            ProjectHandle for adding scenes and further configuration.
        """
        # Determine project ID:
        # - If id is explicitly provided, use it
        # - First project without id defaults to None (main route)
        # - Subsequent projects without id default to sanitized name
        if id is not None:
            project_id = id
        elif not self._projects:
            project_id = None
        else:
            project_id = name2id(name)

        project = ProjectConfig(name=name, id=project_id)
        self._projects.append(project)
        return ProjectHandle(project, self)

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

        # TODO: Build with separate function (and then save the web app with _save_web). And set scene.path and policy.path after building.
        self._save_web(output_path)

        return MuwanxApp(output_path)

    def _save_json(self, output_path: Path) -> None:
        """Save configuration as JSON.

        Creates root assets/config.json with project metadata and structure information.
        Individual project assets (scenes/policies) are saved under project-id/assets/.
        """
        # Create root config with project metadata and structure info
        root_config = {
            "version": __version__,
            "projects": [
                {
                    "name": project.name,
                    "id": project.id,
                    "scenes": [
                        {
                            "name": scene.name,
                            # "path": scene.path,
                            "path": self._get_scene_web_path(scene),
                            "policies": [
                                (
                                    {
                                        "name": policy.name,
                                        **(
                                            {"source": policy.source_path}
                                            if getattr(policy, "source_path", None)
                                            else {}
                                        ),
                                    }
                                )
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
            ├── index.html
            ├── logo.svg
            ├── manifest.json
            ├── robots.txt
            ├── assets/
            │   ├── config.json
            │   └── (compiled js/css files)
            └── <project-id>/ (or 'main')
                ├── index.html
                └── assets/
                    ├── scene/
                    │   └── <scene-id>/
                    └── policy/
                        └── <policy-id>/

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
                builder = ClientBuilder(template_dir)
                builder.build(base_path=self._base_path)

            # Copy all files from template to output_path
            shutil.copytree(
                template_dir,
                output_path,
                dirs_exist_ok=True,
                ignore=shutil.ignore_patterns(
                    ".nodeenv", "__pycache__", "*.pyc", ".md"
                ),
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
        root_config_file = assets_dir / "config.json"

        # Save MuJoCo models and ONNX policies per project
        for project in self._projects:
            # Use 'main' for projects without ID, otherwise use the project ID
            project_dir_name = project.id if project.id else "main"
            project_dir = output_path / project_dir_name
            project_assets_dir = project_dir / "assets"
            scene_dir = project_assets_dir / "scene"
            policy_dir = project_assets_dir / "policy"
            copied_scene_roots: set[Path] = set()

            # Create directories
            project_assets_dir.mkdir(parents=True, exist_ok=True)

            policy_dir.mkdir(exist_ok=True)

            # Copy root config into project assets for standalone hosting.
            if root_config_file.exists():
                shutil.copy(
                    str(root_config_file), str(project_assets_dir / "config.json")
                )

            # Copy index.html to each project directory so direct navigation works
            root_index = output_path / "index.html"
            if root_index.exists():
                shutil.copy(str(root_index), str(project_dir / "index.html"))

            # Copy static root assets
            for static_name in ["manifest.json", "logo.svg"]:
                src_static = output_path / static_name
                if src_static.exists():
                    shutil.copy(str(src_static), str(project_dir / static_name))

            # Save scenes and policies
            for scene in project.scenes:
                scene_name = name2id(scene.name)
                scene_path = scene_dir / scene_name
                scene_path.mkdir(parents=True, exist_ok=True)

                # Save model as binary .mjb file
                # scene_binary_path = scene_dir / f"{scene_name}.mjb"
                # mujoco.mj_saveModel(scene.model, str(scene_binary_path))

                # Copy all scene assets
                scene_source = self._resolve_scene_source(scene)
                if scene_source:
                    source_path, rel_scene_path, copy_root, copy_target = scene_source
                    if copy_root and copy_target:
                        if copy_root not in copied_scene_roots:
                            shutil.copytree(
                                copy_root,
                                project_assets_dir / copy_target,
                                dirs_exist_ok=True,
                            )
                            copied_scene_roots.add(copy_root)
                    if rel_scene_path:
                        target_path = project_assets_dir / rel_scene_path
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        if (
                            source_path
                            and source_path.exists()
                            and not target_path.exists()
                        ):
                            shutil.copy(str(source_path), str(target_path))
                else:
                    scene_xml_path = str(scene_path / "scene.xml")
                    mujoco.mj_saveLastXML(scene_xml_path, scene.model)

                # Save policies
                for policy in scene.policies:
                    policy_name = name2id(policy.name)
                    policy_path = policy_dir / scene_name
                    policy_path.mkdir(parents=True, exist_ok=True)

                    onnx.save(policy.model, str(policy_path / f"{policy_name}.onnx"))

        print(f"✓ Saved muwanx application to: {output_path}")

    def _resolve_scene_source(
        self, scene: SceneConfig
    ) -> tuple[Path | None, Path | None, Path | None, Path | None] | None:
        if not scene.source_path:
            return None

        source_path = Path(scene.source_path).expanduser()
        if not source_path.is_absolute():
            source_path = (Path.cwd() / source_path).resolve()

        if not source_path.exists():
            warnings.warn(
                f"Scene source path not found: {source_path}",
                category=RuntimeWarning,
                stacklevel=2,
            )
            return None

        parts = source_path.parts
        for idx in range(len(parts) - 1):
            if parts[idx] == "assets" and parts[idx + 1] == "scene":
                assets_scene_root = Path(*parts[: idx + 2])
                rel_under = Path(*parts[idx + 2 :])
                if not rel_under.parts:
                    break
                library_root = assets_scene_root / rel_under.parts[0]
                rel_scene_path = Path("scene") / rel_under
                copy_target = Path("scene") / rel_under.parts[0]
                return source_path, rel_scene_path, library_root, copy_target

        rel_scene_path = Path("scene") / name2id(scene.name) / "scene.xml"
        return source_path, rel_scene_path, source_path.parent, rel_scene_path.parent

    def _get_scene_web_path(self, scene: SceneConfig) -> str:
        resolved = self._resolve_scene_source(scene)
        if resolved:
            _, rel_scene_path, _, _ = resolved
            if rel_scene_path:
                return rel_scene_path.as_posix()
        scene_name = name2id(scene.name)
        return f"scene/{scene_name}/scene.xml"

    def get_projects(self) -> list[ProjectConfig]:
        """Get a copy of all project configurations.

        Returns:
            List of ProjectConfig objects.
        """
        return self._projects.copy()


__all__ = ["Builder"]
