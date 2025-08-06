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
    allowedHosts: ['44d9d7076338.ngrok-free.app'], // <--- tu subdominio ngrok
  }
})