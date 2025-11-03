import { ref, markRaw } from 'vue';
import loadMujoco from 'mujoco-js';
import { MujocoRuntime } from '@/mujoco/runtime/MujocoRuntime.js';
import { GoCommandManager } from '@/mujoco/runtime/managers/commands/GoCommandManager.js';
import { IsaacActionManager } from '@/mujoco/runtime/managers/actions/IsaacActionManager.js';
import { PassiveActionManager } from '@/mujoco/runtime/managers/actions/PassiveActionManager.js';
import { TrajectoryActionManager } from '@/mujoco/runtime/managers/actions/TrajectoryActionManager.js';
import { ConfigObservationManager } from '@/mujoco/runtime/managers/observations/ConfigObservationManager.js';
import { LocomotionEnvManager } from '@/mujoco/runtime/managers/environment/LocomotionEnvManager.js';
import type { PolicyConfigItem, TaskConfigItem } from '@/views/demo/types/config';
import { MUJOCO_CONTAINER_ID } from '@/views/demo/constants';

export function useRuntime() {
  const runtime = ref<MujocoRuntime | null>(null);
  const commandManager = ref<any>(null);
  const actionManager = ref<any>(null);
  const trajectoryManager = ref<TrajectoryActionManager | null>(null);
  const observationManager = ref<any>(null);
  const envManager = ref<any>(null);

  const facet_kp = ref<number>(24);
  const command_vel_x = ref<number>(0.0);
  const use_setpoint = ref<boolean>(true);
  const compliant_mode = ref<boolean>(false);

  const state = ref<number>(0);
  const extra_error_message = ref<string>('');

  const trajectoryPlaybackState = ref<'play' | 'stop' | 'reset'>('stop');
  const trajectoryLoop = ref<boolean>(false);

  function resolveSceneConfig(task: TaskConfigItem | null, policy: PolicyConfigItem | null) {
    if (!task) return { scenePath: null as string | null, metaPath: null as string | null };
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
    const needsTrajectory = policyConfig?.type === 'trajectory';
    const current = actionManager.value;

    if (needsTrajectory) {
      const trajectoryPath = policyConfig?.trajectory_path ?? null;
      if (current instanceof TrajectoryActionManager) {
        await loadTrajectoryData(current, trajectoryPath);
        trajectoryManager.value = current;
        current.setLoop(trajectoryLoop.value);
        trajectoryPlaybackState.value = 'stop';
        return;
      }
      const nextManager = markRaw(new TrajectoryActionManager());
      if (runtime.value) {
        if (runtime.value.actionManager && typeof runtime.value.actionManager.dispose === 'function') {
          runtime.value.actionManager.dispose();
        }
        runtime.value.actionManager = nextManager;
        nextManager.attachRuntime(runtime.value);
        if (typeof (nextManager as any).onInit === 'function') {
          await (nextManager as any).onInit();
        }
      }
      await loadTrajectoryData(nextManager, trajectoryPath);
      nextManager.setLoop(trajectoryLoop.value);
      actionManager.value = nextManager;
      trajectoryManager.value = nextManager;
      trajectoryPlaybackState.value = 'stop';
      return;
    }

    trajectoryManager.value = null;
    trajectoryPlaybackState.value = 'stop';
    trajectoryLoop.value = false;

    if (needsIsaac && current instanceof IsaacActionManager) return;
    if (!needsIsaac && current instanceof PassiveActionManager) return;

    const next = markRaw(needsIsaac ? new IsaacActionManager() : new PassiveActionManager());
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

  async function loadTrajectoryData(manager: TrajectoryActionManager, trajectoryPath: string | null | undefined) {
    if (!manager || !trajectoryPath) return;
    try {
      const response = await fetch(trajectoryPath);
      if (!response.ok) {
        console.warn(`Failed to load trajectory from ${trajectoryPath}: ${response.status}`);
        return;
      }
      const trajectoryData = await response.json();
      manager.loadTrajectory(trajectoryData);
    } catch (e) {
      console.error('Error loading trajectory data:', e);
    }
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
      commandManager.value = markRaw(new GoCommandManager());
      observationManager.value = markRaw(new ConfigObservationManager());
      envManager.value = markRaw(new LocomotionEnvManager());

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

  function triggerImpulse() {
    if (!commandManager.value) return;
    commandManager.value.triggerImpulse();
  }

  function playTrajectory() {
    if (!trajectoryManager.value) return;
    trajectoryManager.value.play();
    trajectoryPlaybackState.value = 'play';
  }

  function stopTrajectory() {
    if (!trajectoryManager.value) return;
    trajectoryManager.value.stop();
    trajectoryPlaybackState.value = 'stop';
    (runtime.value as any)?.applyAction?.();
  }

  function resetTrajectory() {
    if (!trajectoryManager.value) return;
    const wasPlaying = trajectoryManager.value.isPlaying;
    trajectoryManager.value.reset();
    trajectoryPlaybackState.value = wasPlaying ? 'play' : 'reset';
  }

  function updateTrajectoryLoop(value: boolean) {
    trajectoryLoop.value = value;
    trajectoryManager.value?.setLoop(value);
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
    trajectoryManager,
    observationManager,
    envManager,

    // params/state
    facet_kp,
    command_vel_x,
    use_setpoint,
    compliant_mode,
    state,
    extra_error_message,
    trajectoryPlaybackState,
    trajectoryLoop,

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
    triggerImpulse,
    playTrajectory,
    stopTrajectory,
    resetTrajectory,
    updateTrajectoryLoop,
    dispose,
  };
}

