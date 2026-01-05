# Muwanx Python SDK

<p align="center">
    <a href="https://pypi.org/project/muwanx/"><img src="https://img.shields.io/pypi/v/muwanx.svg" alt="PyPI version"></a>
    <a href="https://pypi.org/project/muwanx/"><img src="https://img.shields.io/pypi/pyversions/muwanx.svg" alt="Python versions"></a>
    <a href="https://github.com/ttktjmt/muwanx/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ttktjmt/muwanx" alt="License"/></a>
</p>

Python SDK for creating and deploying interactive MuJoCo simulations with trained policies in the browser.

**Muwanx** is a browser-based MuJoCo playground that enables real-time policy control without requiring a server. The Python SDK provides a convenient interface to configure projects, scenes, and policies for deployment as static sites (e.g., GitHub Pages).

## Features

- 🚀 **Browser-based**: Run MuJoCo simulations with real-time policy control in the browser
- 🎯 **Easy Configuration**: Simple Python API for setting up projects and policies
- 📦 **ONNX Support**: Deploy PyTorch/JAX models using ONNX format
- 🌐 **Static Hosting**: Generate static sites for GitHub Pages or any web server
- 🔧 **Flexible**: Customize observations, actions, and scene configurations

## Installation

```bash
pip install muwanx
```

## Quick Start

```python
import muwanx

# Create a project
project = muwanx.Project(name="My Robot Project")

# Add a scene with MuJoCo model
scene = project.add_scene(
    id="robot_walk",
    name="Robot Walking",
    model_path="./robot.xml"
)

# Add ONNX policy
policy = scene.add_policy(
    id="locomotion",
    onnx_path="./policy.onnx",
    config={
        "observations": [
            {"type": "BaseLinearVelocity"},
            {"type": "JointPositions", "joint_names": "isaac"}
        ],
        "actions": {
            "type": "isaac",
            "joint_names": ["joint1", "joint2"]
        }
    }
)

# Build and deploy
project.build(output_dir="./dist")
```

## Configuration

### Scene Configuration

```python
scene = project.add_scene(
    id="my_scene",
    name="My Scene",
    model_path="./model.xml",
    initial_state={
        "qpos": [0.0, 0.0, 1.0],  # Initial joint positions
        "qvel": [0.0, 0.0, 0.0]   # Initial joint velocities
    }
)
```

### Policy Configuration

```python
policy = scene.add_policy(
    id="my_policy",
    onnx_path="./policy.onnx",
    config={
        "observations": [
            {"type": "BaseLinearVelocity"},
            {"type": "BaseAngularVelocity"},
            {"type": "ProjectedGravity"},
            {"type": "JointPositions", "joint_names": "isaac"},
            {"type": "JointVelocities", "joint_names": "isaac"}
        ],
        "actions": {
            "type": "isaac",
            "joint_names": ["FR_hip", "FR_thigh", "FR_calf", ...]
        }
    }
)
```

## License

Apache-2.0 License. See [LICENSE](https://github.com/ttktjmt/muwanx/blob/main/LICENSE) for details.
