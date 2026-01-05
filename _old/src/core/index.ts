/**
 * Core module - Main exports for muwanx core functionality
 * Separates concerns: engine, observation, action, scene, agent
 */

// Engine exports (MuJoCo physics simulation)
export * from './engine';

// Observation exports (sensor data management)
export * from './observation';

// Action exports (motor commands)
export * from './action';

// Scene exports (Three.js visualization)
export * from './scene';

// Agent exports (ONNX/RL inference)
export * from './agent';

// Utilities
export * from './utils';
