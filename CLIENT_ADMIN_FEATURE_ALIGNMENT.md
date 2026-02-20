# Correspondance Fonctionnalités Admin <-> Client

## Flux analysés

- Projet: `admin/project-details-complete.html` + `src/data-store.js`
- Phases: `src/phase-service.js`
- Images chantier: `src/data-store.js` (`project_images`)
- Documents: `src/document-service.js`
- Chat: `src/chat-service.js`
- Tickets: `src/ticket-service.js`
- Profil: `src/profile-service.js`

## Matrice de correspondance

| Domaine | Admin (source) | Client (consommation) | Etat |
|---|---|---|---|
| Projet | `projects` | `client-backend-service.getProject()` | Connecté via RPC `get_project_details_for_client` |
| Phases | `phases` | `getTimeline()` -> `clientDataService.getPhases()` | Connecté via RPC `get_client_timeline` |
| Images chantier | `project_images` (upload admin) | injectées dans `phase.photos` | Corrigé: timeline client lit les images liées aux phases |
| Documents | `documents` + storage `project-documents` | `getDocuments()` | Corrigé: lecture client via RPC `get_client_documents` |
| Messages | `messages` | `getMessages()` / `sendMessage()` | Corrigé: lecture+écriture via RPC `get_client_messages` / `send_client_message` |
| Tickets | `tickets` | `getTickets()` / `createTicket()` | Corrigé: lecture+création via RPC `get_client_tickets` / `create_client_ticket` |
| Profil client | `projects` + `profiles` + `project_members` | `getClientProfile()` / `updateClientProfile()` | Corrigé via RPC `get_client_profile` / `update_client_profile` |

## Pourquoi images/documents ne remontaient pas

- Le portail client utilise une session locale ProjectID+PIN (pas de `auth.uid()` Supabase).
- Avec RLS active, les `select` directs sur `documents`, `phases`, `messages`, `tickets`, `project_images` sont souvent bloqués.
- Résultat: côté client, listes vides malgré uploads admin réussis.

## Correctifs implémentés

- `src/client-backend-service.js`
  - Migration vers appels RPC dédiés pour toutes les ressources client.
  - Fallback conservé si RPC indisponibles.
  - Timeline enrichie avec photos chantier.
- `src/client-data-service.js`
  - Garde la compatibilité frontend et aligne les données normalisées.
- SQL à exécuter:
  - `FIX_CLIENT_RPC_FUNCTIONS.sql`
  - `ENABLE_CLIENT_PORTAL_RPC.sql`

## Vérifications recommandées

1. Se connecter client avec un projet réel (ID + PIN).
2. Vérifier:
   - `client/timeline.html`: phases + photos
   - `client/documents.html`: documents visibles client
   - `client/chat.html`: lecture + envoi message
   - `client/tickets.html`: lecture + création ticket
   - `client/profile.html`: lecture + update
