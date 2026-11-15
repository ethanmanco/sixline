/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Relative base so the build works on a GitHub Pages project site
// (ethanmanco.github.io/sixline) without hard-coding the repo name.
export default defineConfig({
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
