# Muwanx Usage Guide

Complete guide to using Muwanx as an npm package for building interactive MuJoCo applications with neural network policies.

## Table of Contents

- [Installation](#installation)
- [API Patterns](#api-patterns)
  - [Imperative API (Recommended)](#imperative-api-recommended)
  - [Declarative API](#declarative-api)
- [Core Concepts](#core-concepts)
- [Complete Examples](#complete-examples)
  - [Basic Quadruped Locomotion](#basic-quadruped-locomotion)
  - [Multi-Project Application](#multi-project-application)
  - [Custom Controls](#custom-controls)
- [Configuration Reference](#configuration-reference)
- [Event System](#event-system)
- [Runtime Control](#runtime-control)
- [Advanced Usage](#advanced-usage)
- [TypeScript Support](#typescript-support)
- [Troubleshooting](#troubleshooting)

---

## Installation

```bash
npm install muwanx
```

**Dependencies:**
- `vue` (^3.5.x) - UI framework
- `three` (^0.181.x) - 3D rendering
- `mujoco-js` (^0.0.7) - MuJoCo physics engine
- `onnxruntime-web` (^1.21.x) - Neural network inference

---

## API Patterns

Muwanx provides two complementary API patterns for different use cases.

### Imperative API (Recommended)

Build your application programmatically with method chaining and full type safety. Best for dynamic applications where configuration is generated at runtime.

**When to use:**
- Building custom applications with dynamic content
- Need fine-grained control over viewer behavior
- Programmatic scene/policy generation
- Integration with existing TypeScript/JavaScript codebases

**Example:**
```typescript
import { MwxViewer } from 'muwanx';

const viewer = new MwxViewer('#container');

// Build programmatically
const project = viewer.addProject({
  project_name: "My Robotics Project",
  project_link: "https://github.com/username/project"
});

const scene = project.addScene({
  id: "robot-scene",
  name: "Robot Locomotion",
  model_xml: "./assets/scene/robot.xml",
  asset_meta: "./assets/metadata.json"
});

const policy = scene.addPolicy({
  id: "walking-policy",
  name: "Walking Policy",
  path: "./assets/policy/walk.json"
});

await viewer.initialize();
await viewer.selectScene('robot-scene');
await viewer.selectPolicy('walking-policy');
```

### Declarative API

Load configuration from JSON files. Best for static configurations and rapid prototyping.

**When to use:**
- Quick prototyping and demos
- Static, pre-defined configurations
- Loading existing config files
- Simplest setup with minimal code

**Example:**
```typescript
import { MwxViewer } from 'muwanx';

const viewer = new MwxViewer('#container');
await viewer.loadConfig('./config.json');

// Control simulation
viewer.play();
viewer.pause();
await viewer.reset();
```

---

## Core Concepts

### Hierarchy

```
MwxViewer
└── Project(s)
    ├── Project Name
    ├── Project Link
    └── Scene(s)
        ├── Scene Name
        ├── MuJoCo XML Model
        ├── Asset Metadata
        ├── Camera Configuration
        └── Policy(ies)
            ├── Policy Name
            ├── ONNX Model
            ├── Observation Configuration
            └── Control Parameters
```

### Container Element

Muwanx requires a container element to render the 3D scene:

```html
<div id="mujoco-container" style="width: 100%; height: 100vh;"></div>
```

```typescript
// By element ID (string)
const viewer = new MwxViewer('#mujoco-container');

// By HTMLElement reference
const container = document.getElementById('mujoco-container');
const viewer = new MwxViewer(container);
```

### Initialization Flow

1. **Create viewer instance** - `new MwxViewer(container)`
2. **Build configuration** - Add projects, scenes, policies
3. **Initialize runtime** - `await viewer.initialize()` - Loads MuJoCo WASM
4. **Select content** - `selectScene()`, `selectPolicy()`
5. **Control simulation** - `play()`, `pause()`, `reset()`, `updateParams()`

---

## Complete Examples

### Basic Quadruped Locomotion

Complete example with Unitree Go2 robot:

```typescript
import { MwxViewer, type ViewerConfig } from 'muwanx';

// Create viewer
const viewer = new MwxViewer('#mujoco-container');

// Build project
const project = viewer.addProject({
  project_name: "Quadruped Locomotion",
  project_link: "https://github.com/username/quadruped-project"
});

// Add scene with camera configuration
const scene = project.addScene({
  id: "go2-locomotion",
  name: "Unitree Go2 - Flat Terrain",
  model_xml: "./assets/scene/unitree_go2/scene.xml",
  asset_meta: "./assets/policy/go2/asset_meta.json",
  description: "Quadruped locomotion on flat terrain",
  camera: {
    position: [2.0, 1.7, 1.7],
    target: [0, 0.2, 0],
    fov: 45
  },
  backgroundColor: "#1a1a1a"
});

// Add multiple policies for different behaviors
const vanillaPolicy = scene.addPolicy({
  id: "vanilla",
  name: "Vanilla Locomotion",
  description: "Basic walking policy",
  path: "./assets/policy/go2/vanilla.json",
  stiffness: 25.0,
  damping: 0.5,
  ui_controls: ['setpoint', 'stiffness']
});

const roughTerrainPolicy = scene.addPolicy({
  id: "rough-terrain",
  name: "Rough Terrain",
  description: "Policy for uneven surfaces",
  path: "./assets/policy/go2/rough_terrain.json",
  stiffness: 30.0,
  damping: 0.6,
  ui_controls: ['setpoint', 'stiffness']
});

// Set default policy
scene.setDefaultPolicy('vanilla');

// Initialize and run
await viewer.initialize();
await viewer.selectScene('go2-locomotion');

// Start simulation
viewer.play();

// Listen to events
viewer.on('policy-changed', ({ policy }) => {
  console.log('Switched to policy:', policy.name);
});

// Control via UI or programmatically
viewer.updateParams({
  lin_vel_x: 1.0,  // 1 m/s forward
  ang_vel_z: 0.0,
  stiffness: 25.0,
  damping: 0.5
});
```

### Multi-Project Application

Build an application with multiple robot projects:

```typescript
import { MwxViewer } from 'muwanx';

const viewer = new MwxViewer('#mujoco-container');

// Project 1: Quadrupeds
const quadrupedProject = viewer.addProject({
  id: 'quadrupeds',
  project_name: "Quadruped Robots",
  project_link: "https://github.com/username/quadrupeds"
});

const go2Scene = quadrupedProject.addScene({
  id: "go2",
  name: "Unitree Go2",
  model_xml: "./assets/scene/unitree_go2/scene.xml",
  asset_meta: "./assets/policy/go2/asset_meta.json"
});

go2Scene.addPolicy({
  id: "go2-walk",
  name: "Walking",
  path: "./assets/policy/go2/vanilla.json"
});

const go1Scene = quadrupedProject.addScene({
  id: "go1",
  name: "Unitree Go1",
  model_xml: "./assets/scene/unitree_go1/scene.xml",
  asset_meta: "./assets/policy/go1/asset_meta.json"
});

go1Scene.addPolicy({
  id: "go1-walk",
  name: "Walking",
  path: "./assets/policy/go1/vanilla.json"
});

// Project 2: Humanoids
const humanoidProject = viewer.addProject({
  id: 'humanoids',
  project_name: "Humanoid Robots",
  project_link: "https://github.com/username/humanoids"
});

const g1Scene = humanoidProject.addScene({
  id: "g1",
  name: "Unitree G1",
  model_xml: "./assets/scene/unitree_g1/scene.xml",
  asset_meta: "./assets/policy/g1/asset_meta.json"
});

g1Scene.addPolicy({
  id: "g1-walk",
  name: "Walking",
  path: "./assets/policy/g1/vanilla.json"
});

// Initialize
await viewer.initialize();

// Navigate between projects
await viewer.selectProject('quadrupeds');
await viewer.selectScene('go2');

// Switch to humanoids
await viewer.selectProject('humanoids');
await viewer.selectScene('g1');

// Get current state
console.log('Projects:', viewer.getProjects());
console.log('Current scenes:', viewer.getScenes());
console.log('Current policies:', viewer.getPolicies());
```

### Custom Controls

Build a custom control interface:

```typescript
import { MwxViewer } from 'muwanx';

const viewer = new MwxViewer('#mujoco-container');

// ... setup viewer ...

await viewer.initialize();

// Custom control panel
const controlPanel = document.getElementById('control-panel');

// Velocity slider
const velSlider = document.getElementById('velocity');
velSlider.addEventListener('input', (e) => {
  viewer.updateParams({
    lin_vel_x: parseFloat(e.target.value)
  });
});

// Play/Pause button
const playBtn = document.getElementById('play-btn');
playBtn.addEventListener('click', () => {
  const params = viewer.getParams();
  if (params.paused) {
    viewer.play();
    playBtn.textContent = 'Pause';
  } else {
    viewer.pause();
    playBtn.textContent = 'Play';
  }
});

// Reset button
const resetBtn = document.getElementById('reset-btn');
resetBtn.addEventListener('click', async () => {
  await viewer.reset();
});

// Scene selector dropdown
const sceneSelect = document.getElementById('scene-select');
viewer.getScenes().forEach(scene => {
  const option = document.createElement('option');
  option.value = scene.id;
  option.textContent = scene.name;
  sceneSelect.appendChild(option);
});

sceneSelect.addEventListener('change', async (e) => {
  await viewer.selectScene(e.target.value);
});

// Policy selector
const policySelect = document.getElementById('policy-select');
viewer.getPolicies().forEach(policy => {
  const option = document.createElement('option');
  option.value = policy.id;
  option.textContent = policy.name;
  policySelect.appendChild(option);
});

policySelect.addEventListener('change', async (e) => {
  await viewer.selectPolicy(e.target.value);
});

// Real-time parameter feedback
viewer.on('params-changed', ({ params }) => {
  document.getElementById('current-vel').textContent =
    `Velocity: ${params.lin_vel_x.toFixed(2)} m/s`;
  document.getElementById('current-stiffness').textContent =
    `Stiffness: ${params.stiffness.toFixed(1)}`;
});
```

---

## Configuration Reference

### ViewerConfig

Main configuration for the viewer:

```typescript
interface ViewerConfig {
  // Single project or array of projects
  projects: ProjectConfig | ProjectConfig[];

  // Global defaults
  camera?: CameraConfig;
  backgroundColor?: string;
  enableVR?: boolean;
  debug?: boolean;

  // Container element
  container?: HTMLElement | string;

  // Initial selections
  initialProject?: string;
  initialScene?: string;
  initialPolicy?: string;
}
```

### ProjectConfig

Configuration for a project:

```typescript
interface ProjectConfig {
  id?: string;
  project_name?: string;
  project_link?: string;
  scenes: SceneConfig[];
  default_scene?: string;
}
```

### SceneConfig

Configuration for a scene (task):

```typescript
interface SceneConfig {
  id: string;
  name: string;
  model_xml: string;              // Path to MuJoCo XML
  asset_meta?: string | null;     // Path to metadata JSON
  metadata?: AssetMetadata;       // Or inline metadata
  default_policy?: string | null;
  policies: PolicyConfig[];
  camera?: CameraConfig;
  backgroundColor?: string;
  description?: string;
  preview?: string;               // Preview image path
}
```

### PolicyConfig

Configuration for a policy:

```typescript
interface PolicyConfig {
  id: string;
  name: string;
  description?: string;
  path?: string | null;           // Path to policy.json

  // ONNX model
  onnx?: ONNXConfig;

  // Observation configuration
  obs_config?: ObservationConfigMap;

  // Control parameters
  action_scale?: number;
  stiffness?: number;
  damping?: number;

  // Overrides
  model_xml?: string | null;      // Override scene XML
  asset_meta?: string | null;     // Override metadata

  // UI
  ui_controls?: ('setpoint' | 'stiffness' | 'force')[];
}
```

### CameraConfig

Camera configuration:

```typescript
interface CameraConfig {
  position?: [number, number, number];  // [x, y, z]
  target?: [number, number, number];    // lookAt position
  followBody?: string;                   // MuJoCo body to follow
  fov?: number;                         // Field of view (degrees)
  near?: number;                        // Near clipping plane
  far?: number;                         // Far clipping plane
}
```

### AssetMetadata

Robot and scene metadata:

```typescript
interface AssetMetadata {
  // Initial state
  init_state?: {
    pos?: [number, number, number];
    rot?: [number, number, number, number];  // quaternion [w, x, y, z]
    joint_pos?: Record<string, number>;      // Joint name → position
  };

  // Isaac Lab compatibility
  body_names_isaac?: string[];
  joint_names_isaac?: string[];

  // Actuators (PD controllers)
  actuators?: Record<string, ActuatorConfig>;

  // Defaults
  default_joint_pos?: number[];
  description?: string;
}
```

### ObservationConfig

Observation components for policies:

```typescript
// Base observation types
type ObservationConfig =
  | { name: 'ProjectedGravity'; joint_name?: string; history_steps?: number }
  | { name: 'JointPositions'; joint_names?: 'isaac' | string[]; history_steps?: number }
  | { name: 'JointVelocities'; joint_names?: 'isaac' | string[]; history_steps?: number }
  | { name: 'BaseLinearVelocity'; joint_name?: string; history_steps?: number }
  | { name: 'BaseAngularVelocity'; joint_name?: string; history_steps?: number }
  | { name: 'PreviousActions'; history_steps?: number }
  | { name: 'VelocityCommand' }
  | { name: 'VelocityCommandWithOscillators' }
  | { name: 'ImpedanceCommand' };

// Observation groups
interface ObservationConfigMap {
  policy?: ObservationConfig[];     // Main policy input
  command_?: ObservationConfig[];   // Command observations
  [key: string]: ObservationConfig[] | undefined;
}
```

---

## Event System

Muwanx provides an event system to react to viewer state changes:

### Available Events

```typescript
type ViewerEvents = {
  'project-changed': { projectId: string; project: ProjectConfig };
  'scene-changed': { sceneId: string; scene: SceneConfig };
  'policy-changed': { policyId: string; policy: PolicyConfig };
  'params-changed': { params: Partial<RuntimeParams> };
  'state-changed': { state: RuntimeState };
  'error': { error: Error; context?: string };
};
```

### Event Listeners

```typescript
// Add event listener
viewer.on('scene-changed', ({ sceneId, scene }) => {
  console.log(`Scene changed to: ${scene.name}`);
  updateUI(scene);
});

viewer.on('policy-changed', ({ policyId, policy }) => {
  console.log(`Policy changed to: ${policy.name}`);
  updateControls(policy);
});

viewer.on('params-changed', ({ params }) => {
  console.log('Parameters updated:', params);
  displayParams(params);
});

viewer.on('error', ({ error, context }) => {
  console.error(`Error in ${context}:`, error);
  showErrorDialog(error.message);
});

// Remove event listener
const handler = ({ scene }) => console.log(scene.name);
viewer.on('scene-changed', handler);
viewer.off('scene-changed', handler);
```

### Example: Progress Tracking

```typescript
let loadingSteps = [];

viewer.on('scene-changed', ({ scene }) => {
  loadingSteps.push(`Loaded scene: ${scene.name}`);
  updateProgressBar(loadingSteps.length / 3);
});

viewer.on('policy-changed', ({ policy }) => {
  loadingSteps.push(`Loaded policy: ${policy.name}`);
  updateProgressBar(loadingSteps.length / 3);
});

viewer.on('state-changed', ({ state }) => {
  if (state.playing) {
    loadingSteps.push('Simulation started');
    updateProgressBar(1.0);
    hideProgressBar();
  }
});

viewer.on('error', ({ error }) => {
  showError(`Loading failed: ${error.message}`);
  hideProgressBar();
});
```

---

## Runtime Control

### Parameter Control

```typescript
// Get current parameters
const params = viewer.getParams();
console.log('Current velocity:', params.lin_vel_x);

// Update parameters
viewer.updateParams({
  // Velocity commands
  lin_vel_x: 1.0,      // Forward velocity (m/s)
  lin_vel_y: 0.0,      // Lateral velocity (m/s)
  ang_vel_z: 0.5,      // Angular velocity (rad/s)

  // Gait parameters
  gait_freq: 3.0,      // Gait frequency (Hz)
  gait_phase: 0.5,     // Phase offset
  footswing_height: 0.08,  // Footswing height (m)

  // Body orientation
  body_pitch: 0.0,     // Body pitch (rad)
  body_roll: 0.0,      // Body roll (rad)

  // PD controller
  stiffness: 25.0,     // Stiffness (N⋅m/rad)
  damping: 0.5,        // Damping (N⋅m⋅s/rad)
});
```

### Simulation Control

```typescript
// Play/pause
viewer.play();
viewer.pause();

// Reset to initial state
await viewer.reset();

// Check simulation state
const params = viewer.getParams();
console.log('Playing:', !params.paused);
console.log('Simulation time:', params.time);
console.log('FPS:', params.fps);
```

### Content Selection

```typescript
// Select project
await viewer.selectProject('my-project-id');

// Select scene
await viewer.selectScene('my-scene-id');

// Select policy
await viewer.selectPolicy('my-policy-id');

// Get current selections
const currentProject = viewer.getCurrentProject();
const currentScene = viewer.getCurrentScene();
const currentPolicy = viewer.getCurrentPolicy();

// List available content
const projects = viewer.getProjects();
const scenes = viewer.getScenes();      // For current project
const policies = viewer.getPolicies();   // For current scene
```

---

## Advanced Usage

### Direct Runtime Access

For low-level control, access the MujocoRuntime:

```typescript
const runtime = viewer.getRuntime();

// Access MuJoCo model and data
const mjModel = runtime.mjModel;
const mjData = runtime.mjData;

// Direct simulation control
runtime.params.paused = false;
runtime.step();

// Access managers
const actionManager = runtime.actionManager;
const observationManagers = runtime.observationManagers;
```

### Custom Managers

```typescript
import {
  MujocoRuntime,
  IsaacActionManager,
  GoCommandManager,
  ConfigObservationManager
} from 'muwanx';

// Create custom runtime with managers
const commandManager = new GoCommandManager();
const actionManager = new IsaacActionManager();
const observationManager = new ConfigObservationManager();

const runtime = new MujocoRuntime(mujoco, {
  containerId: 'mujoco-container',
  commandManager,
  actionManager,
  observationManagers: [observationManager],
  envManagers: []
});

// Load scene and policy
await runtime.loadEnvironment({
  scenePath: './assets/scene/robot.xml',
  metaPath: './assets/metadata.json',
  policyPath: './assets/policy/walk.json'
});

// Start simulation loop
runtime.running = true;
runtime.startLoop();
```

### Custom Observation Components

```typescript
import { BaseObservation } from 'muwanx';

class CustomObservation extends BaseObservation {
  constructor(config) {
    super(config);
    this.history_steps = config.history_steps || 1;
  }

  observe(context) {
    const { mjModel, mjData } = context;
    // Implement custom observation logic
    const observation = new Float32Array(this.dim);
    // ... populate observation ...
    return observation;
  }

  get dim() {
    // Return observation dimension
    return 12 * this.history_steps;
  }
}

// Register and use
observationManager.registerComponent('CustomObservation', CustomObservation);
```

### Loading External Configs

```typescript
// Load from URL
const viewer = new MwxViewer('#container');
await viewer.loadConfig('https://example.com/config.json');

// Load from JavaScript object
const config = {
  projects: {
    project_name: "My Project",
    scenes: [/* ... */]
  }
};
await viewer.loadConfig(config);

// Convert legacy format
import { convertLegacyConfig } from 'muwanx';

const legacyConfig = await fetch('./old-config.json').then(r => r.json());
const newConfig = convertLegacyConfig(legacyConfig);
await viewer.loadConfig(newConfig);
```

---

## TypeScript Support

Muwanx includes comprehensive TypeScript type definitions.

### Importing Types

```typescript
import type {
  // Main API types
  ViewerConfig,
  ProjectConfig,
  SceneConfig,
  PolicyConfig,

  // Configuration types
  CameraConfig,
  AssetMetadata,
  ActuatorConfig,
  ObservationConfig,
  ObservationConfigMap,
  ONNXConfig,

  // Runtime types
  RuntimeParams,
  RuntimeState,

  // Event types
  ViewerEvents,
  ViewerEventName,
  ViewerEventCallback,
} from 'muwanx';
```

### Type-Safe Configuration

```typescript
import { MwxViewer, type SceneConfig, type PolicyConfig } from 'muwanx';

// Typed scene configuration
const scene: SceneConfig = {
  id: "my-scene",
  name: "My Scene",
  model_xml: "./scene.xml",
  asset_meta: "./metadata.json",
  camera: {
    position: [2, 1, 1],
    target: [0, 0, 0],
    fov: 45
  },
  policies: []
};

// Typed policy configuration
const policy: PolicyConfig = {
  id: "my-policy",
  name: "My Policy",
  path: "./policy.json",
  stiffness: 25.0,
  damping: 0.5,
  ui_controls: ['setpoint', 'stiffness']
};

scene.policies.push(policy);
```

### Type-Safe Event Handlers

```typescript
import { MwxViewer, type ViewerEventCallback } from 'muwanx';

const viewer = new MwxViewer('#container');

// Type-safe event handler
const onSceneChanged: ViewerEventCallback<'scene-changed'> = ({ sceneId, scene }) => {
  console.log(`Scene ${sceneId} loaded:`, scene.name);
};

viewer.on('scene-changed', onSceneChanged);

// Type-safe error handler
const onError: ViewerEventCallback<'error'> = ({ error, context }) => {
  console.error(`Error in ${context}:`, error.message);
};

viewer.on('error', onError);
```

---

## Troubleshooting

### Common Issues

#### White Screen / Viewer Not Loading

**Problem:** Container element not found or not properly sized.

**Solution:**
```typescript
// Ensure container exists and has dimensions
const container = document.getElementById('mujoco-container');
if (!container) {
  throw new Error('Container not found');
}
container.style.width = '100%';
container.style.height = '100vh';

const viewer = new MwxViewer(container);
```

#### Scene/Policy Not Loading

**Problem:** Incorrect file paths or missing files.

**Solution:**
```typescript
// Check browser console for 404 errors
// Ensure paths are relative to index.html

// Example correct paths (if index.html is in root):
model_xml: "./assets/scene/robot/scene.xml"
asset_meta: "./assets/scene/robot/metadata.json"
path: "./assets/policy/robot/walk.json"

// Use browser dev tools Network tab to verify file loading
```

#### ONNX Model Not Working

**Problem:** ONNX runtime initialization failed or model incompatibility.

**Solution:**
```typescript
// Check ONNX model version compatibility
// Ensure onnxruntime-web is installed
npm install onnxruntime-web

// Verify ONNX model loads in browser console
// Check for CORS issues if loading from different origin
```

#### Scene/Policy Parameters Don't Match

**Problem:** URL has stale query parameters from another project.

**Solution:**
This is now fixed in the latest version. Projects switch with clean URLs.
```typescript
// URLs now clean when switching projects:
// From: #/menagerie?scene=Go2&policy=Facet
// To:   #/menagerie (clean, no params)
```

#### Performance Issues

**Problem:** Low FPS or stuttering simulation.

**Solution:**
```typescript
// Reduce simulation complexity
// Check if WebGL is hardware accelerated
// Close other browser tabs
// Use Chrome/Edge for best performance

// Monitor FPS
viewer.on('state-changed', ({ state }) => {
  console.log('FPS:', state.fps);
});
```

### Debug Mode

Enable debug mode for additional logging:

```typescript
const viewer = new MwxViewer('#container');

// Access runtime for debug info
const runtime = viewer.getRuntime();
console.log('MuJoCo Model:', runtime.mjModel);
console.log('MuJoCo Data:', runtime.mjData);
console.log('Current params:', runtime.params);

// Monitor simulation loop
setInterval(() => {
  const params = viewer.getParams();
  console.log('Time:', params.time, 'FPS:', params.fps);
}, 1000);
```

### Getting Help

- **GitHub Issues**: https://github.com/ttktjmt/muwanx/issues
- **Documentation**: https://github.com/ttktjmt/muwanx/tree/main/doc
- **Examples**: Check the `examples/` directory in the repository

---

## License

Muwanx is licensed under the [Apache-2.0 License](../LICENSE).

Third-party assets have their own licenses:
- [MyoSuite License](https://github.com/MyoHub/myosuite/blob/main/LICENSE)
- [MuJoCo Menagerie License](https://github.com/google-deepmind/mujoco_menagerie/blob/main/LICENSE)
- [MuJoCo Playground License](https://github.com/google-deepmind/mujoco_playground/blob/main/LICENSE)
