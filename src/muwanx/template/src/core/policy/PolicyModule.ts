import type { PolicyRunnerContext, PolicyState } from './types';

export type PolicyModuleConfig = {
  name?: string;
  [key: string]: unknown;
};

export abstract class PolicyModule {
  protected config: PolicyModuleConfig;
  protected context: PolicyRunnerContext | null;

  constructor(config: PolicyModuleConfig) {
    this.config = config;
    this.context = null;
  }

  init(context: PolicyRunnerContext): void | Promise<void> {
    this.context = context;
  }

  reset(_state?: PolicyState): void {}

  update(_state: PolicyState): void {}

  getContext(): Record<string, unknown> {
    return {};
  }
}
