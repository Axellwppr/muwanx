/**
 * main.ts
 *
 * Demo app using the muwanx package with imperative API
 */

import { createApp, h, ref } from 'vue'
import { registerPlugins } from '@/viewer/plugins'
import { MwxViewer, MwxViewerComponent } from 'muwanx'
import type { LegacyAppConfig } from 'muwanx'
import 'unfonts.css'

// Define available projects
const projects = [
  { id: 'default', name: 'Muwanx Demo', config: './assets/config.json' },
  { id: 'menagerie', name: 'MuJoCo Menagerie', config: './assets/config_mujoco_menagerie.json' },
  { id: 'playground', name: 'MuJoCo Playground', config: './assets/config_mujoco_playground.json' },
  { id: 'myosuite', name: 'MyoSuite', config: null }, // Built imperatively
]

// Get config path from URL hash
function getConfigFromHash(): string | null {
  const hash = window.location.hash.slice(1).split('?')[0] // Remove # and query params
  const project = projects.find(p => p.id === hash || `/${p.id}` === hash)
  return project ? project.config : projects[0].config
}

// Get project ID from URL hash
function getProjectIdFromHash(): string {
  const hash = window.location.hash.slice(1).split('?')[0]
  const project = projects.find(p => p.id === hash || `/${p.id}` === hash)
  return project ? project.id : projects[0].id
}

// Build MyoSuite project imperatively
function buildMyoSuiteConfig() {
  return {
    project_name: "MyoSuite",
    project_link: "https://github.com/MyoHub/myosuite",
    tasks: [
      {
        id: "1",
        name: "Hand",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/hand/myohand.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_myohand.json",
        default_policy: null,
        policies: []
      },
      {
        id: "2",
        name: "Arm",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/arm/myoarm.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_myoarm.json",
        default_policy: null,
        policies: []
      },
      {
        id: "3",
        name: "Elbow",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/elbow/myoelbow_2dof6muscles.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_myoelbow.json",
        default_policy: null,
        policies: []
      },
      {
        id: "4",
        name: "Legs",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/leg/myolegs.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_myolegs.json",
        default_policy: null,
        policies: []
      },
      {
        id: "5",
        name: "mc23_Relocate",
        model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_relocate.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_relocate.json",
        default_policy: null,
        policies: []
      },
      {
        id: "6",
        name: "mc23_ChaseTag",
        model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/leg/myolegs_chasetag.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_chasetag.json",
        default_policy: null,
        policies: []
      },
      {
        id: "7",
        name: "mc24_Bimanual",
        model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_bionic_bimanual.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_bimanual.json",
        default_policy: null,
        policies: []
      },
      {
        id: "8",
        name: "mc24_RunTrack",
        model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/leg/myoosl_runtrack.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_runtrack.json",
        default_policy: null,
        policies: []
      },
      {
        id: "9",
        name: "mc25_TableTennis",
        model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_tabletennis.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_tabletennis.json",
        default_policy: null,
        policies: []
      },
      {
        id: "10",
        name: "mc25_Soccer",
        model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/leg_soccer/myolegs_soccer.xml",
        asset_meta: "./assets/policy/myosuite/asset_meta_soccer.json",
        default_policy: null,
        policies: []
      }
    ]
  }
}

// Load and build viewer using imperative API
async function buildViewer(containerEl: HTMLElement, configPath: string) {
  // Fetch the config file
  const response = await fetch(configPath)
  const config: LegacyAppConfig = await response.json()

  // Create viewer instance (headless - no Vue component)
  const viewer = new MwxViewer(containerEl)

  // Build project using imperative API
  const project = viewer.addProject({
    project_name: config.project_name,
    project_link: config.project_link,
  })

  // Add scenes (tasks in legacy config)
  if (config.tasks) {
    for (const task of config.tasks) {
      const scene = project.addScene({
        id: task.id,
        name: task.name,
        model_xml: task.model_xml,
        asset_meta: task.asset_meta,
      })

      // Set default policy if specified
      if (task.default_policy) {
        scene.setDefaultPolicy(task.default_policy)
      }

      // Add policies to scene
      if (task.policies) {
        for (const policyConfig of task.policies) {
          scene.addPolicy({
            id: policyConfig.id,
            name: policyConfig.name,
            path: policyConfig.path,
            ui_controls: policyConfig.ui_controls,
          })
        }
      }
    }
  }

  // Initialize the viewer
  await viewer.initialize()

  return viewer
}

// Create root component inline
const App = {
  setup() {
    const configPath = getConfigFromHash()
    const projectId = getProjectIdFromHash()
    const configObject = ref(null)

    // Load and build config using imperative approach
    async function loadImperativeConfig() {
      let legacyConfig: LegacyAppConfig

      // MyoSuite is built imperatively, others load from config files
      if (projectId === 'myosuite') {
        legacyConfig = buildMyoSuiteConfig()
      } else if (configPath) {
        const response = await fetch(configPath)
        legacyConfig = await response.json()
      } else {
        return
      }

      // Build config object imperatively (demonstrating the pattern)
      configObject.value = {
        project_name: legacyConfig.project_name,
        project_link: legacyConfig.project_link,
        tasks: legacyConfig.tasks?.map(task => ({
          id: task.id,
          name: task.name,
          model_xml: task.model_xml,
          asset_meta: task.asset_meta,
          default_policy: task.default_policy,
          policies: task.policies?.map(policy => ({
            id: policy.id,
            name: policy.name,
            path: policy.path,
            ui_controls: policy.ui_controls,
          })) || []
        })) || []
      }
    }

    // Load config on setup
    loadImperativeConfig()

    return () => h('div', {
      style: {
        width: '100%',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }
    }, [
      configObject.value ? h(MwxViewerComponent, {
        config: configObject.value,
        key: projectId // Force re-mount on config change
      }) : h('div', 'Loading...')
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
