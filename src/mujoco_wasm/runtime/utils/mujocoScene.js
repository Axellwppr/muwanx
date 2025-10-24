import * as THREE from 'three';
import { Reflector } from './Reflector.js';
import { mujocoAssetCollector } from '../../utils/mujocoAssetCollector.js';

const SCENE_BASE_URL = './';
const BINARY_EXTENSIONS = ['.png', '.stl', '.skn', '.mjb', '.msh', '.npy'];
const sceneDownloadPromises = new Map();

function isBinaryAsset(path) {
    const lower = path.toLowerCase();
    return BINARY_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function ensureWorkingDirectories(mujoco, segments) {
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

function normalizePathSegments(path) {
    if (!path) {
        return '';
    }
    const parts = path.split('/');
    const resolved = [];
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

function resolveAssetPath(xmlDirectory, assetPath) {
    if (!assetPath) {
        return null;
    }

    let cleaned = assetPath.trim();
    if (!cleaned) {
        return null;
    }

    cleaned = cleaned.replace(/^(\.\/)+/, '');
    cleaned = cleaned.replace(/^public\//, '');
    if (cleaned.startsWith('/')) {
        cleaned = cleaned.slice(1);
    }

    const normalized = normalizePathSegments(cleaned);
    if (normalized.startsWith('examples/')) {
        return normalized;
    }

    const joined = normalizePathSegments(`${xmlDirectory}/${cleaned}`);
    return joined || normalized || null;
}

export async function loadSceneFromURL(mujoco, filename, parent) {
  if (parent.mjData != null) {
    parent.mjData.delete();
    parent.mjModel = null;
    parent.mjData = null;
  }

  parent.mjModel = mujoco.MjModel.loadFromXML(`/working/${filename}`);
  
  parent.mjData = new mujoco.MjData(parent.mjModel);

  let mjModel = parent.mjModel;
  let mjData = parent.mjData;

  let textDecoder = new TextDecoder('utf-8');
  let names_array = new Uint8Array(mjModel.names);
  let fullString = textDecoder.decode(mjModel.names);
  let names = fullString.split(textDecoder.decode(new ArrayBuffer(1)));

  let mujocoRoot = new THREE.Group();
  mujocoRoot.name = 'MuJoCo Root';
  parent.scene.add(mujocoRoot);

  let bodies = {};
  let meshes = {};
  let lights = [];

  let material = new THREE.MeshPhysicalMaterial();
  material.color = new THREE.Color(1, 1, 1);

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

      if (bodies[b].name === 'base') {
        parent.pelvis_body_id = b;
      }
      bodies[b].has_custom_mesh = false;
    }

    let geometry = new THREE.SphereGeometry(size[0] * 0.5);
    if (type === mujoco.mjtGeom.mjGEOM_PLANE.value) {
      // plane handled later
    } else if (type === mujoco.mjtGeom.mjGEOM_HFIELD.value) {
      // hfield not implemented
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

    let texture;
    let color = [
      mjModel.geom_rgba[(g * 4) + 0],
      mjModel.geom_rgba[(g * 4) + 1],
      mjModel.geom_rgba[(g * 4) + 2],
      mjModel.geom_rgba[(g * 4) + 3]
    ];
    if (mjModel.geom_matid[g] !== -1) {
      let matId = mjModel.geom_matid[g];
      color = [
        mjModel.mat_rgba[(matId * 4) + 0],
        mjModel.mat_rgba[(matId * 4) + 1],
        mjModel.mat_rgba[(matId * 4) + 2],
        mjModel.mat_rgba[(matId * 4) + 3]
      ];

      texture = undefined;
      let texId = mjModel.mat_texid[matId];
      if (texId !== -1) {
        let width = mjModel.tex_width[texId];
        let height = mjModel.tex_height[texId];
        let offset = mjModel.tex_adr[texId];
        let rgbArray = mjModel.tex_rgb;
        let rgbaArray = new Uint8Array(width * height * 4);
        for (let p = 0; p < width * height; p++) {
          rgbaArray[(p * 4) + 0] = rgbArray[offset + ((p * 3) + 0)];
          rgbaArray[(p * 4) + 1] = rgbArray[offset + ((p * 3) + 1)];
          rgbaArray[(p * 4) + 2] = rgbArray[offset + ((p * 3) + 2)];
          rgbaArray[(p * 4) + 3] = 1.0;
        }
        texture = new THREE.DataTexture(rgbaArray, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
        if (texId === 2) {
          texture.repeat = new THREE.Vector2(50, 50);
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
        } else {
          texture.repeat = new THREE.Vector2(1, 1);
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
        }

        texture.needsUpdate = true;
      }
    }

    if (material.color.r !== color[0] ||
      material.color.g !== color[1] ||
      material.color.b !== color[2] ||
      material.opacity !== color[3] ||
      material.map !== texture) {
      const materialConfig = {
        color: new THREE.Color(color[0], color[1], color[2]),
        transparent: color[3] < 1.0,
        opacity: color[3],
      };
      if (mjModel.geom_matid[g] !== -1) {
        const matIndex = mjModel.geom_matid[g];
        const specularIntensity = mjModel.mat_specular[matIndex] * 0.5;
        const reflectivity = mjModel.mat_reflectance[matIndex];
        const roughness = 1.0 - mjModel.mat_shininess[matIndex];
        materialConfig.specularIntensity = specularIntensity;
        materialConfig.reflectivity = reflectivity;
        materialConfig.roughness = roughness;
        materialConfig.metalness = 0.1;
      }
      if (texture) {
        materialConfig.map = texture;
      }
      material = new THREE.MeshPhysicalMaterial(materialConfig);
    }

    let mesh;
    if (type === mujoco.mjtGeom.mjGEOM_PLANE.value) {
      const reflectorOptions = { clipBias: 0.003 };
      if (texture) {
        reflectorOptions.texture = texture;
      }
      mesh = new Reflector(new THREE.PlaneGeometry(100, 100), reflectorOptions);
      mesh.rotateX(-Math.PI / 2);
    } else {
      mesh = new THREE.Mesh(geometry, material);
    }

    mesh.castShadow = g === 0 ? false : true;
    mesh.receiveShadow = type !== 7;
    mesh.bodyID = b;
    bodies[b].add(mesh);
    getPosition(mjModel.geom_pos, g, mesh.position);
    if (type !== 0) { getQuaternion(mjModel.geom_quat, g, mesh.quaternion); }
    if (type === 4) { mesh.scale.set(size[0], size[2], size[1]); }
  }

  let tendonMat = new THREE.MeshPhongMaterial();
  tendonMat.color = new THREE.Color(0.8, 0.3, 0.3);
  mujocoRoot.cylinders = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1),
    tendonMat, 1023);
  mujocoRoot.cylinders.receiveShadow = true;
  mujocoRoot.cylinders.castShadow = true;
  mujocoRoot.add(mujocoRoot.cylinders);
  mujocoRoot.spheres = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 10),
    tendonMat, 1023);
  mujocoRoot.spheres.receiveShadow = true;
  mujocoRoot.spheres.castShadow = true;
  mujocoRoot.add(mujocoRoot.spheres);

  // Check if mjModel has light properties before accessing them
  if (mjModel.nlight > 0 && mjModel.light_directional && mjModel.light_attenuation) {
    for (let l = 0; l < mjModel.nlight; l++) {
      let light = new THREE.SpotLight();
      const isDirectional = mjModel.light_directional[l];
      if (isDirectional) {
        light = new THREE.DirectionalLight();
      } else {
        light = new THREE.SpotLight();
      }
      const attenuation = mjModel.light_attenuation[l];
      light.decay = attenuation * 100;
      light.penumbra = 0.5;
      light.castShadow = true;

      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 1;
      light.shadow.camera.far = 10;
      if (bodies[0]) {
        bodies[0].add(light);
      } else {
        mujocoRoot.add(light);
      }
      lights.push(light);
    }
  }
  
  // Add default light if no lights in mjModel
  if (mjModel.nlight === 0 || !mjModel.light_directional) {
    let light = new THREE.DirectionalLight();
    mujocoRoot.add(light);
  }

  for (let b = 0; b < mjModel.nbody; b++) {
    if (b === 0 || !bodies[0]) {
      mujocoRoot.add(bodies[b]);
    } else if (bodies[b]) {
      bodies[0].add(bodies[b]);
    } else {
      bodies[b] = new THREE.Group(); bodies[b].name = names[b + 1]; bodies[b].bodyID = b; bodies[b].has_custom_mesh = false;
      bodies[0].add(bodies[b]);
    }
  }

  parent.bodies = bodies;
  parent.lights = lights;
  parent.meshes = meshes;
  parent.mujocoRoot = mujocoRoot;

  return [mjModel, mjData, bodies, lights];
}

export function getPosition(buffer, index, target, swizzle = true) {
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

export function getQuaternion(buffer, index, target, swizzle = true) {
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

export function toMujocoPos(target) {
    return target.set(target.x, -target.z, target.y);
}

export async function downloadExampleScenesFolder(mujoco, scenePath) {
    if (!scenePath) {
        return;
    }

    const normalizedPath = scenePath.replace(/^[./]+/, '');
    const pathParts = normalizedPath.split('/');
    
    // Get the directory containing the XML file
    const xmlDirectory = pathParts.slice(0, -1).join('/');
    if (!xmlDirectory) {
        return;
    }

    // Use the XML file directory as the cache key
    const cacheKey = xmlDirectory;
    if (sceneDownloadPromises.has(cacheKey)) {
        return sceneDownloadPromises.get(cacheKey);
    }

    const downloadPromise = (async () => {
        // Use the dynamic asset collector instead of index.json
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

        // Filter out external URLs and process only local assets
        const localAssets = manifest
            .filter(asset => 
                typeof asset === 'string' && 
                !asset.startsWith('http://') && 
                !asset.startsWith('https://')
            )
            .map(originalPath => {
                const normalizedPath = resolveAssetPath(xmlDirectory, originalPath);
                if (!normalizedPath) {
                    console.warn(`[downloadExampleScenesFolder] Skipping asset with unresolved path: ${originalPath}`);
                    return null;
                }
                return { originalPath, normalizedPath };
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
                continue; // Skip missing assets but don't fail the whole download
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
                    const textContent = await response.text();
                    mujoco.FS.writeFile(targetPath, textContent);
                }
            } catch (error) {
                console.warn(`[downloadExampleScenesFolder] Failed to write asset ${targetPath}:`, error.message);
            }
        }
    })();

    sceneDownloadPromises.set(xmlDirectory, downloadPromise);
    try {
        await downloadPromise;
    } catch (error) {
        sceneDownloadPromises.delete(xmlDirectory);
        throw error;
    }
}
