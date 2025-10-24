import * as THREE from 'three';
import { Reflector } from './Reflector.js';
import { mujocoAssetCollector } from '../../utils/mujocoAssetCollector.js';

const SCENE_BASE_URL = './';
const BINARY_EXTENSIONS = ['.png', '.stl', '.skn', '.mjb', '.msh', '.npy'];
const sceneDownloadPromises = new Map();
const GLOBAL_LIGHT_INTENSITY_MULTIPLIER = 2.6;
const GLOBAL_AMBIENT_INTENSITY = 0.35;

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

function floatsAlmostEqual(a, b, epsilon = 1e-5) {
    return Math.abs((a ?? 0) - (b ?? 0)) <= epsilon;
}

function colorsAlmostEqual(a, b, epsilon = 1e-5) {
    if (!a || !b) {
        return false;
    }
    for (let i = 0; i < 4; i++) {
        if (!floatsAlmostEqual(a[i], b[i], epsilon)) {
            return false;
        }
    }
    return true;
}

function getGeomColor(mjModel, geomIndex) {
    if (!mjModel.geom_rgba || mjModel.geom_rgba.length < ((geomIndex * 4) + 4)) {
        return [1, 1, 1, 1];
    }
    return [
        mjModel.geom_rgba[(geomIndex * 4) + 0],
        mjModel.geom_rgba[(geomIndex * 4) + 1],
        mjModel.geom_rgba[(geomIndex * 4) + 2],
        mjModel.geom_rgba[(geomIndex * 4) + 3]
    ];
}

function getMatColor(mjModel, matId) {
    if (!mjModel.mat_rgba || mjModel.mat_rgba.length < ((matId * 4) + 4)) {
        return [1, 1, 1, 1];
    }
    return [
        mjModel.mat_rgba[(matId * 4) + 0],
        mjModel.mat_rgba[(matId * 4) + 1],
        mjModel.mat_rgba[(matId * 4) + 2],
        mjModel.mat_rgba[(matId * 4) + 3]
    ];
}

function createBaseTexture(mjModel, texId) {
    if (!mjModel || texId < 0) {
        return null;
    }

    const width = mjModel.tex_width ? mjModel.tex_width[texId] : 0;
    const height = mjModel.tex_height ? mjModel.tex_height[texId] : 0;
    if (!width || !height) {
        return null;
    }

    const texAdr = mjModel.tex_adr ? mjModel.tex_adr[texId] : 0;
    const pixelCount = width * height;

    let textureData = new Uint8Array(pixelCount * 4);

    if (mjModel.tex_rgba && mjModel.tex_rgba.length >= ((texAdr + pixelCount) * 4)) {
        const rgbaSource = mjModel.tex_rgba.subarray(texAdr * 4, (texAdr * 4) + (pixelCount * 4));
        textureData.set(rgbaSource);
    } else if (mjModel.tex_rgb && mjModel.tex_rgb.length >= ((texAdr + pixelCount) * 3)) {
        const rgbSource = mjModel.tex_rgb.subarray(texAdr * 3, (texAdr * 3) + (pixelCount * 3));
        for (let src = 0, dst = 0; src < rgbSource.length; src += 3, dst += 4) {
            textureData[dst + 0] = rgbSource[src + 0];
            textureData[dst + 1] = rgbSource[src + 1];
            textureData[dst + 2] = rgbSource[src + 2];
            textureData[dst + 3] = 255;
        }
    } else {
        return null;
    }

    const texture = new THREE.DataTexture(textureData, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.needsUpdate = true;
    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = 4;
    return texture;
}

function getBaseTexture(textureCache, mjModel, texId) {
    if (texId < 0) {
        return null;
    }
    if (textureCache.has(texId)) {
        return textureCache.get(texId);
    }
    const baseTexture = createBaseTexture(mjModel, texId);
    if (baseTexture) {
        textureCache.set(texId, baseTexture);
    }
    return baseTexture;
}

function buildMaterialFromMatId(mjModel, matId, textureCache) {
    const matColor = getMatColor(mjModel, matId);

    const materialConfig = {
        color: new THREE.Color(matColor[0], matColor[1], matColor[2]),
        transparent: matColor[3] < 0.999,
        opacity: matColor[3],
        roughness: 1.0,
        metalness: 0.0,
    };

    if (mjModel.mat_specular && mjModel.mat_specular.length > matId) {
        const specular = mjModel.mat_specular[matId];
        materialConfig.specularIntensity = specular;
    }

    if (mjModel.mat_reflectance && mjModel.mat_reflectance.length > matId) {
        const reflectance = mjModel.mat_reflectance[matId];
        materialConfig.reflectivity = reflectance;
        materialConfig.metalness = THREE.MathUtils.clamp(reflectance, 0, 1);
    }

    if (mjModel.mat_shininess && mjModel.mat_shininess.length > matId) {
        const shininess = mjModel.mat_shininess[matId];
        materialConfig.roughness = THREE.MathUtils.clamp(1.0 - shininess, 0.0, 1.0);
    }

    if (mjModel.mat_emission && mjModel.mat_emission.length > matId) {
        const emission = mjModel.mat_emission[matId];
        if (emission > 0) {
            materialConfig.emissive = new THREE.Color(matColor[0], matColor[1], matColor[2]);
            materialConfig.emissiveIntensity = emission;
        }
    }

    const texId = (mjModel.mat_texid && mjModel.mat_texid.length > matId) ? mjModel.mat_texid[matId] : -1;
    if (typeof texId === 'number' && texId >= 0) {
        const baseTexture = getBaseTexture(textureCache, mjModel, texId);
        if (baseTexture) {
            const texture = baseTexture.clone();
            texture.needsUpdate = true;

            if (mjModel.mat_texrepeat && mjModel.mat_texrepeat.length >= ((matId * 2) + 2)) {
                const repeatU = mjModel.mat_texrepeat[(matId * 2) + 0] || 1;
                const repeatV = mjModel.mat_texrepeat[(matId * 2) + 1] || 1;
                texture.repeat.set(repeatU, repeatV);
            }

            if (mjModel.mat_texoffset && mjModel.mat_texoffset.length >= ((matId * 2) + 2)) {
                const offsetU = mjModel.mat_texoffset[(matId * 2) + 0] || 0;
                const offsetV = mjModel.mat_texoffset[(matId * 2) + 1] || 0;
                texture.offset.set(offsetU, offsetV);
            }

            if (mjModel.mat_texuniform && mjModel.mat_texuniform.length > matId) {
                const uniform = mjModel.mat_texuniform[matId];
                if (uniform) {
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                } else {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                }
            } else {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
            }

            if (mjModel.mat_texrotate && mjModel.mat_texrotate.length > matId) {
                const rotation = mjModel.mat_texrotate[matId];
                if (rotation) {
                    texture.center.set(0.5, 0.5);
                    texture.rotation = rotation;
                }
            }

            materialConfig.map = texture;
        }
    }

    const material = new THREE.MeshPhysicalMaterial(materialConfig);
    material.userData = {
        ...(material.userData || {}),
        matId,
        matColor: matColor.slice(),
        matOpacity: matColor[3],
        baseTextureId: (typeof texId === 'number' && texId >= 0) ? texId : null,
    };
    return material;
}

function buildColorOnlyMaterial(colorArray) {
    const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colorArray[0], colorArray[1], colorArray[2]),
        transparent: colorArray[3] < 0.999,
        opacity: colorArray[3],
        roughness: 0.9,
        metalness: 0.0,
    });
    material.userData = {
        ...(material.userData || {}),
        matColor: colorArray.slice(),
        matOpacity: colorArray[3],
    };
    return material;
}

function applyGeomColorOverride(material, geomColor) {
    if (!material || !geomColor) {
        return material;
    }

    const baseColor = material.userData?.matColor;
    if (baseColor && colorsAlmostEqual(baseColor, geomColor)) {
        return material;
    }

    const cloned = material.clone();
    cloned.color = new THREE.Color(geomColor[0], geomColor[1], geomColor[2]);
    cloned.transparent = geomColor[3] < 0.999;
    cloned.opacity = geomColor[3];
    cloned.userData = {
        ...(material.userData || {}),
        matColor: geomColor.slice(),
        matOpacity: geomColor[3],
    };
    if (material.map) {
        cloned.map = material.map;
    }
    return cloned;
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
  let dynamicLightCount = 0;
  const globalFillLight = new THREE.HemisphereLight(
    new THREE.Color(0.95, 0.95, 1.0),
    new THREE.Color(0.35, 0.35, 0.35),
    GLOBAL_AMBIENT_INTENSITY
  );
  mujocoRoot.add(globalFillLight);
  lights.push(globalFillLight);
  const textureCache = new Map();
  const materialCache = new Map();

  const getMaterialForMatId = (matId) => {
    if (materialCache.has(matId)) {
      return materialCache.get(matId);
    }
    const mat = buildMaterialFromMatId(mjModel, matId, textureCache);
    materialCache.set(matId, mat);
    return mat;
  };

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

    const geomColor = getGeomColor(mjModel, g);
    let materialInstance;
    const matId = mjModel.geom_matid[g];
    if (typeof matId === 'number' && matId >= 0) {
      const baseMaterial = getMaterialForMatId(matId);
      materialInstance = applyGeomColorOverride(baseMaterial, geomColor);
    } else {
      materialInstance = buildColorOnlyMaterial(geomColor);
    }
    if (!materialInstance) {
      materialInstance = buildColorOnlyMaterial([1, 1, 1, 1]);
    }

    let mesh;
    if (type === mujoco.mjtGeom.mjGEOM_PLANE.value) {
      const planeWidth = (size[0] || 1) * 2;
      const planeHeight = (size[1] || 1) * 2;
      if (materialInstance?.map) {
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, planeHeight), materialInstance);
      } else {
        const reflectorOptions = { clipBias: 0.003 };
        mesh = new Reflector(new THREE.PlaneGeometry(planeWidth, planeHeight), reflectorOptions);
      }
      mesh.rotateX(-Math.PI / 2);
    } else {
      mesh = new THREE.Mesh(geometry, materialInstance);
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
  if (mjModel.nlight > 0 && mjModel.light_pos) {
    const lightPosBuffer = mjModel.light_pos;
    const lightDirBuffer = mjModel.light_dir;
    const lightDiffuseBuffer = mjModel.light_diffuse;
    const lightAmbientBuffer = mjModel.light_ambient;
    const lightSpecularBuffer = mjModel.light_specular;
    const lightCutoffBuffer = mjModel.light_cutoff;
    const lightExponentBuffer = mjModel.light_exponent;
    const lightAttenuationBuffer = mjModel.light_attenuation;
    const lightBodyBuffer = mjModel.light_bodyid;
    const lightShadowBuffer = mjModel.light_castshadow;
    const directionalFlags = mjModel.light_directional;

    const tempPosition = new THREE.Vector3();
    const tempDirection = new THREE.Vector3();

    for (let l = 0; l < mjModel.nlight; l++) {
      const isDirectional = directionalFlags ? !!directionalFlags[l] : false;
      let light = null;
      let useSpot = false;

      let cutoffValue = (lightCutoffBuffer && lightCutoffBuffer.length > l) ? lightCutoffBuffer[l] : 0;
      if (cutoffValue && cutoffValue <= Math.PI * 2) {
        // If already radians, leave as-is; otherwise convert below
      } else if (cutoffValue && cutoffValue > Math.PI * 2) {
        cutoffValue = THREE.MathUtils.degToRad(cutoffValue);
      }

      if (isDirectional) {
        light = new THREE.DirectionalLight();
      } else {
        useSpot = cutoffValue > 0;
        if (useSpot) {
          light = new THREE.SpotLight();
        } else {
          light = new THREE.PointLight();
        }
      }

      const diffuseColor = (lightDiffuseBuffer && lightDiffuseBuffer.length >= ((l * 3) + 3))
        ? [
            lightDiffuseBuffer[(l * 3) + 0],
            lightDiffuseBuffer[(l * 3) + 1],
            lightDiffuseBuffer[(l * 3) + 2]
          ]
        : [1, 1, 1];
      light.color.setRGB(diffuseColor[0], diffuseColor[1], diffuseColor[2]);
      const diffuseIntensity = Math.max(0.01, (diffuseColor[0] + diffuseColor[1] + diffuseColor[2]) / 3);
      light.intensity = diffuseIntensity * GLOBAL_LIGHT_INTENSITY_MULTIPLIER;

      getPosition(lightPosBuffer, l, tempPosition);
      light.position.copy(tempPosition);

      if ((light.isSpotLight || light.isDirectionalLight) && lightDirBuffer && lightDirBuffer.length >= ((l * 3) + 3)) {
        getPosition(lightDirBuffer, l, tempDirection);
        if (tempDirection.lengthSq() > 0) {
          tempDirection.normalize();
          const targetOffset = tempDirection.clone();
          const target = light.target || new THREE.Object3D();
          target.position.copy(light.position.clone().add(targetOffset));
          if (!target.parent) {
            mujocoRoot.add(target);
          }
          light.target = target;
          if (light.isDirectionalLight) {
            light.target.position.copy(light.position.clone().add(tempDirection.multiplyScalar(10)));
          }
        }
      }

      if (light.isSpotLight) {
        const angle = cutoffValue ? THREE.MathUtils.clamp(cutoffValue, 0.001, Math.PI / 2) : THREE.MathUtils.degToRad(45);
        light.angle = angle;

        const exponent = (lightExponentBuffer && lightExponentBuffer.length > l) ? lightExponentBuffer[l] : 0;
        light.penumbra = THREE.MathUtils.clamp(exponent / 100, 0, 1);
      }

      if (!isDirectional && lightAttenuationBuffer) {
        if (lightAttenuationBuffer.length >= ((l * 3) + 3)) {
          const constant = lightAttenuationBuffer[(l * 3) + 0];
          const linear = lightAttenuationBuffer[(l * 3) + 1];
          const quadratic = lightAttenuationBuffer[(l * 3) + 2];
          light.decay = Math.max(quadratic * 10, 0.0);
          const falloff = Math.max(linear, 0);
          if (falloff > 0) {
            light.distance = 1.0 / falloff;
          }
          if (constant > 0 && !light.distance) {
            light.distance = 1.0 / constant;
          }
        } else if (lightAttenuationBuffer.length > l) {
          light.decay = Math.max(lightAttenuationBuffer[l] * 10, 0.0);
        }
      }

      if (lightShadowBuffer && lightShadowBuffer.length > l) {
        light.castShadow = !!lightShadowBuffer[l];
      } else if (!isDirectional) {
        light.castShadow = true;
      }

      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 25;
      light.shadow.bias = -1e-4;

      const bodyId = (lightBodyBuffer && lightBodyBuffer.length > l) ? lightBodyBuffer[l] : -1;
      const parentGroup = (bodyId >= 0 && bodies[bodyId]) ? bodies[bodyId] : mujocoRoot;
      parentGroup.add(light);
      if (light.target && !light.target.parent) {
        parentGroup.add(light.target);
      }
      lights.push(light);
      dynamicLightCount++;

      if (lightAmbientBuffer && lightAmbientBuffer.length >= ((l * 3) + 3)) {
        const ambientColor = new THREE.Color(
          lightAmbientBuffer[(l * 3) + 0],
          lightAmbientBuffer[(l * 3) + 1],
          lightAmbientBuffer[(l * 3) + 2]
        );
        const ambientIntensity = Math.max(ambientColor.r, ambientColor.g, ambientColor.b) * GLOBAL_LIGHT_INTENSITY_MULTIPLIER;
        if (ambientIntensity > 0.001) {
          const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
          mujocoRoot.add(ambientLight);
          lights.push(ambientLight);
          dynamicLightCount++;
        }
      }

      if (lightSpecularBuffer && lightSpecularBuffer.length >= ((l * 3) + 3)) {
        const specularStrength = Math.max(
          lightSpecularBuffer[(l * 3) + 0],
          lightSpecularBuffer[(l * 3) + 1],
          lightSpecularBuffer[(l * 3) + 2]
        );
        light.userData.specularStrength = specularStrength;
      }
    }
  }

  // default light fallback
  if (dynamicLightCount === 0) {
    const fallbackLight = new THREE.DirectionalLight(new THREE.Color(1, 1, 1), 0.75);
    fallbackLight.position.set(5, 10, 5);
    mujocoRoot.add(fallbackLight);
    lights.push(fallbackLight);
    // const ambientFallback = new THREE.AmbientLight(new THREE.Color(1, 1, 1), 0.6);
    // mujocoRoot.add(ambientFallback);
    // lights.push(ambientFallback);

    // const directionalFallback = new THREE.DirectionalLight(new THREE.Color(1, 1, 1), 1.0);
    // directionalFallback.position.set(2, 10, 2);
    // directionalFallback.target.position.set(0, 0, 0);
    // mujocoRoot.add(directionalFallback);
    // mujocoRoot.add(directionalFallback.target);
    // lights.push(directionalFallback);
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
