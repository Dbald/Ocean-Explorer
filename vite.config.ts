import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works from any static host or sub-path.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
