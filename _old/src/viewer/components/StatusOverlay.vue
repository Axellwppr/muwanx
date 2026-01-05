<template>
  <transition name="fade">
    <div v-if="modelValue" class="transition-overlay">
      <v-progress-circular indeterminate color="primary" :size="size" />
      <div class="transition-text">{{ message || 'Loading...' }}</div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps({
  modelValue: { type: Boolean, required: true },
  message: { type: String, default: '' },
  size: { type: [Number, String], default: 64 },
})
</script>

<style scoped>
.transition-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.transition-text {
  color: white;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
body.interactive-mode .transition-overlay {
  display: block !important;
}
</style>
