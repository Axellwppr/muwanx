import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MuwanxViewer from './components/MuwanxViewer';

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
      if (contentType.includes('text/html') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
        throw new Error(`Received HTML from ${url}`);
      }
      try {
        return JSON.parse(text) as AppConfig;
      } catch (error) {
        throw new Error(`Invalid JSON from ${url}: ${error instanceof Error ? error.message : String(error)}`);
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
    project.scenes.find(scene => scene.name.toLowerCase() === normalized) ||
    project.scenes.find(scene => sanitizeName(scene.name) === normalized) ||
    project.scenes[0]
  );
}

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectConfig | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneConfig | null>(null);
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
        const project = data.projects.find(p => {
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
      .catch(err => {
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

  const handleViewerError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  if (error) {
    return (
      <div className="app">
        <div className="hud hud-error">
          <h1 className="hud-title">Muwanx</h1>
          <p className="hud-message">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentProject || !currentScene || !scenePath) {
    return (
      <div className="app">
        <div className="hud">
          <h1 className="hud-title">Muwanx</h1>
          <p className="hud-message">{viewerStatus}</p>
        </div>
      </div>
    );
  }

  const projectLabel = currentProject.id ? currentProject.id : '(main)';
  const sceneLabel = currentScene.name;

  return (
    <div className="app">
      <MuwanxViewer
        scenePath={scenePath}
        baseUrl={import.meta.env.BASE_URL || '/'}
        onStatusChange={setViewerStatus}
        onError={handleViewerError}
      />
      <div className="hud">
        <div className="hud-row">
          <span className="hud-kicker">Project</span>
          <span className="hud-value">{currentProject.name}</span>
          <span className="hud-tag">{projectLabel}</span>
        </div>
        <div className="hud-row">
          <span className="hud-kicker">Scene</span>
          <span className="hud-value">{sceneLabel}</span>
          {sceneQuery && (
            <span className="hud-tag">scene={sceneQuery}</span>
          )}
        </div>
        <div className="hud-row hud-muted">
          <span className="hud-kicker">Status</span>
          <span className="hud-value">{viewerStatus}</span>
        </div>
        {config && config.projects.length > 1 && (
          <div className="hud-row hud-links">
            {config.projects.map(project => {
              const href = `${import.meta.env.BASE_URL}${project.id ? `${project.id}/` : ''}`.replace(/\/+/g, '/');
              const isActive = project.id === currentProject.id;
              return (
                <a
                  key={project.id || 'main'}
                  className={isActive ? 'hud-link active' : 'hud-link'}
                  href={href}
                >
                  {project.name}
                </a>
              );
            })}
          </div>
        )}
        <div className="hud-row hud-muted">
          <span className="hud-kicker">Hint</span>
          <span className="hud-value">Use ?scene=SceneName in the URL.</span>
        </div>
      </div>
    </div>
  );
}

export default App;
