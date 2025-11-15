#!/usr/bin/env node

import { mujocoAssetCollector } from '../src/core/engine/utils/mujocoAssetCollector.ts';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { load as loadYaml } from 'js-yaml';

// Get the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Mock fetch for Node.js environment
global.fetch = async (url, options = {}) => {
  try {
    // Convert URL to file path
    const urlPath = url.replace(/^.*\/examples\/assets\/scene\//, '');
    // Use absolute path based on project root for reliability
    const filePath = path.join(projectRoot, 'examples', 'assets', 'scene', urlPath);

    if (options.method === 'HEAD') {
      // Check if file exists
      try {
        await fs.access(filePath);
        return { ok: true };
      } catch {
        return { ok: false };
      }
    } else {
      // Read file content
      const content = await fs.readFile(filePath, 'utf8');
      return {
        ok: true,
        text: () => Promise.resolve(content)
      };
    }
  } catch (error) {
    return { ok: false, status: 404 };
  }
};

// Mock DOMParser for Node.js
global.DOMParser = class {
  parseFromString(xmlString, mimeType) {
    // Simple XML parser for testing - just extract elements and attributes
    const elements = [];
    const elementRegex = /<(\w+)([^>]*?)(?:\s*\/>|>)/g;
    let match;

    while ((match = elementRegex.exec(xmlString)) !== null) {
      const tagName = match[1];
      const attributesStr = match[2];

      const attributes = {};
      const attrRegex = /(\w+)\s*=\s*["']([^"']*?)["']/g;
      let attrMatch;

      while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
        attributes[attrMatch[1]] = attrMatch[2];
      }

      elements.push({
        tagName: tagName.toLowerCase(),
        getAttribute: (name) => attributes[name] || null,
        attributes: Object.keys(attributes).map(name => ({ name, value: attributes[name] }))
      });
    }

    return {
      documentElement: { tagName: 'root' },
      getElementsByTagName: (tagName) => {
        if (tagName === '*') return elements;
        return elements.filter(el => el.tagName === tagName.toLowerCase());
      },
      querySelector: (selector) => {
        if (selector === 'parsererror') return null;
        return null;
      }
    };
  }
};

async function testAssetCollector() {
  console.log('🧪 Testing MuJoCo Asset Collector\n');

  // Load test settings from YAML
  const yamlPath = path.join(projectRoot, 'tests', 'assets_map.yaml');
  const yamlText = await fs.readFile(yamlPath, 'utf8');
  const yamlDoc = loadYaml(yamlText);
  const testCases = (yamlDoc.testCases || []).map(tc => ({
    name: tc.name,
    model_xml: tc.model_xml,
    assets: (tc.assets || []).slice().sort(),
  }));

  let allTestsPassed = true;
  for (const testCase of testCases) {
    console.log(`\n📁 Testing: ${testCase.name}`);
    console.log('─'.repeat(50));

    try {
      const jsAssets = await mujocoAssetCollector.analyzeScene(testCase.model_xml, projectRoot);
      const expectedAssets = (testCase.assets || []).slice().sort();

      console.log(`✨ JavaScript found: ${jsAssets.length} assets`);
      console.log(`🎯 Expected: ${expectedAssets.length} assets`);

      // Compare results
      const missing = expectedAssets.filter(asset => !jsAssets.includes(asset));
      const extra = jsAssets.filter(asset => !expectedAssets.includes(asset));
      const matching = expectedAssets.filter(asset => jsAssets.includes(asset));

      console.log(`✅ Matching: ${matching.length} assets`);

      if (missing.length === 0 && extra.length === 0) {
        console.log('🎉 PERFECT MATCH!');
      } else {
        allTestsPassed = false;

        if (missing.length > 0) {
          console.log(`❌ Missing (${missing.length}):`);
          missing.forEach(asset => console.log(`   - ${asset}`));
        }

        if (extra.length > 0) {
          console.log(`⚠️  Extra (${extra.length}):`);
          extra.forEach(asset => console.log(`   + ${asset}`));
        }
      }

      if ((missing && missing.length > 0) || (extra && extra.length > 0)) {
        console.log('\n📋 JavaScript found:');
        jsAssets.forEach((asset, i) => console.log(`   ${i + 1}. ${asset}`));
      }

    } catch (error) {
      allTestsPassed = false;
      console.log(`💥 ERROR: ${error.message}`);
      console.error(error.stack);
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎊 ALL TESTS PASSED! Asset collector works correctly.');
  } else {
    console.log('❌ SOME TESTS FAILED. Asset collector needs fixes.');
  }
  console.log('='.repeat(60));
}

// Run the test
testAssetCollector().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
