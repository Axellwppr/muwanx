import { ref, markRaw, type Ref } from 'vue';
import loadMujoco from 'mujoco-js';
import { MujocoRuntime } from '@/core/engine/MujocoRuntime';
import { GoCommandManager as CommandManager } from '@/core/engine/managers/CommandManager';
import { IsaacActionManager as ActionManager } from '@/core/action/IsaacActionManager';
import { PassiveActionManager } from '@/core/action/PassiveActionManager';
import { ConfigObservationManager as ObservationManager } from '@/core/observation/ObservationManager';
import { LocomotionEnvManager as EnvManager } from '@/core/engine/managers/EnvManager';
import type { PolicyConfigItem, TaskConfigItem } from '@/types/config';
import { MUJOCO_CONTAINER_ID } from '@/viewer/utils/constants';

export interface UseRuntimeReturn {
  runtime: Ref<any>;
  commandManager: Ref<any>;
  actionManager: Ref<any>;
  observationManager: Ref<any>;
  envManager: Ref<any>;
  facet_kp: Ref<number>;
  command_vel_x: Ref<number>;
  use_setpoint: Ref<boolean>;
  compliant_mode: Ref<boolean>;
  drag_force_scale: Ref<number>;
  state: Ref<number>;
  extra_error_message: Ref<string>;
  initRuntime: (initialTask: TaskConfigItem, initialPolicy: PolicyConfigItem | null) => Promise<void>;
  onTaskChange: (taskItem: TaskConfigItem, defaultPolicy: PolicyConfigItem | null, withTransition: (msg: string, act: () => Promise<any>) => Promise<any>) => Promise<void>;
  onPolicyChange: (taskItem: TaskConfigItem, policyItem: PolicyConfigItem, withTransition: (msg: string, act: () => Promise<any>) => Promise<any>) => Promise<void>;
  applyCommandState: () => void;
  reset: () => Promise<void>;
  updateFacetKp: () => void;
  updateUseSetpoint: () => void;
  updateCommandVelX: () => void;
  updateCompliantMode: () => void;
  updateDragForceScale: () => void;
  triggerImpulse: () => void;
  toggleVRButton: () => void;
  dispose: () => void;
}

export function useRuntime(): UseRuntimeReturn {
  const runtime = ref<MujocoRuntime | null>(null);
  const commandManager = ref<any>(null);
  const actionManager = ref<any>(null);
  const observationManager = ref<any>(null);
  const envManager = ref<any>(null);

  const facet_kp = ref<number>(24);
  const command_vel_x = ref<number>(0.0);
  const use_setpoint = ref<boolean>(true);
  const compliant_mode = ref<boolean>(false);
  const drag_force_scale = ref<number>(25);

  const state = ref<number>(0);
  const extra_error_message = ref<string>('');

  function resolveSceneConfig(task: TaskConfigItem | null, policy: PolicyConfigItem | null) {
    if (!task) return { scenePath: null as string | null, metaPath: null as string | null };
    // For legacy support, model_xml is treated as either path or content (auto-detected)
    const scenePath = policy?.model_xml ?? task.model_xml;
    const metaRaw = policy?.asset_meta ?? task.asset_meta ?? null;
    const metaPath = metaRaw === 'null' || metaRaw === '' ? null : metaRaw;
    return { scenePath, metaPath };
  }

  function hasAssetMeta(metaPath: string | null | undefined) {
    return Boolean(metaPath);
  }

  async function loadAssetMeta(metaPath: string | null) {
    if (!metaPath) return null;
    try {
      const resp = await fetch(metaPath);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      console.warn('Failed to load asset_meta for inspection:', e);
      return null;
    }
  }

  async function ensureActionManager(metaPath: string | null, policyConfig: PolicyConfigItem | null) {
    let needsIsaac = false;
    if (hasAssetMeta(metaPath)) {
      const meta = await loadAssetMeta(metaPath);
      if (meta && typeof meta === 'object') {
        const hasIsaacJoints = Array.isArray((meta as any).joint_names_isaac) && (meta as any).joint_names_isaac.length > 0;
        const hasActuators = (meta as any).actuators && typeof (meta as any).actuators === 'object' && Object.keys((meta as any).actuators).length > 0;
        const hasDefaultJpos = Array.isArray((meta as any).default_joint_pos) && (meta as any).default_joint_pos.length > 0;
        needsIsaac = hasIsaacJoints || hasActuators || hasDefaultJpos;
      }
    }
    const current = actionManager.value;

    if (needsIsaac && current instanceof ActionManager) return;
    if (!needsIsaac && current instanceof PassiveActionManager) return;

    const next = markRaw(needsIsaac ? new ActionManager() : new PassiveActionManager());
    if (runtime.value) {
      if (runtime.value.actionManager && typeof runtime.value.actionManager.dispose === 'function') {
        runtime.value.actionManager.dispose();
      }
      runtime.value.actionManager = next;
      next.attachRuntime(runtime.value);
      if (typeof (next as any).onInit === 'function') {
        await (next as any).onInit();
      }
    }
    actionManager.value = next;
  }

  function applyCommandState() {
    if (!commandManager.value || !runtime.value) return;
    commandManager.value.setUseSetpoint(use_setpoint.value);
    commandManager.value.setCompliantMode(compliant_mode.value);
    commandManager.value.setImpedanceKp(facet_kp.value);
    commandManager.value.setCommandVelocityX(command_vel_x.value);
    const params = (runtime.value as any)?.params as any;
    if (params) {
      facet_kp.value = params.impedance_kp;
      command_vel_x.value = params.command_vel_x;
    }
  }

  function updateFacetballService(selectedPolicy: PolicyConfigItem | null) {
    const rt = runtime.value as any;
    if (!rt) return;
    const setpointService = rt.getService?.('setpoint-control');
    if (!setpointService) return;
    const policyId = selectedPolicy?.id ?? null;
    setpointService.setActivePolicy?.(policyId);
    const showSetpoint = selectedPolicy?.show_setpoint ?? (policyId === 'facet');
    setpointService.setVisible?.(showSetpoint || use_setpoint.value);
    if (showSetpoint) {
      setpointService.reset?.();
    }
  }

  async function initRuntime(initialTask: TaskConfigItem, initialPolicy: PolicyConfigItem | null) {
    if (typeof WebAssembly !== 'object' || typeof (WebAssembly as any).instantiate !== 'function') {
      state.value = -2;
      return;
    }
    try {
      const mujoco = await loadMujoco();
      const { scenePath, metaPath } = resolveSceneConfig(initialTask, initialPolicy);
      await ensureActionManager(metaPath, initialPolicy);
      commandManager.value = markRaw(new CommandManager());
      observationManager.value = markRaw(new ObservationManager());
      envManager.value = markRaw(new EnvManager());

      runtime.value = markRaw(new MujocoRuntime(mujoco, {
        containerId: MUJOCO_CONTAINER_ID,
        commandManager: commandManager.value,
        actionManager: actionManager.value,
        observationManagers: [observationManager.value],
        envManagers: [envManager.value],
      }));
      await runtime.value.init({
        scenePath,
        metaPath,
        policyPath: initialPolicy?.path,
      });

      // Apply camera config from task if provided
      if (initialTask.camera) {
        runtime.value.applyCameraFromMetadata({
          camera: {
            pos: initialTask.camera.position,
            target: initialTask.camera.target,
            fov: initialTask.camera.fov,
          },
        });
      }

      updateFacetballService(initialPolicy);
      runtime.value.resume();
      applyCommandState();
      state.value = 1;
    } catch (error: any) {
      state.value = -1;
      extra_error_message.value = String(error);
      console.error(error);
    }
  }

  async function loadWithTask(taskItem: TaskConfigItem, policyItem: PolicyConfigItem | null) {
    if (!runtime.value) return;
    const { scenePath, metaPath } = resolveSceneConfig(taskItem, policyItem);
    await ensureActionManager(metaPath, policyItem);
    await runtime.value.loadEnvironment({
      scenePath,
      metaPath,
      policyPath: policyItem?.path ?? null,
    });

    // Apply camera config from task if provided
    if (taskItem.camera) {
      runtime.value.applyCameraFromMetadata({
        camera: {
          pos: taskItem.camera.position,
          target: taskItem.camera.target,
          fov: taskItem.camera.fov,
        },
      });
    }

    updateFacetballService(policyItem);
    runtime.value.resume();
    applyCommandState();
  }

  async function onTaskChange(taskItem: TaskConfigItem, defaultPolicy: PolicyConfigItem | null, withTransition: (msg: string, act: () => Promise<any>) => Promise<any>) {
    await withTransition('Switching scene...', async () => {
      await loadWithTask(taskItem, defaultPolicy);
    });
  }

  async function onPolicyChange(taskItem: TaskConfigItem, policyItem: PolicyConfigItem, withTransition: (msg: string, act: () => Promise<any>) => Promise<any>) {
    await withTransition('Switching policy...', async () => {
      await loadWithTask(taskItem, policyItem);
    });
  }

  async function reset() {
    if (!runtime.value) return;
    await runtime.value.reset();
    applyCommandState();
  }

  function updateFacetKp() {
    facet_kp.value = Math.max(facet_kp.value, 12);
    facet_kp.value = Math.min(facet_kp.value, 24);
    if (!commandManager.value) return;
    commandManager.value.setImpedanceKp(facet_kp.value);
    facet_kp.value = (runtime.value as any)?.params?.impedance_kp ?? facet_kp.value;
  }

  function updateUseSetpoint() {
    if (!commandManager.value) return;
    commandManager.value.setUseSetpoint(use_setpoint.value);
    if (use_setpoint.value) {
      command_vel_x.value = 0.0;
      commandManager.value.setCommandVelocityX(command_vel_x.value);
    }
  }

  function updateCommandVelX() {
    if (!commandManager.value) return;
    commandManager.value.setCommandVelocityX(command_vel_x.value);
  }

  function updateCompliantMode() {
    if (!commandManager.value) return;
    commandManager.value.setCompliantMode(compliant_mode.value);
    facet_kp.value = (runtime.value as any)?.params?.impedance_kp ?? facet_kp.value;
  }

  function updateDragForceScale() {
    if (!envManager.value) return;
    envManager.value.dragForceScale = drag_force_scale.value;
  }

  function triggerImpulse() {
    if (!commandManager.value) return;
    commandManager.value.triggerImpulse();
  }

  function toggleVRButton() {
    if (runtime.value) {
      runtime.value.toggleVRButton();
    }
  }

  function dispose() {
    try {
      runtime.value?.dispose();
    } catch (e) {
      console.warn('Error disposing runtime:', e);
    }
    runtime.value = null as any;
  }

  return {
    // runtime + managers
    runtime,
    commandManager,
    actionManager,
    observationManager,
    envManager,

    // params/state
    facet_kp,
    command_vel_x,
    use_setpoint,
    compliant_mode,
    drag_force_scale,
    state,
    extra_error_message,

    // api
    initRuntime,
    onTaskChange,
    onPolicyChange,
    applyCommandState,
    reset,
    updateFacetKp,
    updateUseSetpoint,
    updateCommandVelX,
    updateCompliantMode,
    updateDragForceScale,
    triggerImpulse,
    toggleVRButton,
    dispose,
  };
}

