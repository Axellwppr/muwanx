import * as THREE from 'three';
import type { MjModel, MjData } from 'mujoco-js';
import { getPosition } from './scene';

export interface TendonMeshes {
  cylinders: THREE.InstancedMesh;
  spheres: THREE.InstancedMesh;
}

export interface TendonState {
  numWraps: number;
  matrix: THREE.Matrix4;
}

/**
 * Create instanced meshes for rendering tendons (cylinders and spheres)
 */
export function createTendonMeshes(mujocoRoot: THREE.Group): TendonMeshes {
  const tendonMat = new THREE.MeshPhongMaterial();
  tendonMat.color = new THREE.Color(0.8, 0.3, 0.3);

  // Create cylinder instances for tendon segments
  const cylinders = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1),
    tendonMat,
    1023
  );
  cylinders.receiveShadow = true;
  cylinders.castShadow = true;
  cylinders.count = 0; // Hide by default
  cylinders.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cylinders.computeBoundingSphere();
  mujocoRoot.add(cylinders);

  // Create sphere instances for tendon wrap points
  const spheres = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 10),
    tendonMat,
    1023
  );
  spheres.receiveShadow = true;
  spheres.castShadow = true;
  spheres.count = 0; // Hide by default
  spheres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  spheres.computeBoundingSphere();
  mujocoRoot.add(spheres);

  // Store references on mujocoRoot for backward compatibility
  (mujocoRoot as any).cylinders = cylinders;
  (mujocoRoot as any).spheres = spheres;

  return { cylinders, spheres };
}

/**
 * Update tendon geometry based on current simulation state
 */
export function updateTendonGeometry(
  mjModel: MjModel,
  mjData: MjData,
  tendonMeshes: TendonMeshes,
  tendonState: TendonState
): void {
  if (!tendonMeshes.cylinders) {
    return;
  }

  let numWraps = 0;
  const mat = tendonState.matrix;

  for (let t = 0; t < mjModel.ntendon; t++) {
    const startW = mjData.ten_wrapadr[t];
    const r = mjModel.tendon_width[t];

    for (let w = startW; w < startW + mjData.ten_wrapnum[t] - 1; w++) {
      const tendonStart = getPosition(mjData.wrap_xpos, w, new THREE.Vector3());
      const tendonEnd = getPosition(mjData.wrap_xpos, w + 1, new THREE.Vector3());
      const tendonAvg = new THREE.Vector3().addVectors(tendonStart, tendonEnd).multiplyScalar(0.5);

      const validStart = tendonStart.length() > 0.01;
      const validEnd = tendonEnd.length() > 0.01;

      if (validStart) {
        tendonMeshes.spheres.setMatrixAt(
          numWraps,
          mat.compose(tendonStart, new THREE.Quaternion(), new THREE.Vector3(r, r, r))
        );
      }

      if (validEnd) {
        tendonMeshes.spheres.setMatrixAt(
          numWraps + 1,
          mat.compose(tendonEnd, new THREE.Quaternion(), new THREE.Vector3(r, r, r))
        );
      }

      if (validStart && validEnd) {
        mat.compose(
          tendonAvg,
          new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            tendonEnd.clone().sub(tendonStart).normalize()
          ),
          new THREE.Vector3(r, tendonStart.distanceTo(tendonEnd), r)
        );
        tendonMeshes.cylinders.setMatrixAt(numWraps, mat);
        numWraps++;
      }
    }
  }

  tendonState.numWraps = numWraps;
}

/**
 * Update tendon mesh rendering (call in render loop)
 */
export function updateTendonRendering(
  tendonMeshes: TendonMeshes,
  tendonState: TendonState
): void {
  if (!tendonMeshes.cylinders) {
    return;
  }

  const numWraps = tendonState.numWraps;
  tendonMeshes.cylinders.count = numWraps;
  tendonMeshes.spheres.count = numWraps > 0 ? numWraps + 1 : 0;
  tendonMeshes.cylinders.instanceMatrix.needsUpdate = true;
  tendonMeshes.spheres.instanceMatrix.needsUpdate = true;

  // Compute bounding sphere for proper rendering in Three.js r150+
  if (numWraps > 0) {
    tendonMeshes.cylinders.computeBoundingSphere();
    tendonMeshes.spheres.computeBoundingSphere();
  }
}

/**
 * Initialize tendon state object
 */
export function createTendonState(): TendonState {
  return {
    numWraps: 0,
    matrix: new THREE.Matrix4()
  };
}
