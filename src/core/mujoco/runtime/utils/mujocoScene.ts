import * as THREE from 'three';
import { mujocoAssetCollector } from '../../utils/mujocoAssetCollector';
import { createLights } from './lights';
import { createTexture } from './textures';
import type { MjModel, MjData } from 'mujoco-js';

const SCENE_BASE_URL = './';
const BINARY_EXTENSIONS = ['.png', '.stl', '.skn', '.mjb', '.msh', '.npy'];
const sceneDownloadPromises = new Map();

function isBinaryAsset(path: string): boolean {
  const lower = path.toLowerCase();
  return BINARY_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function ensureWorkingDirectories(mujoco: any, segments: string[]): void {
  if (!segments.length) {
    return;
  }
  let working = '/working';
  for (const segment of segments) {
    working += `/${segment}`;
    if (!mujoco.FS.analyzePath(working).exists) {
      mujoco.FS.mkdir(working);
    }
  }
}

function normalizePathSegments(path: string): string {
  if (!path) {
    return '';
  }
  const parts: string[] = path.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      if (resolved.length) {
        resolved.pop();
      }
      continue;
    }
    resolved.push(part);
  }
  return resolved.join('/');
}

function resolveAssetPath(xmlDirectory: string, assetPath: string): string | null {
  if (!assetPath) {
    return null;
  }

  let cleaned: string = assetPath.trim();
  if (!cleaned) {
    return null;
  }

  cleaned = cleaned.replace(/^(\.\/)+/, '');
  cleaned = cleaned.replace(/^public\//, '');
  if (cleaned.startsWith('/')) {
    cleaned = cleaned.slice(1);
  }

  const normalized: string = normalizePathSegments(cleaned);
  if (normalized.startsWith('examples/')) {
    return normalized;
  }

  const joined: string = normalizePathSegments(`${xmlDirectory}/${cleaned}`);
  return joined || normalized || null;
}

export async function loadSceneFromURL(mujoco: any, filename: string, parent: any): Promise<any[]> {
  // Clean up existing resources
  if (parent.mjData != null) {
    try { parent.mjData.delete(); } catch (e) { /* ignore */ }
    parent.mjData = null;
  }
  if (parent.mjModel != null) {
    try { parent.mjModel.delete(); } catch (e) { /* ignore */ }
    parent.mjModel = null;
  }

  // Load new model and data with guards
  // Normalize input path to avoid '/./' or leading './' issues in MuJoCo loader
  const cleanedFilename = String(filename || '')
    .trim()
    .replace(/^(\.\/)+/, '')
    .replace(/^public\//, '');
  const normalizedFilename = normalizePathSegments(cleanedFilename);
  const modelPath = `/working/${normalizedFilename}`;
  const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'));
  try {
    const exists = mujoco.FS.analyzePath(modelPath).exists;
    if (!exists) {
      throw new Error(`Scene XML not found at ${modelPath}`);
    }
  } catch (e) {
    throw new Error(`Scene XML not accessible at ${modelPath}: ${e?.message || e}`);
  }

  let newModel: MjModel | null = null;
  try {
    // TODO: The error happens here when visualizing bimanual and soccer models in MyoSuite
    newModel = mujoco.MjModel.loadFromXML(modelPath);
  } catch (err) {
    throw new Error(`Failed to load MjModel from ${modelPath}: ${err?.message || err}`);
  }
  if (!newModel) {
    throw new Error(`MjModel.loadFromXML returned null for ${modelPath}`);
  }
  
  let newData: MjData | null = null;
  try {
    newData = new mujoco.MjData(newModel);
  } catch (err) {
    try { newModel.delete(); } catch (e) { /* ignore */ }
    throw new Error(`Failed to create MjData: ${err?.message || err}`);
  }
  if (!newData) {
    try { newModel.delete(); } catch (e) { /* ignore */ }
    throw new Error(`MjData constructor returned null for model loaded from ${modelPath}`);
  }

  parent.mjModel = newModel;
  parent.mjData = newData;

  let mjModel = parent.mjModel;
  let mjData = parent.mjData;

  let textDecoder = new TextDecoder('utf-8');
  let names_array = new Uint8Array(mjModel.names);
  let fullString = textDecoder.decode(mjModel.names);
  let names = fullString.split(textDecoder.decode(new ArrayBuffer(1)));

  let mujocoRoot = new THREE.Group();
  mujocoRoot.name = 'MuJoCo Root';
  parent.scene.add(mujocoRoot);

  let bodies: Record<number, THREE.Group> = {};
  let meshes: Record<number, THREE.BufferGeometry> = {};

  let material = new THREE.MeshPhysicalMaterial();
  material.color = new THREE.Color(1, 1, 1);

  // MuJoCo => Three.js
  for (let g = 0; g < mjModel.ngeom; g++) {
    if (!(mjModel.geom_group[g] < 3)) { continue; }

    let b = mjModel.geom_bodyid[g];
    let type = mjModel.geom_type[g];
    let size = [
      mjModel.geom_size[(g * 3) + 0],
      mjModel.geom_size[(g * 3) + 1],
      mjModel.geom_size[(g * 3) + 2]
    ];

    if (!(b in bodies)) {
      bodies[b] = new THREE.Group();

      let start_idx = mjModel.name_bodyadr[b];
      let end_idx = start_idx;
      while (end_idx < names_array.length && names_array[end_idx] !== 0) {
        end_idx++;
      }
      let name_buffer = names_array.subarray(start_idx, end_idx);
      bodies[b].name = textDecoder.decode(name_buffer);

      bodies[b].bodyID = b;
      bodies[b].has_custom_mesh = false;
    }

    let geometry = undefined;
    if (type === mujoco.mjtGeom.mjGEOM_PLANE.value) {
      let width, height;
      if (size[0] === 0) { width = 100; } else { width = size[0] * 2.0; }
      if (size[1] === 0) { height = 100; } else { height = size[1] * 2.0; }

      // Use simple plane geometry
      geometry = new THREE.PlaneGeometry(width, height);
      geometry.rotateX(-Math.PI / 2);

      // Use reflective plane for ground if needed
      // const reflectorOptions = { clipBias: 0.003 };
      // let mesh;
      // mesh = new Reflector(new THREE.PlaneGeometry(width, height), reflectorOptions);
      // mesh.rotateX(-Math.PI / 2);
      // mesh.castShadow = g === 0 ? false : true;
      // mesh.receiveShadow = type !== 7;
      // mesh.bodyID = b;
      // bodies[b].add(mesh);
      // getPosition(mjModel.geom_pos, g, mesh.position);\
    } else if (type === mujoco.mjtGeom.mjGEOM_HFIELD.value) {
      // Not implemented
    } else if (type === mujoco.mjtGeom.mjGEOM_SPHERE.value) {
      geometry = new THREE.SphereGeometry(size[0]);
    } else if (type === mujoco.mjtGeom.mjGEOM_CAPSULE.value) {
      geometry = new THREE.CapsuleGeometry(size[0], size[1] * 2.0, 20, 20);
    } else if (type === mujoco.mjtGeom.mjGEOM_ELLIPSOID.value) {
      geometry = new THREE.SphereGeometry(1);
    } else if (type === mujoco.mjtGeom.mjGEOM_CYLINDER.value) {
      geometry = new THREE.CylinderGeometry(size[0], size[0], size[1] * 2.0);
    } else if (type === mujoco.mjtGeom.mjGEOM_BOX.value) {
      geometry = new THREE.BoxGeometry(size[0] * 2.0, size[2] * 2.0, size[1] * 2.0);
    } else if (type === mujoco.mjtGeom.mjGEOM_MESH.value) {
      let meshID = mjModel.geom_dataid[g];

      if (!(meshID in meshes)) {
        geometry = new THREE.BufferGeometry();

        let vertex_buffer = mjModel.mesh_vert.subarray(
          mjModel.mesh_vertadr[meshID] * 3,
          (mjModel.mesh_vertadr[meshID] + mjModel.mesh_vertnum[meshID]) * 3);
        for (let v = 0; v < vertex_buffer.length; v += 3) {
          let temp = vertex_buffer[v + 1];
          vertex_buffer[v + 1] = vertex_buffer[v + 2];
          vertex_buffer[v + 2] = -temp;
        }

        let normal_buffer = mjModel.mesh_normal.subarray(
          mjModel.mesh_vertadr[meshID] * 3,
          (mjModel.mesh_vertadr[meshID] + mjModel.mesh_vertnum[meshID]) * 3);
        for (let v = 0; v < normal_buffer.length; v += 3) {
          let temp = normal_buffer[v + 1];
          normal_buffer[v + 1] = normal_buffer[v + 2];
          normal_buffer[v + 2] = -temp;
        }

        let uv_buffer = mjModel.mesh_texcoord.subarray(
          mjModel.mesh_texcoordadr[meshID] * 2,
          (mjModel.mesh_texcoordadr[meshID] + mjModel.mesh_vertnum[meshID]) * 2);
        let triangle_buffer = mjModel.mesh_face.subarray(
          mjModel.mesh_faceadr[meshID] * 3,
          (mjModel.mesh_faceadr[meshID] + mjModel.mesh_facenum[meshID]) * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertex_buffer, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normal_buffer, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uv_buffer, 2));
        geometry.setIndex(Array.from(triangle_buffer));
        meshes[meshID] = geometry;
      } else {
        geometry = meshes[meshID];
      }

      bodies[b].has_custom_mesh = true;
    }

    // Process geometry color and texture
    let color = [
      mjModel.geom_rgba[g * 4 + 0],
      mjModel.geom_rgba[g * 4 + 1],
      mjModel.geom_rgba[g * 4 + 2],
      mjModel.geom_rgba[g * 4 + 3],
    ];
    let texture: THREE.Texture | null = null;
    let alphaMap = null;
    if (mjModel.geom_matid[g] != -1) {
      let matId = mjModel.geom_matid[g];
      color = [
        mjModel.mat_rgba[matId * 4 + 0],
        mjModel.mat_rgba[matId * 4 + 1],
        mjModel.mat_rgba[matId * 4 + 2],
        mjModel.mat_rgba[matId * 4 + 3],
      ];

      const role = mujoco.mjtTextureRole.mjTEXROLE_RGB.value;
      let texId = mjModel.mat_texid[matId * mujoco.mjtTextureRole.mjNTEXROLE.value + role];
      if (texId != -1) {
        texture = createTexture({ mujoco, mjModel, texId });
        if (texture) {
          // Set repeat from mat_texrepeat (per API)
          const repeatX = mjModel.mat_texrepeat ? mjModel.mat_texrepeat[matId * 2 + 0] : 1;
          const repeatY = mjModel.mat_texrepeat ? mjModel.mat_texrepeat[matId * 2 + 1] : 1;
          texture.repeat.set(repeatX, repeatY);
          texture.wrapS = repeatX > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
          texture.wrapT = repeatY > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
        }
      }
    }

    const materialProps = {
      color: new THREE.Color(color[0], color[1], color[2]),
      transparent: color[3] < 1.0,
      opacity: color[3],
      map: texture,
      alphaMap: alphaMap,
    };
    material = new THREE.MeshPhysicalMaterial(materialProps);

    // Only create mesh if geometry is defined
    if (!geometry) {
      console.warn(`Skipping geometry ${g} (type ${type}): no valid geometry created`);
      continue;
    }

    let mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = g == 0 ? false : true;
    mesh.receiveShadow = type != 7;
    mesh.bodyID = b;
    bodies[b].add(mesh);
    getPosition(mjModel.geom_pos, g, mesh.position);
    if (type != 0) {
      getQuaternion(mjModel.geom_quat, g, mesh.quaternion);
    }
    if (type == 4) {
      mesh.scale.set(size[0], size[2], size[1]);
    } // Stretch the Ellipsoid
  }

  // Tendons
  let tendonMat = new THREE.MeshPhongMaterial();
  tendonMat.color = new THREE.Color(0.8, 0.3, 0.3);
  mujocoRoot.cylinders = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1),
    tendonMat, 1023);
  mujocoRoot.cylinders.receiveShadow = true;
  mujocoRoot.cylinders.castShadow = true;
  mujocoRoot.cylinders.count = 0; // Hide by default
  mujocoRoot.add(mujocoRoot.cylinders);
  mujocoRoot.spheres = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 10),
    tendonMat, 1023);
  mujocoRoot.spheres.receiveShadow = true;
  mujocoRoot.spheres.castShadow = true;
  mujocoRoot.spheres.count = 0; // Hide by default
  mujocoRoot.add(mujocoRoot.spheres);

  // Lights
  const lights: THREE.Light[] = createLights({ mujoco, mjModel, mujocoRoot, bodies });

  for (let b = 0; b < mjModel.nbody; b++) {
    if (b === 0 || !bodies[0]) {
      mujocoRoot.add(bodies[b]);
    } else if (bodies[b]) {
      bodies[0].add(bodies[b]);
    } else {
      bodies[b] = new THREE.Group();
      bodies[b].name = names[b + 1];
      bodies[b].bodyID = b;
      bodies[b].has_custom_mesh = false;
      bodies[0].add(bodies[b]);
    }
  }

  parent.bodies = bodies;
  parent.lights = lights;
  parent.meshes = meshes;
  parent.mujocoRoot = mujocoRoot;

  if (!mjModel || mjModel.deleted) {
    throw new Error('loadSceneFromURL: mjModel is invalid or already deleted');
  }

  return [mjModel, mjData, bodies, lights];
}

export function getPosition(buffer: Float32Array, index: number, target: THREE.Vector3, swizzle = true) {
  if (swizzle) {
    return target.set(
      buffer[(index * 3) + 0],
      buffer[(index * 3) + 2],
      -buffer[(index * 3) + 1]);
  }
  return target.set(
    buffer[(index * 3) + 0],
    buffer[(index * 3) + 1],
    buffer[(index * 3) + 2]);
}

export function getQuaternion(buffer: Float32Array, index: number, target: THREE.Quaternion, swizzle = true) {
  if (swizzle) {
    return target.set(
      -buffer[(index * 4) + 1],
      -buffer[(index * 4) + 3],
      buffer[(index * 4) + 2],
      -buffer[(index * 4) + 0]);
  }
  return target.set(
    buffer[(index * 4) + 0],
    buffer[(index * 4) + 1],
    buffer[(index * 4) + 2],
    buffer[(index * 4) + 3]);
}

export function toMujocoPos(target: THREE.Vector3): THREE.Vector3 {
  return target.set(target.x, -target.z, target.y);
}

export async function downloadExampleScenesFolder(mujoco: any, scenePath: string) {
  if (!scenePath) {
    return;
  }

  const normalizedPath = scenePath.replace(/^[./]+/, '');
  const pathParts = normalizedPath.split('/');

  const xmlDirectory = pathParts.slice(0, -1).join('/');
  if (!xmlDirectory) {
    return;
  }

  const cacheKey = normalizedPath;
  if (sceneDownloadPromises.has(cacheKey)) {
    return sceneDownloadPromises.get(cacheKey);
  }

  const downloadPromise = (async () => {
    let manifest;
    try {
      manifest = await mujocoAssetCollector.analyzeScene(scenePath, SCENE_BASE_URL);

      if (!Array.isArray(manifest)) {
        throw new Error(`Asset collector returned invalid result (not an array): ${typeof manifest}`);
      }

      if (manifest.length === 0) {
        throw new Error('No assets found by collector');
      }

    } catch (error) {
      // Fallback to index.json if asset collector fails
      try {
        const manifestResponse = await fetch(`${SCENE_BASE_URL}/${xmlDirectory}/index.json`);
        if (!manifestResponse.ok) {
          throw new Error(`Failed to load scene manifest for ${xmlDirectory}: ${manifestResponse.status}`);
        }
        manifest = await manifestResponse.json();
        if (!Array.isArray(manifest)) {
          throw new Error(`Invalid scene manifest for ${xmlDirectory}`);
        }
      } catch (fallbackError) {
        throw new Error(`Both asset analysis and index.json fallback failed: ${fallbackError.message}`);
      }
    }

    // Filter external URLs and process local assets
    const localAssets = manifest
      .filter(asset =>
        typeof asset === 'string' &&
        !asset.startsWith('http://') &&
        !asset.startsWith('https://')
      )
      .map(assetPath => {
        // Asset paths from the collector are already full paths, don't resolve them again
        let normalizedPath = assetPath.trim().replace(/^(\.\/)+/, '').replace(/^public\//, '');
        if (normalizedPath.startsWith('/')) {
          normalizedPath = normalizedPath.slice(1);
        }
        if (!normalizedPath) {
          console.warn(`[downloadExampleScenesFolder] Skipping asset with empty path: ${assetPath}`);
          return null;
        }
        return { originalPath: assetPath, normalizedPath };
      })
      .filter(Boolean);

    const seenPaths = new Set();
    const uniqueAssets = [];
    for (const asset of localAssets) {
      if (seenPaths.has(asset.normalizedPath)) {
        continue;
      }
      seenPaths.add(asset.normalizedPath);
      uniqueAssets.push(asset);
    }

    const requests = uniqueAssets.map(({ normalizedPath }) => {
      const fullPath = `${SCENE_BASE_URL}/${normalizedPath}`;
      return fetch(fullPath);
    });

    const responses = await Promise.all(requests);

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const { originalPath, normalizedPath } = uniqueAssets[i];

      if (!response.ok) {
        console.warn(`[downloadExampleScenesFolder] Failed to fetch scene asset ${originalPath}: ${response.status}`);
        continue;
      }

      const assetPath = normalizedPath;
      const segments = assetPath.split('/');
      ensureWorkingDirectories(mujoco, segments.slice(0, -1));

      const targetPath = `/working/${assetPath}`;
      try {
        if (isBinaryAsset(normalizedPath) || isBinaryAsset(originalPath)) {
          const arrayBuffer = await response.arrayBuffer();
          mujoco.FS.writeFile(targetPath, new Uint8Array(arrayBuffer));
        } else {
          const text = await response.text();
          mujoco.FS.writeFile(targetPath, text);
        }
      } catch (error) {
        console.error(`[downloadExampleScenesFolder] Error writing ${targetPath}:`, error);
      }
    }
  })();

  // Keep the promise keyed by the normalized scene path for consistency
  sceneDownloadPromises.set(normalizedPath, downloadPromise);
  try {
    await downloadPromise;
  } catch (error) {
    sceneDownloadPromises.delete(normalizedPath);
    throw error;
  }
}
