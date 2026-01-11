import * as THREE from 'three';
import type { MjData, MjModel } from 'mujoco-js';
import type { Mujoco } from '../../types/mujoco';

/**
 * Snapshot of resources loaded for a scene
 */
export interface ResourceSnapshot {
  bodies: Record<number, THREE.Group>;
  lights: THREE.Light[];
  meshes: Record<number, THREE.BufferGeometry>;
  mujocoRoot: THREE.Group;
  fsFiles: string[];
  estimatedMemoryBytes: number;
}

/**
 * Tracks scene resources and estimates memory usage
 */
export class SceneResourceTracker {
  private fsWriteLog: string[] = [];
  private isTracking: boolean = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private originalWriteFile?: any;

  /**
   * Start tracking FS writes
   */
  public startTracking(mujoco: Mujoco): void {
    if (this.isTracking) {
      console.warn('[ResourceTracker] Already tracking FS writes');
      return;
    }

    this.fsWriteLog = [];
    this.isTracking = true;

    // Wrap FS.writeFile to track writes
    this.originalWriteFile = mujoco.FS.writeFile;
    const fsWriteLog = this.fsWriteLog;
    const originalWriteFile = this.originalWriteFile;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mujoco.FS.writeFile = function (path: string, data: string | ArrayBufferView, opts?: any): void {
      // Track writes to /working/
      if (path.startsWith('/working/')) {
        const relativePath = path.replace(/^\/working\//, '');
        if (!fsWriteLog.includes(relativePath)) {
          fsWriteLog.push(relativePath);
        }
      }

      // Call original function
      if (originalWriteFile) {
        return originalWriteFile.call(mujoco.FS, path, data, opts);
      }
    };
  }

  /**
   * Stop tracking and return captured files
   */
  public stopTracking(mujoco: Mujoco): string[] {
    if (!this.isTracking) {
      return [];
    }

    // Restore original function
    if (this.originalWriteFile) {
      mujoco.FS.writeFile = this.originalWriteFile;
      this.originalWriteFile = undefined;
    }

    this.isTracking = false;
    return [...this.fsWriteLog];
  }

  /**
   * Estimate memory usage for a scene
   */
  public estimateSceneMemory(resources: {
    mjModel: MjModel;
    mjData: MjData;
    bodies: Record<number, THREE.Group>;
    meshes: Record<number, THREE.BufferGeometry>;
    mujocoRoot: THREE.Group;
  }): number {
    let totalBytes = 0;

    // Estimate MuJoCo model and data
    totalBytes += this.estimateMuJoCoMemory(resources.mjModel);

    // Estimate geometries
    for (const geometry of Object.values(resources.meshes)) {
      totalBytes += this.estimateGeometryMemory(geometry);
    }

    // Estimate all geometries in the scene
    resources.mujocoRoot.traverse((object) => {
      if ('geometry' in object && object.geometry) {
        const geom = object.geometry as THREE.BufferGeometry;
        // Only count if not already counted in meshes
        if (!Object.values(resources.meshes).includes(geom)) {
          totalBytes += this.estimateGeometryMemory(geom);
        }
      }

      if ('material' in object && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => {
            totalBytes += this.estimateMaterialMemory(mat);
          });
        } else {
          totalBytes += this.estimateMaterialMemory(object.material as THREE.Material);
        }
      }
    });

    return totalBytes;
  }

  /**
   * Estimate MuJoCo model and data memory
   */

  private estimateMuJoCoMemory(mjModel: MjModel): number {
    let bytes = 0;

    // State vectors
    if (mjModel.nq) bytes += mjModel.nq * 8; // qpos (double)
    if (mjModel.nv) bytes += mjModel.nv * 8; // qvel (double)
    if (mjModel.nbody) bytes += mjModel.nbody * 256; // Body data (approximate)

    // Mesh data
    if (mjModel.mesh_vert) bytes += mjModel.mesh_vert.length * 4;
    if (mjModel.mesh_normal) bytes += mjModel.mesh_normal.length * 4;
    if (mjModel.mesh_texcoord) bytes += mjModel.mesh_texcoord.length * 4;
    if (mjModel.mesh_face) bytes += mjModel.mesh_face.length * 4;

    // Texture data
    if (mjModel.tex_data) bytes += mjModel.tex_data.length;

    // Data state (similar to model)
    bytes += bytes; // Approximate data size as similar to model

    return bytes;
  }

  /**
   * Estimate Three.js geometry memory
   */
  private estimateGeometryMemory(geometry: THREE.BufferGeometry): number {
    let bytes = 0;

    // Count all buffer attributes
    const attributes = geometry.attributes;
    for (const key in attributes) {
      const attribute = attributes[key];
      if (attribute && 'array' in attribute) {
        bytes += attribute.array.byteLength;
      }
    }

    // Index buffer
    if (geometry.index) {
      bytes += geometry.index.array.byteLength;
    }

    return bytes;
  }

  /**
   * Estimate texture memory
   */
  private estimateTextureMemory(texture: THREE.Texture): number {
    if (!texture.image) {
      return 1024; // Minimal overhead
    }

    if (texture instanceof THREE.CubeTexture) {
      // 6 faces
      if (Array.isArray(texture.image) && texture.image.length === 6) {
        let totalBytes = 0;
        for (const img of texture.image) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const imgAny = img as any;
          if (imgAny && typeof imgAny === 'object' && 'width' in imgAny && 'height' in imgAny) {
            totalBytes += (imgAny.width as number) * (imgAny.height as number) * 4; // RGBA
          }
        }
        return totalBytes;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const img = texture.image as any;
    if (img && typeof img === 'object' && 'width' in img && 'height' in img) {
      return (img.width as number) * (img.height as number) * 4; // RGBA
    }

    return 1024; // Default estimate
  }

  /**
   * Estimate material memory
   */
  private estimateMaterialMemory(material: THREE.Material): number {
    let bytes = 1024; // Base material overhead

    const anyMaterial = material as THREE.MeshStandardMaterial & {
      map?: THREE.Texture;
      aoMap?: THREE.Texture;
      emissiveMap?: THREE.Texture;
      metalnessMap?: THREE.Texture;
      normalMap?: THREE.Texture;
      roughnessMap?: THREE.Texture;
      envMap?: THREE.Texture;
      alphaMap?: THREE.Texture;
      lightMap?: THREE.Texture;
      displacementMap?: THREE.Texture;
      bumpMap?: THREE.Texture;
    };

    // Estimate textures
    if (anyMaterial.map) bytes += this.estimateTextureMemory(anyMaterial.map);
    if (anyMaterial.aoMap) bytes += this.estimateTextureMemory(anyMaterial.aoMap);
    if (anyMaterial.emissiveMap) bytes += this.estimateTextureMemory(anyMaterial.emissiveMap);
    if (anyMaterial.metalnessMap) bytes += this.estimateTextureMemory(anyMaterial.metalnessMap);
    if (anyMaterial.normalMap) bytes += this.estimateTextureMemory(anyMaterial.normalMap);
    if (anyMaterial.roughnessMap) bytes += this.estimateTextureMemory(anyMaterial.roughnessMap);
    if (anyMaterial.envMap) bytes += this.estimateTextureMemory(anyMaterial.envMap);
    if (anyMaterial.alphaMap) bytes += this.estimateTextureMemory(anyMaterial.alphaMap);
    if (anyMaterial.lightMap) bytes += this.estimateTextureMemory(anyMaterial.lightMap);
    if (anyMaterial.displacementMap) bytes += this.estimateTextureMemory(anyMaterial.displacementMap);
    if (anyMaterial.bumpMap) bytes += this.estimateTextureMemory(anyMaterial.bumpMap);

    return bytes;
  }
}
