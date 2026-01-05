<template>
  <v-card-title class="control-card-title">
    <v-menu v-model="open" :close-on-content-click="true" transition="fade-transition" location="bottom start">
      <template #activator="{ props }">
        <div class="project-title-activator">
          <template v-if="projectName">
            <template v-if="projectLink">
              <a :href="projectLink" target="_blank" rel="noopener" class="project-title-link">{{ projectName }}</a>
            </template>
            <template v-else>
              <span class="project-title-text">{{ projectName }}</span>
            </template>
          </template>
          <template v-else>
            <span class="project-title-text">{{ currentRouteName || '—' }}</span>
          </template>
          <v-btn v-bind="props" icon size="small" variant="text" density="compact" class="project-title-caret-btn">
            <v-icon size="20" class="project-title-caret">mdi-chevron-down</v-icon>
          </v-btn>
        </div>
      </template>
      <v-list id="route-listbox" class="dropdown-list" density="compact"
        :style="{ minWidth: '192px', maxHeight: '280px', overflowY: 'auto' }">
        <v-list-item v-for="(r, i) in routeItems" :key="r.name || i"
          :class="{ selected: String(r.name) === String(currentRouteName) }" role="option"
          :aria-selected="String(String(r.name) === String(currentRouteName))" @click="onClickRoute(r)">
          <v-list-item-title>{{ r.title }}</v-list-item-title>
          <template #append>
            <v-icon v-if="String(r.name) === String(currentRouteName)" icon="mdi-check" size="small"
              color="primary"></v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-card-title>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  projectName: String,
  projectLink: String,
  routeItems: { type: Array, default: () => [] },
  currentRouteName: [String, Number, Symbol],
})

const emit = defineEmits(['navigate'])
const open = ref(false)

function onClickRoute(r) {
  emit('navigate', r)
  open.value = false
}
</script>

<style scoped>
.project-title-activator {
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
  gap: 6px;
}

.project-title-link,
.project-title-text {
  color: var(--ui-text);
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  flex: 1;
}

.project-title-caret {
  opacity: 0.8;
}

.project-title-caret-btn.v-btn {
  min-width: 0 !important;
  padding: 0 !important;
  margin: 0 0 0 6px !important;
  box-shadow: none !important;
}
</style>
