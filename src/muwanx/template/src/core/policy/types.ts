import type { MjData, MjModel } from 'mujoco-js';
import type { Mujoco } from '../../types/mujoco';

export type PolicyRunnerContext = {
  mujoco: Mujoco;
  mjModel: MjModel | null;
  mjData: MjData | null;
};

export type PolicyState = {
  jointPos: Float32Array;
  jointVel?: Float32Array;
  rootPos?: Float32Array;
  rootQuat?: Float32Array;
  rootAngVel?: Float32Array;
  [key: string]: unknown;
};

export type ObservationConfigEntry = {
  name: string;
  [key: string]: unknown;
};

export type PolicyConfig = {
  policy_module?: string;
  policy_joint_names?: string[];
  default_joint_pos?: number[];
  obs_config?: {
    policy?: ObservationConfigEntry[];
  };
  [key: string]: unknown;
};
