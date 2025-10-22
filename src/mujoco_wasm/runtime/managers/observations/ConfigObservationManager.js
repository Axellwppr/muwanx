import * as ort from 'onnxruntime-web';
import { BaseManager } from '../BaseManager.js';
import { Observations } from '../../observations/index.js';

export class ConfigObservationManager extends BaseManager {
    constructor() {
        super();
        this.observationGroups = {};
        this.historyBuffers = {};
        this.historyConfig = {};
    }

    async onPolicyLoaded({ config, mjModel, mjData, assetMeta }) {
        this.observationGroups = {};
        this.historyBuffers = {};
        this.historyConfig = {};
        
        const obsConfig = config.obs_config || {};
        
        for (const [key, value] of Object.entries(obsConfig)) {
            // Check if this is a config with history settings
            // Must be an object (not array) and have history config properties
            if (value && !Array.isArray(value) && (value.interleaved !== undefined || value.history_steps !== undefined)) {
                // New format: { interleaved: true, history_steps: 6, components: [...] }
                const components = value.components || [];
                const historySteps = value.history_steps || 1;
                const interleaved = value.interleaved || false;
                
                this.observationGroups[key] = components.map(obsConfigItem => 
                    this.createObservationInstance({
                        obsConfig: { ...obsConfigItem, history_steps: 1 }, // Force single timestep
                        mjModel,
                        mjData,
                        assetMeta,
                    })
                );
                
                this.historyConfig[key] = {
                    steps: historySteps,
                    interleaved: interleaved
                };
                
                // Calculate dimensions per timestep
                const dimsPerTimestep = this.observationGroups[key].reduce((sum, obs) => {
                    const testOutput = obs.compute();
                    return sum + testOutput.length;
                }, 0);
                
                this.historyBuffers[key] = new Float32Array(dimsPerTimestep * historySteps);
                
                console.log(`[ConfigObservationManager] Setup history for "${key}": ${dimsPerTimestep} dims/step × ${historySteps} steps = ${dimsPerTimestep * historySteps} total (interleaved: ${interleaved})`);
            } else {
                // Old format: just an array of observation configs
                const obsList = Array.isArray(value) ? value : [value];
                this.observationGroups[key] = obsList.map(obsConfigItem => 
                    this.createObservationInstance({
                        obsConfig: obsConfigItem,
                        mjModel,
                        mjData,
                        assetMeta,
                    })
                );
            }
        }
    }

    async onPolicyCleared() {
        this.observationGroups = {};
        this.historyBuffers = {};
        this.historyConfig = {};
    }

    createObservationInstance({ obsConfig, mjModel, mjData }) {
        const ObsClass = Observations[obsConfig.name];
        if (!ObsClass) {
            throw new Error(`Unknown observation type: ${obsConfig.name}`);
        }
        const kwargs = { ...obsConfig };
        delete kwargs.name;
        if (kwargs.joint_names === 'isaac') {
            kwargs.joint_names = this.runtime.jointNamesIsaac;
        }
        return new ObsClass(mjModel, mjData, this.runtime, kwargs);
    }

    collect() {
        const tensors = {};
        
        for (const [key, obsList] of Object.entries(this.observationGroups)) {
            const historyConfig = this.historyConfig[key];
            
            if (historyConfig) {
                // Collect current observations from all components
                const currentObs = [];
                for (const obs of obsList) {
                    const values = obs.compute();
                    currentObs.push(...values);
                }
                
                const buffer = this.historyBuffers[key];
                const dimsPerTimestep = currentObs.length;
                
                if (historyConfig.interleaved) {
                    // Interleaved history: [all_t0, all_t1, all_t2, ...]
                    // Shift history: [t0, t1, t2, ...] → [current, t0, t1, ...]
                    for (let i = buffer.length - 1; i >= dimsPerTimestep; i--) {
                        buffer[i] = buffer[i - dimsPerTimestep];
                    }
                    buffer.set(currentObs, 0);
                } else {
                    // Grouped history: [comp0_all_t, comp1_all_t, ...]
                    // This would require tracking per-component buffers
                    // For now, just use interleaved as default
                    for (let i = buffer.length - 1; i >= dimsPerTimestep; i--) {
                        buffer[i] = buffer[i - dimsPerTimestep];
                    }
                    buffer.set(currentObs, 0);
                }
                
                tensors[key] = new ort.Tensor('float32', Array.from(buffer), [1, buffer.length]);
            } else {
                // No history, just concatenate observations
                const obsForKey = [];
                for (const obs of obsList) {
                    const values = obs.compute();
                    obsForKey.push(...values);
                }
                tensors[key] = new ort.Tensor('float32', obsForKey, [1, obsForKey.length]);
            }
        }
        
        return tensors;
    }
}
