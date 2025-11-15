#!/usr/bin/env node

/**
 * sync-version.js
 *
 * Syncs version numbers from version.json to package.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read version.json
const versionPath = join(rootDir, 'version.json');
const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));

// Read package.json
const packagePath = join(rootDir, 'package.json');
const packageData = JSON.parse(readFileSync(packagePath, 'utf-8'));

// Update package.json version
packageData.version = versionData.package;

// Write updated package.json
writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');

console.log(`✓ Synced version ${versionData.package} to package.json`);
