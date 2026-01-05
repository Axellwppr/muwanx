/**
 * Observation Management - Sensor data and observation extraction
 */

// Modern atomic components (recommended for new projects)
import {
    BaseLinearVelocity,
    BaseAngularVelocity,
    ProjectedGravity,
    JointPositions,
    JointVelocities,
    PreviousActions,
    SimpleVelocityCommand,
} from './atomic';

// Command components
import {
    VelocityCommand,
    VelocityCommandWithOscillators,
    ImpedanceCommand,
    Oscillator,
} from './commands';

/**
 * All available observation components
 */
export const Observations = {
    // ===== ATOMIC COMPONENTS =====
    // Base state observations
    BaseLinearVelocity,
    BaseAngularVelocity,
    ProjectedGravity,

    // Joint observations
    JointPositions,
    JointVelocities,
    PreviousActions,

    // Commands
    SimpleVelocityCommand,
    VelocityCommand,
    VelocityCommandWithOscillators,
    ImpedanceCommand,
    Oscillator
};

// Export individual components
export * from './atomic';
export * from './commands';
export { ConfigObservationManager as ObservationManager } from './ObservationManager';
