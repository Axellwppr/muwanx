/**
 * main.ts
 *
 * Simple entry point for the demo app using imperative API
 */

import { createApp } from 'vue'
import App from './App.vue'
import { registerPlugins } from '@/viewer/plugins'
import 'unfonts.css'

const app = createApp(App)

// Register Vuetify and other plugins (needed for UI components)
registerPlugins(app)

app.mount('#app')
