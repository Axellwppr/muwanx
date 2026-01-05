import { Paper, Select, Stack, Text } from '@mantine/core';

export interface SelectOption {
  value: string;
  label: string;
}

interface ControlPanelProps {
  projects: SelectOption[];
  projectValue: string | null;
  onProjectChange: (value: string | null) => void;
  scenes: SelectOption[];
  sceneValue: string | null;
  onSceneChange: (value: string | null) => void;
  menus: SelectOption[];
  menuValue: string | null;
  onMenuChange: (value: string | null) => void;
}

function ControlPanel(props: ControlPanelProps) {
  const {
    projects,
    projectValue,
    onProjectChange,
    scenes,
    sceneValue,
    onSceneChange,
    menus,
    menuValue,
    onMenuChange,
  } = props;

  // Only show panel if we have data to display
  if (!projects.length && !scenes.length && !menus.length) {
    return null;
  }

  return (
    <Paper
      withBorder
      radius="xs"
      shadow="0 0 1em 0 rgba(0,0,0,0.1)"
      style={{
        position: 'absolute',
        top: '1em',
        right: '1em',
        width: '20em',
        zIndex: 10,
        padding: '0.5em 0.75em',
      }}
    >
      <Stack gap="xs">
        <Text size="xs" fw={500} style={{ opacity: 0.8 }}>
          Configuration
        </Text>

        {projects.length > 1 && (
          <Select
            label="Project"
            placeholder="Select project"
            data={projects}
            value={projectValue}
            onChange={onProjectChange}
            size="xs"
            radius="xs"
            searchable
            clearable={false}
            styles={{
              label: { fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' },
              input: { minHeight: '1.625rem', height: '1.625rem', padding: '0.5em' },
            }}
            comboboxProps={{ zIndex: 1000 }}
          />
        )}

        {scenes.length > 0 && (
          <Select
            label="Scene"
            placeholder="Select scene"
            data={scenes}
            value={sceneValue}
            onChange={onSceneChange}
            size="xs"
            radius="xs"
            searchable
            clearable={false}
            styles={{
              label: { fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' },
              input: { minHeight: '1.625rem', height: '1.625rem', padding: '0.5em' },
            }}
            comboboxProps={{ zIndex: 1000 }}
          />
        )}

        {menus.length > 0 && (
          <Select
            label="Policy"
            placeholder="Select policy"
            data={menus}
            value={menuValue}
            onChange={onMenuChange}
            size="xs"
            radius="xs"
            searchable
            clearable
            styles={{
              label: { fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' },
              input: { minHeight: '1.625rem', height: '1.625rem', padding: '0.5em' },
            }}
            comboboxProps={{ zIndex: 1000 }}
          />
        )}
      </Stack>
    </Paper>
  );
}

export default ControlPanel;
