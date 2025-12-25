import React, { useEffect, useState } from 'react';

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

function App() {
  const [allProjects, setAllProjects] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load config.json from assets directory with proper base path
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
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load config:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);


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
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Muwanx Configuration Tree</h1>

      <div style={styles.section}>
        <ul style={styles.tree}>
          {allProjects.map(project => {
            const metadataKeys = Object.keys(project.metadata || {});
            return (
              <li key={project.name} style={styles.treeNode}>
                <details style={styles.projectDetails} open>
                  <summary style={styles.projectSummary}>
                    <span aria-hidden="true" style={styles.projectDot} />
                    <span style={styles.projectName}>{project.name}</span>
                    <span style={styles.metaPill}>
                      {project.id ? `id: ${project.id}` : 'id: (main)'}
                    </span>
                    <span style={styles.metaPill}>
                      {project.scenes.length} {project.scenes.length === 1 ? 'scene' : 'scenes'}
                    </span>
                    {metadataKeys.length > 0 && (
                      <span style={styles.metaPill}>metadata: {metadataKeys.length} keys</span>
                    )}
                  </summary>
                  <ul style={styles.treeBranch}>
                    {project.scenes.map(scene => {
                      const sceneMetadataKeys = Object.keys(scene.metadata || {});
                      return (
                        <li key={scene.name} style={styles.treeNode}>
                          <details style={styles.sceneDetails}>
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
                </details>
              </li>
            );
          })}
        </ul>
      </div>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Muwanx - Configuration loaded from config.json
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
    marginBottom: '2rem',
    color: '#1a1a1a',
    fontWeight: '700',
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
  projectDetails: {
    margin: '0',
  },
  projectSummary: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: '10px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    listStyle: 'none',
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
  projectDot: {
    width: '12px',
    height: '12px',
    borderRadius: '999px',
    backgroundColor: '#0b7285',
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
  projectName: {
    fontWeight: '700',
    color: '#212529',
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
