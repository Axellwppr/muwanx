import { computed } from 'vue';

export interface RouteItem {
  name: string;
  path: string;
  title: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  config?: string | null;
}

export function useUrlSync(options: {
  getSceneName: () => string | null;
  getPolicyName: () => string | null;
  projects?: ProjectItem[];
}) {
  const { getSceneName, getPolicyName, projects } = options;

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
      let hashBase = window.location.hash.split('?')[0] || '#';
      // Ensure default project uses #/ format
      if (hashBase === '#') {
        hashBase = '#/';
      }
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
    // If projects list is provided, use it to generate route items
    if (projects && projects.length > 0) {
      return projects.map((project, index) => ({
        name: project.id,
        path: index === 0 ? '#/' : `#/${project.id}`,
        title: project.name
      }));
    }
    return [];
  });

  // Handle project switching via hash navigation
  function goToRoute(r: { name: any; path: string }) {
    if (r.path) {
      // Validate that the path is in the allowed list to prevent open redirect
      const allowedPaths = routeItems.value.map(item => item.path);
      if (!allowedPaths.includes(r.path)) {
        console.warn('Invalid route path rejected:', r.path);
        return;
      }

      // Clear any existing query params when switching projects
      const newHash = r.path.replace('#', '');

      // Additional validation: ensure the hash is a relative path
      if (newHash.includes(':') || newHash.startsWith('//')) {
        console.warn('Potentially unsafe route rejected:', newHash);
        return;
      }

      // Build clean URL with just the project hash (no query params)
      const cleanUrl = window.location.origin + window.location.pathname + '#' + newHash;
      window.location.href = cleanUrl;
    }
  }

  return { sync, routeItems, goToRoute };
}
