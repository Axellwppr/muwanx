import { ref, computed } from 'vue';
import type { AppConfig, TaskConfigItem, PolicyConfigItem } from '@/types/config';

export function useConfig(configSource: string | AppConfig) {
  const config = ref<AppConfig>({ tasks: [] });
  const task = ref<string | null>(null);
  const policy = ref<string | null>(null);
  const urlParamErrorMessage = ref<string>('');

  const taskItems = computed(() => config.value?.tasks ?? []);
  const selectedTask = computed<TaskConfigItem | null>(() =>
    (config.value?.tasks ?? []).find(t => t.id === task.value) ?? null
  );
  const policyItems = computed<PolicyConfigItem[]>(() => selectedTask.value?.policies ?? []);
  const selectedPolicy = computed<PolicyConfigItem | null>(() =>
    (selectedTask.value?.policies ?? []).find(p => p.id === policy.value) ?? null
  );

  const currentProjectLabel = computed(() => config.value?.project_name || '—');

  function resolveDefaultPolicy(taskItem: TaskConfigItem | null): string | null {
    if (!taskItem) return null;
    if (taskItem.default_policy !== null && taskItem.default_policy !== undefined) {
      return taskItem.default_policy as string;
    }
    return taskItem.policies?.[0]?.id ?? null;
  }

  async function loadConfig() {
    try {
      // Support both config path (declarative) and config object (imperative)
      if (typeof configSource === 'string') {
        const response = await fetch(configSource);
        const json = await response.json();
        config.value = json as AppConfig;
      } else {
        config.value = configSource;
      }

      // Parse URL params from hash part for initial scene/policy
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
      const sceneParam = urlParams.get('scene');
      const policyParam = urlParams.get('policy');

      let selectedTaskItem: TaskConfigItem | null = null;
      let selectedPolicyId: string | null = null;
      const warnings: string[] = [];

      if (sceneParam) {
        selectedTaskItem = (config.value.tasks || []).find(t =>
          t.name.toLowerCase() === sceneParam.toLowerCase()
        ) || null;
        if (!selectedTaskItem) {
          console.warn(`Scene "${sceneParam}" not found, using default`);
          warnings.push(`Scene "${sceneParam}" not found`);
        }
      }

      if (!selectedTaskItem) {
        selectedTaskItem = (config.value.tasks || [])[0] ?? null;
      }

      task.value = selectedTaskItem?.id ?? null;

      if (policyParam && selectedTaskItem?.policies?.length) {
        const foundPolicy = selectedTaskItem.policies.find(p =>
          p.name.toLowerCase() === policyParam.toLowerCase()
        );
        if (foundPolicy) {
          selectedPolicyId = foundPolicy.id;
        } else {
          console.warn(`Policy "${policyParam}" not found for scene "${selectedTaskItem?.name}", using default`);
          warnings.push(`Policy "${policyParam}" not found for scene "${selectedTaskItem?.name}`);
        }
      }

      policy.value = selectedPolicyId ?? resolveDefaultPolicy(selectedTaskItem);

      if (warnings.length > 0 && selectedTaskItem) {
        const defaultPolicyName = selectedTaskItem.policies.find(p => p.id === policy.value)?.name ?? 'default';
        urlParamErrorMessage.value = `${warnings.join('. ')}.\n\nLoading default: ${selectedTaskItem.name} - ${defaultPolicyName}`;
      } else {
        urlParamErrorMessage.value = '';
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      throw error;
    }
  }

  return {
    config,
    task,
    policy,
    taskItems,
    policyItems,
    selectedTask,
    selectedPolicy,
    currentProjectLabel,
    urlParamErrorMessage,
    resolveDefaultPolicy,
    loadConfig,
  };
}
