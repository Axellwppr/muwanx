"""Muwanx Demo Application

This is a demo application showcasing the usage of muwanx.
The demo app is hosted on GitHub Pages: https://muwanx.github.io/muwanx/
"""

import os
from pathlib import Path

import mujoco
import onnx

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
    """Set up and return the builder with all demo projects configured.

    This function creates the builder and adds all projects, scenes, and policies
    but does not build or launch the application. Useful for testing.

    Returns:
        Configured Builder instance ready to be built.
    """
    # Ensure asset-relative paths resolve regardless of current working directory.
    os.chdir(Path(__file__).resolve().parent)
    base_path = os.getenv("MUWANX_BASE_PATH", "/")
    builder = mwx.Builder(base_path=base_path)

    # =======================
    # 1. Muwanx Demo Project
    # =======================
    demo_project = builder.add_project(
        name="Muwanx Demo",
    )

    # 1.C. Unitree G1
    g1_scene = demo_project.add_scene(
        model=load_model("assets/scene/muwanx/unitree_g1/scene.xml"),
        name="G1",
    )
    g1_scene.add_policy(
        policy=onnx.load("assets/policy/unitree_g1/tracking_policy.onnx"),
        name="Tracking Policy",
        config_path="assets/policy/unitree_g1/tracking_policy.json",
    )

    return builder


def main():
    """Main entry point for the demo application.

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
