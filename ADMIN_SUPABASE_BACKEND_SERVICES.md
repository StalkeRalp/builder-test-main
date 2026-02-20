# Backend Supabase (Côté Admin) - Services et Rôles

Ce document présente les services backend Supabase utilisés côté admin, avec leur rôle dans le projet.

## 1) Point d'entrée Supabase

### `src/supabase-client.js`
- Rôle: configurer et exposer un client Supabase unique pour toute l'application.
- Responsabilités:
  - Initialise `createClient(...)` avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
  - Configure l'auth (`persistSession`, `autoRefreshToken`, stockage local).
  - Configure Realtime.
  - Expose `checkSupabaseConnection()` pour vérifier la connectivité.
- Utilisé par: tous les services métier.

## 2) Services métier (admin)

### `src/auth-service.js` - Authentification & contrôle d'accès
- Rôle: gérer la connexion admin/client et les gardes de pages.
- Côté admin:
  - `loginAdmin(email, password)` via Supabase Auth.
  - Vérifie le rôle `admin` dans la table `profiles`.
  - `requireAdmin()` pour protéger les pages admin.
- Ressources Supabase:
  - `supabase.auth`
  - Table `profiles`
  - RPC `login_client` (pour login client)

### `src/data-store.js` - Service central Projet (CRUD + opérations liées)
- Rôle: service principal de gestion des projets et activités.
- Fonctions clés admin:
  - Projets: `getAll`, `getById`, `add`, `create`, `update`, `delete`.
  - Phases intégrées projet: `updatePhase`.
  - Images: `addImage`, `getImages`, `deleteImage`.
  - Tickets: `addTicket`, `getTickets`, `updateTicket`, `getAllTickets`.
  - Logs: `addLog`, `getLogs`.
  - Stats: `getStats`.
  - Migration: `migrateFromLocalStorage`.
- Ressources Supabase:
  - Tables `projects`, `project_images`, `tickets`, `activity_logs`
  - Storage buckets `project-images` (et bucket dynamique via `uploadFile`)
  - RPC `get_project_details_for_client` (branche client dans `getById`)

### `src/profile-service.js` - Profils admin/client
- Rôle: lecture/mise à jour des profils et gestion photo.
- Côté admin:
  - `getAdminProfile()`
  - `updateAdminProfile(updates)`
  - `uploadProfilePhoto(file, userId)`
  - `deleteProfilePhoto(userId)`
- Ressources Supabase:
  - Table `profiles`
  - Storage bucket `profile-photos`
  - `supabase.auth.getUser()`

### `src/ticket-service.js` - Gestion des tickets support
- Rôle: CRUD tickets + commentaires.
- Fonctions:
  - Tickets: `getAll`, `getByProjectId`, `getById`, `create`, `update`, `delete`
  - Commentaires: `addComment`, `getComments`
- Ressources Supabase:
  - Tables `tickets`, `ticket_comments`

### `src/chat-service.js` - Messagerie temps réel
- Rôle: messagerie projet admin/client avec Realtime.
- Fonctions:
  - Messages: `sendMessage`, `getConversation`, `deleteMessage`, `deleteConversation`
  - Vue admin: `getAllConversations`, `getTotalUnreadCount`
  - État lecture: `markAsRead`, `getUnreadCount`
  - Realtime: `subscribeToMessages`, `subscribeToAllMessages`, `unsubscribeFromMessages`
- Ressources Supabase:
  - Table `messages`
  - Realtime channels (`postgres_changes`)
  - Table `projects` (enrichissement conversations)

### `src/document-service.js` - Documents projet
- Rôle: gestion des métadonnées document et fichiers.
- Fonctions:
  - `getByProjectId`, `getById`, `create`, `update`, `delete`
  - Upload/Suppression fichier: `uploadFile`, `deleteFile`
  - Téléchargement sécurisé: `getSignedDownloadUrl`
- Ressources Supabase:
  - Table `documents`
  - Storage bucket `project-documents`
  - `supabase.auth.getUser()` (auteur upload)

### `src/phase-service.js` - Timeline / phases projet
- Rôle: CRUD des phases de projet.
- Fonctions:
  - `getByProjectId`, `getById`, `create`, `update`, `delete`
- Ressources Supabase:
  - Table `phases`

### `src/notes-service.js` - Notes internes admin
- Rôle: notes privées internes par projet.
- Fonctions:
  - `getByProjectId`, `getById`, `create`, `update`, `delete`
- Ressources Supabase:
  - Table `internal_notes`

### `src/report-service.js` - Reporting & exports
- Rôle: calcul d'indicateurs globaux et export CSV.
- Fonctions:
  - Stats projets: `getProjectStats`, `getStatusDistribution`
  - Budgets: `getBudgetSummary`
  - Période: `getProjectsInRange`
  - Activité: `getActivityLog`
  - Export: `exportToCSV`, `downloadCSV`
- Ressources Supabase:
  - Tables `projects`, `activity_logs`

### `src/client-service.js` - Relation client / membres projet
- Rôle: exposer une vue "clients" pour l'admin et gérer les membres.
- Fonctions:
  - Clients: `getAll`, `getByEmail`, `search`, `getProjectsByEmail`
  - Membres: `getByProjectId`, `addProjectMember`, `removeProjectMember`
- Ressources Supabase:
  - Tables `projects`, `project_members`

## 3) Résumé rapide par domaine

- Authentification/accès: `auth-service`
- Projets (cœur métier): `data-store`
- Profils: `profile-service`
- Tickets: `ticket-service` (+ partiellement `data-store`)
- Messagerie: `chat-service`
- Documents: `document-service`
- Timeline/phases: `phase-service`
- Notes internes: `notes-service`
- Reporting: `report-service`
- Gestion clients/membres: `client-service`

## 4) Objets Supabase utilisés côté admin

- Auth: `supabase.auth`
- Database tables:
  - `profiles`
  - `projects`
  - `phases`
  - `documents`
  - `messages`
  - `tickets`
  - `ticket_comments`
  - `internal_notes`
  - `project_images`
  - `activity_logs`
  - `project_members`
- RPC:
  - `login_client`
  - `get_project_details_for_client`
- Storage buckets:
  - `project-documents`
  - `project-images`
  - `profile-photos`
