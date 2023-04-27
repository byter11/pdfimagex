import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// yarn add --dev @esbuild-plugins/node-globals-polyfill
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
// yarn add --dev @esbuild-plugins/node-modules-polyfill
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
// You don't need to add this to deps, it's included by @esbuild-plugins/node-modules-polyfill
import rollupNodePolyFill from 'rollup-plugin-node-polyfills'

import commonjs from '@rollup/plugin-commonjs';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/pdfimagex',
  plugins: [
    commonjs({
      include: /node_modules/,
      transformMixedEsModules: true,
    }),
    rollupNodePolyFill(),
    svelte()],
  resolve: {
    alias: {
      util: 'rollup-plugin-node-polyfills/polyfills/util',
      'node:buffer': 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeModulesPolyfillPlugin()
      ]

    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  }
})
