"""MJLab Integration Example

This example demonstrates how to build muwanx projects using mjlab setups.
"""

# from mjlab.tasks.registry import load_env_cfg, load_rl_cfg

import muwanx as mwx


def main():
    builder = mwx.Builder()
    mjlab_project = builder.add_project(name="MJLab Integration Example")  # noqa: F841
    # env_cfg = load_env_cfg("Mjlab-Velocity-Flat-Unitree-G1")  # noqa: F841
    # rl_cfg = load_rl_cfg("Mjlab-Velocity-Flat-Unitree-G1")  # noqa: F841


if __name__ == "__main__":
    main()
