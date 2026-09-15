import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' => asset paths are relative, compatible with static hosting
// on GitHub Pages (no backend required).
export default defineConfig({
  plugins: [react()],
  base: './',
});