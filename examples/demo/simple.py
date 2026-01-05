"""Simple Muwanx Demo

A basic example demonstrating how to use muwanx to create a viewer application
with multiple robot scenes (Go2, Go1, and G1).
"""

import os
from pathlib import Path

import mujoco

import muwanx as mwx

# Flag to control model loading method
USE_MJMODEL = False


def load_model(path: str):
    """Load model based on USE_MJMODEL flag.

    If USE_MJMODEL is True, returns MjModel.from_xml_path(path).
    Otherwise, returns the path string directly.
    """
    if USE_MJMODEL:
        return mujoco.MjModel.from_xml_path(path)
    return path


def setup_builder() -> mwx.Builder:
    """Set up and return the builder with demo projects configured.

    Creates a builder and adds a project with three robot scenes.
    Does not build or launch the application.

    Returns:
        Configured Builder instance ready to be built.
    """
    # Ensure asset-relative paths resolve regardless of current working directory.
    os.chdir(Path(__file__).resolve().parent)
    base_path = os.getenv("MUWANX_BASE_PATH", "/")
    builder = mwx.Builder(base_path=base_path)

    demo_project = builder.add_project(
        name="Muwanx Demo",
    )

    demo_project.add_scene(
        model=load_model("assets/scene/muwanx/unitree_go2/scene.xml"),
        name="Go2",
    )
    demo_project.add_scene(
        model=load_model("assets/scene/muwanx/unitree_go1/go1.xml"),
        name="Go1",
    )
    demo_project.add_scene(
        model=load_model("assets/scene/muwanx/unitree_g1/scene.xml"),
        name="G1",
    )

    return builder


def main():
    """Main entry point for the simple demo.

    Sets up the builder, builds the application, and launches it in a browser.

    Environment variables:
        MUWANX_BASE_PATH: Base path for deployment (default: '/')
        MUWANX_NO_LAUNCH: Set to '1' to skip launching the browser
    """
    builder = setup_builder()
    # Build and launch the application
    app = builder.build()
    if os.getenv("MUWANX_NO_LAUNCH") == "1":
        return
    app.launch()


if __name__ == "__main__":
    main()
