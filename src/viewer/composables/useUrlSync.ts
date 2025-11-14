import { computed } from 'vue';

export function useUrlSync(options: {
  getSceneName: () => string | null;
  getPolicyName: () => string | null;
}) {
  const { getSceneName, getPolicyName } = options;

  function getSearchParams() {
    // Get search params from hash (e.g., #project?scene=x&policy=y)
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      return new URLSearchParams(hashParts[1]);
    }
    return new URLSearchParams();
  }

  function sync() {
    try {
      const sceneName = getSceneName();
      const policyName = getPolicyName();
      const params = getSearchParams();

      // Update params based on current state
      if (sceneName) {
        params.set('scene', sceneName);
      } else {
        params.delete('scene');
      }

      if (policyName) {
        params.set('policy', policyName);
      } else {
        params.delete('policy');
      }

      // Update URL hash with new params
      const hashBase = window.location.hash.split('?')[0] || '#';
      const paramsString = params.toString();
      const newHash = paramsString ? `${hashBase}?${paramsString}` : hashBase;

      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    } catch (e) {
      console.warn('Failed to sync URL with selection:', e);
    }
  }

  // Return empty array since we don't have routes anymore
  const routeItems = computed(() => {
    return [] as { name: any; path: string; title: string }[];
  });

  // No-op function since we don't have routes
  function goToRoute(r: { name: any; path: string }) {
    // Do nothing - routes are not supported without Vue Router
  }

  return { sync, routeItems, goToRoute };
}

