/**
 * MwxViewer - Main API class for Muwanx package
 *
 * Provides both declarative (config-based) and imperative (programmatic) APIs
 * for building interactive MuJoCo-based applications.
 */

import type {
  ViewerConfig,
  ProjectConfig,
  SceneConfig,
  PolicyConfig,
  RuntimeState,
  RuntimeParams,
  AssetMetadata,
} from '@/types/api';
import { MujocoRuntime } from '@/core/engine/MujocoRuntime';
import type { MujocoRuntimeOptions } from '@/core/engine/MujocoRuntime';

// Event types for viewer state changes
export interface ViewerEvents {
  'project-changed': { projectId: string; project: ProjectConfig };
  'scene-changed': { sceneId: string; scene: SceneConfig };
  'policy-changed': { policyId: string; policy: PolicyConfig };
  'params-changed': { params: Partial<RuntimeParams> };
  'state-changed': { state: RuntimeState };
  'error': { error: Error; context?: string };
}

export type ViewerEventName = keyof ViewerEvents;
export type ViewerEventCallback<T extends ViewerEventName> = (event: ViewerEvents[T]) => void;

/**
 * Project builder for imperative API
 */
export class Project {
  private config: ProjectConfig;
  private viewer: MwxViewer;

  constructor(viewer: MwxViewer, config: Partial<ProjectConfig> = {}) {
    this.viewer = viewer;
    this.config = {
      id: config.id || `project-${Date.now()}`,
      project_name: config.project_name,
      project_link: config.project_link,
      scenes: config.scenes || [],
      default_scene: config.default_scene,
    };
  }

  /**
   * Add a scene to this project
   */
  addScene(config: Partial<SceneConfig>): Scene {
    const scene = new Scene(this, config);
    this.config.scenes.push(scene.getConfig());
    return scene;
  }

  /**
   * Set project metadata
   */
  setMetadata(metadata: { name?: string; link?: string }): this {
    if (metadata.name) this.config.project_name = metadata.name;
    if (metadata.link) this.config.project_link = metadata.link;
    return this;
  }

  /**
   * Set the default scene for this project
   */
  setDefaultScene(sceneId: string): this {
    this.config.default_scene = sceneId;
    return this;
  }

  /**
   * Get the project configuration
   */
  getConfig(): ProjectConfig {
    return this.config;
  }

  /**
   * Get parent viewer
   */
  getViewer(): MwxViewer {
    return this.viewer;
  }
}

/**
 * Scene builder for imperative API
 */
export class Scene {
  private config: SceneConfig;
  private project: Project;

  constructor(project: Project, config: Partial<SceneConfig>) {
    this.project = project;
    this.config = {
      id: config.id || `scene-${Date.now()}`,
      name: config.name || 'Untitled Scene',
      model_xml: config.model_xml || '',
      asset_meta: config.asset_meta,
      metadata: config.metadata,
      default_policy: config.default_policy,
      policies: config.policies || [],
      camera: config.camera,
      backgroundColor: config.backgroundColor,
      description: config.description,
      preview: config.preview,
    };
  }

  /**
   * Add a policy to this scene
   */
  addPolicy(config: Partial<PolicyConfig>): Policy {
    const policy = new Policy(this, config);
    this.config.policies.push(policy.getConfig());
    return policy;
  }

  /**
   * Set scene metadata
   */
  setMetadata(metadata: Partial<AssetMetadata>): this {
    this.config.metadata = { ...this.config.metadata, ...metadata };
    return this;
  }

  /**
   * Set camera configuration
   */
  setCamera(camera: SceneConfig['camera']): this {
    this.config.camera = camera;
    return this;
  }

  /**
   * Set background color
   */
  setBackgroundColor(color: string): this {
    this.config.backgroundColor = color;
    return this;
  }

  /**
   * Set the default policy for this scene
   */
  setDefaultPolicy(policyId: string): this {
    this.config.default_policy = policyId;
    return this;
  }

  /**
   * Get the scene configuration
   */
  getConfig(): SceneConfig {
    return this.config;
  }

  /**
   * Get parent project
   */
  getProject(): Project {
    return this.project;
  }
}

/**
 * Policy builder for imperative API
 */
export class Policy {
  private config: PolicyConfig;
  private scene: Scene;

  constructor(scene: Scene, config: Partial<PolicyConfig>) {
    this.scene = scene;
    this.config = {
      id: config.id || `policy-${Date.now()}`,
      name: config.name || 'Untitled Policy',
      description: config.description,
      onnx: config.onnx,
      obs_config: config.obs_config,
      action_scale: config.action_scale,
      stiffness: config.stiffness,
      damping: config.damping,
      model_xml: config.model_xml,
      asset_meta: config.asset_meta,
      ui_controls: config.ui_controls,
      path: config.path,
    };
  }

  /**
   * Set ONNX model configuration
   */
  setONNX(onnx: PolicyConfig['onnx']): this {
    this.config.onnx = onnx;
    return this;
  }

  /**
   * Set observation configuration
   */
  setObservationConfig(obs_config: PolicyConfig['obs_config']): this {
    this.config.obs_config = obs_config;
    return this;
  }

  /**
   * Set PD controller parameters
   */
  setPDParams(params: { stiffness?: number; damping?: number }): this {
    if (params.stiffness !== undefined) this.config.stiffness = params.stiffness;
    if (params.damping !== undefined) this.config.damping = params.damping;
    return this;
  }

  /**
   * Set action scale
   */
  setActionScale(scale: number): this {
    this.config.action_scale = scale;
    return this;
  }

  /**
   * Set UI controls
   */
  setUIControls(controls: PolicyConfig['ui_controls']): this {
    this.config.ui_controls = controls;
    return this;
  }

  /**
   * Get the policy configuration
   */
  getConfig(): PolicyConfig {
    return this.config;
  }

  /**
   * Get parent scene
   */
  getScene(): Scene {
    return this.scene;
  }
}

/**
 * Main MwxViewer class
 *
 * Supports both usage patterns:
 * - Pattern A (Declarative): Load from configuration
 * - Pattern B (Imperative): Programmatic construction
 */
export class MwxViewer {
  private container: HTMLElement | null = null;
  private runtime: MujocoRuntime | null = null;
  private mujoco: any = null;
  private projects: Map<string, ProjectConfig> = new Map();
  private currentProjectId: string | null = null;
  private currentSceneId: string | null = null;
  private currentPolicyId: string | null = null;
  private eventListeners: Map<ViewerEventName, Set<ViewerEventCallback<any>>> = new Map();
  private config: ViewerConfig | null = null;
  private initialized: boolean = false;

  /**
   * Create a new MwxViewer instance
   *
   * @param container - Optional container element or selector
   */
  constructor(container?: HTMLElement | string) {
    if (container) {
      this.setContainer(container);
    }
  }

  /**
   * Set the container element for the viewer
   */
  setContainer(container: HTMLElement | string): this {
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`Container element not found: ${container}`);
      }
      this.container = element as HTMLElement;
    } else {
      this.container = container;
    }

    // Ensure container has an ID for MujocoRuntime
    if (!this.container.id) {
      this.container.id = `muwanx-container-${Date.now()}`;
    }

    return this;
  }

  /**
   * Pattern A: Load configuration from object or URL
   *
   * @param config - ViewerConfig object or URL to config JSON
   */
  async loadConfig(config: ViewerConfig | string): Promise<void> {
    let viewerConfig: ViewerConfig;

    // Fetch config from URL if string provided
    if (typeof config === 'string') {
      const response = await fetch(config);
      if (!response.ok) {
        throw new Error(`Failed to fetch config from ${config}: ${response.statusText}`);
      }
      viewerConfig = await response.json();
    } else {
      viewerConfig = config;
    }

    this.config = viewerConfig;

    // Handle single project or array of projects
    const projects = Array.isArray(viewerConfig.projects)
      ? viewerConfig.projects
      : [viewerConfig.projects];

    // Store projects
    for (const project of projects) {
      const id = project.id || project.project_name || `project-${this.projects.size}`;
      this.projects.set(id, { ...project, id });
    }

    // Set initial selections
    if (viewerConfig.initialProject) {
      this.currentProjectId = viewerConfig.initialProject;
    } else if (this.projects.size > 0) {
      this.currentProjectId = this.projects.keys().next().value;
    }

    // Initialize if container is set
    if (this.container) {
      await this.initialize();
    }

    // Load initial scene/policy if specified
    if (viewerConfig.initialScene) {
      await this.selectScene(viewerConfig.initialScene);
    } else {
      // Load default scene from current project
      const project = this.getCurrentProject();
      if (project?.default_scene) {
        await this.selectScene(project.default_scene);
      } else if (project?.scenes.length > 0) {
        await this.selectScene(project.scenes[0].id);
      }
    }

    if (viewerConfig.initialPolicy) {
      await this.selectPolicy(viewerConfig.initialPolicy);
    }
  }

  /**
   * Pattern B: Add a project programmatically
   *
   * @param config - Partial project configuration
   * @returns Project builder instance
   */
  addProject(config: Partial<ProjectConfig> = {}): Project {
    const project = new Project(this, config);
    const projectConfig = project.getConfig();
    this.projects.set(projectConfig.id!, projectConfig);

    // Set as current if first project
    if (this.projects.size === 1) {
      this.currentProjectId = projectConfig.id!;
    }

    return project;
  }

  /**
   * Initialize the viewer (load MuJoCo, create runtime)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!this.container) {
      throw new Error('Container must be set before initializing');
    }

    try {
      // Dynamically import MuJoCo
      const mujocoModule = await import('mujoco-js');
      this.mujoco = await mujocoModule.default();

      // Create runtime with container
      const options: MujocoRuntimeOptions = {
        containerId: this.container.id,
      };

      this.runtime = new MujocoRuntime(this.mujoco, options);
      this.initialized = true;

      console.log('[MwxViewer] Initialized successfully');
    } catch (error) {
      this.emit('error', { error: error as Error, context: 'initialization' });
      throw error;
    }
  }

  /**
   * Select and load a project
   */
  async selectProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.currentProjectId = projectId;
    this.emit('project-changed', { projectId, project });

    // Load default scene if available
    if (project.default_scene) {
      await this.selectScene(project.default_scene);
    } else if (project.scenes.length > 0) {
      await this.selectScene(project.scenes[0].id);
    }
  }

  /**
   * Select and load a scene
   */
  async selectScene(sceneId: string): Promise<void> {
    await this.initialize();

    const scene = this.findScene(sceneId);
    if (!scene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    this.currentSceneId = sceneId;
    this.emit('scene-changed', { sceneId, scene });

    // Build paths
    const scenePath = scene.model_xml;
    const metaPath = scene.asset_meta || undefined;

    // Load environment (scene only, no policy yet)
    try {
      await this.runtime!.loadEnvironment({
        scenePath,
        metaPath,
      });

      // Apply camera config if provided
      if (scene.camera) {
        this.runtime!.applyCameraFromMetadata({
          camera: {
            pos: scene.camera.position,
            target: scene.camera.target,
            fov: scene.camera.fov,
          },
        });
      }

      // Load default policy if available
      if (scene.default_policy) {
        await this.selectPolicy(scene.default_policy);
      }
    } catch (error) {
      this.emit('error', { error: error as Error, context: 'scene-loading' });
      throw error;
    }
  }

  /**
   * Select and load a policy
   */
  async selectPolicy(policyId: string): Promise<void> {
    const policy = this.findPolicy(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    this.currentPolicyId = policyId;
    this.emit('policy-changed', { policyId, policy });

    try {
      // If policy has its own scene override, reload scene first
      if (policy.model_xml) {
        await this.runtime!.loadScene(
          policy.model_xml,
          policy.asset_meta || undefined
        );
      }

      // Load policy
      if (policy.path) {
        await this.runtime!.loadPolicy(policy.path);
      } else if (policy.onnx) {
        // For programmatic policies, we need to create a temporary policy config
        const tempPolicyPath = this.createTempPolicyConfig(policy);
        await this.runtime!.loadPolicy(tempPolicyPath);
      }

      // Apply PD parameters if specified
      if (policy.stiffness !== undefined || policy.damping !== undefined) {
        this.updateParams({
          stiffness: policy.stiffness,
          damping: policy.damping,
        });
      }
    } catch (error) {
      this.emit('error', { error: error as Error, context: 'policy-loading' });
      throw error;
    }
  }

  /**
   * Update runtime parameters
   */
  updateParams(params: Partial<RuntimeParams>): void {
    if (!this.runtime) {
      throw new Error('Runtime not initialized');
    }

    // Update runtime params
    Object.assign(this.runtime.params, params);
    this.emit('params-changed', { params });
  }

  /**
   * Get current runtime parameters
   */
  getParams(): RuntimeParams | null {
    return this.runtime?.params || null;
  }

  /**
   * Start/resume simulation
   */
  play(): void {
    if (this.runtime) {
      this.runtime.params.paused = false;
    }
  }

  /**
   * Pause simulation
   */
  pause(): void {
    if (this.runtime) {
      this.runtime.params.paused = true;
    }
  }

  /**
   * Reset simulation
   */
  async reset(): Promise<void> {
    if (this.runtime) {
      await this.runtime.reset();
    }
  }

  /**
   * Get current project
   */
  getCurrentProject(): ProjectConfig | null {
    return this.currentProjectId ? this.projects.get(this.currentProjectId) || null : null;
  }

  /**
   * Get current scene
   */
  getCurrentScene(): SceneConfig | null {
    return this.currentSceneId ? this.findScene(this.currentSceneId) : null;
  }

  /**
   * Get current policy
   */
  getCurrentPolicy(): PolicyConfig | null {
    return this.currentPolicyId ? this.findPolicy(this.currentPolicyId) : null;
  }

  /**
   * Get all projects
   */
  getProjects(): ProjectConfig[] {
    return Array.from(this.projects.values());
  }

  /**
   * Get scenes for current project
   */
  getScenes(): SceneConfig[] {
    const project = this.getCurrentProject();
    return project?.scenes || [];
  }

  /**
   * Get policies for current scene
   */
  getPolicies(): PolicyConfig[] {
    const scene = this.getCurrentScene();
    return scene?.policies || [];
  }

  /**
   * Add event listener
   */
  on<T extends ViewerEventName>(event: T, callback: ViewerEventCallback<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off<T extends ViewerEventName>(event: T, callback: ViewerEventCallback<T>): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event to listeners
   */
  private emit<T extends ViewerEventName>(event: T, data: ViewerEvents[T]): void {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Find scene by ID across all projects
   */
  private findScene(sceneId: string): SceneConfig | null {
    for (const project of this.projects.values()) {
      const scene = project.scenes.find(s => s.id === sceneId);
      if (scene) return scene;
    }
    return null;
  }

  /**
   * Find policy by ID across all scenes
   */
  private findPolicy(policyId: string): PolicyConfig | null {
    for (const project of this.projects.values()) {
      for (const scene of project.scenes) {
        const policy = scene.policies.find(p => p.id === policyId);
        if (policy) return policy;
      }
    }
    return null;
  }

  /**
   * Create temporary policy config for programmatic policies
   * (This would need to be enhanced to properly serialize the policy config)
   */
  private createTempPolicyConfig(policy: PolicyConfig): string {
    // For now, throw an error - this would need proper implementation
    throw new Error('Programmatic policy creation not yet implemented. Please use policy.path.');
  }

  /**
   * Destroy the viewer and clean up resources
   */
  destroy(): void {
    if (this.runtime) {
      this.runtime.stop();
      this.runtime = null;
    }
    this.projects.clear();
    this.eventListeners.clear();
    this.initialized = false;
  }

  /**
   * Get the underlying MujocoRuntime instance (advanced usage)
   */
  getRuntime(): MujocoRuntime | null {
    return this.runtime;
  }
}

// Re-export types for convenience
export type {
  ViewerConfig,
  ProjectConfig,
  SceneConfig,
  PolicyConfig,
  RuntimeParams,
} from '@/types/api';
