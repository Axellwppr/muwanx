# URL Parameters

| Parameter | Description | Values | Default |
|------------|-------------|---------|----------|
| `scene` | Mujoco scene to load | Any scene name from `config.json` | First scene in config |
| `policy` | Control policy to use | Any policy name for the scene from `config.json` | Default policy for the scene |
| `hidectrl` | Control panel UI visibility | `1` | Show all UI elements |

## Examples

```bash
https://ttktjmt.github.io/muwanx/#/?hidectrl=1
https://ttktjmt.github.io/muwanx/#/?scene=go2&policy=facet
https://ttktjmt.github.io/muwanx/#/myosuite?scene=finger
https://ttktjmt.github.io/muwanx/#/myosuite/?scene=finger
https://ttktjmt.github.io/muwanx/#/?scene=Go2&policy=Robust&hidectrl=1
```

## Syntax

```bash
https://ttktjmt.github.io/muwanx/#/?scene=<scene_name>&policy=<policy_name>&hidectrl=1
```
⚠️ Query parameters **must** be placed after the hash (#). Placing them before the hash will not work:
`https://ttktjmt.github.io/muwanx?scene=go2`  
This sends the query to the GitHub Pages server, not to the app.

## Notes

1. All parameters are optional and case-insensitive.
1. Scene name matches against `task.name` in config
1. Policy name matches against `policy.name` for that scene
1. Invalid values fall back to defaults with console warnings
