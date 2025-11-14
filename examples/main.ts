/**
 * main.ts
 *
 * Simple entry point for the demo app
 * Handles project selection via URL hash and renders MwxViewer
 */

import { createApp, h } from 'vue'
import { registerPlugins } from '@/viewer/plugins'
import MwxViewer from '@/viewer/MwxViewer.vue'
import 'unfonts.css'

// Define available projects
const projects = [
  { id: 'default', name: 'Muwanx Demo', config: './assets/config.json' },
  { id: 'menagerie', name: 'MuJoCo Menagerie', config: './assets/config_mujoco_menagerie.json' },
  { id: 'playground', name: 'MuJoCo Playground', config: './assets/config_mujoco_playground.json' },
  { id: 'myosuite', name: 'MyoSuite', config: './assets/config_myosuite.json' },
]

// Get config path from URL hash
function getConfigFromHash(): string {
  const hash = window.location.hash.slice(1).split('?')[0] // Remove # and query params
  const project = projects.find(p => p.id === hash || `/${p.id}` === hash)
  return project ? project.config : projects[0].config
}

// Create root component inline
const App = {
  setup() {
    const configPath = getConfigFromHash()

    return () => h('div', {
      style: {
        width: '100%',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }
    }, [
      h(MwxViewer, {
        configPath,
        key: configPath // Force re-mount on config change
      })
    ])
  }
}

// Create and mount app
const app = createApp(App)
registerPlugins(app)
app.mount('#app')

// Handle hash changes (back/forward navigation)
window.addEventListener('hashchange', () => {
  // Reload page to reinitialize MuJoCo runtime with new config
  window.location.reload()
})
