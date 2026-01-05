<template>
  <v-card-text v-if="show" :class="{ 'mobile-padding': isMobile, 'pb-2': !isMobile }">
    <div class="control-row">
      <div class="control-label">Force</div>
      <div class="control-unit">
        <v-btn @click="emit('impulse')" color="primary" :size="isMobile ? 'default' : 'small'" class="impulse-button"
          block>
          Impulse
        </v-btn>
      </div>
    </div>
  </v-card-text>
</template>

<script setup>
const props = defineProps({ show: { type: Boolean, default: false }, isMobile: { type: Boolean, default: false } })
const emit = defineEmits(['impulse'])
</script>
