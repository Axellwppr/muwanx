# Adding Custom MuJoCo Scenes and Policies

This guide explains how to add your own MuJoCo scenes and trained ONNX policies to Muwanx.

---

## Overview

Muwanx automatically handles most of the complexity when adding new content:

- **Automatic Asset Collection**: The `MuJoCoAssetCollector` component automatically discovers and loads all assets (meshes, textures, includes) referenced in your scene XML files
- **Flexible Configuration**: JSON-based configuration makes it easy to add multiple scenes and policies without modifying core code

---

## Step 1: Add Your MuJoCo Scene

### 1.1 Create Scene Directory

Create a directory for your robot scene under `public/examples/scenes/`:

```bash
mkdir -p public/examples/scenes/my_robot
```

### 1.2 Add Scene Files

Place your MuJoCo XML files and assets in this directory:


**Important Notes:**
- The `MuJoCoAssetCollector` automatically finds all referenced files (meshes, textures, includes)
- Use relative paths in your XML files (e.g., `file="../assets/body.stl"`)
- The collector handles nested includes automatically
- Both XML and binary assets (.png, .stl, .skn, .mjb) are supported

---

## Step 2: Add Your Policy

### 2.1 Create Checkpoint Directory

Create a directory for your policy checkpoints:

```bash
mkdir -p public/examples/checkpoints/my_robot
```

### 2.2 Add Policy Files

For each policy, you need two files:

```
public/examples/checkpoints/my_robot/
├── asset_meta.json        # Robot metadata (optional but recommended)
├── my_policy.json         # Policy configuration
└── my_policy.onnx         # ONNX model file
```

### 2.3 Policy Configuration File

Create a JSON file (e.g., `my_policy.json`) that describes your policy:

```json
{
    "onnx": {
        "meta": {
            "in_keys": ["command", "policy"],
            "out_keys": ["action"],
            "in_shapes": [
                [[1, 3], [1, 48]]
            ]
        },
        "path": "./examples/checkpoints/my_robot/my_policy.onnx"
    },
    "obs_config": {
        "policy": [
            {
                "name": "GravityMultistep",
                "joint_name": "floating_base_joint",
                "history_steps": 3
            },
            {
                "name": "JointPosMultistep",
                "joint_names": "isaac",
                "history_steps": 3
            },
            {
                "name": "JointVelMultistep",
                "joint_names": "isaac",
                "history_steps": 3
            },
            {
                "name": "PrevActions",
                "history_steps": 3
            }
        ],
        "command": [
            {
                "name": "ImpedanceCommand"
            }
        ]
    },
    "action_scale": 0.5,
    "stiffness": 25.0,
    "damping": 0.5
}
```

### 2.4 ONNX Model File

Export your trained policy to ONNX format. The input/output structure should match the `in_keys`, `out_keys`, and `in_shapes` defined in your JSON configuration.

Example PyTorch export:

```python
import torch
import torch.onnx

# Your policy model
model = YourPolicyModel()
model.eval()

# Dummy inputs matching your observation structure
dummy_command = torch.randn(1, 3)
dummy_policy = torch.randn(1, 48)

# Export to ONNX
torch.onnx.export(
    model,
    (dummy_command, dummy_policy),
    "my_policy.onnx",
    input_names=["command", "policy"],
    output_names=["action"],
    dynamic_axes={
        "command": {0: "batch_size"},
        "policy": {0: "batch_size"},
        "action": {0: "batch_size"}
    }
)
```

### 2.5 Asset Metadata File (Optional)

Create `asset_meta.json` to provide additional robot information:

```json
{
    "init_state": {
        "pos": [0.0, 0.0, 0.4],
        "rot": [1.0, 0.0, 0.0, 0.0],
        "lin_vel": [0.0, 0.0, 0.0],
        "ang_vel": [0.0, 0.0, 0.0],
        "joint_pos": {
            ".*_hip_joint": 0.0,
            ".*_knee_joint": 0.0
        },
        "joint_vel": {
            ".*": 0.0
        }
    },
    "body_names_isaac": [
        "base",
        "hip_left",
        "knee_left",
        "hip_right",
        "knee_right"
    ],
    "joint_names_isaac": [
        "hip_left_joint",
        "knee_left_joint",
        "hip_right_joint",
        "knee_right_joint"
    ],
    "default_joint_pos": [0.0, 0.0, 0.0, 0.0],
    "actuators": {
        "base_legs": {
            "stiffness": 25.0,
            "damping": 0.5,
            "effort_limit": {
                ".*_hip_joint": 80.0,
                ".*_knee_joint": 80.0
            }
        }
    }
}
```

**Purpose of asset_meta.json:**
- **init_state**: Defines initial robot configuration (position, orientation, joint angles)
- **body_names_isaac**: List of body names in simulation order
- **joint_names_isaac**: List of actuated joint names (used when `joint_names: "isaac"` in obs_config)
- **default_joint_pos**: Default joint positions
- **actuators**: Actuator parameters (stiffness, damping, limits)

---

## Step 3: Update Configuration

Edit `public/config.json` to register your scene and policies:

```json
{
  "tasks": [
    {
      "id": "1",
      "name": "My Robot",
      "model_xml": "my_robot/scene.xml",
      "asset_meta": "./examples/checkpoints/my_robot/asset_meta.json",
      "default_policy": "my_policy",
      "policies": [
        {
          "id": "my_policy",
          "name": "My Policy",
          "path": "./examples/checkpoints/my_robot/my_policy.json",
          "ui_controls": ["setpoint", "stiffness"]
        }
      ]
    }
  ]
}
```

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for the task |
| `name` | Yes | Display name shown in UI tabs |
| `model_xml` | Yes | Path to scene XML (relative to `public/examples/scenes/`) |
| `asset_meta` | No | Path to asset metadata JSON |
| `default_policy` | No | Default policy ID to load on startup |
| `policies` | No | Array of policy configurations (can be empty for scene-only) |

### Policy Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique policy identifier |
| `name` | Yes | Display name for the policy |
| `path` | Yes | Path to policy JSON configuration |
| `ui_controls` | No | Array of UI controls to enable (see [UI Controls](#ui-controls)) |

---

## Policy Configuration Details

### ONNX Section

```json
"onnx": {
    "meta": {
        "in_keys": ["command", "policy"],
        "out_keys": ["action"],
        "in_shapes": [[[1, 3], [1, 48]]]
    },
    "path": "./examples/checkpoints/my_robot/my_policy.onnx"
}
```

- **in_keys**: Names of input tensors (must match observation groups in `obs_config`)
- **out_keys**: Names of output tensors
- **in_shapes**: Shape of each input tensor (batch_size, features)
- **path**: Relative path to ONNX file

### Action Configuration

```json
"action_scale": 0.5,
"stiffness": 25.0,
"damping": 0.5
```

- **action_scale**: Multiplier for policy actions
- **stiffness**: Default PD controller stiffness (K_p)
- **damping**: Default PD controller damping (K_d)

---

## Observation Configuration

The `obs_config` defines what observations are computed and fed to your policy.

### Structure

```json
"obs_config": {
    "<group_name>": [
        {
            "name": "<ObservationType>",
            "param1": value1,
            "param2": value2
        }
    ]
}
```

- **group_name**: Must match an entry in `in_keys`
- Each group is an array of observation configurations
- Observations in a group are concatenated into a single tensor

### Available Observation Types

#### GravityMultistep
Computes gravity vector in the robot's local frame.

```json
{
    "name": "GravityMultistep",
    "joint_name": "floating_base_joint",
    "history_steps": 3
}
```

Parameters:
- `joint_name`: Name of the floating base joint
- `history_steps`: Number of timesteps to include in history

#### JointPosMultistep
Computes joint positions.

```json
{
    "name": "JointPosMultistep",
    "joint_names": "isaac",
    "history_steps": 3
}
```

Parameters:
- `joint_names`: Either `"isaac"` (uses `joint_names_isaac` from asset_meta) or array of joint names
- `history_steps`: Number of timesteps in history

#### JointVelMultistep
Computes joint velocities.

```json
{
    "name": "JointVelMultistep",
    "joint_names": "isaac",
    "history_steps": 3
}
```

Parameters: Same as JointPosMultistep

#### PrevActions
Provides history of previous actions.

```json
{
    "name": "PrevActions",
    "history_steps": 3
}
```

Parameters:
- `history_steps`: Number of previous actions to include

#### ImpedanceCommand
Command for impedance control (target position or velocity).

```json
{
    "name": "ImpedanceCommand"
}
```

No additional parameters required.

### Example: Full Observation Configuration

```json
"obs_config": {
    "policy": [
        {
            "name": "GravityMultistep",
            "joint_name": "floating_base_joint",
            "history_steps": 3
        },
        {
            "name": "JointPosMultistep",
            "joint_names": "isaac",
            "history_steps": 3
        },
        {
            "name": "JointVelMultistep",
            "joint_names": "isaac",
            "history_steps": 3
        },
        {
            "name": "PrevActions",
            "history_steps": 3
        }
    ],
    "command": [
        {
            "name": "ImpedanceCommand"
        }
    ]
}
```

This creates:
- `policy` tensor: concatenation of gravity (3×3=9), joint_pos (12×3=36), joint_vel (12×3=36), prev_actions (12×3=36) = 117 features
- `command` tensor: impedance command features

---

## UI Controls

The `ui_controls` array enables optional UI features for your policy.

### Available Controls

#### `"setpoint"`
Enables target position/velocity control UI:
- Checkbox to toggle between setpoint mode (drag 3D sphere) and velocity sliders
- Velocity slider for X-axis command
- Interactive 3D sphere for spatial position targets

```json
"ui_controls": ["setpoint"]
```

#### `"stiffness"`
Enables stiffness control UI:
- Compliant mode checkbox (sets stiffness to 0)
- Stiffness slider (0-24 range)

```json
"ui_controls": ["stiffness"]
```

#### `"trajectory_playback"`
Enables trajectory playback controls:
- Play/Stop/Reset buttons
- Loop playback checkbox
- Requires trajectory files in `public/examples/trajectories/<robot>/`

```json
"ui_controls": ["trajectory_playback"]
```

### Example Combinations

```json
// Full control suite
"ui_controls": ["setpoint", "stiffness"]

// Trajectory playback only
"ui_controls": ["trajectory_playback"]

// No UI controls (free running policy)
"ui_controls": []
```

---

## Asset Metadata Reference

### Complete Example

```json
{
    "init_state": {
        "pos": [0.0, 0.0, 0.4],
        "rot": [1.0, 0.0, 0.0, 0.0],
        "lin_vel": [0.0, 0.0, 0.0],
        "ang_vel": [0.0, 0.0, 0.0],
        "joint_pos": {
            "FL_hip_joint": 0.1,
            "FR_hip_joint": -0.1,
            ".*_thigh_joint": 0.7,
            ".*_calf_joint": -1.5
        },
        "joint_vel": {
            ".*": 0.0
        }
    },
    "body_names_isaac": [
        "base",
        "FL_hip",
        "FR_hip",
        "FL_thigh",
        "FR_thigh"
    ],
    "joint_names_isaac": [
        "FL_hip_joint",
        "FR_hip_joint",
        "FL_thigh_joint",
        "FR_thigh_joint"
    ],
    "default_joint_pos": [0.1, -0.1, 0.7, 0.7],
    "actuators": {
        "base_legs": {
            "class_type": "isaaclab.actuators.actuator_pd:ImplicitActuator",
            "joint_names_expr": [".*_hip_joint", ".*_thigh_joint"],
            "effort_limit": {
                ".*_hip_joint": 23.5,
                ".*_thigh_joint": 35.5
            },
            "velocity_limit": 30.0,
            "stiffness": 25.0,
            "damping": 0.5
        }
    }
}
```

### Field Descriptions

#### init_state
- **pos**: Initial position [x, y, z] in world coordinates
- **rot**: Initial rotation as quaternion [w, x, y, z]
- **lin_vel**: Initial linear velocity [vx, vy, vz]
- **ang_vel**: Initial angular velocity [wx, wy, wz]
- **joint_pos**: Initial joint positions (supports regex patterns)
- **joint_vel**: Initial joint velocities (supports regex patterns)

Regex patterns in joint_pos/joint_vel use ".*" for wildcards, e.g.:
- `".*_hip_joint": 0.1` matches all hip joints
- `"F[L,R]_.*": 0.5` matches front left/right joints

#### body_names_isaac
List of body names in the order used by your simulation framework (e.g., IsaacLab).

#### joint_names_isaac
List of actuated joint names. Used when observations specify `"joint_names": "isaac"`.

#### default_joint_pos
Array of default joint positions, ordered to match `joint_names_isaac`.

#### actuators
Actuator group configurations:
- **class_type**: Actuator class (informational)
- **joint_names_expr**: Joint name patterns
- **effort_limit**: Torque limits per joint (supports regex)
- **velocity_limit**: Maximum joint velocity
- **stiffness**: PD controller proportional gain
- **damping**: PD controller derivative gain

---

## Testing Your Setup

### 1. Start Development Server

```bash
npm run dev
```

### 2. Access Your Scene

Navigate to:
```
http://localhost:5173/#/?scene=My%20Robot
```

Or with a specific policy:
```
http://localhost:5173/#/?scene=My%20Robot&policy=My%20Policy
```

### 3. Check Browser Console

Open browser developer tools (F12) and check for:
- Asset collection logs: `[MuJoCoAssetCollector] Successfully analyzed...`
- ONNX loading: Policy should load without errors
- Observation shapes: Verify tensor dimensions match your expectations

### 4. Verify Functionality

- Scene loads and renders correctly
- Robot appears in correct initial pose
- Policy tab is selectable
- UI controls (if enabled) work as expected
- Robot responds to policy/commands

---

## Troubleshooting

### Scene Not Loading

**Issue**: Scene XML fails to load or assets are missing.

**Solutions**:
1. Check file paths in `config.json` are correct
2. Verify XML file paths are relative to `public/examples/scenes/`
3. Check browser console for 404 errors
4. Ensure XML syntax is valid (no parsing errors)
5. Verify mesh/texture paths in XML are relative to XML file location

### Policy Not Loading

**Issue**: Policy fails to load or produces errors.

**Solutions**:
1. Verify ONNX file path in policy JSON is correct
2. Check that `in_keys` match observation group names in `obs_config`
3. Verify `in_shapes` match actual observation dimensions
4. Test ONNX model independently (e.g., with `onnxruntime-python`)
5. Check browser console for ONNX Runtime errors

### Observation Dimension Mismatch

**Issue**: Error about tensor shape mismatch.

**Solutions**:
1. Count features in each observation group:
   - GravityMultistep: 3 × history_steps
   - JointPosMultistep: num_joints × history_steps
   - JointVelMultistep: num_joints × history_steps
   - PrevActions: num_actions × history_steps
2. Ensure `in_shapes` in policy JSON matches computed dimensions
3. Verify `joint_names_isaac` count matches your robot's actuators

### Robot Behavior Issues

**Issue**: Robot moves erratically or falls immediately.

**Solutions**:
1. Check `init_state` in `asset_meta.json` (proper initial pose)
2. Verify `action_scale` is appropriate (try 0.25-0.5 range)
3. Adjust `stiffness` and `damping` values
4. Ensure actuator limits are reasonable
5. Test with compliant mode (stiffness=0) first

### Asset Collection Issues

**Issue**: Meshes or textures not loading.

**Solutions**:
1. The `MuJoCoAssetCollector` runs automatically - check browser console logs
2. Ensure file extensions are recognized: `.png`, `.stl`, `.skn`, `.mjb`
3. Use relative paths in XML (not absolute paths)
4. Check that nested includes are properly resolved
5. Verify files exist at expected locations

### UI Controls Not Appearing

**Issue**: Expected controls don't show in UI.

**Solutions**:
1. Verify `ui_controls` array in policy configuration
2. Check spelling: `"setpoint"`, `"stiffness"`, `"trajectory_playback"`
3. Ensure policy is properly selected in UI
4. Check that policy has required observation types (e.g., ImpedanceCommand for setpoint)

---

## Advanced Topics

### Multiple Policies for One Robot

You can define multiple policies for the same robot:

```json
{
    "id": "1",
    "name": "My Robot",
    "model_xml": "my_robot/scene.xml",
    "asset_meta": "./examples/checkpoints/my_robot/asset_meta.json",
    "default_policy": "policy_a",
    "policies": [
        {
            "id": "policy_a",
            "name": "Walking",
            "path": "./examples/checkpoints/my_robot/walking.json",
            "ui_controls": ["setpoint", "stiffness"]
        },
        {
            "id": "policy_b",
            "name": "Running",
            "path": "./examples/checkpoints/my_robot/running.json",
            "ui_controls": ["setpoint"]
        }
    ]
}
```

### Scene Without Policy

For visualization-only (no trained policy):

```json
{
    "id": "3",
    "name": "My Robot Viz",
    "model_xml": "my_robot/scene.xml",
    "asset_meta": null,
    "default_policy": null,
    "policies": []
}
```

### Custom Observation Types

To add new observation types, extend the `Observations` registry in:
- `src/mujoco/runtime/observations/index.js`

### Trajectory Files

For trajectory playback, add trajectory data to:
```
public/examples/trajectories/<robot>/trajectory.json
```

Format:
```json
{
    "timesteps": [...],
    "joint_positions": [[...], [...], ...],
    "joint_velocities": [[...], [...], ...]
}
```

---

## Best Practices

1. **Start Simple**: Begin with a basic scene and no policy, then add complexity
2. **Test Incrementally**: Verify scene loads before adding policies
3. **Use Meaningful Names**: Clear IDs and names help with URL parameters and debugging
4. **Document Your Config**: Add comments in policy JSON (though JSON technically doesn't support them, you can maintain a separate commented version)
5. **Version Control**: Keep policy checkpoints organized by version/date
6. **Check Dimensions**: Always verify observation dimensions match ONNX inputs
7. **Provide Licenses**: Include LICENSE files for robot models from external sources

---

## Example: Complete Workflow

Here's a complete example adding a new quadruped robot:

1. **Create scene directory**:
```bash
mkdir -p public/examples/scenes/my_quadruped
```

2. **Add scene files**:
```
public/examples/scenes/my_quadruped/
├── scene.xml
├── my_quadruped.xml
└── meshes/
    ├── body.stl
    └── leg.stl
```

3. **Create checkpoint directory**:
```bash
mkdir -p public/examples/checkpoints/my_quadruped
```

4. **Add policy files**:
```
public/examples/checkpoints/my_quadruped/
├── asset_meta.json
├── trot_policy.json
└── trot_policy.onnx
```

5. **Update config.json**:
```json
{
  "tasks": [
    {
      "id": "4",
      "name": "My Quadruped",
      "model_xml": "my_quadruped/scene.xml",
      "asset_meta": "./examples/checkpoints/my_quadruped/asset_meta.json",
      "default_policy": "trot",
      "policies": [
        {
          "id": "trot",
          "name": "Trot Gait",
          "path": "./examples/checkpoints/my_quadruped/trot_policy.json",
          "ui_controls": ["setpoint", "stiffness"]
        }
      ]
    }
  ]
}
```

6. **Test**:
```bash
npm run dev
# Navigate to http://localhost:5173/#/?scene=My%20Quadruped
```

That's it! The `MuJoCoAssetCollector` handles the rest automatically.

---

## Need Help?

- Check the browser console for detailed error messages
- Review existing examples in `public/examples/`
- See [URL_PARAMS.md](./URL_PARAMS.md) for URL parameter usage
- Open an issue on GitHub with your error logs and configuration

Happy building! 🚀
