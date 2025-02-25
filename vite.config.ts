import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron';

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0' // This will expose the server to the network
    },
  plugins: 
  [
    electron({
      entry: 'electron/main.js',
    }),
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
  },
})
