import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

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
        // Admin Pages
        admin_dashboard: resolve(__dirname, 'admin/index.html'),
        admin_login: resolve(__dirname, 'admin/login.html'),
        admin_create_project: resolve(__dirname, 'admin/create-project.html'),
        admin_project_details: resolve(__dirname, 'admin/project-details.html'),
        admin_clients: resolve(__dirname, 'admin/clients.html'),
        admin_tickets: resolve(__dirname, 'admin/tickets.html'),
        admin_profile: resolve(__dirname, 'admin/profile.html'),
        admin_calendar: resolve(__dirname, 'admin/calendar.html'),
        admin_messages: resolve(__dirname, 'admin/messages.html'),
        // Client Pages
        client_dashboard: resolve(__dirname, 'client/login.html'),
        client_login: resolve(__dirname, 'client/login.html'),
        client_tickets: resolve(__dirname, 'client/tickets.html'),
        client_documents: resolve(__dirname, 'client/documents.html'),
        client_profile: resolve(__dirname, 'client/profile.html'),
        client_timeline: resolve(__dirname, 'client/timeline.html'),
        client_chat: resolve(__dirname, 'client/chat.html'),
      },
    },
  },
})
