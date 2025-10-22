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
        <v-btn v-if="isMobile" class="panel-toggle" @click="togglePanel" icon size="small" color="primary"
            elevation="2">
            <v-icon>{{ isPanelCollapsed ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>

        <v-card class="control-card" :elevation="isMobile ? 0 : 2">
            <!-- Model/Task tabs with click handler -->
            <v-tabs v-model="task" bg-color="primary" @update:modelValue="updateTaskCallback()"
                :density="isMobile ? 'compact' : 'default'" class="tabs-container">
                <v-tab v-for="task in config.tasks" :key="task.id" :value="task.id" 
                    :class="{ 'mobile-tab': isMobile }" @click="handleTaskTabClick(task.id)">
                    {{ task.name }}
                </v-tab>
            </v-tabs>

            <v-tabs-window v-model="task">
                <v-tabs-window-item v-for="task in config.tasks" :key="task.id" :value="task.id">
                    <template v-if="task.policies?.length">
                        <!-- Policy tabs with click handler -->
                        <v-tabs v-model="policy" bg-color="primary" @update:modelValue="updatePolicyCallback()"
                            :density="isMobile ? 'compact' : 'default'">
                            <v-tab v-for="policy in task.policies" :key="policy.id" :value="policy.id"
                                :class="{ 'mobile-tab': isMobile }" @click="handlePolicyTabClick(policy.id)">
                                {{ policy.name }}
                            </v-tab>
                        </v-tabs>

                        <!-- Policy-specific contents -->
                        <v-tabs-window v-model="policy">
                            <v-tabs-window-item v-for="policy in task.policies" :key="policy.id" :value="policy.id">
                                <!-- Command Controls Group -->
                                <v-card-text :class="{ 'mobile-padding': isMobile }">
                                    <div class="control-section-title">Target Controls</div>

                                    <!-- Setpoint checkbox -->
                                    <v-checkbox v-if="policy.ui_controls && policy.ui_controls.includes('setpoint')"
                                        :disabled="compliant_mode" v-model="use_setpoint"
                                        @update:modelValue="updateUseSetpointCallback()"
                                        :density="isMobile ? 'compact' : 'default'" hide-details class="mobile-checkbox">
                                        <template v-slot:label>
                                            <div class="checkbox-label">
                                                <span class="label-text">Use Setpoint</span>
                                                <span class="label-description">
                                                    <span v-if="use_setpoint">
                                                        Drag the red sphere to command target positions
                                                    </span>
                                                    <span v-else>
                                                        Slide to command target velocities
                                                    </span>
                                                </span>
                                            </div>
                                        </template>
                                    </v-checkbox>

                                    <!-- Velocity slider -->
                                    <div class="slider-section">
                                        <div class="slider-label">Slide to set command velocity</div>
                                        <v-slider
                                            :disabled="use_setpoint && policy.ui_controls && policy.ui_controls.includes('setpoint') && compliant_mode"
                                            v-model="command_vel_x" :min="-0.5" :max="1.5" :step="0.1"
                                            :thumb-size="isMobile ? 20 : 16" :track-size="isMobile ? 6 : 4" hide-details
                                            @update:modelValue="updateCommandVelXCallback()" class="mobile-slider">
                                            <template v-slot:append>
                                                <div class="slider-value">{{ command_vel_x }}</div>
                                            </template>
                                        </v-slider>
                                    </div>
                                </v-card-text>

                                <v-card-text v-if="policy.ui_controls && policy.ui_controls.includes('trajectory_playback')"
                                    :class="{ 'mobile-padding': isMobile }">
                                    <div class="control-section-title">Trajectory Playback</div>

                                    <v-btn-toggle v-model="trajectoryPlaybackState" mandatory class="mb-3">
                                        <v-btn @click="playTrajectory" value="play"
                                            :size="isMobile ? 'default' : 'small'" prepend-icon="mdi-play">
                                            Play
                                        </v-btn>
                                        <v-btn @click="stopTrajectory" value="stop"
                                            :size="isMobile ? 'default' : 'small'" prepend-icon="mdi-stop">
                                            Stop
                                        </v-btn>
                                        <v-btn @click="resetTrajectory" value="reset"
                                            :size="isMobile ? 'default' : 'small'" prepend-icon="mdi-refresh">
                                            Reset
                                        </v-btn>
                                    </v-btn-toggle>

                                    <v-checkbox v-model="trajectoryLoop" @update:modelValue="updateTrajectoryLoop"
                                        label="Loop playback" :density="isMobile ? 'compact' : 'default'" hide-details>
                                    </v-checkbox>
                                </v-card-text>

                                <!-- Stiffness Controls Group -->
                                <v-divider
                                    v-if="policy.ui_controls && policy.ui_controls.includes('stiffness')"></v-divider>
                                <v-card-text v-if="policy.ui_controls && policy.ui_controls.includes('stiffness')"
                                    :class="{ 'mobile-padding': isMobile }">
                                    <div class="control-section-title">Stiffness Controls</div>

                                    <v-checkbox v-model="compliant_mode" @update:modelValue="updateCompliantModeCallback()"
                                        :density="isMobile ? 'compact' : 'default'" hide-details class="mobile-checkbox">
                                        <template v-slot:label>
                                            <div class="checkbox-label">
                                                <span class="label-text">Compliant Mode</span>
                                                <span class="label-description">
                                                    <span v-if="compliant_mode">
                                                        Stiffness is set to 0
                                                    </span>
                                                    <span v-else>
                                                        Slide to set stiffness
                                                    </span>
                                                </span>
                                            </div>
                                        </template>
                                    </v-checkbox>

                                    <div class="slider-section">
                                        <v-slider :disabled="compliant_mode" v-model="facet_kp" :min="0" :max="24" :step="1"
                                            :thumb-size="isMobile ? 20 : 16" :track-size="isMobile ? 6 : 4" hide-details
                                            @update:modelValue="updateFacetKpCallback()" class="mobile-slider">
                                            <template v-slot:append>
                                                <div class="slider-value">{{ facet_kp }}</div>
                                            </template>
                                        </v-slider>
                                    </div>
                                </v-card-text>
                            </v-tabs-window-item>
                        </v-tabs-window>
                    </template>
                    <v-card-text v-else :class="{ 'mobile-padding': isMobile }" class="no-policy-message">
                        <div class="control-section-title">Policy Controls</div>
                        <div class="force-description">
                            No policy is configured for this task.
                        </div>
                    </v-card-text>

                    <!-- Force Controls Group -->
                    <v-divider></v-divider>
                    <v-card-text :class="{ 'mobile-padding': isMobile, 'pb-2': !isMobile }">
                        <div class="control-section-title">Force Controls</div>
                        <div class="force-description">
                            Drag on the robot to apply force
                        </div>
                        <template v-if="task.name === 'Go2'">
                            <v-btn @click="StartImpulse" color="primary" block :size="isMobile ? 'large' : 'default'"
                                class="impulse-button">
                                Impulse
                            </v-btn>
                            <div class="force-description">
                                Click the button to apply an impulse
                            </div>
                        </template>
                    </v-card-text>
                </v-tabs-window-item>
            </v-tabs-window>

            <!-- Reset button -->
            <v-btn @click="reset" block text :size="isMobile ? 'large' : 'default'" class="reset-button">
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
                        Loading MuJoCo and ONNX,<br/>Please wait...
                    </span>
                    <span v-else>
                        Loading MuJoCo and ONNX, Please wait...
                    </span>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <!-- Error dialog -->
    <v-dialog :model-value="state < 0 || urlParamErrorMessage !== ''" 
        :persistent="state < 0" 
        :max-width="isMobile ? '90vw' : '600px'"
        :fullscreen="isMobile && isSmallScreen" 
        scrollable>
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
    <div class="help-button-container" :class="helpButtonClasses">
        <v-btn 
            @click="showHelpDialog = true" 
            icon 
            size="small" 
            variant="text"
            class="help-btn"
            title="Keyboard Shortcuts (?)"
        >
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

export default {
    name: 'DemoPage',
    props: {
        configPath: {
            type: String,
            default: './config.json'
        }
    },
    data: () => ({
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
        keydown_listener: null,
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
        helpButtonClasses() {
            const classes = [];
            if (this.isMobile) {
                classes.push('help-button--mobile');
            }
            if (this.uiHidden) {
                classes.push('help-button--interactive');
            }
            return classes;
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
        async ensureActionManager(metaPath, policyConfig) {
            const needsIsaac = this.hasAssetMeta(metaPath);
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
                await this.withTransition('Switching model...', async () => {
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
        handleTaskTabClick(clickedTaskId) {
            // If clicking the same task tab that's already active
            if (this.task === clickedTaskId) {
                this.reloadDefaultPolicyAndResetSimulation();
            }
        },
        handlePolicyTabClick(clickedPolicyId) {
            // If clicking the same policy tab that's already active
            if (this.policy === clickedPolicyId) {
                this.resetSimulation();
            }
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

        this.keydown_listener = (event) => {
            if (event.code === 'Backspace') {
                this.reset();
            }
            if (event.key === 'i') {
                this.toggleUIVisibility();
            }
            if (event.key === '?') {
                this.showHelpDialog = !this.showHelpDialog;
            }
            if (event.key === 's') {
                this.navigateScene(1);
            }
            if (event.key === 'S') {
                this.navigateScene(-1);
            }
            if (event.key === 'p') {
                this.navigatePolicy(1);
            }
            if (event.key === 'P') {
                this.navigatePolicy(-1);
            }
        };
        document.addEventListener('keydown', this.keydown_listener);
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
        if (this.keydown_listener) {
            document.removeEventListener('keydown', this.keydown_listener);
        }
        // Clean up interactive mode class
        document.body.classList.remove('interactive-mode');
    },
};
</script>

<style scoped>
.mujoco-container {
    width: 100%;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1;
}

/* Control Panel Styles */
.control-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    z-index: 1000;
    transition: all 0.3s ease;
}

/* Mobile Control Panel */
@media (max-width: 768px) {
    .control-panel {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-height: 70vh;
        transform: translateY(0);
        border-radius: 16px 16px 0 0;
        background: white;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    }

    .control-panel.panel-collapsed {
           transform: translateY(calc(100% - 36px)); /* Show only the model controls */
    }
}

@media (max-width: 480px) {
    .control-panel {
        max-height: 80vh;
    }

    .control-panel.panel-collapsed {
           transform: translateY(calc(100% - 36px));
    }
}

.panel-toggle {
    position: absolute;
    top: -50px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1001;
}

.control-card {
    transition: transform 0.2s;
    overflow-y: auto;
    max-height: 100%;
}

@media (max-width: 768px) {
    .control-card {
        border-radius: 16px 16px 0 0;
        box-shadow: none;
    }
}

.control-card:hover {
    transform: translateY(-2px);
}

@media (max-width: 768px) {
    .control-card:hover {
        transform: none;
    }
}

/* Tab Styles */
.tabs-container {
    border-radius: 8px 8px 0 0;
}

:deep(.v-tab .v-btn__content) {
    text-transform: none;
}

:deep(.v-tab) {
    min-width: auto !important;
}

/* Content Styles */
.mobile-padding {
    padding: 12px 16px !important;
}

.control-section-title {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 12px;
    color: rgba(0, 0, 0, 0.87);
}

.checkbox-label {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}

.label-text {
    font-weight: 500;
    margin-bottom: 4px;
}

.label-description {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    line-height: 1.3;
}

.mobile-checkbox {
    margin-bottom: 8px;
}

/* Slider Styles */
.slider-section {
    margin-top: 12px;
}

.no-policy-message {
    padding-top: 16px !important;
    padding-bottom: 16px !important;
}

.slider-label {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    margin-bottom: 8px;
}

.mobile-slider {
    margin-bottom: 8px;
}

.slider-value {
    font-size: 0.75rem;
    font-weight: 500;
    min-width: 40px;
    text-align: center;
}

/* Force Controls */
.force-description {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    margin-bottom: 12px;
    text-align: center;
}

.impulse-button {
    margin: 8px 0;
}

.reset-button {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 0;
}

@media (max-width: 768px) {
    .reset-button {
        padding: 16px;
    }
}

/* Dialog Styles */
.dialog-content {
    text-align: center;
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100px;
}

@media (max-width: 768px) {
    .dialog-content {
        /* Full height for mobile fullscreen dialogs */
        min-height: 60vh;
        height: 60vh;
        padding: 10px;
        justify-content: center;
    }
    
    /* Center the card title on mobile */
    .status-dialog-card .v-card-title {
        text-align: center !important;
        justify-content: center !important;
    }
    
    /* Style for mobile dialog title positioned above progress bar */
    .mobile-dialog-title {
        text-align: left;
        font-size: 1.25rem;
        font-weight: 500;
        margin-bottom: 16px;
        color: rgba(0, 0, 0, 0.87);
    }
}

.loading-text,
.error-text {
    justify-content: center;
    font-size: 0.95rem;
    line-height: 1.5;
}

/* Warning Content Styles */
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
    color: rgba(0, 0, 0, 0.87);
    white-space: pre-line;
}

/* Notice Styles */
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
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    /* more transparent */
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    white-space: nowrap;
}

@media (max-width: 480px) {
    .notice-content {
        font-size: 12px;
        padding: 6px 10px;
    }
}

.notice-link {
    color: #8DDFFB;
    text-decoration: none;
}

.notice-link:hover {
    text-decoration: underline;
}

/* Help Button Styles */
.help-button-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1001;
    transition: bottom 0.2s ease;
}

.help-button-container.help-button--mobile {
    bottom: 90px;
    right: 16px;
}

.help-button-container.help-button--interactive {
    bottom: 20px !important;
}

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

/* Help Dialog Content Styles */
.help-content {
    padding: 20px !important;
}

.shortcut-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.shortcut-item {
    display: flex;
    align-items: center;
    gap: 16px;
}

.shortcut-key {
    min-width: 120px;
}

.shortcut-key kbd {
    display: inline-block;
    padding: 6px 12px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    background: linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%);
    border: 1px solid #bbb;
    border-radius: 4px;
    box-shadow: 0 2px 0 #999, 0 3px 2px rgba(0,0,0,0.2);
    text-shadow: 0 1px 0 #fff;
}

.shortcut-key kbd.clickable-key {
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
}

.shortcut-key kbd.clickable-key:hover {
    background: linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%);
    transform: translateY(1px);
    box-shadow: 0 1px 0 #999, 0 2px 1px rgba(0,0,0,0.2);
}

.shortcut-key kbd.clickable-key:active {
    background: linear-gradient(180deg, #d0d0d0 0%, #c0c0c0 100%);
    transform: translateY(2px);
    box-shadow: 0 0 0 #999, 0 1px 1px rgba(0,0,0,0.2);
}

.shortcut-description {
    flex: 1;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.87);
}

.fade-enter-active,

.transition-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 2000;
    backdrop-filter: blur(2px);
}

.transition-text {
    color: #fff;
    font-size: 1rem;
    letter-spacing: 0.02em;
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
