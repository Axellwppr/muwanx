# Muwanx Usage Guide

Complete guide to using Muwanx as an npm package for building interactive MuJoCo applications with neural network policies.

## Table of Contents

- [Installation](#installation)
- [API Design](#api-design)
  - [Imperative API (Recommended)](#imperative-api-recommended)
  - [Declarative API](#declarative-api)
- [Hierarchy](#hierarchy)
- [Examples](#examples)
  - [Basic Quadruped Locomotion](#basic-quadruped-locomotion)
  - [Multi-Project Application](#multi-project-application)
  - [Custom Controls](#custom-controls)
- [Getting Help](#getting-help)

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

## API Design

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

## Hierarchy

Muwanx organizes content in a hierarchical structure:

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
            ├── Action Configuration
            ├── Observation Configuration
            └── Control Parameters
```

---

## Examples

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

## Getting Help

- **GitHub Issues**: https://github.com/ttktjmt/muwanx/issues
- **Documentation**: https://github.com/ttktjmt/muwanx/tree/main/doc
- **Examples**: Check the `examples/` directory in the repository
