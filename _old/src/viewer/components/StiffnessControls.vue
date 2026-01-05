<template>
  <v-card-text v-if="showStiffness" :class="{ 'mobile-padding': isMobile }">
    <div class="control-row">
      <div class="control-label">Compliant</div>
      <div class="control-unit">
        <v-checkbox v-model="localCompliantMode" density="compact" hide-details
          class="mobile-checkbox inline-checkbox" />
      </div>
    </div>
    <div class="control-row">
      <div class="control-label">Stiffness Kp</div>
      <div class="control-unit">
        <v-slider :disabled="localCompliantMode" v-model="localFacetKp" :min="0" :max="24" :step="1"
          :thumb-size="isMobile ? 18 : 14" :track-size="isMobile ? 5 : 3" hide-details class="mobile-slider">
          <template #append>
            <div class="slider-value">{{ localFacetKp }}</div>
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
  facetKp: { type: Number, default: 24 },
  compliantMode: { type: Boolean, default: false },
  isMobile: { type: Boolean, default: false },
})
const emit = defineEmits(['update:facetKp', 'update:compliantMode'])

const showStiffness = computed(() => Array.isArray(props.selectedPolicy?.ui_controls) && props.selectedPolicy.ui_controls.includes('stiffness'))
const localFacetKp = computed({ get: () => props.facetKp, set: (v) => emit('update:facetKp', v) })
const localCompliantMode = computed({ get: () => props.compliantMode, set: (v) => emit('update:compliantMode', v) })
</script>
