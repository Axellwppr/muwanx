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
  id?: string;
  metadata: Record<string, any>;
  scenes: SceneConfig[];
}

interface AppConfig {
  version: string;
  projects: ProjectConfig[];
}

async function init() {
  const root = document.getElementById('root');
  if (!root) return;

  try {
    const response = await fetch('./config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }
    const config: AppConfig = await response.json();

    const container = document.createElement('div');
    container.style.fontFamily = 'monospace';
    container.style.padding = '20px';

    const title = document.createElement('h1');
    title.textContent = 'Muwanx App Structure';
    container.appendChild(title);

    config.projects.forEach(project => {
      const projectDiv = document.createElement('div');
      projectDiv.style.marginBottom = '20px';
      projectDiv.style.border = '1px solid #ccc';
      projectDiv.style.padding = '10px';

      const projectName = document.createElement('h2');
      projectName.textContent = `Project: ${project.name}`;
      projectDiv.appendChild(projectName);

      project.scenes.forEach(scene => {
        const sceneDiv = document.createElement('div');
        sceneDiv.style.marginLeft = '20px';

        const sceneName = document.createElement('h3');
        sceneName.textContent = `Scene: ${scene.name}`;
        sceneDiv.appendChild(sceneName);

        if (scene.policies.length > 0) {
          const policiesList = document.createElement('ul');
          scene.policies.forEach(policy => {
            const policyItem = document.createElement('li');
            policyItem.textContent = `Policy: ${policy.name}`;
            policiesList.appendChild(policyItem);
          });
          sceneDiv.appendChild(policiesList);
        } else {
          const noPolicy = document.createElement('p');
          noPolicy.textContent = 'No policies';
          noPolicy.style.fontStyle = 'italic';
          sceneDiv.appendChild(noPolicy);
        }

        projectDiv.appendChild(sceneDiv);
      });

      container.appendChild(projectDiv);
    });

    root.appendChild(container);

  } catch (error) {
    console.error(error);
    root.textContent = `Error loading application: ${error}`;
  }
}

init();
