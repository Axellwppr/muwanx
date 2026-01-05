/**
 * MuJoCo Asset Collector
 *
 * This component analyzes MuJoCo XML files to detect all referenced assets.
 * (meshes, textures, includes, etc.)
 *
 * Usage:
 *   const collector = new MuJoCoAssetCollector();
 *   const assets = await collector.analyzeScene('./examples/scenes/unitree_go2/scene.xml');
 */

export class MuJoCoAssetCollector {
  private REFERENCE_ATTRS: Set<string>;
  private TAG_DIRECTORY_HINTS: Record<string, string[]>;
  private BINARY_EXTENSIONS: string[];
  private cache: Map<string, string[]>;
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    // Attributes that may reference external resources
    this.REFERENCE_ATTRS = new Set([
      'file', 'href', 'src',
      'fileup', 'fileback', 'filedown',
      'filefront', 'fileleft', 'fileright'
    ]);

    // Map MJCF tags to compiler attributes that provide directory hints
    this.TAG_DIRECTORY_HINTS = {
      'include': ['includedir'],
      'mesh': ['meshdir'],
      'texture': ['texturedir'],
      'heightfield': ['heightfielddir'],
      'skin': ['skindir'],
    };

    this.BINARY_EXTENSIONS = ['.png', '.stl', '.skn', '.mjb'];

    this.cache = new Map();
    this.debug = options.debug || false;
  }

  /**
   * Analyze a MuJoCo XML file and return all referenced assets
   * @param {string} xmlPath - Path to the root XML file (e.g., 'unitree_go2/scene.xml')
   * @param {string} baseUrl - Base URL for fetching files (default: './examples/scenes')
   * @returns {Promise<Array<string>>} Array of relative asset paths
   */
  async analyzeScene(xmlPath: string, baseUrl: string = './'): Promise<Array<string>> {

    // Input validation
    if (!xmlPath || typeof xmlPath !== 'string') {
      throw new Error(`Invalid xmlPath: ${xmlPath}`);
    }

    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error(`Invalid baseUrl: ${baseUrl}`);
    }

    // Normalize the xmlPath to handle both 'unitree_go2/scene.xml' and '/examples/scenes/unitree_go2/scene.xml'
    let normalizedXmlPath = this._normalizePath(xmlPath);

    const cacheKey = `${baseUrl}/${normalizedXmlPath}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      return Array.isArray(cached) ? cached : [];
    }

    try {
      const result = await this._collectAssets(normalizedXmlPath, baseUrl);
      const validResult: Array<string> = Array.isArray(result) ? result : [];
      this.cache.set(cacheKey, validResult);
      return validResult;
    } catch (error) {
      console.error(`[MuJoCoAssetCollector] Error analyzing scene ${xmlPath}:`, error);
      // Return empty array to allow fallback to index.json in mujocoScene.js
      return [];
    }
  }

  /**
   * Clear the analysis cache
   */
  clearCache() {
    this.cache.clear();
  }

  async _collectAssets(rootPath: string, baseUrl: string): Promise<Array<string>> {
    const rootDir = this._getDirectoryPath(rootPath);

    const visited = new Set();
    const collected = new Set<string>();

    const walk = async (filePath, parentHints = {}) => {
      const normalizedPath = this._normalizePath(filePath);
      const fullFilePath = `${baseUrl}/${normalizedPath}`;

      if (visited.has(normalizedPath)) {
        return;
      }
      visited.add(normalizedPath);

      // Add the file itself to collected assets
      collected.add(normalizedPath);

      let xmlContent;
      try {
        const response = await fetch(fullFilePath);
        if (!response.ok) {
          console.warn(`[MuJoCoAssetCollector] Failed to fetch ${fullFilePath}: ${response.status}`);
          return;
        }
        xmlContent = await response.text();
      } catch (error) {
        console.error(`[MuJoCoAssetCollector] Error fetching ${filePath}:`, error);
        return;
      }

      const baseDir = this._getDirectoryPath(normalizedPath);
      const localHints = this._parseCompilerDirectories(xmlContent, baseDir);
      const directoryHints = this._mergeDirectoryHints(parentHints, localHints);

      // Parse XML and find references
      const parser = new DOMParser();
      let xmlDoc;
      try {
        xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
          throw new Error(parseError.textContent);
        }
      } catch (error) {
        console.warn(`[MuJoCoAssetCollector] Failed to parse XML ${filePath}:`, error.message);
        return;
      }

      // Walk through all elements to find references
      const allElements = xmlDoc.getElementsByTagName('*');

      for (const element of allElements) {
        const tagName = this._stripNamespace(element.tagName.toLowerCase());

        for (const attrName of this.REFERENCE_ATTRS) {
          const attrValue = element.getAttribute(attrName);
          if (!attrValue) continue;

          const reference = await this._resolveReference(
            attrValue,
            tagName,
            attrName,
            baseDir,
            directoryHints,
            baseUrl,
            rootDir
          );

          if (reference) {
            if ('path' in reference) {
              collected.add(reference.path);

              // Recursively process include files
              if (tagName === 'include' && attrName === 'file') {
                await walk(reference.path, directoryHints);
              }
            } else if ('text' in reference) {
              collected.add(reference.text);
            }
          }
        }
      }
    };

    try {
      await walk(rootPath);
    } catch (error) {
      console.error(`[MuJoCoAssetCollector] Error during asset collection for ${rootPath}:`, error);
      throw error;
    }

    const result: Array<string> = Array.from(collected).sort();

    // Validate result
    if (!Array.isArray(result)) {
      console.error('[MuJoCoAssetCollector] Internal error: result is not an array');
      return [];
    }

    console.log(`[MuJoCoAssetCollector] Successfully analyzed ${rootPath}: found ${result.length} assets`);
    return result;
  }

  _parseCompilerDirectories(xmlContent: string, baseDir: string) {
    const directories: Record<string, string[]> = {};

    // Parse XML properly to find all compiler elements
    const parser = new DOMParser();
    let xmlDoc;
    try {
      xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        return this._parseCompilerDirectoriesRegex(xmlContent, baseDir);
      }
    } catch (error) {
      return this._parseCompilerDirectoriesRegex(xmlContent, baseDir);
    }

    // Find all compiler elements
    const compilerElements = xmlDoc.getElementsByTagName('compiler');

    for (const compiler of compilerElements) {
      for (let i = 0; i < compiler.attributes.length; i++) {
        const attr = compiler.attributes[i];
        const attrName = attr.name.toLowerCase();
        const attrValue = attr.value.trim();

        if ((attrName.endsWith('dir') || attrName.endsWith('path')) && attrValue) {
          let normalizedPath;
          if (attrValue.startsWith('/')) {
            normalizedPath = attrValue;
          } else {
            // Join with base directory - this is crucial for MuJoCo path resolution
            normalizedPath = baseDir ? this._joinPath(baseDir, attrValue) : attrValue;
          }

          if (!directories[attrName]) {
            directories[attrName] = [];
          }
          directories[attrName].push(this._normalizePath(normalizedPath));
        }
      }
    }

    return directories;
  }

  _parseCompilerDirectoriesRegex(xmlContent, baseDir) {
    const directories = {};

    // Simple regex to find compiler elements and their attributes
    const compilerRegex = /<compiler[^>]*>/gi;
    const matches = xmlContent.match(compilerRegex) || [];

    for (const match of matches) {
      // Extract attributes from compiler element
      const attrRegex = /(\w+)\s*=\s*["']([^"']*?)["']/g;
      let attrMatch;

      while ((attrMatch = attrRegex.exec(match)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2].trim();

        if ((attrName.endsWith('dir') || attrName.endsWith('path')) && attrValue) {
          let normalizedPath;
          if (attrValue.startsWith('/') || attrValue.includes('://')) {
            normalizedPath = attrValue;
          } else {
            normalizedPath = this._joinPath(baseDir, attrValue);
          }

          if (!directories[attrName]) {
            directories[attrName] = [];
          }
          directories[attrName].push(this._normalizePath(normalizedPath));
        }
      }
    }

    return directories;
  }

  _mergeDirectoryHints(parentHints: Record<string, string[]>, localHints: Record<string, string[]>): Record<string, string[]> {
    const merged: Record<string, string[]> = { ...parentHints };

    for (const [key, paths] of Object.entries(localHints)) {
      if (merged[key]) {
        merged[key] = [...merged[key], ...paths];
      } else {
        merged[key] = [...paths];
      }
    }

    // Remove duplicates
    for (const key in merged) {
      merged[key] = [...new Set(merged[key])];
    }

    return merged;
  }

  _buildSearchOrder(tag: string, directoryHints: Record<string, string[]>, baseDir: string | undefined, rootDir: string | undefined): string[] {
    const order = [];

    // For include files, prioritize the same directory first
    if (tag === 'include') {
      // Add the file's folder first for include files
      if (baseDir) {
        order.push(baseDir);
      }
      order.push(''); // root directory
    }

    // Tag-specific hints (this is crucial for MuJoCo asset resolution)
    const hints = this.TAG_DIRECTORY_HINTS[tag] || [];
    for (const hint of hints) {
      if (directoryHints[hint]) {
        order.push(...directoryHints[hint]);
      }
    }

    // For non-include files, add common asset directories
    if (tag !== 'include') {
      const commonDirs = ['', 'assets', 'meshes', 'textures'];
      for (const commonDir of commonDirs) {
        if (baseDir) {
          order.push(this._normalizePath(this._joinPath(baseDir, commonDir)));
        } else {
          order.push(commonDir);
        }
      }
    }

    // Fall back to every known compiler directory
    for (const paths of Object.values(directoryHints)) {
      order.push(...paths);
    }

    // For non-include files, add the file's folder and root directory
    if (tag !== 'include') {
      if (baseDir) {
        order.push(baseDir);
      }
      order.push('');
    }

    // Add the root directory as a fallback
    if (rootDir) {
      order.push(rootDir);
    }

    // Remove duplicates while preserving order
    return [...new Set(order.filter(path => path !== undefined))];
  }

  async _resolveLocalFile(value: string, baseDir: string | undefined, searchDirs: string[], baseUrl: string): Promise<string | null> {
    if (!value.trim()) return null;

    if (this.debug) {
      console.log(`[MuJoCoAssetCollector] _resolveLocalFile: value="${value}", baseDir="${baseDir}", searchDirs=[${searchDirs.join(', ')}]`);
    }

    // Handle absolute paths first
    if (value.startsWith('/')) {
      try {
        const response = await fetch(`${baseUrl}${value}`, { method: 'HEAD' });
        if (response.ok) return this._normalizePath(value.substring(1)); // Remove leading slash
      } catch (error) {
        // Continue to relative resolution
      }
    }

    // Search in order: search directories first, then base directory
    for (const directory of searchDirs) {
      const candidate = this._normalizePath(this._joinPath(directory, value));
      const fullUrl = `${baseUrl}/${candidate}`;

      if (this.debug) {
        console.log(`[MuJoCoAssetCollector] Trying: ${fullUrl}`);
      }

      try {
        const response = await fetch(fullUrl, { method: 'HEAD' });
        if (response.ok) {
          if (this.debug) {
            console.log(`[MuJoCoAssetCollector] Found: ${candidate}`);
          }
          return candidate;
        }
        if (this.debug) {
          console.log(`[MuJoCoAssetCollector] Not found (${response.status}): ${fullUrl}`);
        }
      } catch (error) {
        if (this.debug) {
          console.log(`[MuJoCoAssetCollector] Error accessing: ${fullUrl} - ${error.message}`);
        }
      }
    }

    if (this.debug) {
      console.log(`[MuJoCoAssetCollector] Could not resolve: ${value}`);
    }
    return null;
  }

  async _resolveReference(rawValue: string, tag: string, attr: string, baseDir: string | undefined, directoryHints: Record<string, string[]>, baseUrl: string, rootDir: string | undefined): Promise<{ text: string } | null | { path: string }> {
    const value = rawValue.trim();
    if (!value) return null;

    const lower = value.toLowerCase();

    // Skip HTTP URLs
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      return { text: value };
    }

    // Handle file:// URLs
    if (lower.startsWith('file://')) {
      console.warn(`[MuJoCoAssetCollector] file:// URLs not supported in browser: ${value}`);
      return null;
    }

    // Handle archive references (file@member)
    if (value.includes('@') && !value.startsWith('@')) {
      const [prefix, member] = value.split('@', 2);
      if (!member) {
        console.warn(`[MuJoCoAssetCollector] Invalid archive reference: ${value}`);
        return null;
      }

      const searchDirs = this._buildSearchOrder(tag, directoryHints, baseDir, rootDir);
      const archivePath = await this._resolveLocalFile(prefix, baseDir, searchDirs, baseUrl);
      if (!archivePath) return null;

      return { text: `${archivePath}@${member}` };
    }

    // Resolve local file
    const searchDirs = this._buildSearchOrder(tag, directoryHints, baseDir, rootDir);
    const resolved = await this._resolveLocalFile(value, baseDir, searchDirs, baseUrl);

    if (!resolved) return null;

    return { path: resolved };
  }

  _stripNamespace(tag: string): string {
    if (tag.includes(':')) {
      return tag.split(':', 2)[1];
    }
    return tag;
  }

  _normalizePath(path: string): string {
    if (!path) return '';

    const isAbsolute = path.startsWith('/');

    // Replace multiple slashes and remove trailing slash
    path = path.replace(/\/+/g, '/').replace(/\/$/, '');

    const parts = path.split('/');

    const resolved = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '' || part === '.') {
        continue;
      }
      if (part === '..') {
        if (resolved.length > 0) {
          resolved.pop();
        }
        // Removed the else push '..' to clip at root
      } else {
        resolved.push(part);
      }
    }

    let result = resolved.join('/');

    if (isAbsolute && result !== '') {
      result = '/' + result;
    }

    return result || '';
  }

  _getDirectoryPath(filePath: string): string {
    const parts = filePath.split('/');
    return parts.slice(0, -1).join('/');
  }

  _joinPath(...parts: (string | undefined)[]): string {
    const filtered = parts.filter(part => part !== null && part !== undefined && part !== '.');
    if (filtered.length === 0) return '';

    const joined = filtered.join('/').replace(/\/+/g, '/');

    // Don't remove leading slash if the first part was absolute
    if (parts[0] && parts[0].startsWith('/')) {
      return this._normalizePath(joined);
    }

    return this._normalizePath(joined.replace(/^\//, ''));
  }
}

// Export a singleton instance for convenience
export const mujocoAssetCollector = new MuJoCoAssetCollector();
