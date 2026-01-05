/**
 * Muwanx API Type Definitions
 *
 * This file contains comprehensive type definitions for the Muwanx package API,
 * supporting both declarative (config-based) and imperative (programmatic) usage patterns.
 */

// ============================================================================
// Camera Configuration
// ============================================================================

export interface CameraConfig {
  /** Initial camera position [x, y, z] */
  position?: [number, number, number];
  /** Initial camera target/lookAt position [x, y, z] */
  target?: [number, number, number];
  /** Optional MuJoCo body name to follow with camera */
  followBody?: string;
  /** Camera field of view in degrees */
  fov?: number;
  /** Near clipping plane */
  near?: number;
  /** Far clipping plane */
  far?: number;
}

// ============================================================================
// Asset Metadata Configuration
// ============================================================================

export interface InitialState {
  /** Initial position [x, y, z] */
  pos?: [number, number, number];
  /** Initial rotation quaternion [w, x, y, z] */
  rot?: [number, number, number, number];
  /** Initial joint positions (regex pattern → value mapping) */
  joint_pos?: Record<string, number>;
}

export interface ActuatorConfig {
  /** Actuator class type (e.g., "isaaclab.actuators.actuator_pd:ImplicitActuator") */
  class_type: string;
  /** Joint name regex patterns for this actuator group */
  joint_names_expr: string[];
  /** PD controller stiffness */
  stiffness: number;
  /** PD controller damping */
  damping: number;
  /** Effort/torque limits (joint name pattern → limit mapping) */
  effort_limit?: Record<string, number>;
  /** Velocity limit (rad/s or m/s) */
  velocity_limit?: number;
  /** Armature (rotor inertia) */
  armature?: number;
  /** Friction loss */
  friction?: number;
}

export interface AssetMetadata {
  /** Initial state configuration for scene reset */
  init_state?: InitialState;
  /** Body names mapping for Isaac Lab compatibility */
  body_names_isaac?: string[];
  /** Joint names mapping for Isaac Lab compatibility */
  joint_names_isaac?: string[];
  /** Actuator configurations */
  actuators?: Record<string, ActuatorConfig>;
  /** Default joint positions array */
  default_joint_pos?: number[];
  /** Robot description */
  description?: string;
}

// ============================================================================
// Observation Configuration
// ============================================================================

export interface BaseObservationConfig {
  /** Observation component name */
  name: string;
  /** Number of history steps to include */
  history_steps?: number;
}

export interface ProjectedGravityConfig extends BaseObservationConfig {
  name: 'ProjectedGravity';
  /** Joint name for gravity observation */
  joint_name?: string;
}

export interface JointPositionsConfig extends BaseObservationConfig {
  name: 'JointPositions';
  /** Joint names: 'isaac' for Isaac Lab mapping, or array of joint names */
  joint_names?: 'isaac' | string[];
}

export interface JointVelocitiesConfig extends BaseObservationConfig {
  name: 'JointVelocities';
  /** Joint names: 'isaac' for Isaac Lab mapping, or array of joint names */
  joint_names?: 'isaac' | string[];
}

export interface BaseLinearVelocityConfig extends BaseObservationConfig {
  name: 'BaseLinearVelocity';
  /** Joint name for base velocity observation */
  joint_name?: string;
}

export interface BaseAngularVelocityConfig extends BaseObservationConfig {
  name: 'BaseAngularVelocity';
  /** Joint name for base angular velocity observation */
  joint_name?: string;
}

export interface PreviousActionsConfig extends BaseObservationConfig {
  name: 'PreviousActions';
}

export interface VelocityCommandConfig extends BaseObservationConfig {
  name: 'VelocityCommand';
}

export interface VelocityCommandWithOscillatorsConfig extends BaseObservationConfig {
  name: 'VelocityCommandWithOscillators';
}

export interface ImpedanceCommandConfig extends BaseObservationConfig {
  name: 'ImpedanceCommand';
}

export type ObservationConfig =
  | ProjectedGravityConfig
  | JointPositionsConfig
  | JointVelocitiesConfig
  | BaseLinearVelocityConfig
  | BaseAngularVelocityConfig
  | PreviousActionsConfig
  | VelocityCommandConfig
  | VelocityCommandWithOscillatorsConfig
  | ImpedanceCommandConfig;

// ============================================================================
// Policy Configuration
// ============================================================================

export interface ONNXMetadata {
  /** Input tensor keys */
  in_keys: string[];
  /** Output tensor keys */
  out_keys: string[];
  /** Input tensor shapes (nested arrays for batch dimensions) */
  in_shapes: number[][][];
  /** Optional output tensor shapes */
  out_shapes?: number[][][];
}

export interface ONNXConfig {
  /** ONNX model metadata */
  meta: ONNXMetadata;
  /** Path to ONNX model file */
  path: string;
}

export interface ObservationConfigMap {
  /** Observation configuration for policy input */
  policy?: ObservationConfig[];
  /** Observation configuration for commands (velocity, impedance, etc.) */
  command_?: ObservationConfig[];
  /** Additional observation groups */
  [key: string]: ObservationConfig[] | undefined;
}

export type UIControlType = 'setpoint' | 'stiffness' | 'force';

export interface PolicyConfig {
  /** Policy identifier */
  id: string;
  /** Display name */
  name: string;
  /** Policy description/comment */
  description?: string;
  /** ONNX model configuration */
  onnx?: ONNXConfig;
  /** Observation configuration */
  obs_config?: ObservationConfigMap;
  /** Action scaling factor */
  action_scale?: number;
  /** Default PD controller stiffness */
  stiffness?: number;
  /** Default PD controller damping */
  damping?: number;
  /**
   * Optional scene override - can be either:
   * - A file path to an XML file (e.g., "./assets/scene.xml")
   * - Inline XML content as a string (must start with "<mujoco" or "<?xml")
   */
  model_xml?: string | null;
  /** Optional asset metadata override path */
  asset_meta?: string | null;
  /** UI control types to display in control panel */
  ui_controls?: UIControlType[];
  /** Path to policy.json file (for declarative loading) */
  path?: string | null;
}

// ============================================================================
// Scene Configuration
// ============================================================================

export interface SceneConfig {
  /** Scene identifier */
  id: string;
  /** Display name */
  name: string;
  /**
   * MuJoCo XML model - can be either:
   * - A file path to an XML file (e.g., "./assets/scene.xml")
   * - Inline XML content as a string (must start with "<mujoco" or "<?xml")
   */
  model_xml: string;
  /** Path to asset metadata JSON file */
  asset_meta?: string | null;
  /** Asset metadata object (alternative to asset_meta path) */
  metadata?: AssetMetadata;
  /** ID of default policy to load */
  default_policy?: string | null;
  /** Available policies for this scene */
  policies: PolicyConfig[];
  /** Camera configuration */
  camera?: CameraConfig;
  /** Background color as hex string (e.g., "#1a1a1a") or CSS color */
  backgroundColor?: string;
  /** Scene description */
  description?: string;
  /** Preview image path */
  preview?: string;
}

// ============================================================================
// Project Configuration
// ============================================================================

export interface ProjectConfig {
  /** Project identifier */
  id?: string;
  /** Project name */
  project_name?: string;
  /** Project homepage/repository link */
  project_link?: string;
  /** Available scenes/tasks */
  scenes: SceneConfig[];
  /** Default scene ID to load */
  default_scene?: string;
}

// ============================================================================
// Viewer Configuration
// ============================================================================

export interface ViewerConfig {
  /** Single project or array of projects */
  projects: ProjectConfig | ProjectConfig[];
  /** Global camera defaults */
  camera?: CameraConfig;
  /** Global background color default */
  backgroundColor?: string;
  /** Enable VR/WebXR support */
  enableVR?: boolean;
  /** Enable debug mode */
  debug?: boolean;
  /** Container element or selector */
  container?: HTMLElement | string;
  /** Initial project ID (for multi-project configs) */
  initialProject?: string;
  /** Initial scene ID */
  initialScene?: string;
  /** Initial policy ID */
  initialPolicy?: string;
}

// ============================================================================
// Runtime State Types
// ============================================================================

export interface RuntimeParams {
  /** Linear velocity X command (m/s) */
  lin_vel_x: number;
  /** Linear velocity Y command (m/s) */
  lin_vel_y: number;
  /** Angular velocity Z command (rad/s) */
  ang_vel_z: number;
  /** Gait frequency (Hz) */
  gait_freq: number;
  /** Gait phase offset */
  gait_phase: number;
  /** Gait offset */
  gait_offset: number;
  /** Gait bound */
  gait_bound: number;
  /** Gait duration */
  gait_duration: number;
  /** Footswing height (m) */
  footswing_height: number;
  /** Body pitch offset (rad) */
  body_pitch: number;
  /** Body roll offset (rad) */
  body_roll: number;
  /** PD controller stiffness */
  stiffness: number;
  /** PD controller damping */
  damping: number;
}

export interface RuntimeState {
  /** Current runtime parameters */
  params: RuntimeParams;
  /** Whether simulation is playing */
  playing: boolean;
  /** Whether simulation is in reset state */
  resetting: boolean;
  /** Current simulation time */
  time: number;
  /** Frames per second */
  fps: number;
}

// ============================================================================
// Backward Compatibility Types
// ============================================================================

/**
 * Legacy config format for backward compatibility
 * @deprecated Use ProjectConfig instead
 */
export interface LegacyAppConfig {
  project_name?: string;
  project_link?: string;
  tasks: Array<{
    id: string;
    name: string;
    model_xml: string;
    asset_meta?: string | null;
    camera?: CameraConfig;
    default_policy?: string | null;
    policies: Array<{
      id: string;
      name: string;
      path?: string | null;
      model_xml?: string | null;
      asset_meta?: string | null;
      ui_controls?: string[];
    }>;
  }>;
}

/**
 * Converts legacy config format to new ProjectConfig format
 */
export function convertLegacyConfig(legacy: LegacyAppConfig): ProjectConfig {
  return {
    project_name: legacy.project_name,
    project_link: legacy.project_link,
    scenes: legacy.tasks.map(task => ({
      id: task.id,
      name: task.name,
      model_xml: task.model_xml,
      asset_meta: task.asset_meta,
      camera: task.camera,
      default_policy: task.default_policy,
      policies: task.policies.map(policy => ({
        id: policy.id,
        name: policy.name,
        path: policy.path,
        model_xml: policy.model_xml,
        asset_meta: policy.asset_meta,
        ui_controls: policy.ui_controls as UIControlType[] | undefined,
      })),
    })),
  };
}
