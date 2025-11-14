<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-title>Muwanx Demo</v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Project selector -->
      <v-select
        v-model="selectedProject"
        :items="projects"
        item-title="name"
        item-value="id"
        density="compact"
        variant="outlined"
        hide-details
        class="project-selector"
        @update:model-value="switchProject"
      ></v-select>

      <v-btn
        icon="mdi-github"
        href="https://github.com/ttktjmt/muwanx"
        target="_blank"
        class="ml-2"
      ></v-btn>
    </v-app-bar>

    <v-main>
      <MwxViewer v-if="configPath" :configPath="configPath" :key="configPath" />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MwxViewer from '@/viewer/MwxViewer.vue'

// Define available projects
const projects = [
  { id: 'default', name: 'Muwanx Demo', config: './assets/config.json' },
  { id: 'menagerie', name: 'MuJoCo Menagerie', config: './assets/config_mujoco_menagerie.json' },
  { id: 'playground', name: 'MuJoCo Playground', config: './assets/config_mujoco_playground.json' },
  { id: 'myosuite', name: 'MyoSuite', config: './assets/config_myosuite.json' },
]

// Get initial project from hash or default to first project
const getInitialProject = () => {
  const hash = window.location.hash.slice(1) // Remove #
  const project = projects.find(p => p.id === hash)
  return project ? project.id : projects[0].id
}

const selectedProject = ref(getInitialProject())
const configPath = ref(projects.find(p => p.id === selectedProject.value)?.config)

// Switch project and update URL hash
const switchProject = (projectId: string) => {
  const project = projects.find(p => p.id === projectId)
  if (project) {
    configPath.value = project.config
    window.location.hash = projectId
    // Reload to reinitialize MuJoCo runtime
    window.location.reload()
  }
}

// Listen for hash changes (back/forward navigation)
window.addEventListener('hashchange', () => {
  const newProjectId = getInitialProject()
  if (newProjectId !== selectedProject.value) {
    selectedProject.value = newProjectId
    window.location.reload()
  }
})
</script>

<style scoped>
.project-selector {
  max-width: 250px;
}

:deep(.v-field) {
  background-color: rgba(255, 255, 255, 0.1);
}

:deep(.v-field__input) {
  color: white;
}

:deep(.v-icon) {
  color: white;
}
</style>

<style>
html,
body {
  height: 100%;
  overflow: hidden;
}

body,
.v-application {
  font-family: 'Google Sans', 'Noto Sans SC', Arial, sans-serif !important;
}

:root {
  --ui-surface: rgba(255, 255, 255, 0.9);
  --ui-border: rgba(0, 0, 0, 0.08);
  --ui-text: #111827;
  --ui-muted: #6b7280;
  --ui-radius: 8px;
  --ui-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

body {
  color: var(--ui-text);
}

.v-card {
  border-radius: var(--ui-radius) !important;
}
</style>
