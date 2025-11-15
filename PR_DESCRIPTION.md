# Restructure muwanx as npm package with customizable API

## Summary

This PR restructures muwanx into a professional npm package with a flexible, TypeScript-typed API that supports both **imperative** (programmatic) and **declarative** (config-based) approaches. The package now provides a clean separation between core logic and viewer UI, enabling users to easily integrate muwanx into their own applications.

## Key Changes

### 🎯 Package Restructuring

#### New API Layer (`src/core/MwxViewer.ts`)
- **MwxViewer Class**: Headless viewer with programmatic API
- **Builder Pattern**: Fluent API with `Project`, `Scene`, and `Policy` classes
- **Event System**: Subscribe to viewer state changes
- **Type Safety**: Full TypeScript type definitions

Example imperative usage:
```typescript
import { MwxViewer } from 'muwanx';

const viewer = new MwxViewer('#container');
const project = viewer.addProject({
  project_name: "MyoSuite",
  project_link: "https://github.com/MyoHub/myosuite"
});

const scene = project.addScene({
  id: "hand",
  name: "Hand",
  model_xml: "./assets/scene/myosuite/.../myohand.xml",
  camera: {
    pos: [0.4, 1.6, 1.4],
    target: [-0.1, 1.4, 0.4]
  }
});

await viewer.initialize();
viewer.play();
```

#### Type System (`src/types/api.ts`)
- Complete TypeScript definitions for all API interfaces
- `ViewerConfig`, `ProjectConfig`, `SceneConfig`, `PolicyConfig`
- Camera, observation, policy, and runtime types
- Legacy config conversion utilities

#### Package Exports (`package.json`)
Multiple entry points for different use cases:
```json
{
  ".": "./dist/muwanx.es.js",           // Main API
  "./viewer": "./src/viewer/MwxViewer.vue", // Vue component
  "./core": "./src/core/MwxViewer.ts",      // Headless viewer
  "./types": "./src/types/api.ts"           // TypeScript types
}
```

### 📚 Documentation

#### Root README.md
- Simplified to quick-start guide
- Clear installation instructions
- Links to detailed documentation

#### Comprehensive USAGE.md (`doc/USAGE.md`)
- **1000+ line** detailed documentation
- Installation and setup guide
- Both imperative and declarative API patterns
- Complete configuration reference
- Event system documentation
- Runtime control examples
- TypeScript usage guide
- Troubleshooting section

#### Examples README (`examples/README.md`)
- Demo application overview
- Development guide
- Build instructions

### 🎨 Demo Application Improvements

#### Single-File Architecture (`examples/main.ts`)
- Simplified from multi-file Vue router setup to single TypeScript file
- **MyoSuite project built imperatively** (no config file needed)
- All 10 MyoSuite models with inline camera configurations
- Direct demonstration of imperative API usage

#### URL Synchronization Fixes
- Fixed URL format: `#/?scene=X` for default project
- Clean parameter handling when switching projects
- Proper query param isolation between projects
- Browser back/forward navigation support

#### UI Improvements
- Restored original ProjectSelector dropdown in control panel
- Improved control panel opacity
- Better mobile responsiveness
- Cleaner navigation between projects

### 🗂️ File Organization

#### Removed
- `examples/App.vue` - Single-file approach
- `examples/router.ts` - No router needed
- `examples/assets/config_myosuite.json` - Built imperatively
- All MyoSuite `asset_meta_*.json` files - Inlined camera configs

#### Added
- `src/core/MwxViewer.ts` - Core API implementation
- `src/types/api.ts` - Complete type system
- `src/types/three.d.ts` - Three.js type augmentations
- `doc/USAGE.md` - Comprehensive documentation
- `examples/README.md` - Demo documentation

#### Modified
- `src/index.ts` - Enhanced package exports
- `src/viewer/MwxViewer.vue` - Support both config paths and objects
- `src/viewer/composables/useConfig.ts` - Accept both string and object configs
- `src/viewer/composables/useUrlSync.ts` - Improved URL handling
- `vite.config.mjs` - Package alias for development

### 🔧 Technical Improvements

#### Type Safety
- Full TypeScript type coverage
- Proper type exports for consumers
- Type declarations in dist output

#### Build Configuration
- Dual build modes: library and demo
- Vite alias for local package linking
- Proper source map generation
- Tree-shaking support

#### Vue Component Enhancement
- Accept both `configPath` (declarative) and `config` (imperative) props
- Backward compatible with existing usage
- Better error handling

## Migration Examples

### Before (Declarative)
```typescript
import MwxViewer from 'muwanx/viewer';

// Use in Vue component
<MwxViewer configPath="./config.json" />
```

### After (Imperative)
```typescript
import { MwxViewer } from 'muwanx';

const viewer = new MwxViewer('#container');
viewer.addProject({ /* ... */ })
  .addScene({ /* ... */ })
  .addPolicy({ /* ... */ });
await viewer.initialize();
```

### Both Approaches Still Supported
```typescript
// Declarative - still works
<MwxViewerComponent configPath="./config.json" />

// Imperative - new option
<MwxViewerComponent :config="configObject" />
```

## MyoSuite Imperative API Demonstration

The MyoSuite project showcases full imperative API usage with all configuration defined in code:

```typescript
function buildMyoSuiteConfig() {
  return {
    project_name: "MyoSuite",
    project_link: "https://github.com/MyoHub/myosuite",
    tasks: [
      {
        id: "1",
        name: "Hand",
        model_xml: "./assets/scene/myosuite/.../myohand.xml",
        camera: { pos: [0.4, 1.6, 1.4], target: [-0.1, 1.4, 0.4] },
        policies: []
      },
      // ... 9 more models
    ]
  }
}
```

## Breaking Changes

None - this is a backward-compatible enhancement. Existing declarative usage continues to work.

## Testing

- ✅ Demo builds successfully
- ✅ All 4 projects load correctly (Muwanx, Menagerie, Playground, MyoSuite)
- ✅ URL synchronization works properly
- ✅ Scene and policy switching functional
- ✅ Package exports resolve correctly
- ✅ TypeScript types work as expected

## Files Changed

- **37 files changed**: +3,947 additions, -326 deletions
- Core API: +709 lines
- Type definitions: +372 lines
- Documentation: +1,021 lines (USAGE.md)
- Demo refactor: Significant simplification

## Next Steps (Future Work)

- [ ] Publish to npm registry
- [ ] Add unit tests for core API
- [ ] Create more examples (React, Vue, vanilla JS)
- [ ] Add API documentation generator (TypeDoc)
- [ ] Version management automation
- [ ] CI/CD pipeline for npm publishing

## Related Issues

Closes: [Add issue numbers if applicable]

## Checklist

- [x] Code follows project style guidelines
- [x] Documentation updated (README.md, USAGE.md)
- [x] Examples updated to demonstrate new features
- [x] Build succeeds without errors
- [x] All existing functionality preserved
- [x] TypeScript types properly exported
- [x] Backward compatibility maintained
