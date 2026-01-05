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
  { id: 'ant', name: 'Ant (Inline XML)', config: null }, // Built imperatively with inline XML
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
        id: "hand",
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
        id: "arm",
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
        id: "elbow",
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
        id: "legs",
        name: "Legs",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/leg/myolegs.xml",
        camera: {
          position: [-1.5, 1.5, 1.9] as [number, number, number],
          target: [0, 0.9, 0] as [number, number, number]
        },
        default_policy: undefined,
        policies: []
      },
      {
        id: "finger",
        name: "Finger",
        model_xml: "./assets/scene/myosuite/myosuite/simhive/myo_sim/finger/myofinger_v0.xml",
        camera: {
          position: [1.0, 1.0, 1.0] as [number, number, number],
          target: [0, 0.2, 0] as [number, number, number]
        },
        default_policy: undefined,
        policies: []
      },
    ]
  }
}

// Build Ant config using inline XML (demonstrating string XML support)
function buildAntConfig(): LegacyAppConfig {
  return {
    project_name: "Ant Robot",
    project_link: "https://github.com/Farama-Foundation/Gymnasium-Robotics",
    tasks: [
      {
        id: "1",
        name: "Ant",
        // Using inline XML string instead of file path
        model_xml: `<mujoco model="ant">
  <compiler angle="degree" coordinate="local" inertiafromgeom="true"/>
  <option integrator="RK4" timestep="0.01"/>
  <custom>
    <numeric data="0.0 0.0 0.55 1.0 0.0 0.0 0.0 0.0 1.0 0.0 -1.0 0.0 -1.0 0.0 1.0" name="init_qpos"/>
  </custom>
  <default>
    <joint armature="1" damping="1" limited="true"/>
    <geom conaffinity="0" condim="3" density="5.0" friction="1 0.5 0.5" margin="0.01" rgba="0.8 0.6 0.4 1"/>
  </default>
  <asset>
    <texture builtin="gradient" height="100" rgb1="1 1 1" rgb2="0 0 0" type="skybox" width="100"/>
    <texture builtin="flat" height="1278" mark="cross" markrgb="1 1 1" name="texgeom" random="0.01" rgb1="0.8 0.6 0.4" rgb2="0.8 0.6 0.4" type="cube" width="127"/>
    <texture builtin="checker" height="100" name="texplane" rgb1="0 0 0" rgb2="0.8 0.8 0.8" type="2d" width="100"/>
    <material name="MatPlane" reflectance="0.5" shininess="1" specular="1" texrepeat="60 60" texture="texplane"/>
    <material name="geom" texture="texgeom" texuniform="true"/>
  </asset>
  <worldbody>
    <light cutoff="100" diffuse="1 1 1" dir="-0 0 -1.3" directional="true" exponent="1" pos="0 0 1.3" specular=".1 .1 .1"/>
    <geom conaffinity="1" condim="3" material="MatPlane" name="floor" pos="0 0 0" rgba="0.8 0.9 0.8 1" size="40 40 40" type="plane"/>
    <body name="torso" pos="0 0 0.75">
      <camera name="track" mode="trackcom" pos="0 -3 0.3" xyaxes="1 0 0 0 0 1"/>
      <geom name="torso_geom" pos="0 0 0" size="0.25" type="sphere"/>
      <joint armature="0" damping="0" limited="false" margin="0.01" name="root" pos="0 0 0" type="free"/>
      <body name="front_left_leg" pos="0 0 0">
        <geom fromto="0.0 0.0 0.0 0.2 0.2 0.0" name="aux_1_geom" size="0.08" type="capsule"/>
        <body name="aux_1" pos="0.2 0.2 0">
          <joint axis="0 0 1" name="hip_1" pos="0.0 0.0 0.0" range="-30 30" type="hinge"/>
          <geom fromto="0.0 0.0 0.0 0.2 0.2 0.0" name="left_leg_geom" size="0.08" type="capsule"/>
          <body pos="0.2 0.2 0">
            <joint axis="-1 1 0" name="ankle_1" pos="0.0 0.0 0.0" range="30 70" type="hinge"/>
            <geom fromto="0.0 0.0 0.0 0.4 0.4 0.0" name="left_ankle_geom" size="0.08" type="capsule"/>
          </body>
        </body>
      </body>
      <body name="front_right_leg" pos="0 0 0">
        <geom fromto="0.0 0.0 0.0 -0.2 0.2 0.0" name="aux_2_geom" size="0.08" type="capsule"/>
        <body name="aux_2" pos="-0.2 0.2 0">
          <joint axis="0 0 1" name="hip_2" pos="0.0 0.0 0.0" range="-30 30" type="hinge"/>
          <geom fromto="0.0 0.0 0.0 -0.2 0.2 0.0" name="right_leg_geom" size="0.08" type="capsule"/>
          <body pos="-0.2 0.2 0">
            <joint axis="1 1 0" name="ankle_2" pos="0.0 0.0 0.0" range="-70 -30" type="hinge"/>
            <geom fromto="0.0 0.0 0.0 -0.4 0.4 0.0" name="right_ankle_geom" size="0.08" type="capsule"/>
          </body>
        </body>
      </body>
      <body name="back_leg" pos="0 0 0">
        <geom fromto="0.0 0.0 0.0 -0.2 -0.2 0.0" name="aux_3_geom" size="0.08" type="capsule"/>
        <body name="aux_3" pos="-0.2 -0.2 0">
          <joint axis="0 0 1" name="hip_3" pos="0.0 0.0 0.0" range="-30 30" type="hinge"/>
          <geom fromto="0.0 0.0 0.0 -0.2 -0.2 0.0" name="back_leg_geom" size="0.08" type="capsule"/>
          <body pos="-0.2 -0.2 0">
            <joint axis="-1 1 0" name="ankle_3" pos="0.0 0.0 0.0" range="-70 -30" type="hinge"/>
            <geom fromto="0.0 0.0 0.0 -0.4 -0.4 0.0" name="third_ankle_geom" size="0.08" type="capsule"/>
          </body>
        </body>
      </body>
      <body name="right_back_leg" pos="0 0 0">
        <geom fromto="0.0 0.0 0.0 0.2 -0.2 0.0" name="aux_4_geom" size="0.08" type="capsule"/>
        <body name="aux_4" pos="0.2 -0.2 0">
          <joint axis="0 0 1" name="hip_4" pos="0.0 0.0 0.0" range="-30 30" type="hinge"/>
          <geom fromto="0.0 0.0 0.0 0.2 -0.2 0.0" name="rightback_leg_geom" size="0.08" type="capsule"/>
          <body pos="0.2 -0.2 0">
            <joint axis="1 1 0" name="ankle_4" pos="0.0 0.0 0.0" range="30 70" type="hinge"/>
            <geom fromto="0.0 0.0 0.0 0.4 -0.4 0.0" name="fourth_ankle_geom" size="0.08" type="capsule"/>
          </body>
        </body>
      </body>
    </body>
  </worldbody>
  <actuator>
    <motor ctrllimited="true" ctrlrange="-1.0 1.0" joint="hip_4" gear="150"/>
    <motor ctrllimited="true" ctrlrange="-1.0 1.0" joint="ankle_4" gear="150"/>
    <motor ctrllimited="true" ctrlrange="-1.0 1.0" joint="hip_1" gear="150"/>
    <motor ctrllimited="true" ctrlrange="-1.0 1.0" joint="ankle_1" gear="150"/>
    <motor ctrllimited="true" ctrlrange="-1.0 1.0" joint="hip_2" gear="150"/>
    <motor ctrllimited="true" ctrlrange="-1.0 1.0" joint="ankle_2" gear="150"/>
    <motor ctrllimited="true" ctrlrange="-1.0 1.0" joint="hip_3" gear="150"/>
    <motor ctrllimited="true" ctrlrange="-1.0 1.0" joint="ankle_3" gear="150"/>
  </actuator>
</mujoco>`,
        camera: {
          position: [5, 2, -1] as [number, number, number],
          target: [0, 0.5, 0] as [number, number, number]
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
    id: "relocate",
    name: "mc23_Relocate",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_relocate.xml",
  })
  mc23_relocate.setCamera({
    position: [0, 1.7, 2.0],
    target: [0, 1.3, 0.2]
  })

  const mc23_chasetag = project.addScene({
    id: "chasetag",
    name: "mc23_ChaseTag",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/leg/myolegs_chasetag.xml",
  })
  mc23_chasetag.setCamera({
    position: [0, 5, 12],
    target: [0, 0, 0]
  })

  // MyoChallenge 2024 scenes
  const mc24_bimanual = project.addScene({
    id: "bimanual",
    name: "mc24_Bimanual",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_bionic_bimanual.xml",
  })
  mc24_bimanual.setCamera({
    position: [0, 1.7, 2.0],
    target: [0, 1.3, 0.2]
  })

  const mc24_runtrack = project.addScene({
    id: "runtrack",
    name: "mc24_RunTrack",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/leg/myoosl_runtrack.xml",
  })
  mc24_runtrack.setCamera({
    position: [6, 5, 10],
    target: [0, 1.5, 4]
  })

  // MyoChallenge 2025 scenes
  const mc25_tabletennis = project.addScene({
    id: "tabletennis",
    name: "mc25_TableTennis",
    model_xml: "./assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_tabletennis.xml",
  })
  mc25_tabletennis.setCamera({
    position: [-1.5, 2, 3],
    target: [0, 1.1, 0]
  })

  const mc25_soccer = project.addScene({
    id: "soccer",
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
      } else if (projectId === 'ant') {
        // Ant demonstrates inline XML string support
        legacyConfig = buildAntConfig()
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
        projects: projects,
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
