import { ref, nextTick } from 'vue';

export function useTransition() {
  const isTransitioning = ref(false);
  const transitionMessage = ref('');

  async function withTransition(message: string, action: () => Promise<any> | any) {
    transitionMessage.value = message;
    isTransitioning.value = true;
    // Give Vue time to render the overlay before starting heavy work
    await nextTick();
    // Two RAFs + a macrotask tend to guarantee a paint on busy UIs
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    try {
      const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const result = await action();
      // Ensure the spinner is visible for at least a short time
      const minVisibleMs = 150;
      const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const elapsed = end - start;
      if (elapsed < minVisibleMs) {
        await new Promise<void>(r => setTimeout(r, minVisibleMs - elapsed));
      }
      return result;
    } finally {
      isTransitioning.value = false;
      transitionMessage.value = '';
    }
  }

  return { isTransitioning, transitionMessage, withTransition };
}
