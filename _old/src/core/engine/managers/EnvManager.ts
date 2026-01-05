import * as THREE from 'three';
import { BaseManager } from './BaseManager';
import { DragStateManager } from '@/viewer/utils/DragStateManager';
import { getPosition, getQuaternion, toMujocoPos } from '@/core/scene/scene';
import { MjData, MjModel } from 'mujoco-js';

interface LocomotionEnvOptions {
  ballHeight?: number;
  dragForceScale?: number;
  impulseForce?: THREE.Vector3;
  serviceName?: string;
}

export class LocomotionEnvManager extends BaseManager {
  options: LocomotionEnvOptions;
  ballHeight: number;
  dragForceScale: number;
  impulseForce: THREE.Vector3;
  serviceName: string;
  defaultBallPosition: THREE.Vector3;
  activePolicyId: string | null;
  isFacetPolicyActive: boolean;
  desiredVisibility: boolean;
  useSetpointActive: boolean;
  compliantModeActive: boolean;
  scene: any;
  camera: any;
  renderer: any;
  controls: any;
  container: any;
  ball: THREE.Mesh;
  dragStateManager: DragStateManager;
  mjModel: MjModel;
  mjData: MjData;
  pelvisBodyId: number | null;

  constructor(options: LocomotionEnvOptions = {}) {
    super();
    this.options = options;
    this.ballHeight = options.ballHeight ?? 0.5;
    this.dragForceScale = options.dragForceScale ?? 25;
    this.impulseForce = options.impulseForce ?? new THREE.Vector3(0, 50, 0);
    this.serviceName = options.serviceName ?? 'setpoint-control';
    this.defaultBallPosition = new THREE.Vector3(0, this.ballHeight, 0);
    this.activePolicyId = null;
    this.isFacetPolicyActive = false;
    this.desiredVisibility = false;
    this.useSetpointActive = false;
    this.compliantModeActive = false;
  }

  onRuntimeAttached(runtime) {
    this.scene = runtime.scene;
    this.camera = runtime.camera;
    this.renderer = runtime.renderer;
    this.controls = runtime.controls;
    this.container = runtime.container.parentElement;
    this.createFacetBall();
    this.dragStateManager = new DragStateManager(this.scene, this.renderer, this.camera, this.container, this.controls);
    runtime.registerService(this.serviceName, this.createServiceInterface());
    this.updateBallPresence();
  }

  createFacetBall() {
    const ballGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.2,
      roughness: 0.2,
    });
    this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
    this.ball.name = 'facetball';
    this.ball.position.copy(this.defaultBallPosition);
    this.ball.castShadow = true;
    this.ball.bodyID = 'facetball';
    this.ball.visible = false;
    this.runtime.ball = this.ball;
  }

  setActivePolicy(policyId) {
    this.activePolicyId = policyId;
    const isFacet = policyId === 'facet';
    if (this.isFacetPolicyActive !== isFacet) {
      this.isFacetPolicyActive = isFacet;
      if (!isFacet && this.dragStateManager?.physicsObject === this.ball) {
        this.dragStateManager.end?.({ type: 'facetball-hidden' });
      }
      this.updateBallPresence();
    }
  }

  setBallVisibilityState(visible) {
    this.desiredVisibility = Boolean(visible);
    this.updateBallPresence();
  }

  setUseSetpointActive(flag) {
    this.useSetpointActive = Boolean(flag);
    this.updateBallPresence();
  }

  setCompliantModeActive(flag, kp) {
    this.compliantModeActive = Boolean(flag);
    if (typeof kp === 'number') {
      this.runtime.params.impedance_kp = kp;
    }
    this.updateBallPresence();
  }

  updateBallPresence() {
    if (!this.ball || !this.scene) {
      return;
    }
    const shouldDisplay = this.isFacetPolicyActive && !this.compliantModeActive && (this.useSetpointActive || this.desiredVisibility);
    if (shouldDisplay) {
      if (!this.ball.parent) {
        this.scene.add(this.ball);
      }
    } else if (this.ball.parent) {
      this.scene.remove(this.ball);
      if (this.dragStateManager?.physicsObject === this.ball) {
        this.dragStateManager.end?.({ type: 'facetball-hidden' });
      }
    }
    this.ball.visible = shouldDisplay;
  }

  createServiceInterface() {
    return {
      ball: this.ball,
      setActivePolicy: (policyId) => {
        this.setActivePolicy(policyId);
      },
      setVisible: (visible) => {
        this.setBallVisibilityState(visible);
      },
      setPosition: (x, y, z) => {
        this.ball.position.set(x, y, z);
      },
      reset: () => {
        this.ball.position.copy(this.defaultBallPosition);
        this.updateBallPresence();
      },
      onSetpointEnabled: () => {
        this.setUseSetpointActive(true);
      },
      onSetpointDisabled: () => {
        this.setUseSetpointActive(false);
      },
      onCompliantModeChange: (flag, kp) => {
        this.setCompliantModeActive(flag, kp);
      },
      onImpedanceChange: () => { },
      onImpulseTriggered: () => { },
    };
  }

  async onSceneLoaded({ mjModel, mjData }) {
    this.mjModel = mjModel;
    this.mjData = mjData;
    this.runtime.mujocoRoot = this.runtime.scene.getObjectByName('MuJoCo Root');
    this.ball.position.copy(this.defaultBallPosition);

    this.pelvisBodyId = null;
    for (let b = 0; b < this.mjModel.nbody; b++) {
      const body = this.runtime.bodies?.[b];
      if (body && body.name === 'base') {
        this.pelvisBodyId = b;
        break;
      }
    }
  }

  beforeSimulationStep() {
    if (!this.mjData) {
      return;
    }
    // Clear applied forces
    for (let i = 0; i < this.mjData.qfrc_applied.length; i++) {
      this.mjData.qfrc_applied[i] = 0.0;
    }
    // Clear Cartesian forces (xfrc_applied)
    for (let i = 0; i < this.mjData.xfrc_applied.length; i++) {
      this.mjData.xfrc_applied[i] = 0.0;
    }

    const dragged = this.dragStateManager.physicsObject;
    if (dragged && dragged.bodyID) {
      for (let b = 0; b < this.mjModel.nbody; b++) {
        if (this.runtime.bodies[b]) {
          getPosition(this.mjData.xpos, b, this.runtime.bodies[b].position);
          getQuaternion(this.mjData.xquat, b, this.runtime.bodies[b].quaternion);
          this.runtime.bodies[b].updateWorldMatrix();
        }
      }
      this.dragStateManager.update();
      if (this.dragStateManager.physicsObject) {
        if (this.dragStateManager.physicsObject.bodyID === 'facetball') {
          this.ball.position.x = this.dragStateManager.currentWorld.x;
          this.ball.position.z = this.dragStateManager.currentWorld.z;
        } else {
          const force = toMujocoPos(this.dragStateManager.offset.clone().multiplyScalar(this.dragForceScale));
          const point = toMujocoPos(this.dragStateManager.worldHit.clone());
          const bodyId = this.dragStateManager.physicsObject.bodyID;

          // Apply force directly to xfrc_applied (Cartesian forces)
          // xfrc_applied is sized (nbody, 6): [fx, fy, fz, tx, ty, tz] for each body
          const offset = bodyId * 6;

          // Get body position to compute torque from force at point
          const bodyPos = new THREE.Vector3(
            this.mjData.xpos[bodyId * 3],
            this.mjData.xpos[bodyId * 3 + 1],
            this.mjData.xpos[bodyId * 3 + 2]
          );

          // Compute torque: r × F (cross product of position offset and force)
          const r = new THREE.Vector3(point.x - bodyPos.x, point.y - bodyPos.y, point.z - bodyPos.z);
          const f = new THREE.Vector3(force.x, force.y, force.z);
          const torque = new THREE.Vector3().crossVectors(r, f);

          // Apply force and torque to xfrc_applied
          this.mjData.xfrc_applied[offset + 0] = force.x;
          this.mjData.xfrc_applied[offset + 1] = force.y;
          this.mjData.xfrc_applied[offset + 2] = force.z;
          this.mjData.xfrc_applied[offset + 3] = torque.x;
          this.mjData.xfrc_applied[offset + 4] = torque.y;
          this.mjData.xfrc_applied[offset + 5] = torque.z;
        }
      }
    }

    if (this.runtime.params.impulse_remain_time > 0 && this.pelvisBodyId !== null) {
      const point = new THREE.Vector3();
      getPosition(this.mjData.xpos, this.pelvisBodyId, point, false);

      // Apply impulse force directly to xfrc_applied
      const offset = this.pelvisBodyId * 6;

      // Get body position to compute torque
      const bodyPos = new THREE.Vector3(
        this.mjData.xpos[this.pelvisBodyId * 3],
        this.mjData.xpos[this.pelvisBodyId * 3 + 1],
        this.mjData.xpos[this.pelvisBodyId * 3 + 2]
      );

      // Compute torque: r × F
      const r = new THREE.Vector3(point.x - bodyPos.x, point.y - bodyPos.y, point.z - bodyPos.z);
      const f = new THREE.Vector3(this.impulseForce.x, this.impulseForce.y, this.impulseForce.z);
      const torque = new THREE.Vector3().crossVectors(r, f);

      // Apply force and torque
      this.mjData.xfrc_applied[offset + 0] = this.impulseForce.x;
      this.mjData.xfrc_applied[offset + 1] = this.impulseForce.y;
      this.mjData.xfrc_applied[offset + 2] = this.impulseForce.z;
      this.mjData.xfrc_applied[offset + 3] = torque.x;
      this.mjData.xfrc_applied[offset + 4] = torque.y;
      this.mjData.xfrc_applied[offset + 5] = torque.z;

      this.runtime.params.impulse_remain_time -= this.runtime.timestep;
    }
  }

  dispose() {
    if (this.ball) {
      if (this.ball.parent) {
        this.scene.remove(this.ball);
      }
      this.ball.geometry.dispose();
      if (Array.isArray(this.ball.material)) {
        this.ball.material.forEach((mat) => mat.dispose());
      } else {
        this.ball.material.dispose();
      }
    }
    this.runtime.unregisterService(this.serviceName);
  }

  reset() {
    this.ball.position.copy(this.defaultBallPosition);
  }
}
