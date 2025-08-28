import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Permite acceder desde fuera de localhost (necesario para ngrok)
    allowedHosts: ['98b33a5ea245.ngrok-free.app'],
    port: 5173, // <--- tu subdominio ngrok
  }
})