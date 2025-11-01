import { defineConfig } from 'vite';

export default defineConfig({
  base: '/computer-graphics/lab02/',
  build: {
    rollupOptions: {
      // don't try to bundle the OpenCV WASM package (it may be loaded at runtime)
      external: ['@opencv.js/wasm']
    }
  }
});
