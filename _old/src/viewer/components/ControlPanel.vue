<template>
  <div class="control-panel">
    <v-btn v-if="isMobile" class="panel-toggle" @click="$emit('toggle')" icon size="small" color="primary"
      elevation="2">
      <v-icon>{{ collapsed ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </v-btn>

    <v-card v-show="!(isMobile && collapsed)" class="control-card" :elevation="isMobile ? 0 : 2">
      <ProjectSelector :project-name="projectName" :project-link="projectLink" :route-items="routeItems"
        :current-route-name="currentRouteName" @navigate="(r) => $emit('navigateRoute', r)" />

      <v-card-text :class="{ 'mobile-padding': isMobile }">
        <SceneSelector :items="taskItems" :selected-id="taskId" @select="(id) => $emit('selectTask', id)" />
      </v-card-text>

      <v-card-text v-if="policyItems && policyItems.length" :class="{ 'mobile-padding': isMobile }">
        <PolicySelector :items="policyItems" :selected-id="policyId" @select="(id) => $emit('selectPolicy', id)" />
      </v-card-text>

      <template v-if="policyId">
        <CommandControls :selected-policy="selectedPolicy" :use-setpoint="useSetpoint" :command-vel-x="commandVelX"
          :compliant-mode="compliantMode" :is-mobile="isMobile"
          @update:useSetpoint="(v) => $emit('update:useSetpoint', v)"
          @update:commandVelX="(v) => $emit('update:commandVelX', v)" />

        <v-divider v-if="selectedPolicy?.ui_controls && selectedPolicy.ui_controls.includes('stiffness')" />
        <StiffnessControls :selected-policy="selectedPolicy" :facet-kp="facetKp" :compliant-mode="compliantMode"
          :is-mobile="isMobile" @update:facetKp="(v) => $emit('update:facetKp', v)"
          @update:compliantMode="(v) => $emit('update:compliantMode', v)" />
      </template>

      <v-divider></v-divider>
      <ForceControls :show="selectedTask?.name === 'Go2'" :is-mobile="isMobile" @impulse="$emit('impulse')" />

      <v-btn @click="$emit('reset')" block text :size="isMobile ? 'default' : 'small'"
        class="reset-button">Reset</v-btn>
    </v-card>
  </div>
</template>

<script setup>
import ProjectSelector from './ProjectSelector.vue'
import SceneSelector from './SceneSelector.vue'
import PolicySelector from './PolicySelector.vue'
import CommandControls from './CommandControls.vue'
import StiffnessControls from './StiffnessControls.vue'
import ForceControls from './ForceControls.vue'

defineProps({
  projectName: String,
  projectLink: String,
  routeItems: { type: Array, default: () => [] },
  currentRouteName: [String, Number, Symbol],
  isMobile: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
  taskItems: { type: Array, default: () => [] },
  taskId: { type: [String, Number], default: null },
  policyItems: { type: Array, default: () => [] },
  policyId: { type: [String, Number], default: null },
  selectedTask: { type: Object, default: null },
  selectedPolicy: { type: Object, default: null },
  useSetpoint: { type: Boolean, default: true },
  commandVelX: { type: Number, default: 0 },
  compliantMode: { type: Boolean, default: false },
  facetKp: { type: Number, default: 24 },
})

defineEmits([
  'toggle',
  'navigateRoute',
  'selectTask',
  'selectPolicy',
  'update:useSetpoint',
  'update:commandVelX',
  'update:facetKp',
  'update:compliantMode',
  'impulse',
  'reset',
])
</script>

<style scoped>
.control-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 260px;
  z-index: 1000;
}

.control-card {
  background: var(--ui-surface);
  backdrop-filter: saturate(120%) blur(6px);
  border: 1px solid var(--ui-border);
  box-shadow: var(--ui-shadow);
  border-radius: 8px !important;
  font-size: 0.8rem;
}

.reset-button {
  border: 1px solid var(--ui-border);
}

.mobile-padding {
  padding: 6px 10px !important;
}

:deep(.control-row) {
  display: grid;
  grid-template-columns: var(--cp-label-width, 96px) 1fr;
  align-items: center;
  column-gap: 12px;
  row-gap: 6px;
  width: 100%;
}

:deep(.control-label) {
  font-size: 0.85rem;
  color: var(--ui-text);
  opacity: 0.85;
  user-select: none;
}

:deep(.control-unit) {
  min-width: 0;
}

.inline-checkbox {
  margin: 0 !important;
  padding: 0 !important;
}

.slider-value {
  min-width: 32px;
  font-size: 0.72rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--ui-muted);
}

.dropdown-list {
  border: 1px solid var(--ui-border);
  border-radius: 6px;
}

.control-card :deep(.v-card-text) {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  margin-top: 2px !important;
  margin-bottom: 2px !important;
}

.control-card :deep(.mobile-slider) {
  margin-inline-start: 1px !important;
  margin-inline-end: 0 !important;
  gap: 0 !important;
}

.control-card :deep(.slider-value) {
  font-size: 0.7rem !important;
}

@media (max-width: 768px) {
  .control-panel {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    padding: 6px 10px 10px;
  }

  .panel-toggle {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(100% + 8px);
    background: primary !important;
    border: 1px solid var(--ui-border) !important;
    box-shadow: var(--ui-shadow) !important;
  }
}
</style>

<style>
:root {
  --ui-surface: rgba(255, 255, 255, 0.8);
}

body.interactive-mode .control-panel {
  display: none !important;
}
</style>
