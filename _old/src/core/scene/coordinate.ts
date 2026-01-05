import * as THREE from 'three';

/**
 * Convert a mujoco coordinate to three.js coordinate. (x, y, z) -> (x, z, -y) if y-up.
 * @param v Input array in MuJoCo coordinates.
 */
export function mjcToThreeCoordinate(v: ArrayLike<number>): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[2], -v[1]);
};

/**
 * Convert a three.js coordinate to mujoco coordinate. (x, y, z) -> (x, -z, y) if y-up.
 * @param v Input vector in Three.js coordinates.
 */
export function threeToMjcCoordinate(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, -v.z, v.y);
};
