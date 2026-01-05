<template>
  <StatusOverlay :model-value="isTransitioning" :message="transitionMessage" />

  <div id="mujoco-container" class="mujoco-container" />

  <ControlPanel :project-name="projectName" :project-link="projectLink" :route-items="routeItems"
    :current-route-name="currentRouteName" :is-mobile="isMobile" :task-items="taskItems" :task-id="task"
    :policy-items="policyItems" :policy-id="policy" :selected-task="selectedTask" :selected-policy="selectedPolicy"
    :collapsed="isPanelCollapsed" :use-setpoint="use_setpoint" :command-vel-x="command_vel_x"
    :compliant-mode="compliant_mode" :facet-kp="facet_kp" @navigateRoute="goToRoute" @toggle="togglePanel"
    @selectTask="onSelectTask" @selectPolicy="onSelectPolicy" @update:useSetpoint="onUpdateUseSetpoint"
    @update:commandVelX="onUpdateCommandVelX" @update:facetKp="onUpdateFacetKp"
    @update:compliantMode="onUpdateCompliantMode" @impulse="triggerImpulse" @reset="reset" />

  <StatusDialogs :state="state" :extra-error-message="extra_error_message"
    :url-param-error-message="urlParamErrorMessage" :is-mobile="isMobile" :is-small-screen="isSmallScreen"
    @clearWarning="clearUrlWarning" />

  <Notice />

  <HelpDialog v-model="showHelpDialog" :is-mobile="isMobile" :show-button="!isMobile || isPanelCollapsed"
    :drag-force-scale="drag_force_scale"
    @update:dragForceScale="onUpdateDragForceScale"
    @toggleHelp="() => (showHelpDialog = !showHelpDialog)" @toggleUI="toggleUIVisibility"
    @toggleVRButton="toggleVRButton" @reset="reset" @navigateScene="navigateScene" @navigatePolicy="navigatePolicy" />
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, ref, computed } from 'vue'
import ControlPanel from './ControlPanel.vue'
import StatusDialogs from './StatusDialogs.vue'
import HelpDialog from './HelpDialog.vue'
import Notice from './Notice.vue'
import StatusOverlay from './StatusOverlay.vue'
import { useConfig } from '../composables/useConfig'
import { useRuntime } from '../composables/useRuntime'
import { useScenePolicy } from '../composables/useScenePolicy'
import { useUrlSync } from '../composables/useUrlSync'
import { useTransition } from '../composables/useTransition'
import { useResponsive } from '../composables/useResponsive'
import { createShortcuts } from '../utils/shortcuts'

const props = defineProps({
  configPath: { type: String, default: './assets/config.json' },
  config: { type: Object, default: null },
  projects: { type: Array, default: () => [] }
})

const transitionApi = useTransition()
const isTransitioning = transitionApi.isTransitioning
const transitionMessage = transitionApi.transitionMessage
const withTransition = transitionApi.withTransition
const { isMobile, isSmallScreen, isPanelCollapsed, togglePanel } = useResponsive()
const rt = useRuntime()
const {
  state,
  extra_error_message,
  use_setpoint,
  command_vel_x,
  compliant_mode,
  facet_kp,
  drag_force_scale,
  initRuntime,
  onTaskChange,
  onPolicyChange,
  updateFacetKp,
  updateUseSetpoint,
  updateCommandVelX,
  updateCompliantMode,
  updateDragForceScale,
  triggerImpulse,
  toggleVRButton,
  reset,
  dispose,
} = rt

// Use config object if provided (imperative), otherwise use configPath (declarative)
const conf = useConfig(props.config || props.configPath)
const { config: appConfig, task, policy, taskItems, policyItems, selectedTask, selectedPolicy, urlParamErrorMessage, resolveDefaultPolicy, loadConfig } = conf
const projectName = computed(() => appConfig.value?.project_name)
const projectLink = computed(() => appConfig.value?.project_link)

const { routeItems, goToRoute, sync } = useUrlSync({
  getSceneName: () => selectedTask.value?.name || null,
  getPolicyName: () => selectedPolicy.value?.name || null,
  projects: props.projects
})

// Detect current route from URL hash
const currentRouteName = computed(() => {
  const hash = window.location.hash.slice(1).split('?')[0] // Remove # and query params
  if (!hash || hash === '' || hash === '/') return 'default'
  return hash.replace('/', '') // Remove leading slash if present
})

const { selectTask, selectPolicy, navigateScene, navigatePolicy } = useScenePolicy({
  config: appConfig,
  task,
  policy,
  resolveDefaultPolicy,
  onTaskChange,
  onPolicyChange,
  withTransition,
})

const showHelpDialog = ref(false)
let shortcuts = null

function toggleUIVisibility() {
  document.body.classList.toggle('interactive-mode')
}

async function onSelectTask(id) { await selectTask(id) }
async function onSelectPolicy(id) { await selectPolicy(id) }

function onUpdateUseSetpoint(v) {
  use_setpoint.value = v
  updateUseSetpoint()
}

function onUpdateCommandVelX(v) {
  command_vel_x.value = v
  updateCommandVelX()
}

function onUpdateFacetKp(v) {
  facet_kp.value = v
  updateFacetKp()
}

function onUpdateCompliantMode(v) {
  compliant_mode.value = v
  updateCompliantMode()
}

function onUpdateDragForceScale(v) {
  drag_force_scale.value = v
  updateDragForceScale()
}

function clearUrlWarning() { urlParamErrorMessage.value = '' }

watch([selectedTask, selectedPolicy], () => sync())

onMounted(async () => {
  // Disable scrollbars on body and html
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.margin = '0'
  document.body.style.padding = '0'

  await loadConfig()
  if (selectedTask.value) {
    const initialTask = selectedTask.value
    const initialPolicy = selectedPolicy.value
    await initRuntime(initialTask, initialPolicy)
  }

  const urlParams = new URLSearchParams(window.location.hash.split('?')[1])
  if (urlParams.get('hidectrl') === '1') {
    document.body.classList.add('interactive-mode')
  } else if (urlParams.get('hidectrl') === '0') {
    document.body.classList.remove('interactive-mode')
  }

  shortcuts = createShortcuts({
    onReset: () => reset(),
    onToggleUI: () => toggleUIVisibility(),
    onToggleVRButton: () => toggleVRButton(),
    onNavigateScene: (d) => navigateScene(d),
    onNavigatePolicy: (d) => navigatePolicy(d),
    getHelpVisible: () => showHelpDialog.value,
    setHelpVisible: (v) => { showHelpDialog.value = v },
  })
})

onBeforeUnmount(() => {
  dispose()
  if (shortcuts && typeof shortcuts.detach === 'function') shortcuts.detach()

  // Restore scrollbars
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  document.body.style.margin = ''
  document.body.style.padding = ''

  document.body.classList.remove('interactive-mode')
})
</script>

<style scoped>
.mujoco-container {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  z-index: 1;
}
</style>
