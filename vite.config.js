import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        construction: resolve(__dirname, 'construction.html'),
        energy: resolve(__dirname, 'energy.html'),
        it_services: resolve(__dirname, 'it-services.html'),
        supply: resolve(__dirname, 'supply.html'),
        consultancy: resolve(__dirname, 'consultancy.html'),
        suggestions: resolve(__dirname, 'suggestions.html'),
      },
    },
  },
})
