import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MjData, MjModel } from 'mujoco-js';
import type { Mujoco } from '../../types/mujoco';
import {
  downloadExampleScenesFolder,
  getPosition,
  getQuaternion,
  loadSceneFromURL,
} from '../scene/scene';
import { DragStateManager } from '../utils/dragStateManager';
import { createTendonState, updateTendonGeometry, updateTendonRendering } from '../scene/tendons';
import { updateHeadlightFromCamera, updateLightsFromData } from '../scene/lights';
import { threeToMjcCoordinate } from '../scene/coordinate';
import { SceneCacheManager } from '../cache/sceneCacheManager';
import { SceneResourceTracker } from '../cache/resourceTracker';
import { MemoryMonitor } from '../cache/memoryMonitor';

type RuntimeOptions = {
  baseUrl?: string;
};

type BodyState = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

export class MuwanxRuntime {
  private mujoco: Mujoco;
  private container: HTMLElement;
  private baseUrl: string;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private mjModel: MjModel | null;
  private mjData: MjData | null;
  private bodies: Record<number, THREE.Group> | null;
  private lights: THREE.Light[];
  private mujocoRoot: THREE.Group | null;
  private lastSimState: {
    bodies: Map<number, BodyState>;
    tendons: ReturnType<typeof createTendonState>;
  };
  private loopPromise: Promise<void> | null;
  private running: boolean;
  private timestep: number;
  private decimation: number;
  private loadingScene: Promise<void> | null;
  private resizeObserver: ResizeObserver | null;
  private dragStateManager: DragStateManager | null;
  private dragForceScale: number;
  private sceneCacheManager: SceneCacheManager;
  private resourceTracker: SceneResourceTracker;
  private memoryMonitor: MemoryMonitor;

  constructor(mujoco: Mujoco, container: HTMLElement, options: RuntimeOptions = {}) {
    this.mujoco = mujoco;
    this.container = container;
    this.baseUrl = options.baseUrl || '/';

    const workingPath = '/working';
    try {
      this.mujoco.FS.mkdir(workingPath);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST') {
        console.warn('Failed to create /working directory:', error);
      }
    }
    try {
      this.mujoco.FS.mount(this.mujoco.MEMFS, { root: '.' }, workingPath);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST' && error.code !== 'EBUSY') {
        console.warn('Failed to mount MEMFS at /working:', error);
      }
    }

    const { width, height } = this.getSize();

    this.scene = new THREE.Scene();
    this.scene.name = 'scene';
    this.scene.background = new THREE.Color(0.15, 0.25, 0.35);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 1000);
    this.camera.name = 'PerspectiveCamera';
    this.camera.position.set(2.0, 1.7, 1.7);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.xr.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.2, 0);
    this.controls.panSpeed = 2;
    this.controls.zoomSpeed = 1;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.screenSpacePanning = true;
    this.controls.update();

    this.renderer.setAnimationLoop(this.render);
    window.addEventListener('resize', this.onWindowResize);

    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
      this.resizeObserver.observe(this.container);
    } else {
      this.resizeObserver = null;
    }

    this.lastSimState = {
      bodies: new Map(),
      tendons: createTendonState(),
    };

    this.mjModel = null;
    this.mjData = null;
    this.bodies = null;
    this.lights = [];
    this.mujocoRoot = null;
    this.loopPromise = null;
    this.running = false;
    this.timestep = 0.001;
    this.decimation = 1;
    this.loadingScene = null;
    this.dragStateManager = null;
    this.dragForceScale = 100.0;

    // Initialize cache system (singleton shared across runtime instances)
    this.sceneCacheManager = SceneCacheManager.getInstance(this.mujoco);
    this.resourceTracker = new SceneResourceTracker();
    this.memoryMonitor = new MemoryMonitor();
  }

  async loadEnvironment(scenePath: string): Promise<void> {
    await this.stop();

    const startTime = performance.now();

    // Check cache first
    if (this.sceneCacheManager.has(scenePath)) {
      await this.restoreFromCache(scenePath);
      const elapsed = performance.now() - startTime;
      this.memoryMonitor.logCacheOperation('hit', scenePath, { elapsedMs: elapsed });
    } else {
      this.memoryMonitor.logCacheOperation('miss', scenePath);

      // Prepare cache for new scene (may trigger eviction)
      await this.sceneCacheManager.prepareForNewScene();

      // Clear current references before loading new scene
      // This prevents loadSceneFromURL from deleting cached objects
      this.mjModel = null;
      this.mjData = null;
      this.bodies = null;
      this.lights = [];
      this.mujocoRoot = null;

      // Start tracking resources
      this.resourceTracker.startTracking(this.mujoco);

      // Normal load
      await downloadExampleScenesFolder(this.mujoco, scenePath, this.baseUrl);
      await this.loadScene(scenePath);

      // Capture and cache resources
      await this.captureAndCacheResources(scenePath);
    }

    this.running = true;
    void this.startLoop();
  }

  async loadScene(scenePath: string): Promise<void> {
    if (this.loadingScene) {
      await this.loadingScene;
    }

    this.loadingScene = (async () => {
      const existingRoot = this.scene.getObjectByName('MuJoCo Root');
      if (existingRoot) {
        this.scene.remove(existingRoot);
      }

      const parent = {
        mjModel: this.mjModel,
        mjData: this.mjData,
        scene: this.scene,
      };

      [this.mjModel, this.mjData, this.bodies, this.lights] = await loadSceneFromURL(
        this.mujoco,
        scenePath,
        parent
      );

      if (!this.mjModel || !this.mjData) {
        throw new Error('Failed to load MuJoCo model.');
      }

      this.mujocoRoot = this.scene.getObjectByName('MuJoCo Root') as THREE.Group | null;

      this.mujoco.mj_forward(this.mjModel, this.mjData);

      this.timestep = this.mjModel.opt.timestep || 0.001;
      this.decimation = Math.max(1, Math.round(0.02 / this.timestep));

      this.lastSimState.bodies.clear();
      this.updateCachedState();

      // Initialize DragStateManager
      if (!this.dragStateManager) {
        this.dragStateManager = new DragStateManager({
          scene: this.scene,
          renderer: this.renderer,
          camera: this.camera,
          container: this.container,
          controls: this.controls,
        });
      }

      this.loadingScene = null;
    })();

    await this.loadingScene;
  }

  async startLoop(): Promise<void> {
    if (this.loopPromise) {
      return this.loopPromise;
    }
    this.running = true;
    this.loopPromise = this.mainLoop();
    return this.loopPromise;
  }

  async stop(): Promise<void> {
    this.running = false;
    const pending = this.loopPromise;
    if (pending) {
      await pending;
    }
    this.loopPromise = null;
  }

  private async mainLoop(): Promise<void> {
    while (this.running) {
      const loopStart = performance.now();

      if (this.mjModel && this.mjData) {
        this.executeSimulationSteps();
        this.updateCachedState();
      }

      const elapsed = (performance.now() - loopStart) / 1000;
      const target = this.timestep * this.decimation;
      const sleepTime = Math.max(0, target - elapsed);
      if (sleepTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, sleepTime * 1000));
      }
    }
    this.loopPromise = null;
  }

  private executeSimulationSteps(): void {
    if (!this.mjModel || !this.mjData) {
      return;
    }
    // Apply drag forces
    this.applyDragForces();

    for (let substep = 0; substep < this.decimation; substep++) {
      this.mujoco.mj_step(this.mjModel, this.mjData);
    }
  }

  private applyDragForces(): void {
    if (!this.dragStateManager || !this.mjModel || !this.mjData || !this.bodies) {
      return;
    }

    // Clear xfrc_applied (reset to zero at each step)
    for (let i = 0; i < this.mjData.xfrc_applied.length; i++) {
      this.mjData.xfrc_applied[i] = 0.0;
    }

    const dragged = this.dragStateManager.physicsObject;
    if (!dragged || !('bodyID' in dragged) || typeof dragged.bodyID !== 'number' || dragged.bodyID <= 0) {
      return;
    }

    const bodyId = dragged.bodyID as number;

    // Update body positions (for drag calculation)
    for (let b = 0; b < this.mjModel.nbody; b++) {
      if (this.bodies[b]) {
        getPosition(this.mjData.xpos, b, this.bodies[b].position);
        getQuaternion(this.mjData.xquat, b, this.bodies[b].quaternion);
        this.bodies[b].updateWorldMatrix(true, false);
      }
    }

    // Update offset
    this.dragStateManager.update();

    // Calculate force (Three.js coordinate system → MuJoCo coordinate system)
    const forceThree = this.dragStateManager.offset
      .clone()
      .multiplyScalar(this.dragForceScale);
    const force = threeToMjcCoordinate(forceThree);

    // Point where force is applied (world coordinates)
    const pointThree = this.dragStateManager.worldHit.clone();
    const point = threeToMjcCoordinate(pointThree);
    // Body position
    const bodyPos = new THREE.Vector3(
      this.mjData.xpos[bodyId * 3 + 0],
      this.mjData.xpos[bodyId * 3 + 1],
      this.mjData.xpos[bodyId * 3 + 2]
    );

    // Calculate torque: τ = r × F
    const r = new THREE.Vector3(
      point.x - bodyPos.x,
      point.y - bodyPos.y,
      point.z - bodyPos.z
    );
    const f = new THREE.Vector3(force.x, force.y, force.z);
    const torque = new THREE.Vector3().crossVectors(r, f);

    // Set xfrc_applied
    // xfrc_applied: (nbody, 6) = [fx, fy, fz, tx, ty, tz] for each body
    const offset = bodyId * 6;
    this.mjData.xfrc_applied[offset + 0] = force.x;
    this.mjData.xfrc_applied[offset + 1] = force.y;
    this.mjData.xfrc_applied[offset + 2] = force.z;
    this.mjData.xfrc_applied[offset + 3] = torque.x;
    this.mjData.xfrc_applied[offset + 4] = torque.y;
    this.mjData.xfrc_applied[offset + 5] = torque.z;
  }

  private updateCachedState(): void {
    if (!this.mjModel || !this.mjData || !this.bodies) {
      return;
    }
    for (let b = 0; b < this.mjModel.nbody; b++) {
      if (this.bodies[b]) {
        if (!this.lastSimState.bodies.has(b)) {
          this.lastSimState.bodies.set(b, {
            position: new THREE.Vector3(),
            quaternion: new THREE.Quaternion(),
          });
        }
        const state = this.lastSimState.bodies.get(b) as BodyState;
        getPosition(this.mjData.xpos, b, state.position);
        getQuaternion(this.mjData.xquat, b, state.quaternion);
      }
    }

    if (this.mujocoRoot && this.mujocoRoot.cylinders) {
      updateTendonGeometry(
        this.mjModel,
        this.mjData,
        {
          cylinders: this.mujocoRoot.cylinders,
          spheres: this.mujocoRoot.spheres!,
        },
        this.lastSimState.tendons
      );
    }
  }

  private render = (): void => {
    this.controls.update();

    if (this.mjModel && this.mjData && this.bodies) {
      updateHeadlightFromCamera(this.camera, this.lights);

      for (const [b, state] of this.lastSimState.bodies) {
        const body = this.bodies[b];
        if (body) {
          body.position.copy(state.position);
          body.quaternion.copy(state.quaternion);
          body.updateWorldMatrix(true, false);
        }
      }

      updateLightsFromData(this.mujoco, this.mjData, this.lights);

      if (this.mujocoRoot && this.mujocoRoot.cylinders) {
        updateTendonRendering(
          {
            cylinders: this.mujocoRoot.cylinders,
            spheres: this.mujocoRoot.spheres!,
          },
          this.lastSimState.tendons
        );
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize = (): void => {
    const { width, height } = this.getSize();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  dispose(): void {
    this.stop();

    if (this.dragStateManager) {
      this.dragStateManager.dispose();
      this.dragStateManager = null;
    }

    // NOTE: Do NOT delete mjData/mjModel here as they may be cached
    // The cache manager will handle their disposal when evicting
    // Just clear references
    this.mjData = null;
    this.mjModel = null;

    // NOTE: Do NOT dispose Three.js resources here as they may be cached
    // The cache manager will handle their disposal when evicting
    // Just clear references
    // this.disposeThreeJSResources();

    window.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.controls.dispose();
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    this.bodies = null;
    this.lights = [];
    this.mujocoRoot = null;
    this.lastSimState.bodies.clear();
  }

  private disposeThreeJSResources(): void {
    if (!this.scene) {
      return;
    }

    this.scene.traverse((object) => {
      if ('geometry' in object && object.geometry) {
        (object.geometry as THREE.BufferGeometry).dispose();
      }
      if ('material' in object && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => this.disposeMaterial(material));
        } else {
          this.disposeMaterial(object.material as THREE.Material);
        }
      }
    });

    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }

  private disposeMaterial(material: THREE.Material): void {
    const anyMaterial = material as THREE.MeshStandardMaterial & {
      map?: THREE.Texture;
      aoMap?: THREE.Texture;
      emissiveMap?: THREE.Texture;
      metalnessMap?: THREE.Texture;
      normalMap?: THREE.Texture;
      roughnessMap?: THREE.Texture;
    };

    if (anyMaterial.map) {
      anyMaterial.map.dispose();
    }
    if (anyMaterial.aoMap) {
      anyMaterial.aoMap.dispose();
    }
    if (anyMaterial.emissiveMap) {
      anyMaterial.emissiveMap.dispose();
    }
    if (anyMaterial.metalnessMap) {
      anyMaterial.metalnessMap.dispose();
    }
    if (anyMaterial.normalMap) {
      anyMaterial.normalMap.dispose();
    }
    if (anyMaterial.roughnessMap) {
      anyMaterial.roughnessMap.dispose();
    }
    material.dispose();
  }

  private getSize(): { width: number; height: number } {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    return {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  }

  /**
   * Restore scene from cache
   */
  private async restoreFromCache(scenePath: string): Promise<void> {
    const resources = this.sceneCacheManager.get(scenePath);
    if (!resources) {
      throw new Error(`Scene ${scenePath} not found in cache`);
    }

    // Remove existing root if present
    const existingRoot = this.scene.getObjectByName('MuJoCo Root');
    if (existingRoot) {
      this.scene.remove(existingRoot);
    }

    // Restore MuJoCo objects
    this.mjModel = resources.mjModel;
    this.mjData = resources.mjData;

    // Restore Three.js resources
    this.bodies = resources.bodies;
    this.lights = resources.lights;
    this.mujocoRoot = resources.mujocoRoot;

    // Re-add root to scene
    this.scene.add(this.mujocoRoot);

    // Run forward dynamics
    this.mujoco.mj_forward(this.mjModel, this.mjData);

    // Update runtime parameters
    this.timestep = this.mjModel.opt.timestep || 0.001;
    this.decimation = Math.max(1, Math.round(0.02 / this.timestep));

    // Clear and update cached state
    this.lastSimState.bodies.clear();
    this.updateCachedState();

    // Initialize DragStateManager if needed
    if (!this.dragStateManager) {
      this.dragStateManager = new DragStateManager({
        scene: this.scene,
        renderer: this.renderer,
        camera: this.camera,
        container: this.container,
        controls: this.controls,
      });
    }
  }

  /**
   * Capture resources and add to cache
   */
  private async captureAndCacheResources(scenePath: string): Promise<void> {
    // Stop tracking and get FS files
    const fsFiles = this.resourceTracker.stopTracking(this.mujoco);

    if (!this.mjModel || !this.mjData || !this.bodies || !this.mujocoRoot) {
      console.warn('[SceneCache] Cannot cache scene: missing resources');
      return;
    }

    // Estimate memory usage
    const estimatedMemoryBytes = this.resourceTracker.estimateSceneMemory({
      mjModel: this.mjModel,
      mjData: this.mjData,
      bodies: this.bodies,
      meshes: {}, // Meshes are part of the scene
      mujocoRoot: this.mujocoRoot,
    });

    // Create cache entry
    await this.sceneCacheManager.set(scenePath, {
      scenePath,
      lastAccessed: Date.now(),
      loadedAt: Date.now(),
      mjModel: this.mjModel,
      mjData: this.mjData,
      bodies: this.bodies,
      lights: this.lights,
      meshes: {},
      mujocoRoot: this.mujocoRoot,
      fsFiles,
      estimatedMemoryBytes,
    });

    // Log the cache operation
    const metrics = this.sceneCacheManager.getMetrics();
    this.memoryMonitor.logCacheOperation('load', scenePath, {
      memoryMB: estimatedMemoryBytes / 1048576,
      totalScenes: metrics.totalScenes,
      totalMemoryMB: metrics.totalMemoryBytes / 1048576,
    });
  }
}
