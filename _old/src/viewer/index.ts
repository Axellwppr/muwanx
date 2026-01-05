/**
 * Viewer module - Main exports for muwanx viewer
 */

// High-level API classes
export { MwxViewer, Project, Scene, Policy } from './MwxViewer';
export type {
  ViewerEvents,
  ViewerEventName,
  ViewerEventCallback,
} from './MwxViewer';

// Main viewer component
export { default as MwxViewerComponent } from './components/MwxViewer.vue';

// UI Components
export { default as ControlPanel } from './components/ControlPanel.vue';
export { default as StatusDialogs } from './components/StatusDialogs.vue';
export { default as StatusOverlay } from './components/StatusOverlay.vue';
export { default as HelpDialog } from './components/HelpDialog.vue';
export { default as Notice } from './components/Notice.vue';
export { default as CommandControls } from './components/CommandControls.vue';
export { default as ForceControls } from './components/ForceControls.vue';
export { default as PolicySelector } from './components/PolicySelector.vue';
export { default as ProjectSelector } from './components/ProjectSelector.vue';
export { default as SceneSelector } from './components/SceneSelector.vue';
export { default as StiffnessControls } from './components/StiffnessControls.vue';

// Composables
export { useConfig } from './composables/useConfig';
export { useResponsive } from './composables/useResponsive';
export { useRuntime } from './composables/useRuntime';
export { useScenePolicy } from './composables/useScenePolicy';
export { useTransition } from './composables/useTransition';
export { useUrlSync } from './composables/useUrlSync';
export type { RouteItem, ProjectItem } from './composables/useUrlSync';

// Utilities
export * from './utils';
