// Modern atomic components (recommended for new projects)
import {
  BaseLinearVelocity,
  BaseAngularVelocity,
  ProjectedGravity,
  JointPositions,
  JointVelocities,
  PreviousActions,
  SimpleVelocityCommand,
} from './atomic.js';

// Command components
import {
  VelocityCommand,
  VelocityCommandWithOscillators,
  ImpedanceCommand,
  Oscillator,
} from './commands.js';

/**
 * All available observation components
 */
export const Observations = {
  // ===== ATOMIC COMPONENTS (Production) =====
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

// Default export for convenience
export default Observations;
