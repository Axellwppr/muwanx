import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MantineProvider } from '@mantine/core';
import MuwanxViewer from './components/MuwanxViewer';
import ControlPanel from './ControlPanel';

interface PolicyConfig {
  name: string;
  metadata: Record<string, unknown>;
}

interface SceneConfig {
  name: string;
  metadata: Record<string, unknown>;
  policies: PolicyConfig[];
  path?: string;
}

interface ProjectConfig {
  name: string;
  id: string | null;
  metadata: Record<string, unknown>;
  scenes: SceneConfig[];
}

interface AppConfig {
  version: string;
  projects: ProjectConfig[];
}

function getProjectIdFromLocation(): string | null {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '/');
  const pathname = window.location.pathname;

  let pathClean = pathname.replace(/^\/+|\/+$/g, '');
  const baseClean = base.replace(/^\/+|\/+$/g, '');

  if (baseClean) {
    if (pathClean === baseClean) {
      pathClean = '';
    } else if (pathClean.startsWith(`${baseClean}/`)) {
      pathClean = pathClean.slice(baseClean.length + 1);
    }
  }

  if (!pathClean) {
    return null;
  }

  const projectId = pathClean.split('/')[0];
  if (projectId === 'main') {
    return null;
  }
  if (projectId.includes('.') || projectId === 'assets') {
    return null;
  }
  return projectId;
}

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
}

function buildConfigCandidates(baseUrl: string, projectId: string | null): string[] {
  const normalizedBase = (baseUrl || '/').replace(/\/+$/, '/');
  const candidates = new Set<string>();
  const add = (path: string, base?: string) => {
    if (!path) {
      return;
    }
    try {
      const resolved = new URL(path, base || window.location.href).toString();
      candidates.add(resolved);
    } catch {
      candidates.add(path.replace(/\/+/g, '/'));
    }
  };

  const originBase = `${window.location.origin}/`;
  const appBase = new URL(normalizedBase, originBase).toString();
  add('assets/config.json', appBase);

  const pathname = window.location.pathname;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (last === 'index.html') {
      parts.pop();
    }
  }
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (last === (projectId ?? 'main')) {
      parts.pop();
    }
  }
  const rootPath = `/${parts.join('/')}${parts.length ? '/' : ''}`;
  const rootBase = `${window.location.origin}${rootPath}`;
  add('assets/config.json', rootBase);

  add('assets/config.json');
  add('../assets/config.json');
  add('../../assets/config.json');

  return Array.from(candidates);
}

async function loadConfig(baseUrl: string, projectId: string | null): Promise<AppConfig> {
  const params = new URLSearchParams(window.location.search);
  const override = params.get('config');
  const candidates = buildConfigCandidates(baseUrl, projectId);
  if (override) {
    try {
      candidates.unshift(new URL(override, window.location.href).toString());
    } catch {
      candidates.unshift(override);
    }
  }
  let lastError: Error | null = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      const text = await response.text();
      const trimmed = text.trim();
      const contentType = response.headers.get('content-type') || '';
      if (
        contentType.includes('text/html') ||
        trimmed.startsWith('<!doctype') ||
        trimmed.startsWith('<html')
      ) {
        throw new Error(`Received HTML from ${url}`);
      }
      try {
        return JSON.parse(text) as AppConfig;
      } catch (error) {
        throw new Error(
          `Invalid JSON from ${url}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Failed to load config.json.');
}

function pickScene(project: ProjectConfig, sceneQuery: string | null): SceneConfig | null {
  if (!project.scenes.length) {
    return null;
  }
  if (!sceneQuery) {
    return project.scenes[0];
  }
  const normalized = sceneQuery.trim().toLowerCase();
  return (
    project.scenes.find((scene) => scene.name.toLowerCase() === normalized) ||
    project.scenes.find((scene) => sanitizeName(scene.name) === normalized) ||
    project.scenes[0]
  );
}

function updateUrlParams(
  projectId: string | null,
  sceneName: string | null,
  policyName: string | null
) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '/');
  const normalizedBase = base.replace(/^\//g, '').replace(/\/+$/g, '');

  let pathname = normalizedBase ? `/${normalizedBase}/` : '/';
  if (projectId && projectId !== 'main') {
    pathname += `${projectId}/`;
  }

  const params = new URLSearchParams();
  if (sceneName) {
    params.set('scene', sceneName);
  }
  if (policyName) {
    params.set('policy', policyName);
  }

  const newUrl = pathname + (params.toString() ? '?' + params.toString() : '');
  window.history.replaceState({}, '', newUrl);
}

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectConfig | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneConfig | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [viewerStatus, setViewerStatus] = useState<string>('Loading configuration...');
  const [error, setError] = useState<string | null>(null);

  const projectId = useMemo(() => getProjectIdFromLocation(), []);
  const sceneQuery = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('scene');
  }, []);

  useEffect(() => {
    loadConfig(import.meta.env.BASE_URL || '/', projectId)
      .then((data: AppConfig) => {
        setConfig(data);
        const project = data.projects.find((p) => {
          if (projectId === null) {
            return p.id === null;
          }
          return p.id === projectId;
        });
        if (!project) {
          throw new Error(`Project "${projectId ?? '(main)'}" not found in config.json.`);
        }
        setCurrentProject(project);
        const selectedScene = pickScene(project, sceneQuery);
        setCurrentScene(selectedScene);
        setSelectedMenu(selectedScene?.policies?.[0]?.name ?? null);
        if (selectedScene && sceneQuery) {
          const normalizedQuery = sceneQuery.trim().toLowerCase();
          const matched =
            selectedScene.name.toLowerCase() === normalizedQuery ||
            sanitizeName(selectedScene.name) === normalizedQuery;
          setViewerStatus(
            matched
              ? 'Preparing scene...'
              : `Scene "${sceneQuery}" not found. Loading "${selectedScene.name}".`
          );
        } else {
          setViewerStatus('Preparing scene...');
        }
      })
      .catch((err) => {
        console.error('Failed to load config:', err);
        setError(err.message || 'Failed to load config.');
      });
  }, [projectId, sceneQuery]);

  const scenePath = useMemo(() => {
    if (!currentProject || !currentScene) {
      return null;
    }
    const projectDir = currentProject.id ? currentProject.id : 'main';
    const sceneRelPath = currentScene.path
      ? currentScene.path
      : `scene/${sanitizeName(currentScene.name)}/scene.xml`;
    return `${projectDir}/assets/${sceneRelPath}`.replace(/\/+/g, '/');
  }, [currentProject, currentScene]);
  const projectOptions = useMemo(() => {
    if (!config) {
      return [] as { value: string; label: string }[];
    }
    return config.projects.map((project) => ({
      value: project.id ?? 'main',
      label: project.name || (project.id ?? 'Main'),
    }));
  }, [config]);

  const sceneOptions = useMemo(() => {
    if (!currentProject) {
      return [] as { value: string; label: string }[];
    }
    return currentProject.scenes.map((scene) => ({ value: scene.name, label: scene.name }));
  }, [currentProject]);

  const menuOptions = useMemo(() => {
    if (!currentScene || !currentScene.policies) {
      return [] as { value: string; label: string }[];
    }
    return currentScene.policies.map((policy) => ({ value: policy.name, label: policy.name }));
  }, [currentScene]);

  const projectValue = currentProject ? (currentProject.id ?? 'main') : null;
  const sceneValue = currentScene?.name ?? null;
  const handleViewerError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  const handleProjectChange = useCallback(
    (value: string | null) => {
      if (!config || !value) {
        return;
      }
      const normalized = value === 'main' ? null : value;
      const project = config.projects.find((p) => (p.id ?? 'main') === (normalized ?? 'main'));
      if (!project) {
        return;
      }
      setCurrentProject(project);
      const nextScene = pickScene(project, null);
      setCurrentScene(nextScene);
      const nextPolicy = nextScene?.policies?.[0]?.name ?? null;
      setSelectedMenu(nextPolicy);
      updateUrlParams(project.id, nextScene?.name ?? null, nextPolicy);
      setViewerStatus('Preparing scene...');
    },
    [config]
  );

  const handleSceneChange = useCallback(
    (value: string | null) => {
      if (!currentProject || !value) {
        return;
      }
      const scene = currentProject.scenes.find((s) => s.name === value);
      if (!scene) {
        return;
      }
      setCurrentScene(scene);
      const nextPolicy = scene.policies?.[0]?.name ?? null;
      setSelectedMenu(nextPolicy);
      updateUrlParams(currentProject.id, value, nextPolicy);
      setViewerStatus('Preparing scene...');
    },
    [currentProject]
  );

  const handleMenuChange = useCallback(
    (value: string | null) => {
      setSelectedMenu(value);
      updateUrlParams(currentProject?.id ?? null, currentScene?.name ?? null, value);
    },
    [currentProject, currentScene]
  );

  if (error) {
    return (
      <MantineProvider>
        <div className="app">
          <div className="hud hud-error">
            <h1 className="hud-title">Muwanx</h1>
            <p className="hud-message">{error}</p>
          </div>
        </div>
      </MantineProvider>
    );
  }

  if (!currentProject || !currentScene || !scenePath) {
    return (
      <MantineProvider>
        <div className="app">
          <div className="hud">
            <h1 className="hud-title">Muwanx</h1>
            <p className="hud-message">{viewerStatus}</p>
          </div>
        </div>
      </MantineProvider>
    );
  }

  return (
    <MantineProvider>
      <div className="app">
        <ControlPanel
          projects={projectOptions}
          projectValue={projectValue}
          onProjectChange={handleProjectChange}
          scenes={sceneOptions}
          sceneValue={sceneValue}
          onSceneChange={handleSceneChange}
          menus={menuOptions}
          menuValue={selectedMenu}
          onMenuChange={handleMenuChange}
        />
        <MuwanxViewer
          scenePath={scenePath}
          baseUrl={import.meta.env.BASE_URL || '/'}
          onStatusChange={setViewerStatus}
          onError={handleViewerError}
        />
      </div>
    </MantineProvider>
  );
}

export default App;
