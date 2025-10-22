import { BaseManager } from '../BaseManager.js';

const nowSeconds = () => {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now() / 1000;
    }
    return Date.now() / 1000;
};

export class TrajectoryActionManager extends BaseManager {
    constructor(options = {}) {
        super();
        this.options = options;
        this.runtime = null;
        this.mjModel = null;
        this.mjData = null;
        this.assetMeta = null;
        this.trajectory = null;
        this.currentFrame = 0;
        this.isPlaying = false;
        this.startTime = null;
        this.loop = false;
        this.pdGains = { kp: 25.0, kd: 0.5 };
        this.ctrlAdr = [];
        this.qposAdr = [];
        this.qvelAdr = [];
        this.jointNames = [];
        this.textDecoder = null;
        this.trajectoryJointNames = null;
        this.jointRemap = null;
        this.numActuators = 0;
        this.commandBuffer = new Float32Array(0);
        this.zeroAction = new Float32Array(0);
    }

    onRuntimeAttached(runtime) {
        this.runtime = runtime;
    }

    async onInit() {
        console.log('TrajectoryActionManager initialized');
    }

    async onSceneLoaded({ mjModel, mjData, assetMeta }) {
        this.mjModel = mjModel;
        this.mjData = mjData;
        this.assetMeta = assetMeta ?? null;
        this.numActuators = typeof this.mjModel?.nu === 'number' ? this.mjModel.nu : 0;
        this.commandBuffer = new Float32Array(this.numActuators);
        this.zeroAction = new Float32Array(this.numActuators);
        this.buildJointMappings();
        this.updateTrajectoryRemap();
        this.stop();
        this.reset();
    }

    async onPolicyCleared() {
        this.stop();
    }

    buildJointMappings() {
        this.ctrlAdr = [];
        this.qposAdr = [];
        this.qvelAdr = [];
        this.jointNames = [];
        if (!this.mjModel) {
            return;
        }

        const mujoco = this.runtime?.mujoco;
        const jointNames = this.assetMeta?.joint_names_isaac;

        if (Array.isArray(jointNames) && jointNames.length > 0 && mujoco) {
            for (const jointName of jointNames) {
                const jointId = mujoco.mj_name2id(
                    this.mjModel,
                    mujoco.mjtObj.mjOBJ_JOINT,
                    jointName
                );
                if (jointId < 0) {
                    console.warn(`Joint ${jointName} not found in model`);
                    continue;
                }
                const actuatorIndex = this.findActuatorIndexForJoint(jointId);
                if (actuatorIndex < 0) {
                    console.warn(`No actuator mapped to joint ${jointName}`);
                    continue;
                }
                this.ctrlAdr.push(actuatorIndex);
                this.qposAdr.push(this.mjModel.jnt_qposadr[jointId]);
                this.qvelAdr.push(this.mjModel.jnt_dofadr[jointId]);
                this.jointNames.push(jointName);
            }
        } else {
            // Fallback: assume actuators align with joints defined in actuator_trnid
            for (let actuatorIndex = 0; actuatorIndex < this.numActuators; actuatorIndex++) {
                const jointId = this.mjModel.actuator_trnid[2 * actuatorIndex];
                if (typeof jointId !== 'number' || jointId < 0) {
                    continue;
                }
                this.ctrlAdr.push(actuatorIndex);
                this.qposAdr.push(this.mjModel.jnt_qposadr[jointId]);
                this.qvelAdr.push(this.mjModel.jnt_dofadr[jointId]);
                const jointName = this.getJointNameFromId(jointId) ?? `joint_${actuatorIndex}`;
                this.jointNames.push(jointName);
            }
        }
    }

    findActuatorIndexForJoint(jointId) {
        if (!this.mjModel) {
            return -1;
        }
        for (let i = 0; i < this.mjModel.nu; i++) {
            const mappedJointId = this.mjModel.actuator_trnid[2 * i];
            if (mappedJointId === jointId) {
                return i;
            }
        }
        return -1;
    }

    getJointNameFromId(jointId) {
        if (!this.mjModel || typeof jointId !== 'number' || jointId < 0) {
            return null;
        }
        if (!this.textDecoder) {
            this.textDecoder = new TextDecoder();
        }
        const namesArray = new Uint8Array(this.mjModel.names);
        const startIdx = this.mjModel.name_jntadr[jointId];
        if (typeof startIdx !== 'number') {
            return null;
        }
        let endIdx = startIdx;
        while (endIdx < namesArray.length && namesArray[endIdx] !== 0) {
            endIdx++;
        }
        return this.textDecoder.decode(namesArray.subarray(startIdx, endIdx));
    }

    updateTrajectoryRemap() {
        if (!Array.isArray(this.trajectoryJointNames) || this.trajectoryJointNames.length === 0 || !this.jointNames.length) {
            this.jointRemap = null;
            return;
        }
        const indexLookup = new Map();
        this.trajectoryJointNames.forEach((name, index) => {
            if (typeof name === 'string') {
                indexLookup.set(name, index);
            }
        });
        this.jointRemap = this.jointNames.map(name => indexLookup.has(name) ? indexLookup.get(name) : -1);
    }

    loadTrajectory(trajectoryData) {
        if (!trajectoryData || !Array.isArray(trajectoryData.frames)) {
            console.warn('Invalid trajectory data');
            this.trajectory = null;
            return;
        }
        this.trajectory = {
            name: trajectoryData.name ?? 'unnamed',
            dt: typeof trajectoryData.dt === 'number' && trajectoryData.dt > 0 ? trajectoryData.dt : 0.02,
            frames: trajectoryData.frames,
        };
        this.trajectoryJointNames = Array.isArray(trajectoryData.joint_names) ? trajectoryData.joint_names : null;
        this.updateTrajectoryRemap();
        this.currentFrame = 0;
        this.isPlaying = false;
        this.startTime = null;
        console.log(`Loaded trajectory: ${this.trajectory.name}, ${this.trajectory.frames.length} frames`);
    }

    play() {
        if (!this.trajectory) {
            console.warn('No trajectory loaded');
            return;
        }
        this.isPlaying = true;
        this.startTime = nowSeconds();
        this.currentFrame = 0;
        console.log('Trajectory playback started');
    }

    stop() {
        if (this.isPlaying) {
            console.log('Trajectory playback stopped');
        }
        this.isPlaying = false;
        this.startTime = null;
    }

    reset() {
        this.currentFrame = 0;
        this.startTime = this.isPlaying ? nowSeconds() : null;
    }

    getCurrentTargetState() {
        if (!this.trajectory || !this.isPlaying) {
            return null;
        }
        const elapsedTime = nowSeconds() - this.startTime;
        const frameIndex = Math.floor(elapsedTime / this.trajectory.dt);
        if (frameIndex >= this.trajectory.frames.length) {
            if (this.loop) {
                this.reset();
                return this.trajectory.frames[0];
            }
            this.stop();
            return this.trajectory.frames[this.trajectory.frames.length - 1];
        }
        this.currentFrame = frameIndex;
        return this.trajectory.frames[frameIndex];
    }

    computePDControl(targetQpos, targetQvel) {
        const action = this.commandBuffer;
        action.fill(0);
        if (!this.mjData || !Array.isArray(this.ctrlAdr) || this.ctrlAdr.length === 0) {
            return action;
        }
        for (let i = 0; i < this.ctrlAdr.length; i++) {
            const ctrlIndex = this.ctrlAdr[i];
            const qposIndex = this.qposAdr[i];
            const qvelIndex = this.qvelAdr[i];
            const sourceIndex = Array.isArray(this.jointRemap) ? this.jointRemap[i] : i;
            if (typeof sourceIndex !== 'number' || sourceIndex < 0) {
                continue;
            }
            const targetPos = this.getTargetValue(targetQpos, sourceIndex);
            const targetVel = this.getTargetValue(targetQvel, sourceIndex) ?? 0;
            if (typeof targetPos !== 'number' || typeof qposIndex !== 'number' || typeof qvelIndex !== 'number') {
                continue;
            }
            const currentPos = this.mjData.qpos[qposIndex];
            const currentVel = this.mjData.qvel[qvelIndex];
            const posError = targetPos - currentPos;
            const velError = targetVel - currentVel;
            action[ctrlIndex] = this.pdGains.kp * posError + this.pdGains.kd * velError;
        }
        return action;
    }

    async generateAction(_observations) {
        if (!this.mjModel || !this.mjData) {
            return this.zeroAction;
        }
        const targetState = this.getCurrentTargetState();
        if (!targetState) {
            return this.zeroAction;
        }
        const qposContainer = targetState.qpos;
        const validArray = Array.isArray(qposContainer) || ArrayBuffer.isView(qposContainer);
        const validObject = typeof qposContainer === 'object' && qposContainer !== null;
        if (!validArray && !validObject) {
            console.warn('Trajectory frame missing qpos');
            return this.zeroAction;
        }
        const action = this.computePDControl(targetState.qpos, targetState.qvel);
        return action;
    }

    getTargetValue(container, index) {
        if (container == null || typeof index !== 'number' || index < 0) {
            return undefined;
        }
        if (Array.isArray(container) || ArrayBuffer.isView(container)) {
            return container[index];
        }
        if (typeof container === 'object') {
            const key = this.trajectoryJointNames?.[index] ?? this.jointNames[index];
            if (key && Object.prototype.hasOwnProperty.call(container, key)) {
                return container[key];
            }
        }
        return undefined;
    }

    setPDGains(kp, kd) {
        if (typeof kp === 'number') {
            this.pdGains.kp = kp;
        }
        if (typeof kd === 'number') {
            this.pdGains.kd = kd;
        }
    }

    setLoop(enabled) {
        this.loop = Boolean(enabled);
    }

    dispose() {
        this.stop();
        this.reset();
        this.trajectory = null;
        this.runtime = null;
        this.mjModel = null;
        this.mjData = null;
        this.assetMeta = null;
        this.ctrlAdr = [];
        this.qposAdr = [];
        this.qvelAdr = [];
        this.jointNames = [];
        this.trajectoryJointNames = null;
        this.jointRemap = null;
        this.textDecoder = null;
        this.commandBuffer = new Float32Array(0);
        this.zeroAction = new Float32Array(0);
    }
}
