<template>
  <transition name="fade">
    <div v-if="isTransitioning" class="transition-overlay">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <div class="transition-text">{{ transitionMessage || 'Loading...' }}</div>
    </div>
  </transition>

  <div id="mujoco-container" class="mujoco-container">
    <!-- this is for placing the background demo -->
  </div>

  <div class="control-panel" :class="{ 'panel-collapsed': isPanelCollapsed }">
    <!-- Toggle button for mobile -->
    <v-btn v-if="isMobile" class="panel-toggle" @click="togglePanel" icon size="small" color="primary" elevation="2">
      <v-icon>{{ isPanelCollapsed ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </v-btn>

    <v-card class="control-card" :elevation="isMobile ? 0 : 2">
      <!-- Project title (shown only when project_name exists) -->
      <v-card-title v-if="config && config.project_name" class="control-card-title">
        <template v-if="config.project_link">
          <a :href="config.project_link" target="_blank" rel="noopener" class="project-title-link">
            {{ config.project_name }}
          </a>
        </template>
        <template v-else>
          <span class="project-title-text">{{ config.project_name }}</span>
        </template>
      </v-card-title>
      <!-- Scene selection (segmented dropdown) -->
      <v-card-text :class="{ 'mobile-padding': isMobile }">
        <div class="segmented-select">
          <div class="segment-label">Scene</div>
          <v-menu v-model="sceneMenu" :close-on-content-click="true" transition="fade-transition" location="bottom start">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                class="segment-button"
                size="small"
                variant="text"
                append-icon="mdi-chevron-down"
                role="combobox"
                aria-haspopup="listbox"
                :aria-expanded="String(sceneMenu)"
                aria-controls="scene-listbox"
              >
                <span class="segment-value">{{ selectedTask?.name || '—' }}</span>
              </v-btn>
            </template>
            <v-list id="scene-listbox" class="dropdown-list" density="compact" :style="{ minWidth: '192px', maxHeight: '280px', overflowY: 'auto' }">
              <v-list-item
                v-for="(item, i) in taskItems"
                :key="item.id || i"
                :class="{ selected: item.id === task }"
                role="option"
                :aria-selected="String(item.id === task)"
                @click="task = item.id; updateTaskCallback()"
              >
                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <template #append>
                  <v-icon v-if="item.id === task" icon="mdi-check" size="small" color="primary"></v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </v-card-text>

      <!-- Policy selection (segmented dropdown, only if available) -->
      <v-card-text v-if="selectedTask && selectedTask.policies && selectedTask.policies.length"
        :class="{ 'mobile-padding': isMobile }">
        <div class="segmented-select">
          <div class="segment-label">Policy</div>
          <v-menu v-model="policyMenu" :close-on-content-click="true" transition="fade-transition" location="bottom start">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                class="segment-button"
                size="small"
                variant="text"
                append-icon="mdi-chevron-down"
                role="combobox"
                aria-haspopup="listbox"
                :aria-expanded="String(policyMenu)"
                aria-controls="policy-listbox"
              >
                <span class="segment-value">{{ selectedPolicy?.name || '—' }}</span>
              </v-btn>
            </template>
            <v-list id="policy-listbox" class="dropdown-list" density="compact" :style="{ minWidth: '192px', maxHeight: '280px', overflowY: 'auto' }">
              <v-list-item
                v-for="(item, i) in policyItems"
                :key="item.id || i"
                :class="{ selected: item.id === policy }"
                role="option"
                :aria-selected="String(item.id === policy)"
                @click="policy = item.id; updatePolicyCallback()"
              >
                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <template #append>
                  <v-icon v-if="item.id === policy" icon="mdi-check" size="small" color="primary"></v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </v-card-text>

      <!-- Policy-specific contents for selected policy -->
      <template v-if="selectedPolicy">
        <!-- Command Controls Group -->
        <v-card-text :class="{ 'mobile-padding': isMobile }">
          <div class="control-section-title">Target Velocity</div>

          <!-- Setpoint checkbox -->
          <v-checkbox v-if="selectedPolicy.ui_controls && selectedPolicy.ui_controls.includes('setpoint')"
            :disabled="compliant_mode" v-model="use_setpoint" @update:modelValue="updateUseSetpointCallback()"
            density="compact" hide-details class="mobile-checkbox">
            <template v-slot:label>
              <div class="checkbox-label">
                <span class="label-text">Use Setpoint</span>
              </div>
            </template>
          </v-checkbox>

          <!-- Velocity slider -->
          <div class="slider-section">
            <v-slider
              :disabled="use_setpoint && selectedPolicy.ui_controls && selectedPolicy.ui_controls.includes('setpoint') && compliant_mode"
              v-model="command_vel_x" :min="-0.5" :max="1.5" :step="0.1" :thumb-size="isMobile ? 18 : 14"
              :track-size="isMobile ? 5 : 3" hide-details @update:modelValue="updateCommandVelXCallback()"
              class="mobile-slider"
            >
              <template v-slot:append>
                <div class="slider-value">{{ command_vel_x }}</div>
              </template>
            </v-slider>
          </div>
        </v-card-text>

        <v-card-text v-if="selectedPolicy.ui_controls && selectedPolicy.ui_controls.includes('trajectory_playback')"
          :class="{ 'mobile-padding': isMobile }">
          <div class="control-section-title">Playback</div>

          <v-btn-toggle v-model="trajectoryPlaybackState" mandatory class="mb-1">
            <v-btn @click="playTrajectory" value="play" :size="isMobile ? 'default' : 'small'" prepend-icon="mdi-play">Play</v-btn>
            <v-btn @click="stopTrajectory" value="stop" :size="isMobile ? 'default' : 'small'" prepend-icon="mdi-stop">Stop</v-btn>
            <v-btn @click="resetTrajectory" value="reset" :size="isMobile ? 'default' : 'small'" prepend-icon="mdi-refresh">Reset</v-btn>
          </v-btn-toggle>

          <v-checkbox v-model="trajectoryLoop" @update:modelValue="updateTrajectoryLoop" label="Loop"
            density="compact" hide-details />
        </v-card-text>

        <!-- Stiffness Controls Group -->
        <v-divider v-if="selectedPolicy.ui_controls && selectedPolicy.ui_controls.includes('stiffness')"></v-divider>
        <v-card-text v-if="selectedPolicy.ui_controls && selectedPolicy.ui_controls.includes('stiffness')"
          :class="{ 'mobile-padding': isMobile }">
          <div class="control-section-title">Stiffness</div>

          <v-checkbox v-model="compliant_mode" @update:modelValue="updateCompliantModeCallback()"
            density="compact" hide-details class="mobile-checkbox">
            <template v-slot:label>
              <div class="checkbox-label">
                <span class="label-text">Compliant Mode</span>
              </div>
            </template>
          </v-checkbox>

          <div class="slider-section">
            <v-slider :disabled="compliant_mode" v-model="facet_kp" :min="0" :max="24" :step="1"
              :thumb-size="isMobile ? 18 : 14" :track-size="isMobile ? 5 : 3" hide-details
              @update:modelValue="updateFacetKpCallback()" class="mobile-slider">
              <template v-slot:append>
                <div class="slider-value">{{ facet_kp }}</div>
              </template>
            </v-slider>
          </div>
        </v-card-text>
      </template>

      <!-- Force Controls Group -->
      <v-divider></v-divider>
      <v-card-text v-if="selectedTask && selectedTask.name === 'Go2'" :class="{ 'mobile-padding': isMobile, 'pb-2': !isMobile }">
        <div class="control-section-title">Force</div>
        <v-btn @click="StartImpulse" color="primary" block :size="isMobile ? 'default' : 'small'" class="impulse-button">
          Impulse
        </v-btn>
      </v-card-text>

      <!-- Reset button -->
      <v-btn @click="reset" block text :size="isMobile ? 'default' : 'small'" class="reset-button">
        Reset
      </v-btn>
    </v-card>
  </div>

  <!-- Loading dialog -->
  <v-dialog :model-value="state === 0" persistent :max-width="isMobile ? '90vw' : '600px'"
    :fullscreen="isMobile && isSmallScreen" scrollable>
    <v-card class="status-dialog-card" :title="!isMobile ? 'Loading Simulation Environment' : undefined">
      <v-card-text class="dialog-content">
        <div v-if="isMobile" class="mobile-dialog-title">Loading...</div>
        <v-progress-linear indeterminate color="primary" class="mb-4"></v-progress-linear>
        <div class="loading-text">
          <span v-if="isMobile">
            Setting up simulation,<br />Please wait...
          </span>
          <span v-else>
            Setting up simulation, Please wait...
          </span>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Error dialog -->
  <v-dialog :model-value="state < 0 || urlParamErrorMessage !== ''" :persistent="state < 0"
    :max-width="isMobile ? '90vw' : '600px'" :fullscreen="isMobile && isSmallScreen" scrollable>
    <v-card class="status-dialog-card"
      :title="urlParamErrorMessage ? 'Invalid URL Parameters' : (isMobile ? 'Error' : 'Simulation Environment Loading Error')">
      <v-card-text class="dialog-content">
        <div class="error-text" v-if="state < 0">
          <span v-if="state == -1">
            Unexpected JS error, please refresh the page
            <br />
            {{ extra_error_message }}
          </span>
          <span v-if="state == -2">
            Your browser does not support WebAssembly, please use latest Chrome/Edge/Firefox
          </span>
        </div>
        <div v-if="urlParamErrorMessage" class="warning-content-inline">
          <v-icon color="warning" size="48" class="mb-3">mdi-alert</v-icon>
          <div class="warning-message">{{ urlParamErrorMessage }}</div>
        </div>
      </v-card-text>
      <v-card-actions v-if="urlParamErrorMessage">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="urlParamErrorMessage = ''">
          OK
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Notice -->
  <div class="notice-container">
    <div class="notice-content">
      Powered by
      <a href="https://github.com/ttktjmt/muwanx" target="_blank" class="notice-link">
        Muwanx
      </a>
    </div>
  </div>

  <!-- Help Button -->
  <div class="help-button-container" v-if="!isMobile || isPanelCollapsed">
    <v-btn @click="showHelpDialog = true" icon size="small" variant="text" class="help-btn"
      title="Keyboard Shortcuts (?)">
      <v-icon color="white">mdi-help</v-icon>
    </v-btn>
  </div>

  <!-- Help Dialog -->
  <v-dialog v-model="showHelpDialog" :max-width="isMobile ? '90vw' : '500px'" scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Keyboard Shortcuts</span>
        <v-btn icon size="small" @click="showHelpDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="help-content">
        <div class="shortcut-section">
          <div class="shortcut-item">
            <div class="shortcut-key">
              <kbd @click="showHelpDialog = false" class="clickable-key">?</kbd>
            </div>
            <div class="shortcut-description">
              Toggle this help dialog
            </div>
          </div>
          <div class="shortcut-item">
            <div class="shortcut-key">
              <kbd @click="toggleUIVisibility" class="clickable-key">i</kbd>
            </div>
            <div class="shortcut-description">
              Toggle Interactive Mode (Hide/Show UI)
            </div>
          </div>
          <div class="shortcut-item">
            <div class="shortcut-key">
              <kbd @click="reset" class="clickable-key">backspace</kbd>
            </div>
            <div class="shortcut-description">
              Reset simulation
            </div>
          </div>
          <div class="shortcut-item">
            <div class="shortcut-key">
              <kbd @click="navigateScene(1)" class="clickable-key">s</kbd>
              /
              <kbd @click="navigateScene(-1)" class="clickable-key">S</kbd>
            </div>
            <div class="shortcut-description">
              Next / Previous scene
            </div>
          </div>
          <div class="shortcut-item">
            <div class="shortcut-key">
              <kbd @click="navigatePolicy(1)" class="clickable-key">p</kbd>
              /
              <kbd @click="navigatePolicy(-1)" class="clickable-key">P</kbd>
            </div>
            <div class="shortcut-description">
              Next / Previous policy
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { MujocoRuntime } from '@/mujoco_wasm/runtime/MujocoRuntime.js';
import { GoCommandManager } from '@/mujoco_wasm/runtime/managers/commands/GoCommandManager.js';
import { IsaacActionManager } from '@/mujoco_wasm/runtime/managers/actions/IsaacActionManager.js';
import { PassiveActionManager } from '@/mujoco_wasm/runtime/managers/actions/PassiveActionManager.js';
import { TrajectoryActionManager } from '@/mujoco_wasm/runtime/managers/actions/TrajectoryActionManager.js';
import { ConfigObservationManager } from '@/mujoco_wasm/runtime/managers/observations/ConfigObservationManager.js';
import { LocomotionEnvManager } from '@/mujoco_wasm/runtime/managers/environment/LocomotionEnvManager.js';
import loadMujoco from '@/mujoco_wasm/dist/mujoco_wasm.js';
import { markRaw, nextTick } from 'vue';
import { createShortcuts } from '@/utils/shortcuts.js';

export default {
  name: 'DemoPage',
  props: {
    configPath: {
      type: String,
      default: './config.json'
    }
  },
  data: () => ({
    // segmented dropdown menus state
    sceneMenu: false,
    policyMenu: false,
    config: { tasks: [] },
    task: null,
    policy: null,
    facet_kp: 24,
    command_vel_x: 0.0,
    use_setpoint: true,
    compliant_mode: false,
    state: 0,
    extra_error_message: "",
    urlParamErrorMessage: "",
    shortcuts: null,
    runtime: null,
    commandManager: null,
    actionManager: null,
    trajectoryManager: null,
    observationManager: null,
    envManager: null,
    // Mobile responsive data
    isMobile: false,
    isSmallScreen: false,
    isPanelCollapsed: false,
    isTransitioning: false,
    transitionMessage: '',
    // Interactive mode (hide UI)
    uiHidden: false,
    // Help dialog
    showHelpDialog: false,
    // Trajectory playback controls
    trajectoryPlaybackState: 'stop',
    trajectoryLoop: false,
  }),
  computed: {
    selectedTask() {
      return this.config?.tasks?.find?.(t => t.id === this.task) || null;
    },
    selectedPolicy() {
      if (!this.selectedTask || !this.selectedTask.policies) return null;
      return this.selectedTask.policies.find(p => p.id === this.policy) || null;
    },
    taskItems() {
      return this.config?.tasks || [];
    },
    policyItems() {
      return this.selectedTask?.policies || [];
    },
  },
  methods: {
    resolveDefaultPolicy(task) {
      if (!task) return null;
      if (task.default_policy !== null && task.default_policy !== undefined) {
        return task.default_policy;
      }
      return task.policies?.[0]?.id ?? null;
    },
    async withTransition(message, action) {
      this.transitionMessage = message;
      this.isTransitioning = true;
      await nextTick();
      try {
        return await action();
      } finally {
        this.isTransitioning = false;
        this.transitionMessage = '';
      }
    },
    resolveSceneConfig(task, policy) {
      if (!task) {
        return { scenePath: null, metaPath: null };
      }
      const scenePath = policy?.model_xml ?? task.model_xml;
      const metaRaw = policy?.asset_meta ?? task.asset_meta ?? null;
      const metaPath = metaRaw === 'null' || metaRaw === '' ? null : metaRaw;
      return { scenePath, metaPath };
    },
    hasAssetMeta(metaPath) {
      return Boolean(metaPath);
    },
    async loadAssetMeta(metaPath) {
      if (!metaPath) return null;
      try {
        const resp = await fetch(metaPath);
        if (!resp.ok) return null;
        return await resp.json();
      } catch (e) {
        console.warn('Failed to load asset_meta for inspection:', e);
        return null;
      }
    },
    async ensureActionManager(metaPath, policyConfig) {
      // Decide manager type more robustly: only use Isaac if asset_meta includes Isaac-related keys
      // (so asset_meta can be camera-only without forcing IsaacActionManager)
      let needsIsaac = false;
      if (this.hasAssetMeta(metaPath)) {
        const meta = await this.loadAssetMeta(metaPath);
        if (meta && typeof meta === 'object') {
          const hasIsaacJoints = Array.isArray(meta.joint_names_isaac) && meta.joint_names_isaac.length > 0;
          const hasActuators = meta.actuators && typeof meta.actuators === 'object' && Object.keys(meta.actuators).length > 0;
          const hasDefaultJpos = Array.isArray(meta.default_joint_pos) && meta.default_joint_pos.length > 0;
          needsIsaac = hasIsaacJoints || hasActuators || hasDefaultJpos;
        }
      }
      const needsTrajectory = policyConfig?.type === 'trajectory';
      const currentManager = this.actionManager;

      if (needsTrajectory) {
        const trajectoryPath = policyConfig?.trajectory_path ?? null;
        if (currentManager instanceof TrajectoryActionManager) {
          await this.loadTrajectoryData(currentManager, trajectoryPath);
          this.trajectoryManager = currentManager;
          currentManager.setLoop(this.trajectoryLoop);
          this.trajectoryPlaybackState = 'stop';
          return;
        }

        const nextManager = markRaw(new TrajectoryActionManager());
        if (this.runtime) {
          if (this.runtime.actionManager && typeof this.runtime.actionManager.dispose === 'function') {
            this.runtime.actionManager.dispose();
          }
          this.runtime.actionManager = nextManager;
          nextManager.attachRuntime(this.runtime);
          if (typeof nextManager.onInit === 'function') {
            await nextManager.onInit();
          }
        }
        await this.loadTrajectoryData(nextManager, trajectoryPath);
        nextManager.setLoop(this.trajectoryLoop);
        this.actionManager = nextManager;
        this.trajectoryManager = nextManager;
        this.trajectoryPlaybackState = 'stop';
        return;
      }

      this.trajectoryManager = null;
      this.trajectoryPlaybackState = 'stop';
      this.trajectoryLoop = false;

      if (needsIsaac && currentManager instanceof IsaacActionManager) {
        return;
      }
      if (!needsIsaac && currentManager instanceof PassiveActionManager) {
        return;
      }

      const nextManager = markRaw(needsIsaac ? new IsaacActionManager() : new PassiveActionManager());
      if (this.runtime) {
        if (this.runtime.actionManager && typeof this.runtime.actionManager.dispose === 'function') {
          this.runtime.actionManager.dispose();
        }
        this.runtime.actionManager = nextManager;
        nextManager.attachRuntime(this.runtime);
        if (typeof nextManager.onInit === 'function') {
          await nextManager.onInit();
        }
      }
      this.actionManager = nextManager;
    },
    async loadTrajectoryData(manager, trajectoryPath) {
      if (!manager || !trajectoryPath) {
        return;
      }
      try {
        const response = await fetch(trajectoryPath);
        if (!response.ok) {
          console.warn(`Failed to load trajectory from ${trajectoryPath}: ${response.status}`);
          return;
        }
        const trajectoryData = await response.json();
        manager.loadTrajectory(trajectoryData);
      } catch (error) {
        console.error('Error loading trajectory data:', error);
      }
    },
    applyCommandState() {
      if (!this.commandManager) {
        return;
      }
      this.commandManager.setUseSetpoint(this.use_setpoint);
      this.commandManager.setCompliantMode(this.compliant_mode);
      this.commandManager.setImpedanceKp(this.facet_kp);
      this.commandManager.setCommandVelocityX(this.command_vel_x);
      const params = this.runtime?.params;
      if (params) {
        this.facet_kp = params.impedance_kp;
        this.command_vel_x = params.command_vel_x;
      }
    },
    checkMobileDevice() {
      this.isMobile = window.innerWidth <= 768;
      this.isSmallScreen = window.innerWidth <= 480;
      this.isPanelCollapsed = this.isMobile; // Start collapsed on mobile
    },
    togglePanel() {
      this.isPanelCollapsed = !this.isPanelCollapsed;
    },
    toggleUIVisibility() {
      this.uiHidden = !this.uiHidden;
      // Toggle body class for global CSS targeting
      if (this.uiHidden) {
        document.body.classList.add('interactive-mode');
      } else {
        document.body.classList.remove('interactive-mode');
      }
    },
    async init() {
      if (typeof WebAssembly !== "object" || typeof WebAssembly.instantiate !== "function") {
        this.state = -2;
        return;
      }
      try {
        await this.loadConfig();
        console.log(this.config);
        if (!this.config.tasks.length) return;
        const mujoco = await loadMujoco();

        // Use the task and policy selected in loadConfig (may be from URL params)
        const initialTask = this.config.tasks.find(t => t.id === this.task) ?? this.config.tasks[0];
        const initialPolicy = initialTask.policies.find(p => p.id === this.policy) ??
          initialTask.policies.find(p => p.id === initialTask.default_policy) ??
          initialTask.policies[0];
        const { scenePath, metaPath } = this.resolveSceneConfig(initialTask, initialPolicy);

        await this.ensureActionManager(metaPath, initialPolicy);
        this.commandManager = markRaw(new GoCommandManager());
        this.observationManager = markRaw(new ConfigObservationManager());
        this.envManager = markRaw(new LocomotionEnvManager());

        this.runtime = markRaw(new MujocoRuntime(mujoco, {
          commandManager: this.commandManager,
          actionManager: this.actionManager,
          observationManagers: [this.observationManager],
          envManagers: [this.envManager],
        }));
        await this.runtime.init({
          scenePath,
          metaPath,
          policyPath: initialPolicy?.path,
        });
        this.updateFacetballService(initialPolicy);
        this.runtime.resume();
        this.applyCommandState();
        this.state = 1;
      } catch (error) {
        this.state = -1;
        this.extra_error_message = error.toString();
        console.error(error);
      }
    },
    async loadConfig() {
      try {
        const response = await fetch(this.configPath);
        this.config = await response.json();

        // Parse URL parameters for initial scene and policy
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const sceneParam = urlParams.get('scene');
        const policyParam = urlParams.get('policy');

        let selectedTask = null;
        let selectedPolicyId = null;
        let warningMessages = [];

        // Try to find task by name from URL parameter
        if (sceneParam) {
          selectedTask = this.config.tasks.find(t =>
            t.name.toLowerCase() === sceneParam.toLowerCase()
          );

          if (!selectedTask) {
            console.warn(`Scene "${sceneParam}" not found, using default`);
            warningMessages.push(`Scene "${sceneParam}" not found`);
          }
        }

        // Fall back to first task if not found
        if (!selectedTask) {
          selectedTask = this.config.tasks[0];
        }

        this.task = selectedTask?.id ?? null;

        // Try to find policy by name from URL parameter
        if (policyParam && selectedTask?.policies?.length) {
          const foundPolicy = selectedTask.policies.find(p =>
            p.name.toLowerCase() === policyParam.toLowerCase()
          );

          if (foundPolicy) {
            selectedPolicyId = foundPolicy.id;
          } else {
            console.warn(`Policy "${policyParam}" not found for scene "${selectedTask.name}", using default`);
            warningMessages.push(`Policy "${policyParam}" not found for scene "${selectedTask.name}"`);
          }
        }

        // Fall back to default policy if not specified or not found
        this.policy = selectedPolicyId ?? this.resolveDefaultPolicy(selectedTask);

        // Show error dialog if there were any issues with URL parameters
        if (warningMessages.length > 0) {
          const defaultPolicyName = selectedTask.policies.find(p => p.id === this.policy)?.name ?? 'default';
          this.urlParamErrorMessage = `${warningMessages.join('. ')}.\n\nLoading default: ${selectedTask.name} - ${defaultPolicyName}`;
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        this.state = -1;
        this.extra_error_message = 'Config load failed: ' + error;
      }
    },
    async updateTaskCallback() {
      const selectedTask = this.config.tasks.find(t => t.id === this.task);
      if (!selectedTask) return;

      this.policy = this.resolveDefaultPolicy(selectedTask);
      if (!this.runtime) return;
      const selectedPolicy = selectedTask.policies.find(p => p.id === this.policy);
      const { scenePath, metaPath } = this.resolveSceneConfig(selectedTask, selectedPolicy);
      await this.withTransition('Switching scene...', async () => {
        await this.ensureActionManager(metaPath, selectedPolicy);
        await this.runtime.loadEnvironment({
          scenePath,
          metaPath,
          policyPath: selectedPolicy?.path,
        });
        this.updateFacetballService(selectedPolicy);
        this.runtime.resume();
        this.applyCommandState();
      });
    },
    async updatePolicyCallback() {
      const selectedTask = this.config.tasks.find(t => t.id === this.task);
      const selectedPolicy = selectedTask.policies.find(p => p.id === this.policy);
      if (!selectedPolicy) return;

      if (!this.runtime) return;
      const { scenePath, metaPath } = this.resolveSceneConfig(selectedTask, selectedPolicy);
      await this.withTransition('Switching policy...', async () => {
        await this.ensureActionManager(metaPath, selectedPolicy);
        await this.runtime.loadEnvironment({
          scenePath,
          metaPath,
          policyPath: selectedPolicy.path,
        });
        this.updateFacetballService(selectedPolicy);
        this.runtime.resume();
        this.applyCommandState();
      });
    },
    async reloadDefaultPolicyAndResetSimulation() {
      if (!this.runtime) return;

      const selectedTask = this.config.tasks.find(t => t.id === this.task);
      if (!selectedTask) return;

      this.policy = this.resolveDefaultPolicy(selectedTask);
      const defaultPolicy = selectedTask.policies.find(p => p.id === this.policy);

      try {
        const { scenePath, metaPath } = this.resolveSceneConfig(selectedTask, defaultPolicy);
        await this.withTransition('Switching scene...', async () => {
          await this.ensureActionManager(metaPath, defaultPolicy);
          await this.runtime.loadEnvironment({
            scenePath,
            metaPath,
            policyPath: defaultPolicy?.path,
          });
          this.updateFacetballService(defaultPolicy);
          this.runtime.resume();

          // Reset simulation after loading default policy or environment
          await this.runtime.reset();
          this.applyCommandState();
        });
      } catch (error) {
        console.error('Failed to reload default policy and reset simulation:', error);
      }
    },
    updateFacetballService(selectedPolicy) {
      if (!this.runtime) return;
      const setpointService = this.runtime.getService?.('setpoint-control');
      if (!setpointService) return;
      const policyId = selectedPolicy?.id ?? this.policy ?? null;
      setpointService.setActivePolicy?.(policyId);
      const showSetpoint = selectedPolicy?.show_setpoint ?? (policyId === 'facet');
      setpointService.setVisible?.(showSetpoint || this.use_setpoint);
      if (showSetpoint) {
        setpointService.reset?.();
      }
    },
    async resetSimulation() {
      if (!this.runtime) return;

      try {
        await this.runtime.reset();
        this.applyCommandState();
      } catch (error) {
        console.error('Failed to reset simulation:', error);
      }
    },
    async reset() {
      if (!this.runtime) return;
      await this.runtime.reset();
      this.applyCommandState();
    },
    updateFacetKpCallback() {
      this.facet_kp = Math.max(this.facet_kp, 12);
      this.facet_kp = Math.min(this.facet_kp, 24);
      if (!this.commandManager) return;
      this.commandManager.setImpedanceKp(this.facet_kp);
      this.facet_kp = this.runtime?.params?.impedance_kp ?? this.facet_kp;
    },
    updateUseSetpointCallback() {
      console.log("use setpoint", this.use_setpoint);
      if (!this.commandManager) return;
      this.commandManager.setUseSetpoint(this.use_setpoint);
      if (this.use_setpoint) {
        this.command_vel_x = 0.0;
        this.commandManager.setCommandVelocityX(this.command_vel_x);
      }
    },
    updateCommandVelXCallback() {
      console.log("set command vel x", this.command_vel_x);
      if (!this.commandManager) return;
      this.commandManager.setCommandVelocityX(this.command_vel_x);
    },
    updateCompliantModeCallback() {
      if (!this.commandManager) return;
      this.commandManager.setCompliantMode(this.compliant_mode);
      this.facet_kp = this.runtime?.params?.impedance_kp ?? this.facet_kp;
    },
    StartImpulse() {
      console.log("start impulse");
      if (!this.commandManager) return;
      this.commandManager.triggerImpulse();
    },
    playTrajectory() {
      if (!this.trajectoryManager) {
        return;
      }
      this.trajectoryManager.play();
      this.trajectoryPlaybackState = 'play';
    },
    stopTrajectory() {
      if (!this.trajectoryManager) {
        return;
      }
      this.trajectoryManager.stop();
      this.trajectoryPlaybackState = 'stop';
      this.runtime?.applyAction?.();
    },
    resetTrajectory() {
      if (!this.trajectoryManager) {
        return;
      }
      const wasPlaying = this.trajectoryManager.isPlaying;
      this.trajectoryManager.reset();
      this.trajectoryPlaybackState = wasPlaying ? 'play' : 'reset';
    },
    updateTrajectoryLoop(value) {
      this.trajectoryLoop = value;
      if (this.trajectoryManager) {
        this.trajectoryManager.setLoop(value);
      }
    },
    handleResize() {
      this.checkMobileDevice();
    },
    navigateScene(direction) {
      if (!this.config.tasks || this.config.tasks.length === 0) return;

      const currentIndex = this.config.tasks.findIndex(t => t.id === this.task);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex + direction;
      // Wrap around
      if (nextIndex < 0) {
        nextIndex = this.config.tasks.length - 1;
      } else if (nextIndex >= this.config.tasks.length) {
        nextIndex = 0;
      }

      this.task = this.config.tasks[nextIndex].id;
      this.updateTaskCallback();
    },
    navigatePolicy(direction) {
      const selectedTask = this.config.tasks.find(t => t.id === this.task);
      if (!selectedTask || !selectedTask.policies || selectedTask.policies.length === 0) return;

      const currentIndex = selectedTask.policies.findIndex(p => p.id === this.policy);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex + direction;
      // Wrap around
      if (nextIndex < 0) {
        nextIndex = selectedTask.policies.length - 1;
      } else if (nextIndex >= selectedTask.policies.length) {
        nextIndex = 0;
      }

      this.policy = selectedTask.policies[nextIndex].id;
      this.updatePolicyCallback();
    },
  },
  mounted() {
    this.checkMobileDevice();
    this.init();

    window.addEventListener('resize', this.handleResize);

    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    if (urlParams.get('hidectrl') === '1') {
      this.uiHidden = true;
      document.body.classList.add('interactive-mode');
    } else if (urlParams.get('hidectrl') === '0') {
      this.uiHidden = false;
      document.body.classList.remove('interactive-mode');
    }

    this.shortcuts = createShortcuts({
      onReset: () => this.reset(),
      onToggleUI: () => this.toggleUIVisibility(),
      onNavigateScene: (d) => this.navigateScene(d),
      onNavigatePolicy: (d) => this.navigatePolicy(d),
      getHelpVisible: () => this.showHelpDialog,
      setHelpVisible: (v) => { this.showHelpDialog = v; },
    });
  },
  beforeUnmount() {
    // Properly dispose of the runtime before component unmount
    if (this.runtime) {
      try {
        this.runtime.dispose();
      } catch (e) {
        console.warn('Error disposing runtime:', e);
      }
      this.runtime = null;
    }

    window.removeEventListener('resize', this.handleResize);
    if (this.shortcuts && typeof this.shortcuts.detach === 'function') {
      this.shortcuts.detach();
    }
    // Clean up interactive mode class
    document.body.classList.remove('interactive-mode');
  },
};
</script>

<style scoped>
/* Canvas container */
.mujoco-container {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  z-index: 1;
}

/* Control panel */
.control-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 260px;
  z-index: 1000;
}

.control-card {
  background: var(--ui-surface);
  backdrop-filter: saturate(120%) blur(6px);
  border: 1px solid var(--ui-border);
  box-shadow: var(--ui-shadow);
  border-radius: 8px !important; /* sharper corners */
}

/* removed old tabs styles */

.control-card {
  font-size: 0.8rem; /* base size inside panel */
}

.control-card :deep(.v-card-title.control-card-title) {
  padding: 6px 12px !important;
  background: primary !important;
}

.project-title-link,
.project-title-text {
  color: var(--ui-text);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.project-title-link:hover { text-decoration: none; }

.mobile-padding { padding: 6px 10px !important; }
.control-card :deep(.v-card-text) { padding: 6px 10px !important; }

.control-section-title {
  margin: 4px 0 4px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ui-text);
  opacity: 0.85;
}

.checkbox-label .label-text {
  font-size: 0.8rem;
  font-weight: 400; /* not bold */
  color: var(--ui-text);
}

.checkbox-label .label-description { display: none; }

.slider-section { margin-top: 4px; }

.slider-label {
  font-size: 0.72rem;
  color: var(--ui-muted);
  margin-bottom: 4px;
}

.slider-value {
  min-width: 32px;
  font-size: 0.72rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--ui-muted);
}

.force-description {
  font-size: 0.72rem;
  color: var(--ui-muted);
}

.impulse-button,
.reset-button {
  border: 1px solid var(--ui-border);
}

/* Segmented select (label + dropdown button) */
.segmented-select {
  display: inline-flex;
  align-items: stretch;
  border-radius: 3px;
  box-shadow: 0 0 0 1px var(--ui-border);
  overflow: hidden;
}

.segment-label {
  background: color-mix(in srgb, var(--ui-surface) 70%, transparent);
  color: var(--ui-muted);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 8px;
  border-right: 1px solid var(--ui-border);
  display: flex;
  align-items: center;
}

.segment-button.v-btn {
  background: color-mix(in srgb, var(--ui-surface) 70%, transparent) !important;
  box-shadow: none !important;
  height: 28px !important;
  min-height: 28px !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  padding: 0 10px !important;
  text-transform: none !important;
}

.segment-button.v-btn:hover {
  background: var(--ui-surface) !important;
}

.segment-value {
  font-size: 12px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Dropdown list styling */
.dropdown-list {
  border: 1px solid var(--ui-border);
  border-radius: 6px;
}

.dropdown-list .v-list-item.selected {
  background: rgba(25, 118, 210, 0.08);
}

.dropdown-list .v-list-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.dropdown-list .v-list-item-title {
  font-size: 0.85rem;
}

/* Mobile: bottom sheet */
@media (max-width: 768px) {
  .control-panel {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    padding: 6px 10px 10px;
  }

  .panel-toggle {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(100% + 8px);
    background: primary !important;
    border: 1px solid var(--ui-border) !important;
    box-shadow: var(--ui-shadow) !important;
  }

  .panel-collapsed .control-card {
    display: none;
  }
}

/* Dialogs */
.dialog-content {
  text-align: center;
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
}

@media (max-width: 768px) {
  .dialog-content {
    min-height: 50vh;
  }
  .status-dialog-card .v-card-title {
    text-align: center !important;
    justify-content: center !important;
  }
  .mobile-dialog-title {
    text-align: left;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 12px;
  }
}

.loading-text,
.error-text {
  font-size: 0.95rem;
  line-height: 1.5;
}

/* Warnings */
.warning-content-inline {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.warning-message {
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-line;
}

/* Notice */
.notice-container {
  position: fixed;
  bottom: 12px;
  left: 12px;
  z-index: 999;
}

@media (max-width: 768px) {
  .notice-container {
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    bottom: auto;
  }
}

.notice-content {
  color: rgba(255, 255, 255, 0.7);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(2px);
}

.notice-link {
  color: #8DDFFB;
  text-decoration: none;
}

.notice-link:hover {
  text-decoration: underline;
}

/* Help button */
.help-button-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1001;
  transition: bottom 0.2s ease;
}

/* removed variant classes; help button shows only when panel collapsed */

.help-btn {
  background: transparent !important;
  transition: opacity 0.2s ease;
  opacity: 0.7;
}

.help-btn:hover {
  opacity: 1;
}

@media (max-width: 768px) {
  .help-button-container {
    right: 16px;
  }
}

/* Help dialog */
.help-content {
  padding: 16px !important;
}

.shortcut-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shortcut-key {
  min-width: 120px;
}

.shortcut-key kbd {
  display: inline-block;
  padding: 6px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text);
  background: #f6f7f8;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
}

.shortcut-key kbd.clickable-key {
  cursor: pointer;
  user-select: none;
}

.shortcut-description {
  flex: 1;
  font-size: 14px;
  color: var(--ui-muted);
}

/* Transition overlay */
.transition-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.transition-text {
  color: white;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
}
</style>

<style>
/* Global styles for interactive mode - hides UI elements when body has 'interactive-mode' class */
body.interactive-mode .control-panel {
  display: none !important;
}

/* Keep transition overlay, notice, and help button visible in interactive mode */
body.interactive-mode .transition-overlay,
body.interactive-mode .notice-container,
body.interactive-mode .help-button-container {
  display: block !important;
}
</style>
