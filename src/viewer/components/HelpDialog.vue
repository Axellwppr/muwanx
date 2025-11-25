<template>
  <div v-if="showButton" class="help-button-container">
    <v-btn icon size="small" variant="text" class="help-btn" title="Help Button (?)" @click="model = true">
      <v-icon color="white">mdi-help</v-icon>
    </v-btn>
  </div>

  <v-dialog v-model="model" :max-width="isMobile ? '90vw' : '500px'" scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Help</span>
        <v-btn icon size="small" @click="model = false"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="help-content">
        <div class="help-title">Keyboard Shortcuts</div>
        <div class="shortcut-section">
          <div class="shortcut-item">
            <div class="shortcut-key"><kbd @click="emit('toggleHelp')" class="clickable-key">?</kbd></div>
            <div class="shortcut-description">Toggle this help dialog</div>
          </div>
          <div class="shortcut-item">
            <div class="shortcut-key"><kbd @click="emit('toggleUI')" class="clickable-key">i</kbd></div>
            <div class="shortcut-description">Toggle control panel</div>
          </div>
          <div class="shortcut-item">
            <div class="shortcut-key"><kbd @click="emit('toggleVRButton')" class="clickable-key">v</kbd></div>
            <div class="shortcut-description">Toggle VR button (experimental)</div>
          </div>
          <div class="shortcut-item">
            <div class="shortcut-key"><kbd @click="emit('reset')" class="clickable-key">backspace</kbd></div>
            <div class="shortcut-description">Reset simulation</div>
          </div>
          <div class="shortcut-item">
            <div class="shortcut-key">
              <kbd @click="emit('navigateScene', 1)" class="clickable-key">s</kbd> / <kbd
                @click="emit('navigateScene', -1)" class="clickable-key">S</kbd>
            </div>
            <div class="shortcut-description">Next / Previous scene</div>
          </div>
          <div class="shortcut-item">
            <div class="shortcut-key">
              <kbd @click="emit('navigatePolicy', 1)" class="clickable-key">p</kbd> / <kbd
                @click="emit('navigatePolicy', -1)" class="clickable-key">P</kbd>
            </div>
            <div class="shortcut-description">Next / Previous policy</div>
          </div>
        </div>

        <v-divider class="my-4"></v-divider>

        <div class="help-title">Drag Force Scale</div>
        <div class="settings-section">
          <div class="setting-item">
            <div class="setting-control">
              <v-slider
                :model-value="logDragForceScale"
                @update:model-value="handleDragForceScaleUpdate"
                :min="0"
                :max="10"
                :step="0.1"
                hide-details
                density="compact"
                thumb-label
              >
                <template #thumb-label="{ modelValue }">
                  {{ Math.pow(2, modelValue).toFixed(1) }}
                </template>
              </v-slider>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  isMobile: { type: Boolean, default: false },
  showButton: { type: Boolean, default: false },
  dragForceScale: { type: Number, default: 25 },
})
const emit = defineEmits(['update:modelValue', 'update:dragForceScale', 'toggleHelp', 'toggleUI', 'toggleVRButton', 'reset', 'navigateScene', 'navigatePolicy'])
const model = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })

// Convert drag force scale to log2 scale (0-10 representing 2^0=1 to 2^10=1024)
const logDragForceScale = computed(() => Math.log2(props.dragForceScale))

// Convert from log scale back to linear scale
const handleDragForceScaleUpdate = (logValue) => {
  const linearValue = Math.pow(2, logValue)
  emit('update:dragForceScale', linearValue)
}
</script>

<style scoped>
.help-content {
  padding: 16px !important;
}

.help-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--ui-text);
}

.shortcut-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shortcut-key {
  min-width: 120px;
}

.shortcut-key kbd {
  display: inline-block;
  padding: 6px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text);
  background: #f6f7f8;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
}

.shortcut-key kbd.clickable-key {
  cursor: pointer;
  user-select: none;
}

.shortcut-description {
  flex: 1;
  font-size: 14px;
  color: var(--ui-muted);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--ui-text);
}

.setting-control {
  width: 100%;
  padding: 0 20px;
  margin: 0 auto;
}
</style>

<style>
.help-button-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1001;
  transition: bottom 0.2s ease;
}

.help-btn {
  background: transparent !important;
  transition: opacity 0.2s ease;
  opacity: 0.7;
}

.help-btn:hover {
  opacity: 1;
}

body.interactive-mode .help-button-container {
  display: block !important;
}
</style>
