// Plugins
import Vue from '@vitejs/plugin-vue'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import Fonts from 'unplugin-fonts/vite'
import dts from 'vite-plugin-dts'

// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isLibMode = process.env.BUILD_MODE === 'lib';

  return {
    base: '/muwanx/',
    publicDir: isLibMode ? false : 'examples',
    build: isLibMode ? {
      lib: {
        entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        name: 'Muwanx',
        fileName: (format) => `muwanx.${format}.js`,
        formats: ['es', 'umd'],
      },
      rollupOptions: {
        external: ['vue', 'vuetify', 'vue-router', 'three', 'onnxruntime-web', 'mujoco-js'],
        output: {
          globals: {
            vue: 'Vue',
            vuetify: 'Vuetify',
            'vue-router': 'VueRouter',
            three: 'THREE',
            'onnxruntime-web': 'ort',
            'mujoco-js': 'MuJoCo',
          },
          // Preserve module structure for better tree-shaking
          preserveModules: false,
          exports: 'named',
        },
      },
      // Generate TypeScript declarations
      emitAssets: true,
    } : {
      outDir: 'dist',
      rollupOptions: {
        input: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
    },
    plugins: [
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      styles: {
        configFile: './src/viewer/styles/settings.scss',
      },
    }),
    Fonts({
      fontsource: {
        families: [
          {
            name: 'Roboto',
            weights: [100, 300, 400, 500, 700, 900],
            styles: ['normal', 'italic'],
          },
        ],
      },
    }),
    // Generate TypeScript declarations in library mode
    ...(isLibMode ? [dts({
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
      outDir: 'dist',
      copyDtsFiles: true,
      staticImport: true,
      rollupTypes: true,
      skipDiagnostics: false,
    })] : []),
  ],
  optimizeDeps: {
    exclude: ['vuetify', 'onnxruntime-web'],
  },
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@examples': fileURLToPath(new URL('./examples', import.meta.url)),
      // Alias 'muwanx' to local src for development
      'muwanx': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3000,
  },
    css: {
      preprocessorOptions: {
        sass: {
          api: 'modern-compiler',
        },
        scss: {
          api:'modern-compiler',
        },
      },
    },
  };
});
