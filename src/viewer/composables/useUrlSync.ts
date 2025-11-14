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

  // Define available projects for the dropdown
  const routeItems = computed(() => {
    return [
      { name: 'default', path: '#', title: 'Muwanx Demo' },
      { name: 'menagerie', path: '#menagerie', title: 'MuJoCo Menagerie' },
      { name: 'playground', path: '#playground', title: 'MuJoCo Playground' },
      { name: 'myosuite', path: '#myosuite', title: 'MyoSuite' },
    ];
  });

  // Handle project switching via hash navigation
  function goToRoute(r: { name: any; path: string }) {
    if (r.path) {
      window.location.hash = r.path.replace('#', '');
      // Reload to reinitialize MuJoCo runtime with new config
      window.location.reload();
    }
  }

  return { sync, routeItems, goToRoute };
}

