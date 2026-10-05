import { defineConfig } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import path from 'path';

/**
 * Plugin that runs BEFORE vite:import-analysis (enforce: 'pre') and transforms
 * .js files containing JSX using esbuild. Without this, Vite's acorn-based
 * import analysis fails on JSX syntax in .js files (like saleTable/page.js).
 */
function jsxInJsPrePlugin() {
  return {
    name: 'jsx-in-js-pre',
    enforce: 'pre',
    async transform(code, id) {
      // Only target .js files under src/ (not node_modules, not .jsx already)
      if (!id.includes('node_modules') && /src\/.*\.js$/.test(id)) {
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
          jsxImportSource: 'react',
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [jsxInJsPrePlugin()],
  esbuild: {
    // Enable JSX transform in .jsx and .js files (saleTable/page.js contains
    // JSX with a .js extension — Next.js handles this at build time, but
    // Vite/vitest needs an explicit hint).
    jsx: 'automatic',
    jsxImportSource: 'react',
    include: /src\/.*\.[jt]sx?$/,
    loader: 'jsx',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    include: ['src/**/*.{test,spec}.{js,jsx}', 'src/**/*.{integration.test,integration.spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
