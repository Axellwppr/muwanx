import { computed } from 'vue';
import type { AppConfig, TaskConfigItem, PolicyConfigItem } from '@/types/config';

export function useScenePolicy(options: {
  config: { value: AppConfig };
  task: { value: string | null };
  policy: { value: string | null };
  resolveDefaultPolicy: (task: TaskConfigItem | null) => string | null;
  onTaskChange: (taskItem: TaskConfigItem, defaultPolicy: PolicyConfigItem | null, withTransition: (m: string, a: () => Promise<any>) => Promise<any>) => Promise<any>;
  onPolicyChange: (taskItem: TaskConfigItem, policyItem: PolicyConfigItem, withTransition: (m: string, a: () => Promise<any>) => Promise<any>) => Promise<any>;
  withTransition: (message: string, act: () => Promise<any>) => Promise<any>;
}) {
  const { config, task, policy, resolveDefaultPolicy, onTaskChange, onPolicyChange, withTransition } = options;

  const selectedTask = computed<TaskConfigItem | null>(() => (config.value.tasks || []).find(t => t.id === task.value) ?? null);
  const selectedPolicy = computed<PolicyConfigItem | null>(() => (selectedTask.value?.policies || []).find(p => p.id === policy.value) ?? null);

  async function selectTask(id: string) {
    const nextTask = (config.value.tasks || []).find(t => t.id === id) ?? null;
    if (!nextTask) return;
    task.value = nextTask.id;
    const defaultPolicyId = resolveDefaultPolicy(nextTask);
    const defaultPolicy = (nextTask.policies || []).find(p => p.id === defaultPolicyId) ?? null;
    policy.value = defaultPolicy?.id ?? null;
    await onTaskChange(nextTask, defaultPolicy, withTransition);
  }

  async function selectPolicy(id: string) {
    const t = selectedTask.value;
    const p = (t?.policies || []).find(pp => pp.id === id) ?? null;
    if (!t || !p) return;
    policy.value = id;
    await onPolicyChange(t, p, withTransition);
  }

  function navigateScene(direction: 1 | -1) {
    const list = config.value.tasks || [];
    if (!list.length) return;
    const currentIndex = list.findIndex(t => t.id === task.value);
    if (currentIndex < 0) return;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = list.length - 1;
    if (nextIndex >= list.length) nextIndex = 0;
    const nextTask = list[nextIndex];
    selectTask(nextTask.id);
  }

  function navigatePolicy(direction: 1 | -1) {
    const t = selectedTask.value;
    const list = t?.policies || [];
    if (!t || !list.length) return;
    const currentIndex = list.findIndex(p => p.id === policy.value);
    if (currentIndex < 0) return;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = list.length - 1;
    if (nextIndex >= list.length) nextIndex = 0;
    const nextPolicy = list[nextIndex];
    selectPolicy(nextPolicy.id);
  }

  return { selectedTask, selectedPolicy, selectTask, selectPolicy, navigateScene, navigatePolicy };
}
