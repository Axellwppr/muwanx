import { BaseManager } from '../BaseManager.js';

export class PassiveActionManager extends BaseManager {
    constructor(options = {}) {
        super();
        this.options = options;
        this.controlType = 'none';
        this.mjModel = null;
        this.mjData = null;
        this.assetMeta = null;
        this.policyConfig = null;
        this.resetState(0);
    }

    resetState(numActions = 0) {
        this.numActions = typeof numActions === 'number' && numActions > 0 ? numActions : 0;
        this.lastActions = new Float32Array(this.numActions);
        this.actionBuffer = Array.from({ length: 4 }, () => new Float32Array(this.numActions));
        this.defaultJpos = new Float32Array(this.numActions);
        this.actionScale = new Float32Array(this.numActions);
        this.jntKp = new Float32Array(this.numActions);
        this.jntKd = new Float32Array(this.numActions);
        this.jointNamesIsaac = [];
        this.jointNamesMJC = [];
        this.ctrlAdrIsaac = [];
        this.qposAdrIsaac = [];
        this.qvelAdrIsaac = [];
        this.updateRuntimeState();
    }

    updateRuntimeState() {
        if (!this.runtime) {
            return;
        }
        this.runtime.controlType = this.controlType;
        this.runtime.numActions = this.numActions;
        this.runtime.lastActions = this.lastActions;
        this.runtime.actionBuffer = this.actionBuffer;
        this.runtime.defaultJpos = this.defaultJpos;
        this.runtime.actionScale = this.actionScale;
        this.runtime.jntKp = this.jntKp;
        this.runtime.jntKd = this.jntKd;
        this.runtime.jointNamesIsaac = this.jointNamesIsaac;
        this.runtime.jointNamesMJC = this.jointNamesMJC;
        this.runtime.ctrlAdrIsaac = this.ctrlAdrIsaac;
        this.runtime.qposAdrIsaac = this.qposAdrIsaac;
        this.runtime.qvelAdrIsaac = this.qvelAdrIsaac;
    }

    onRuntimeAttached() {
        this.updateRuntimeState();
    }

    async onSceneLoaded({ mjModel, mjData, assetMeta }) {
        this.mjModel = mjModel;
        this.mjData = mjData;
        this.assetMeta = assetMeta ?? null;
        const numActions = typeof this.mjModel?.nu === 'number' ? this.mjModel.nu : 0;
        this.resetState(numActions);
        if (this.mjData?.ctrl?.fill) {
            this.mjData.ctrl.fill(0);
        }
    }

    async onPolicyLoaded({ config }) {
        this.policyConfig = config ?? null;
        this.controlType = 'none';
        const numActions = this.mjModel?.nu ?? 0;
        this.resetState(numActions);
    }

    async onPolicyCleared() {
        this.policyConfig = null;
        this.controlType = 'none';
        const numActions = this.mjModel?.nu ?? 0;
        this.resetState(numActions);
    }

    onPolicyOutput(_result) {
        // no-op: passive manager does not process policy outputs
    }

    beforeSimulationStep() {
        if (this.mjData?.ctrl?.fill) {
            this.mjData.ctrl.fill(0);
        }
    }

    afterSimulationStep() {
        // no-op
    }

    dispose() {
        if (this.mjData?.ctrl?.fill) {
            this.mjData.ctrl.fill(0);
        }
        this.mjModel = null;
        this.mjData = null;
        this.assetMeta = null;
        this.policyConfig = null;
        this.resetState(0);
    }
}
