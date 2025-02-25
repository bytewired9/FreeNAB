import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'

export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    tailwindcss(),
  ]
  
  // Only add the Electron plugin if we're in electron mode
  if (mode === 'electron') {
    plugins.push(
      electron({
        entry: 'electron/main.js',
      })
    )
  }
  
  return {
    server: {
      host: '0.0.0.0',
    },
    plugins,
    build: {
      outDir: 'dist',
    },
  }
})
