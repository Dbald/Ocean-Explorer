import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works from any static host or sub-path.
  base: './',
  plugins: [
    // Classroom boards often ship an older built-in browser. Modern browsers get
    // the modern bundle (transpiled down to Chrome 64-era syntax, with polyfills);
    // anything older gets a fully transpiled legacy bundle.
    legacy({
      targets: ['chrome >= 64', 'android >= 64', 'safari >= 12', 'edge >= 79', 'firefox >= 67'],
      modernTargets: ['chrome >= 64', 'android >= 64', 'safari >= 12', 'edge >= 79', 'firefox >= 67'],
      modernPolyfills: true,
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
