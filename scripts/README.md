# Scripts

This directory contains utility scripts for the muwanx project.

## Version Management

All version numbers in this project are centralized in `/version.json`.

### `sync-version.js`

Syncs version numbers from `version.json` to `package.json`.

This script automatically runs before builds via npm hooks (`prebuild` and `prebuild:lib`).

**Manual usage:**
```bash
npm run version:sync
```

### Version File Structure

`/version.json` contains:
- `package`: Package version number (synced to package.json)
- `node`: Node.js version for CI/CD
- `actions`: GitHub Actions version tags

**Example:**
```json
{
  "package": "0.0.0",
  "node": "20",
  "actions": {
    "checkout": "v4",
    "setup-node": "v4",
    "configure-pages": "v4",
    "upload-pages-artifact": "v3",
    "deploy-pages": "v4"
  }
}
```

### Updating Versions

1. Edit `/version.json` with new version numbers
2. Run `npm run version:sync` to update package.json
3. For GitHub Actions versions, update `version.json` and manually update `.github/workflows/deploy.yml` (comments indicate which field to sync)

The sync happens automatically before builds, ensuring consistency across the project.
