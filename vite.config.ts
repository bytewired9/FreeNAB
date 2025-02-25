import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0' // This will expose the server to the network
    },
  plugins: 
  [
    react(),
    tailwindcss(),
  ],
})
