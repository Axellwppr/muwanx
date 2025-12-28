import * as THREE from 'three';
import type { MjData, MjModel } from 'mujoco-js';
import { mjcToThreeCoordinate } from './coordinate';

interface CreateLightsParams {
  mujoco: any;
  mjModel: MjModel;
  mujocoRoot: THREE.Group;
  bodies: Record<number, THREE.Group>;
}

export function createLights({ mujoco, mjModel, mujocoRoot, bodies }: CreateLightsParams): THREE.Light[] {
  const lights: THREE.Light[] = [];
  const ambientSum = new THREE.Color(0, 0, 0);

  if (mjModel.nlight > 0) {
    for (let l = 0; l < mjModel.nlight; l++) {
      if (!mjModel.light_active[l]) {
        continue;
      }

      const lightType = mjModel.light_type[l];
      let light: THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight;

      switch (lightType) {
        case mujoco.mjtLightType.mjLIGHT_DIRECTIONAL.value:
          light = new THREE.DirectionalLight();
          mujocoRoot.add((light as THREE.DirectionalLight).target);
          break;
        case mujoco.mjtLightType.mjLIGHT_POINT.value:
          light = new THREE.PointLight();
          break;
        case mujoco.mjtLightType.mjLIGHT_SPOT.value:
          light = new THREE.SpotLight();
          mujocoRoot.add((light as THREE.SpotLight).target);
          break;
        case mujoco.mjtLightType.mjLIGHT_IMAGE.value:
          console.warn(`Skipping unsupported light type: mjLIGHT_IMAGE (light index ${l})`);
          continue;
        default:
          console.warn(`Skipping unknown light type: ${lightType} (light index ${l})`);
          continue;
      }

      light.userData.mjIndex = l;
      light.userData.mjType = lightType;

      const diffuseColor = new THREE.Color().fromArray(mjModel.light_diffuse.slice(l * 3, l * 3 + 3));
      const specularColor = new THREE.Color().fromArray(mjModel.light_specular.slice(l * 3, l * 3 + 3));
      const combinedColor = diffuseColor.clone().add(specularColor);
      const luminance = Math.max(combinedColor.r, combinedColor.g, combinedColor.b);

      if (luminance > 0) {
        light.color = combinedColor.multiplyScalar(1 / luminance);
      } else {
        light.color = new THREE.Color(0, 0, 0);
      }

      const intensityMultiplier = mjModel.light_intensity[l] || 0.5;
      (light as any).intensity = luminance * intensityMultiplier * Math.PI;

      const ambientColor = new THREE.Color().fromArray(mjModel.light_ambient.slice(l * 3, l * 3 + 3));
      ambientSum.add(ambientColor);

      light.castShadow = mjModel.light_castshadow[l];
      if (light.castShadow) {
        light.shadow!.mapSize.width = 1024;
        light.shadow!.mapSize.height = 1024;
        light.shadow!.camera.near = 1;
        light.shadow!.camera.far = 10;
        light.shadow!.radius = mjModel.light_bulbradius[l] * 50;
      }

      const pos = mjcToThreeCoordinate(mjModel.light_pos.slice(l * 3, l * 3 + 3)).toArray();
      const dir = mjcToThreeCoordinate(mjModel.light_dir.slice(l * 3, l * 3 + 3)).normalize();

      if (lightType === mujoco.mjtLightType.mjLIGHT_DIRECTIONAL.value) {
        const len = Math.max(1, mjModel.light_range[l] || 10);
        const dl = light as THREE.DirectionalLight;
        dl.position.set(pos[0] - dir.x * len, pos[1] - dir.y * len, pos[2] - dir.z * len);
        dl.target.position.set(pos[0], pos[1], pos[2]);
      } else if (lightType === mujoco.mjtLightType.mjLIGHT_SPOT.value) {
        const sl = light as THREE.SpotLight;
        sl.position.set(pos[0], pos[1], pos[2]);
        sl.target.position.set(pos[0] + dir.x, pos[1] + dir.y, pos[2] + dir.z);
      } else {
        (light as THREE.PointLight).position.set(pos[0], pos[1], pos[2]);
      }

      if (lightType === mujoco.mjtLightType.mjLIGHT_SPOT.value) {
        (light as THREE.SpotLight).angle = mjModel.light_cutoff[l] * Math.PI / 180;
        const exponent = mjModel.light_exponent[l];
        (light as THREE.SpotLight).penumbra = 1 / (1 + exponent);
      }

      if (lightType !== mujoco.mjtLightType.mjLIGHT_DIRECTIONAL.value) {
        const att = mjModel.light_attenuation.slice(l * 3, l * 3 + 3);

        (light as any).distance = mjModel.light_range[l] ?? 0;

        if (att[2] > 0) {
          (light as any).decay = 2;
        } else if (att[1] > 0) {
          (light as any).decay = 1;
        } else {
          (light as any).decay = 0;
        }
        (light as any).distance = mjModel.light_range[l] ?? 0;
      }

      const bodyId = mjModel.light_bodyid[l];
      if (bodyId >= 0 && bodies[bodyId]) {
        bodies[bodyId].add(light);
        const isDir = lightType === mujoco.mjtLightType.mjLIGHT_DIRECTIONAL.value;
        const isSpot = lightType === mujoco.mjtLightType.mjLIGHT_SPOT.value;
        if (isDir || isSpot) {
          bodies[bodyId].add((light as THREE.DirectionalLight | THREE.SpotLight).target);
        }
      } else {
        mujocoRoot.add(light);
      }
      lights.push(light);
    }
  }

  const vis = (mjModel as any).vis ?? (mjModel as any).visual;
  if (vis?.headlight?.active) {
    const headAmbient = new THREE.Color().fromArray(vis.headlight.ambient as number[]);
    ambientSum.add(headAmbient);

    const headDiffuse = new THREE.Color().fromArray(vis.headlight.diffuse as number[]);
    const headSpecular = new THREE.Color().fromArray(vis.headlight.specular as number[]);

    const headLight = new THREE.DirectionalLight();
    headLight.color = headDiffuse.clone().add(headSpecular);
    headLight.intensity = 0.8 * Math.PI;
    headLight.castShadow = false;

    mujocoRoot.add(headLight.target);
    headLight.position.set(0, 0, 2);
    headLight.target.position.set(0, 0, 0);
    headLight.userData.isHeadlight = true;
    mujocoRoot.add(headLight);
    lights.push(headLight);
  }

  if (!ambientSum.equals(new THREE.Color(0, 0, 0))) {
    const ambientLight = new THREE.AmbientLight(ambientSum, 0.2);
    mujocoRoot.add(ambientLight);
    lights.push(ambientLight);
  }

  if (lights.length === 0) {
    console.warn('No active lights found in MuJoCo model; adding default light.');
    const defaultLight = new THREE.DirectionalLight();
    defaultLight.intensity = 0.8 * Math.PI;
    mujocoRoot.add(defaultLight);
    lights.push(defaultLight);
  }

  return lights;
}

export function updateLightsFromData(
  mujoco: any,
  mjData: MjData,
  lights: THREE.Light[],
): void {
  if (!mjData || !mjData.light_xpos || !mjData.light_xdir) {
    return;
  }

  for (const light of lights) {
    const idx = (light as any).userData?.mjIndex;
    const type = (light as any).userData?.mjType;
    if (idx == null) {
      continue;
    }

    const posMJ = mjData.light_xpos.slice(idx * 3, idx * 3 + 3);
    const dirMJ = mjData.light_xdir.slice(idx * 3, idx * 3 + 3);

    const pos = mjcToThreeCoordinate(posMJ);
    const dir = mjcToThreeCoordinate(dirMJ).normalize();

    if (type === mujoco.mjtLightType.mjLIGHT_DIRECTIONAL.value) {
      const dl = light as THREE.DirectionalLight;
      const len = Math.max(1, (dl.shadow?.camera?.far as number) || 10);
      dl.target.position.copy(pos);
      dl.position.copy(pos).addScaledVector(dir, -len);
      dl.target.updateMatrixWorld?.();
    } else if (type === mujoco.mjtLightType.mjLIGHT_SPOT.value) {
      const sl = light as THREE.SpotLight;
      sl.position.copy(pos);
      sl.target.position.copy(pos.clone().add(dir));
      sl.target.updateMatrixWorld?.();
    } else if (type === mujoco.mjtLightType.mjLIGHT_POINT.value) {
      (light as THREE.PointLight).position.copy(pos);
    }
  }
}

export function updateHeadlightFromCamera(camera: THREE.Camera, lights: THREE.Light[]): void {
  const dir = new THREE.Vector3();
  for (const light of lights) {
    if (!(light as any).userData?.isHeadlight) {
      continue;
    }
    const dl = light as THREE.DirectionalLight;
    camera.getWorldDirection(dir);
    dl.position.copy((camera as any).position);
    dl.target.position.copy((camera as any).position).add(dir);
    dl.target.updateMatrixWorld?.();
  }
}
