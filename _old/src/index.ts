/**
 * Muwanx
 *
 * Main package entry point for the muwanx npm package.
 *
 * This package provides a customizable API for building interactive
 * MuJoCo-based applications with RL/NN policies.
 *
 * @example
 * ```typescript
 * // Pattern A: Declarative (load from config)
 * import { MwxViewer } from 'muwanx';
 *
 * const viewer = new MwxViewer('#container');
 * await viewer.loadConfig('./config.json');
 * ```
 *
 * @example
 * ```typescript
 * // Pattern B: Imperative (programmatic)
 * import { MwxViewer } from 'muwanx';
 *
 * const viewer = new MwxViewer('#container');
 * const project = viewer.addProject({
 *   name: "My Project",
 *   link: "https://..."
 * });
 * const scene = project.addScene({
 *   id: "scene1",
 *   name: "My Scene",
 *   model_xml: "./assets/scene.xml"
 * });
 * const policy = scene.addPolicy({
 *   id: "policy1",
 *   name: "My Policy",
 *   path: "./assets/policy.json"
 * });
 * await viewer.initialize();
 * ```
 */

// ============================================================================
// Main API - MwxViewer class and builders
// ============================================================================
export { MwxViewer, Project, Scene, Policy } from './viewer/MwxViewer';
export type {
  ViewerEvents,
  ViewerEventName,
  ViewerEventCallback,
} from './viewer/MwxViewer';

// ============================================================================
// API Type Definitions
// ============================================================================
export type {
  // Main configuration types
  ViewerConfig,
  ProjectConfig,
  SceneConfig,
  PolicyConfig,

  // Camera configuration
  CameraConfig,

  // Asset metadata
  AssetMetadata,
  InitialState,
  ActuatorConfig,

  // Observation configuration
  ObservationConfig,
  ObservationConfigMap,
  BaseObservationConfig,
  ProjectedGravityConfig,
  JointPositionsConfig,
  JointVelocitiesConfig,
  BaseLinearVelocityConfig,
  BaseAngularVelocityConfig,
  PreviousActionsConfig,
  VelocityCommandConfig,
  VelocityCommandWithOscillatorsConfig,
  ImpedanceCommandConfig,

  // Policy configuration
  ONNXConfig,
  ONNXMetadata,
  UIControlType,

  // Runtime state
  RuntimeState,
  RuntimeParams,

  // Legacy types
  LegacyAppConfig,
} from './types/api';

// Utility functions
export { convertLegacyConfig } from './types/api';

// ============================================================================
// Legacy type definitions (for backward compatibility)
// ============================================================================
export type * from './types/config';
export type * from './types/events';
export type * from './types/state';

// ============================================================================
// Core Engine (Advanced Usage)
// ============================================================================
export { MujocoRuntime } from './core/engine/MujocoRuntime';
export type { MujocoRuntimeOptions } from './core/engine/MujocoRuntime';

// Action managers
export { IsaacActionManager } from './core/action/IsaacActionManager';
export { PassiveActionManager } from './core/action/PassiveActionManager';

// Observation managers and components
export { ConfigObservationManager } from './core/observation/ObservationManager';
// Alias for convenience
export { ConfigObservationManager as ObservationManager } from './core/observation/ObservationManager';
export * from './core/observation/atomic';
export * from './core/observation/commands';

// Command managers
export { GoCommandManager } from './core/engine/managers/CommandManager';

// Environment managers
export { LocomotionEnvManager } from './core/engine/managers/EnvManager';

// ONNX helper
export { ONNXModule } from './core/agent/onnxHelper';

// Scene utilities
export * from './core/scene/scene';
export * from './core/scene/lights';
export * from './core/scene/textures';
export * from './core/scene/tendons';

// ============================================================================
// Vue Viewer Components (Optional)
// ============================================================================
// Note: These are exported separately via the './viewer' export path
// Import them using: import MwxViewerComponent from 'muwanx/viewer';

// Re-export viewer for convenience
export { default as MwxViewerComponent } from './viewer/components/MwxViewer.vue';

// Composables
export { useConfig } from './viewer/composables/useConfig';
export { useRuntime } from './viewer/composables/useRuntime';
export { useScenePolicy } from './viewer/composables/useScenePolicy';
export { useUrlSync } from './viewer/composables/useUrlSync';
export type { RouteItem, ProjectItem } from './viewer/composables/useUrlSync';
export { useTransition } from './viewer/composables/useTransition';
export { useResponsive } from './viewer/composables/useResponsive';
