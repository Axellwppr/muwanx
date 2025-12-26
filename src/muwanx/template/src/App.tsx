import React, { useEffect, useState, useMemo } from 'react';

interface PolicyConfig {
  name: string;
  metadata: Record<string, any>;
}

interface SceneConfig {
  name: string;
  metadata: Record<string, any>;
  policies: PolicyConfig[];
}

interface ProjectConfig {
  name: string;
  id: string | null;
  metadata: Record<string, any>;
  scenes: SceneConfig[];
}

interface AppConfig {
  version: string;
  projects: ProjectConfig[];
}

/**
 * Extract project ID from current location
 * Returns null for main project (no path or path is /)
 * Returns the first path segment for other projects
 */
function getProjectIdFromLocation(): string | null {
  const path = window.location.pathname;
  // Remove leading slash and trailing slashes
  const cleanPath = path.replace(/^\/|\/$/g, '');

  // If no path or path is empty, it's the main project
  if (!cleanPath) {
    return null;
  }

  // Extract first path segment (project ID)
  const segments = cleanPath.split('/');
  const projectId = segments[0];

  // Ignore if it looks like a file or reserved path
  if (projectId.includes('.') || projectId === 'assets') {
    return null;
  }

  return projectId;
}

function App() {
  const [allProjects, setAllProjects] = useState<ProjectConfig[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = useMemo(() => getProjectIdFromLocation(), []);

  useEffect(() => {
    // Load root config.json from assets directory
    // All project index.html files reference the same root assets using absolute path
    const configPath = `${import.meta.env.BASE_URL}assets/config.json`.replace(/\/+/g, '/');
    fetch(configPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load config.json: ${response.status}`);
        }
        return response.json();
      })
      .then((config: AppConfig) => {
        setAllProjects(config.projects);

        // Find the current project based on URL
        const found = config.projects.find(p => {
          // For main project (id=null), only match if projectId is null
          if (projectId === null) {
            return p.id === null;
          }
          // For other projects, match by id
          return p.id === projectId;
        });

        setCurrentProject(found || null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load config:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [projectId]);


  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <p style={{marginTop: '1rem', fontSize: '0.9rem', color: '#666'}}>
            Project ID: {projectId ? projectId : '(main)'}
          </p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Project Not Found</h2>
          <p>
            {projectId
              ? `Project "${projectId}" not found.`
              : 'No main project configured.'}
          </p>
          {allProjects.length > 0 && (
            <div style={{marginTop: '1rem'}}>
              <p style={{marginBottom: '0.5rem'}}>Available projects:</p>
              <ul style={{margin: 0, paddingLeft: '1.5rem'}}>
                {allProjects.map(p => (
                  <li key={p.id || 'main'}>
                    <a href={p.id ? `/${p.id}/` : '/'} style={{color: '#0066cc'}}>
                      {p.name} {p.id ? `(/${p.id}/)` : '(/)'}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{currentProject.name}</h1>

      <nav style={styles.nav}>
        <div style={styles.navItem}>
          <span style={styles.navLabel}>Current Project:</span>
          <span style={styles.navValue}>
            {currentProject.id || '(main)'}
          </span>
        </div>
        {allProjects.length > 1 && (
          <div style={styles.navItem}>
            <span style={styles.navLabel}>Other Projects:</span>
            <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
              {allProjects.map(p => (
                p.id !== currentProject.id && (
                  <a
                    key={p.id || 'main'}
                    href={p.id ? `/${p.id}/` : '/'}
                    style={styles.projectLink}
                  >
                    {p.name}
                  </a>
                )
              ))}
            </div>
          </div>
        )}
      </nav>

      <div style={styles.section}>
        <h2 style={styles.subtitle}>Scenes & Policies</h2>
        <p style={{color: '#666', fontSize: '0.9rem', marginBottom: '1rem'}}>
          Project Asset Path: <code style={{backgroundColor: '#f5f5f5', padding: '0.2rem 0.4rem'}}>
            {projectId ? `${projectId}/assets/` : 'main/assets/'}
          </code>
        </p>
        <ul style={styles.tree}>
          {currentProject.scenes.map(scene => {
            const sceneMetadataKeys = Object.keys(scene.metadata || {});
            return (
              <li key={scene.name} style={styles.treeNode}>
                <details style={styles.sceneDetails} open>
                  <summary style={styles.sceneSummary}>
                    <span aria-hidden="true" style={styles.sceneDot} />
                    <span style={styles.sceneName}>{scene.name}</span>
                    <span style={styles.metaPill}>
                      {scene.policies.length} {scene.policies.length === 1 ? 'policy' : 'policies'}
                    </span>
                    {sceneMetadataKeys.length > 0 && (
                      <span style={styles.metaPill}>
                        metadata: {sceneMetadataKeys.length} keys
                      </span>
                    )}
                  </summary>
                  <ul style={styles.treeBranch}>
                    {scene.policies.map(policy => {
                      const policyMetadataKeys = Object.keys(policy.metadata || {});
                      return (
                        <li key={policy.name} style={styles.treeNode}>
                          <div style={styles.policyRow}>
                            <span aria-hidden="true" style={styles.policyDot} />
                            <span style={styles.policyName}>{policy.name}</span>
                            {policyMetadataKeys.length > 0 && (
                              <span style={styles.metaPill}>
                                metadata: {policyMetadataKeys.length} keys
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      </div>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Muwanx - Hybrid Structure (shared app, per-project assets)
        </p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    lineHeight: '1.6',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '1.2rem',
    color: '#6c757d',
  },
  error: {
    padding: '2rem',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c2c7',
    borderRadius: '8px',
    color: '#842029',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
    color: '#1a1a1a',
    fontWeight: '700',
  },
  nav: {
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  navItem: {
    marginBottom: '0.75rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.75rem',
  },
  navLabel: {
    fontWeight: '600',
    color: '#495057',
    minWidth: '150px',
  },
  navValue: {
    padding: '0.35rem 0.6rem',
    backgroundColor: '#e7f5ff',
    borderRadius: '4px',
    color: '#0b7285',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  },
  projectLink: {
    padding: '0.5rem 0.75rem',
    backgroundColor: '#ffffff',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    color: '#0066cc',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  section: {
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  subtitle: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
    color: '#495057',
    fontWeight: '600',
  },
  tree: {
    margin: '0',
    paddingLeft: '0',
    listStyle: 'none',
  },
  treeBranch: {
    margin: '0.5rem 0 0.5rem 1.5rem',
    paddingLeft: '1rem',
    listStyle: 'none',
    borderLeft: '2px solid #dee2e6',
  },
  treeNode: {
    margin: '0.35rem 0',
    color: '#495057',
  },
  sceneDetails: {
    margin: '0',
  },
  sceneSummary: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.6rem',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    cursor: 'pointer',
    listStyle: 'none',
  },
  policyRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.3rem 0.5rem',
  },
  sceneDot: {
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    backgroundColor: '#1971c2',
  },
  policyDot: {
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    backgroundColor: '#2f9e44',
  },
  sceneName: {
    fontWeight: '600',
    color: '#343a40',
  },
  policyName: {
    fontWeight: '500',
    color: '#495057',
  },
  metaPill: {
    padding: '2px 8px',
    borderRadius: '999px',
    backgroundColor: '#f1f3f5',
    color: '#495057',
    fontSize: '0.85rem',
  },
  footer: {
    marginTop: '3rem',
    paddingTop: '2rem',
    borderTop: '1px solid #dee2e6',
    textAlign: 'center',
  },
  footerText: {
    color: '#6c757d',
    fontSize: '0.9rem',
  },
};

export default App;
