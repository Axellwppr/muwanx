<template>
  <v-card-text :class="{ 'mobile-padding': isMobile }">
    <div v-if="showSetpoint" class="control-row">
      <div class="control-label">Setpoint</div>
      <div class="control-unit">
        <v-checkbox :disabled="compliantMode" v-model="localUseSetpoint" density="compact" hide-details
          class="mobile-checkbox inline-checkbox" />
      </div>
    </div>
    <div class="control-row">
      <div class="control-label">Target Velocity</div>
      <div class="control-unit">
        <v-slider :disabled="localUseSetpoint && showSetpoint && compliantMode" v-model="localCommandVelX" :min="-0.5"
          :max="1.5" :step="0.1" :thumb-size="isMobile ? 18 : 14" :track-size="isMobile ? 5 : 3" hide-details
          class="mobile-slider">
          <template #append>
            <div class="slider-value">{{ localCommandVelX }}</div>
          </template>
        </v-slider>
      </div>
    </div>
  </v-card-text>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  selectedPolicy: { type: Object, default: null },
  useSetpoint: { type: Boolean, default: true },
  commandVelX: { type: Number, default: 0 },
  compliantMode: { type: Boolean, default: false },
  isMobile: { type: Boolean, default: false },
})
const emit = defineEmits(['update:useSetpoint', 'update:commandVelX'])

const showSetpoint = computed(() => Array.isArray(props.selectedPolicy?.ui_controls) && props.selectedPolicy.ui_controls.includes('setpoint'))
const localUseSetpoint = computed({ get: () => props.useSetpoint, set: (v) => emit('update:useSetpoint', v) })
const localCommandVelX = computed({ get: () => props.commandVelX, set: (v) => emit('update:commandVelX', v) })
</script>
