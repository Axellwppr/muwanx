import { ObservationBase } from '../observation/ObservationBase';
import { PolicyModule } from './PolicyModule';
import type {
  ObservationConfigEntry,
  PolicyConfig,
  PolicyRunnerContext,
  PolicyState,
} from './types';

export type PolicyModuleConstructor = new (config: PolicyConfig) => PolicyModule;
export type ObservationConstructor = new (
  runner: PolicyRunner,
  config: ObservationConfigEntry
) => ObservationBase;

export type PolicyRunnerOptions = {
  policyModules?: Record<string, PolicyModuleConstructor>;
  observations?: Record<string, ObservationConstructor>;
};

export class PolicyRunner {
  private config: PolicyConfig;
  private options: PolicyRunnerOptions;
  private policyModule: PolicyModule | null;
  private obsModules: ObservationBase[];
  private obsLayout: { name: string; size: number }[];
  private obsSize: number;
  private context: PolicyRunnerContext | null;
  private policyJointNames: string[];
  private defaultJointPos: Float32Array;
  private numActions: number;
  private lastActions: Float32Array;

  constructor(config: PolicyConfig, options: PolicyRunnerOptions = {}) {
    this.config = config;
    this.options = options;
    this.policyModule = null;
    this.obsModules = [];
    this.obsLayout = [];
    this.obsSize = 0;
    this.context = null;

    this.policyJointNames = (config.policy_joint_names ?? []).slice();
    this.numActions = this.policyJointNames.length;
    this.lastActions = new Float32Array(this.numActions);
    this.defaultJointPos = this.normalizeArray(
      config.default_joint_pos ?? [],
      this.numActions,
      0.0
    );
  }

  async init(context: PolicyRunnerContext): Promise<void> {
    this.context = context;
    this.policyModule = await this.buildPolicyModule(context);
    this.obsModules = this.buildObservations();
    this.obsLayout = this.obsModules.map((obs, index) => ({
      name: this.getObsName(index),
      size: obs.size,
    }));
    this.obsSize = this.obsLayout.reduce((sum, entry) => sum + entry.size, 0);
  }

  reset(state?: PolicyState): void {
    this.lastActions.fill(0.0);
    this.policyModule?.reset(state);
    for (const obs of this.obsModules) {
      if (obs.reset) {
        obs.reset(state);
      }
    }
  }

  update(state: PolicyState): void {
    this.policyModule?.update(state);
    for (const obs of this.obsModules) {
      if (obs.update) {
        obs.update(state);
      }
    }
  }

  collectObservations(state: PolicyState): Float32Array {
    this.update(state);

    if (!this.obsSize) {
      return new Float32Array(0);
    }

    const output = new Float32Array(this.obsSize);
    let offset = 0;
    for (const obs of this.obsModules) {
      const value = obs.compute(state);
      const array = value instanceof Float32Array ? value : Float32Array.from(value);
      if (array.length !== obs.size) {
        throw new Error(
          `Observation size mismatch: expected ${obs.size}, got ${array.length}`
        );
      }
      output.set(array, offset);
      offset += array.length;
    }
    return output;
  }

  getObservationSize(): number {
    return this.obsSize;
  }

  getObservationLayout(): { name: string; size: number }[] {
    return this.obsLayout.map((entry) => ({ ...entry }));
  }

  getPolicyModuleContext(): Record<string, unknown> {
    return this.policyModule?.getContext() ?? {};
  }

  getPolicyModule(): PolicyModule | null {
    return this.policyModule;
  }

  getContext(): PolicyRunnerContext | null {
    return this.context;
  }

  getPolicyJointNames(): string[] {
    return this.policyJointNames.slice();
  }

  getNumActions(): number {
    return this.numActions;
  }

  getDefaultJointPos(): Float32Array {
    return new Float32Array(this.defaultJointPos);
  }

  getLastActions(): Float32Array {
    return new Float32Array(this.lastActions);
  }

  setLastActions(actions: Float32Array): void {
    if (actions.length !== this.lastActions.length) {
      this.lastActions = new Float32Array(actions);
      return;
    }
    this.lastActions.set(actions);
  }

  private async buildPolicyModule(
    context: PolicyRunnerContext
  ): Promise<PolicyModule | null> {
    const registry = this.options.policyModules ?? {};
    const moduleKey = this.config.policy_module;
    const Module = moduleKey ? registry[moduleKey] : registry.default;

    if (moduleKey && !Module) {
      throw new Error(`Unknown policy module: ${moduleKey}`);
    }

    if (!Module) {
      return null;
    }

    const module = new Module(this.config);
    await module.init(context);
    return module;
  }

  private buildObservations(): ObservationBase[] {
    const registry = this.options.observations ?? {};
    const obsList = Array.isArray(this.config.obs_config?.policy)
      ? this.config.obs_config?.policy
      : [];

    return obsList.map((entry) => {
      const ObsClass = registry[entry.name];
      if (!ObsClass) {
        throw new Error(`Unknown observation type: ${entry.name}`);
      }
      return new ObsClass(this, entry);
    });
  }

  private getObsName(index: number): string {
    const obsList = Array.isArray(this.config.obs_config?.policy)
      ? this.config.obs_config?.policy
      : [];
    return obsList[index]?.name ?? `obs_${index}`;
  }

  private normalizeArray(
    values: number[],
    length: number,
    fallback: number
  ): Float32Array {
    const output = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      output[i] = typeof values[i] === 'number' ? values[i] : fallback;
    }
    return output;
  }
}
