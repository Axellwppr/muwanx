import { BaseManager } from './BaseManager';

interface GoCommandManagerOptions {
  setpointServiceName?: string;
  minImpedance?: number;
  maxImpedance?: number;
  defaultImpedance?: number;
}

export class GoCommandManager extends BaseManager {
  options: GoCommandManagerOptions;
  setpointServiceName: string;

  constructor(options: GoCommandManagerOptions = {}) {
    super();
    this.options = options;
    this.setpointServiceName = options.setpointServiceName || 'setpoint-control';
  }

  get setpointService() {
    return this.runtime?.getService(this.setpointServiceName);
  }

  setPaused(paused) {
    this.runtime.params.paused = paused;
  }

  setCommandVelocityX(value) {
    this.runtime.params.command_vel_x = value;
  }

  setImpedanceKp(value) {
    const minKp = this.options.minImpedance ?? 12;
    const maxKp = this.options.maxImpedance ?? 24;
    const clamped = Math.min(Math.max(value, minKp), maxKp);
    this.runtime.params.impedance_kp = clamped;
    if (this.setpointService && typeof this.setpointService.onImpedanceChange === 'function') {
      this.setpointService.onImpedanceChange(clamped);
    }
  }

  setUseSetpoint(flag) {
    this.runtime.params.use_setpoint = flag;
    if (flag) {
      this.runtime.params.command_vel_x = 0.0;
      if (this.setpointService && typeof this.setpointService.onSetpointEnabled === 'function') {
        this.setpointService.onSetpointEnabled();
      }
    } else if (this.setpointService && typeof this.setpointService.onSetpointDisabled === 'function') {
      this.setpointService.onSetpointDisabled();
    }
  }

  setCompliantMode(flag) {
    this.runtime.params.compliant_mode = flag;
    if (flag) {
      this.runtime.params.impedance_kp = 0;
      this.runtime.params.command_vel_x = 0.0;
    } else {
      this.runtime.params.impedance_kp = this.options.defaultImpedance ?? 24;
    }
    if (this.setpointService && typeof this.setpointService.onCompliantModeChange === 'function') {
      this.setpointService.onCompliantModeChange(flag, this.runtime.params.impedance_kp);
    }
  }

  triggerImpulse(duration = 0.1) {
    this.runtime.params.impulse_remain_time = duration;
    if (this.setpointService && typeof this.setpointService.onImpulseTriggered === 'function') {
      this.setpointService.onImpulseTriggered(duration);
    }
  }

  reset() {
    if (this.setpointService && typeof this.setpointService.reset === 'function') {
      this.setpointService.reset();
    }
  }
}
