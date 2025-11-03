export class BaseManager {
  attachRuntime(runtime) {
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
