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

// Build base MyoSuite config (declarative approach for basic scenes)
function buildBaseMyoSuiteConfig(): LegacyAppConfig {
  return {
    project_name: "MyoSuite",
    project_link: "https://github.com/MyoHub/myosuite",
    tasks: [
      {
        id: "1",
        name: "Hand",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/hand/myohand.xml",
        camera: {
          position: [0.4, 1.6, 1.4] as [number, number, number],
          target: [-0.1, 1.4, 0.4] as [number, number, number]
        },
        default_policy: undefined,
        policies: []
      },
      {
        id: "2",
        name: "Arm",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/arm/myoarm.xml",
        camera: {
          position: [-0.8, 1.7, 1.4] as [number, number, number],
          target: [-0.3, 1.3, 0.2] as [number, number, number]
        },
        default_policy: undefined,
        policies: []
      },
      {
        id: "3",
        name: "Elbow",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/elbow/myoelbow_2dof6muscles.xml",
        camera: {
          position: [-1.5, 1.7, 1.0] as [number, number, number],
          target: [-0.5, 1.3, 0.2] as [number, number, number]
        },
        default_policy: undefined,
        policies: []
      },
      {
        id: "4",
        name: "Legs",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/leg/myolegs.xml",
        camera: {
          position: [-1.5, 1.5, 1.9] as [number, number, number],
          target: [0, 0.9, 0] as [number, number, number]
        },
        default_policy: undefined,
        policies: []
      }
    ]
  }
}

// Add MyoChallenge scenes using imperative Scene builder API
function addMyoChallengeScenes(baseConfig: LegacyAppConfig): LegacyAppConfig {
  // Create a temporary viewer instance to use the imperative API
  const tempContainer = document.createElement('div')
  const viewer = new MwxViewer(tempContainer)

  const project = viewer.addProject({
    project_name: baseConfig.project_name,
    project_link: baseConfig.project_link,
  })

  // Add base scenes from config
  for (const task of baseConfig.tasks) {
    project.addScene({
      id: task.id,
      name: task.name,
      model_xml: task.model_xml,
      camera: task.camera,
    })
  }

  // MyoChallenge 2023 scenes - using imperative API
  const mc23_relocate = project.addScene({
    id: "5",
    name: "mc23_Relocate",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_relocate.xml",
  })
  mc23_relocate.setCamera({
    position: [0, 1.7, 2.0],
    target: [0, 1.3, 0.2]
  })

  const mc23_chasetag = project.addScene({
    id: "6",
    name: "mc23_ChaseTag",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/leg/myolegs_chasetag.xml",
  })
  mc23_chasetag.setCamera({
    position: [0, 5, 12],
    target: [0, 0, 0]
  })

  // MyoChallenge 2024 scenes
  const mc24_bimanual = project.addScene({
    id: "7",
    name: "mc24_Bimanual",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_bionic_bimanual.xml",
  })
  mc24_bimanual.setCamera({
    position: [0, 1.7, 2.0],
    target: [0, 1.3, 0.2]
  })

  const mc24_runtrack = project.addScene({
    id: "8",
    name: "mc24_RunTrack",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/leg/myoosl_runtrack.xml",
  })
  mc24_runtrack.setCamera({
    position: [6, 5, 10],
    target: [0, 1.5, 4]
  })

  // MyoChallenge 2025 scenes
  const mc25_tabletennis = project.addScene({
    id: "9",
    name: "mc25_TableTennis",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_tabletennis.xml",
  })
  mc25_tabletennis.setCamera({
    position: [-1.5, 2, 3],
    target: [0, 1.1, 0]
  })

  const mc25_soccer = project.addScene({
    id: "10",
    name: "mc25_Soccer",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/leg_soccer/myolegs_soccer.xml",
  })
  mc25_soccer.setCamera({
    position: [-15, 7, 0],
    target: [5, 0, 0]
  })

  // Convert back to config format
  const projectConfig = project.getConfig()
  return {
    project_name: projectConfig.project_name,
    project_link: projectConfig.project_link,
    tasks: projectConfig.scenes.map(scene => ({
      id: scene.id,
      name: scene.name,
      model_xml: scene.model_xml,
      asset_meta: scene.asset_meta,
      camera: scene.camera,
      default_policy: scene.default_policy,
      policies: scene.policies.map(policy => ({
        id: policy.id,
        name: policy.name,
        path: policy.path,
        ui_controls: policy.ui_controls,
      }))
    }))
  }
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

      // MyoSuite demonstrates both declarative (base) and imperative (mc* scenes) approaches
      if (projectId === 'myosuite') {
        // Start with declarative base config
        const baseConfig = buildBaseMyoSuiteConfig()
        // Add MyoChallenge scenes imperatively and get the combined config
        legacyConfig = addMyoChallengeScenes(baseConfig)
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
          camera: task.camera,
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
