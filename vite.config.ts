import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// GitHub Pages serves this repository from /novpon/, not from the domain root.
export default defineConfig({
  base: '/novpon/',
  plugins: [preact()],
});
