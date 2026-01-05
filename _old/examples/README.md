# Muwanx Examples

This directory contains the demo application and assets for Muwanx.

## Directory Structure

```
examples/
├── assets/              # Shared assets (scenes, policies, configs)
│   ├── config.json      # Main demo configuration
│   ├── scene/           # MuJoCo scene files
│   └── policy/          # Policy configurations and ONNX models
└── main.ts              # Single-file demo entry point (60 lines)
```

The demo is intentionally kept as a **single TypeScript file** for simplicity. It handles project selection via URL hash and renders the full-featured MwxViewer component with all UI controls.

## Running the Demo

The demo application showcases the full Muwanx viewer with interactive controls.

### Development Server

```bash
npm install
npm run dev
```

Then navigate to http://localhost:3000

### Build for Production

```bash
npm run build:demo
npm run preview
```

## Using Muwanx in Your Project

The demo uses the pre-built Vue viewer component (`MwxViewer.vue`), but you can use the imperative API to build custom applications:

### Installation

```bash
npm install muwanx
```

### Imperative API Usage

Build your viewer programmatically:

```typescript
import { MwxViewer } from 'muwanx';

// Create viewer instance
const viewer = new MwxViewer('#container');

// Build programmatically
const project = viewer.addProject({
  project_name: "My Robotics Project",
  project_link: "https://github.com/username/project"
});

const scene = project.addScene({
  id: "go2-scene",
  name: "Unitree Go2 Locomotion",
  model_xml: "./assets/scene/unitree_go2/scene.xml",
  asset_meta: "./assets/policy/go2/asset_meta.json",
  camera: {
    position: [2.0, 1.7, 1.7],
    target: [0, 0.2, 0],
    fov: 45
  }
});

const policy = scene.addPolicy({
  id: "vanilla-policy",
  name: "Vanilla Locomotion",
  path: "./assets/policy/go2/vanilla.json",
  stiffness: 25.0,
  damping: 0.5,
  ui_controls: ['setpoint', 'stiffness']
});

// Initialize and load
await viewer.initialize();
await viewer.selectScene('go2-scene');
await viewer.selectPolicy('vanilla-policy');

// Control simulation
viewer.play();
```

### Declarative API Usage

Load from configuration:

```typescript
import { MwxViewer } from 'muwanx';

const viewer = new MwxViewer('#container');
await viewer.loadConfig('./config.json');
```

### Using the Vue Component

For a full-featured viewer with UI controls:

```vue
<template>
  <MwxViewer :configPath="'./assets/config.json'" />
</template>

<script setup>
import { MwxViewer } from 'muwanx/viewer';
</script>
```

## Available Assets

The `assets/` directory contains pre-configured scenes and policies:

### Scenes
- **Unitree Go2**: Quadruped robot (`scene/unitree_go2/`)
- **Unitree Go1**: Quadruped robot (`scene/unitree_go1/`)
- **Unitree G1**: Humanoid robot (`scene/unitree_g1/`)
- **MyoSuite**: Biomechanics models (`scene/myosuite/`)
- **MuJoCo Menagerie**: Various robots from Google DeepMind
- **MuJoCo Playground**: Playground environments

### Policies
- **Vanilla Locomotion**: Basic walking policy
- **Rough Terrain**: Policy for uneven surfaces
- **Stairs**: Policy for climbing stairs
- And more...

## Configuration Format

The demo uses JSON configuration files. Example structure:

```json
{
  "project_name": "Muwanx Demo",
  "project_link": "https://github.com/ttktjmt/muwanx",
  "tasks": [
    {
      "id": "go2",
      "name": "Unitree Go2",
      "model_xml": "./assets/scene/unitree_go2/scene.xml",
      "asset_meta": "./assets/policy/go2/asset_meta.json",
      "default_policy": "vanilla",
      "policies": [
        {
          "id": "vanilla",
          "name": "Vanilla Locomotion",
          "path": "./assets/policy/go2/vanilla.json",
          "ui_controls": ["setpoint", "stiffness"]
        }
      ]
    }
  ]
}
```

**Note:** The config format uses `tasks` (legacy) which maps to `scenes` in the new API.

## API Reference

### MwxViewer Class

The main API class for building custom applications:

**Constructor:**
```typescript
new MwxViewer(container?: HTMLElement | string)
```

**Methods:**
- `loadConfig(config: ViewerConfig | string): Promise<void>` - Load from config
- `addProject(config: ProjectConfig): Project` - Add project (imperative)
- `initialize(): Promise<void>` - Initialize MuJoCo runtime
- `selectProject(projectId: string): Promise<void>` - Switch project
- `selectScene(sceneId: string): Promise<void>` - Load scene
- `selectPolicy(policyId: string): Promise<void>` - Load policy
- `play(): void` - Start simulation
- `pause(): void` - Pause simulation
- `reset(): Promise<void>` - Reset simulation
- `updateParams(params: Partial<RuntimeParams>): void` - Update parameters
- `getProjects(): ProjectConfig[]` - Get all projects
- `getScenes(): SceneConfig[]` - Get scenes for current project
- `getPolicies(): PolicyConfig[]` - Get policies for current scene
- `on(event: string, callback: Function): void` - Add event listener
- `off(event: string, callback: Function): void` - Remove event listener

**Events:**
- `project-changed` - Fired when project changes
- `scene-changed` - Fired when scene loads
- `policy-changed` - Fired when policy loads
- `params-changed` - Fired when parameters update
- `error` - Fired on errors

### Builder Classes

**Project Builder:**
```typescript
const project = viewer.addProject(config);
project.addScene(sceneConfig);
project.setMetadata({ name, link });
project.setDefaultScene(sceneId);
```

**Scene Builder:**
```typescript
const scene = project.addScene(config);
scene.addPolicy(policyConfig);
scene.setMetadata(metadata);
scene.setCamera(cameraConfig);
scene.setBackgroundColor(color);
scene.setDefaultPolicy(policyId);
```

**Policy Builder:**
```typescript
const policy = scene.addPolicy(config);
policy.setONNX(onnxConfig);
policy.setObservationConfig(obsConfig);
policy.setPDParams({ stiffness, damping });
policy.setActionScale(scale);
policy.setUIControls(['setpoint', 'stiffness']);
```

## TypeScript Support

Full TypeScript type definitions included:

```typescript
import type {
  ViewerConfig,
  ProjectConfig,
  SceneConfig,
  PolicyConfig,
  RuntimeParams,
  AssetMetadata,
  ObservationConfig,
  CameraConfig,
} from 'muwanx';
```

## Advanced Usage

### Custom Observation Components

```typescript
const policy = scene.addPolicy({
  id: 'custom-policy',
  name: 'Custom Policy',
  obs_config: {
    policy: [
      { name: 'ProjectedGravity', history_steps: 3 },
      { name: 'JointPositions', joint_names: 'isaac', history_steps: 3 },
      { name: 'JointVelocities', joint_names: 'isaac', history_steps: 1 },
    ]
  }
});
```

### Direct Runtime Access

For low-level control:

```typescript
const runtime = viewer.getRuntime();
// Access MuJoCo model and data
const mjModel = runtime.mjModel;
const mjData = runtime.mjData;
```

### Event Handling

```typescript
viewer.on('scene-changed', ({ scene }) => {
  console.log('Loaded:', scene.name);
});

viewer.on('policy-changed', ({ policy }) => {
  console.log('Policy:', policy.name);
});

viewer.on('params-changed', ({ params }) => {
  console.log('Params:', params);
});

viewer.on('error', ({ error, context }) => {
  console.error(`Error in ${context}:`, error);
});
```

## Library Build

To use Muwanx as a library in your own project:

```bash
# Build the library
npm run build:lib

# This generates:
# - dist/muwanx.es.js (ES module)
# - dist/muwanx.umd.js (UMD)
# - dist/index.d.ts (TypeScript declarations)
```

## License

See the main [LICENSE](../LICENSE) file for details.

Third-party assets in the demo have their own licenses. See:
- [MyoSuite License](https://github.com/MyoHub/myosuite/blob/main/LICENSE)
- [MuJoCo Menagerie License](https://github.com/google-deepmind/mujoco_menagerie/blob/main/LICENSE)
- [MuJoCo Playground License](https://github.com/google-deepmind/mujoco_playground/blob/main/LICENSE)
