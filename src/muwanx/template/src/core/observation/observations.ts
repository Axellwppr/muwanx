import * as THREE from 'three';
import { ObservationBase } from './ObservationBase';
import {
  clampFutureIndices,
  normalizeQuat,
  quatApplyInv,
  quatInverse,
  quatMultiply,
  quatToRot6d,
} from './math';
import type { PolicyState } from '../policy/types';
import type { TrackingHelper } from '../policy/modules/TrackingPolicy';
import type { PolicyRunner } from '../policy/PolicyRunner';

function getTrackingContext(runner: PolicyRunner): TrackingHelper | null {
  const context = runner.getPolicyModuleContext();
  const tracking = context.tracking as TrackingHelper | undefined;
  return tracking ?? null;
}

export class BootIndicator extends ObservationBase {
  get size(): number {
    return 1;
  }

  compute(_state: PolicyState): Float32Array {
    return new Float32Array([0.0]);
  }
}

export class RootAngVelB extends ObservationBase {
  get size(): number {
    return 3;
  }

  compute(state: PolicyState): Float32Array {
    const value = state.rootAngVel ?? new Float32Array(3);
    return new Float32Array(value);
  }
}

export class ProjectedGravityB extends ObservationBase {
  private gravity: THREE.Vector3;

  constructor(runner: any, config: any) {
    super(runner, config);
    this.gravity = new THREE.Vector3(0, 0, -1);
  }

  get size(): number {
    return 3;
  }

  compute(state: PolicyState): Float32Array {
    const quat = state.rootQuat ?? new Float32Array([1, 0, 0, 0]);
    const quatObj = new THREE.Quaternion(quat[1], quat[2], quat[3], quat[0]);
    const gravityLocal = this.gravity.clone().applyQuaternion(quatObj.clone().invert());
    return new Float32Array([gravityLocal.x, gravityLocal.y, gravityLocal.z]);
  }
}

export class JointPos extends ObservationBase {
  private posSteps: number[];
  private numJoints: number;
  private maxStep: number;
  private history: Float32Array[];

  constructor(runner: any, config: any) {
    super(runner, config);
    const posSteps = Array.isArray(config.pos_steps)
      ? config.pos_steps.map((value: number) => Math.max(0, Math.floor(value)))
      : [0, 1, 2, 3, 4, 8];
    this.posSteps = posSteps;
    this.numJoints = runner.getNumActions();
    this.maxStep = Math.max(...this.posSteps);
    this.history = Array.from({ length: this.maxStep + 1 }, () => new Float32Array(this.numJoints));
  }

  get size(): number {
    return this.posSteps.length * this.numJoints;
  }

  reset(state?: PolicyState): void {
    const source = state?.jointPos ?? new Float32Array(this.numJoints);
    this.history[0].set(source);
    for (let i = 1; i < this.history.length; i++) {
      this.history[i].set(this.history[0]);
    }
  }

  update(state: PolicyState): void {
    for (let i = this.history.length - 1; i > 0; i--) {
      this.history[i].set(this.history[i - 1]);
    }
    this.history[0].set(state.jointPos);
  }

  compute(_state: PolicyState): Float32Array {
    const out = new Float32Array(this.posSteps.length * this.numJoints);
    let offset = 0;
    for (const step of this.posSteps) {
      const idx = Math.min(step, this.history.length - 1);
      out.set(this.history[idx], offset);
      offset += this.numJoints;
    }
    return out;
  }
}

export class TrackingCommandObsRaw extends ObservationBase {
  private futureSteps: number[];
  private outputLength: number;

  constructor(runner: any, config: any) {
    super(runner, config);
    this.futureSteps = Array.isArray(config.future_steps)
      ? config.future_steps.map((value: number) => Math.max(0, Math.floor(value)))
      : [0, 2, 4, 8, 16];
    const nFut = this.futureSteps.length;
    this.outputLength = (nFut - 1) * 3 + nFut * 6;
  }

  get size(): number {
    return this.outputLength;
  }

  compute(state: PolicyState): Float32Array {
    const tracking = getTrackingContext(this.runner);
    if (!tracking || !tracking.isReady()) {
      return new Float32Array(this.outputLength);
    }

    const baseIdx = tracking.refIdx;
    const refLen = tracking.refLen;
    const indices = clampFutureIndices(baseIdx, this.futureSteps, refLen);

    const basePos = tracking.refRootPos[indices[0]];
    const baseQuat = normalizeQuat(tracking.refRootQuat[indices[0]]);

    const posDiff: number[] = [];
    for (let i = 1; i < indices.length; i++) {
      const pos = tracking.refRootPos[indices[i]];
      const diff = [pos[0] - basePos[0], pos[1] - basePos[1], pos[2] - basePos[2]];
      const diffB = quatApplyInv(baseQuat, diff);
      posDiff.push(diffB[0], diffB[1], diffB[2]);
    }

    const qCur = normalizeQuat(state.rootQuat ?? [1, 0, 0, 0]);
    const qCurInv = quatInverse(qCur);

    const rot6d: number[] = [];
    for (let i = 0; i < indices.length; i++) {
      const refQuat = normalizeQuat(tracking.refRootQuat[indices[i]]);
      const rel = quatMultiply(qCurInv, refQuat);
      const r6 = quatToRot6d(rel);
      rot6d.push(r6[0], r6[1], r6[2], r6[3], r6[4], r6[5]);
    }

    return Float32Array.from([...posDiff, ...rot6d]);
  }
}

export class TargetRootZObs extends ObservationBase {
  private futureSteps: number[];

  constructor(runner: any, config: any) {
    super(runner, config);
    this.futureSteps = Array.isArray(config.future_steps)
      ? config.future_steps.map((value: number) => Math.max(0, Math.floor(value)))
      : [0, 2, 4, 8, 16];
  }

  get size(): number {
    return this.futureSteps.length;
  }

  compute(_state: PolicyState): Float32Array {
    const tracking = getTrackingContext(this.runner);
    if (!tracking || !tracking.isReady()) {
      return new Float32Array(this.size);
    }
    const indices = clampFutureIndices(tracking.refIdx, this.futureSteps, tracking.refLen);
    const out = new Float32Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
      out[i] = tracking.refRootPos[indices[i]][2];
    }
    return out;
  }
}

export class TargetJointPosObs extends ObservationBase {
  private futureSteps: number[];

  constructor(runner: any, config: any) {
    super(runner, config);
    this.futureSteps = Array.isArray(config.future_steps)
      ? config.future_steps.map((value: number) => Math.max(0, Math.floor(value)))
      : [0, 2, 4, 8, 16];
  }

  get size(): number {
    const tracking = getTrackingContext(this.runner);
    const nJoints = tracking?.nJoints ?? 0;
    return this.futureSteps.length * nJoints;
  }

  compute(_state: PolicyState): Float32Array {
    const tracking = getTrackingContext(this.runner);
    if (!tracking || !tracking.isReady()) {
      return new Float32Array(this.size);
    }
    const indices = clampFutureIndices(tracking.refIdx, this.futureSteps, tracking.refLen);
    const out = new Float32Array(indices.length * tracking.nJoints);
    let offset = 0;
    for (const idx of indices) {
      out.set(tracking.refJointPos[idx], offset);
      offset += tracking.nJoints;
    }
    return out;
  }
}

export class TargetProjectedGravityBObs extends ObservationBase {
  private futureSteps: number[];

  constructor(runner: any, config: any) {
    super(runner, config);
    this.futureSteps = Array.isArray(config.future_steps)
      ? config.future_steps.map((value: number) => Math.max(0, Math.floor(value)))
      : [0, 2, 4, 8, 16];
  }

  get size(): number {
    return this.futureSteps.length * 3;
  }

  compute(_state: PolicyState): Float32Array {
    const tracking = getTrackingContext(this.runner);
    if (!tracking || !tracking.isReady()) {
      return new Float32Array(this.size);
    }
    const indices = clampFutureIndices(tracking.refIdx, this.futureSteps, tracking.refLen);
    const out = new Float32Array(indices.length * 3);
    const gravity = [0.0, 0.0, -1.0];
    let offset = 0;
    for (const idx of indices) {
      const quat = normalizeQuat(tracking.refRootQuat[idx]);
      const gLocal = quatApplyInv(quat, gravity);
      out[offset++] = gLocal[0];
      out[offset++] = gLocal[1];
      out[offset++] = gLocal[2];
    }
    return out;
  }
}

export class PrevActions extends ObservationBase {
  private steps: number;
  private numActions: number;
  private actionBuffer: Float32Array[];

  constructor(runner: any, config: any) {
    super(runner, config);
    const history = typeof config.history_steps === 'number' ? config.history_steps : 4;
    this.steps = Math.max(1, Math.floor(history));
    this.numActions = runner.getNumActions();
    this.actionBuffer = Array.from({ length: this.steps }, () => new Float32Array(this.numActions));
  }

  get size(): number {
    return this.steps * this.numActions;
  }

  reset(): void {
    for (const buffer of this.actionBuffer) {
      buffer.fill(0.0);
    }
  }

  update(): void {
    for (let i = this.actionBuffer.length - 1; i > 0; i--) {
      this.actionBuffer[i].set(this.actionBuffer[i - 1]);
    }
    const source = this.runner.getLastActions();
    this.actionBuffer[0].set(source);
  }

  compute(_state: PolicyState): Float32Array {
    const flattened = new Float32Array(this.steps * this.numActions);
    for (let i = 0; i < this.steps; i++) {
      for (let j = 0; j < this.numActions; j++) {
        flattened[i * this.numActions + j] = this.actionBuffer[i][j];
      }
    }
    return flattened;
  }
}

export const Observations = {
  PrevActions,
  BootIndicator,
  RootAngVelB,
  ProjectedGravityB,
  JointPos,
  TrackingCommandObsRaw,
  TargetRootZObs,
  TargetJointPosObs,
  TargetProjectedGravityBObs,
};
