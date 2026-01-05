export class BaseManager {
  protected runtime: any;
  protected onRuntimeAttached?(runtime: any): void;

  attachRuntime(runtime: any) {
    this.runtime = runtime;
    if (typeof this.onRuntimeAttached === 'function') {
      this.onRuntimeAttached(runtime);
    }
  }

  async onInit() { }

  async onSceneLoaded(_context) { }

  async onPolicyLoaded(_context) { }

  beforeSimulationStep(_context) { }

  afterSimulationStep(_context) { }

  dispose() { }
}
