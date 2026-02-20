# 👑 ARCHITECTURE DÉTAILLÉE - TDE Group Platform

## 🏛️ Vue Globale de l'Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SITE PUBLIC VITRINE                        │
│         (Aucune authentification requise - Lecture seule)        │
│  Pages: index, construction, energy, it-services, consultancy   │
│         supply, suggestions (EmailJS)                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────────────┴────────────────────┐
         ↓                                          ↓
┌──────────────────────────┐          ┌──────────────────────────┐
│   👑 ADMIN PORTAL        │          │  👤 CLIENT PORTAL        │
│   admin/                 │          │  client/                 │
│                          │          │                          │
│ Super-utilisateur        │          │ Accès sécurisé           │
│ Contrôle total           │          │ ID Project + PIN         │
│                          │          │                          │
│ • Dashboard              │          │ • Dashboard              │
│ • Création projets       │          │ • Timeline (lecture)     │
│ • Édition projets        │          │ • Documents (lecture)    │
│ • Gestion phases         │          │ • Chat ✍️               │
│ • Documents officiels    │          │ • Tickets ✍️            │
│ • CRM clients            │          │ • Profil (édition)       │
│ • Support (Tickets)      │          │                          │
│ • Chat admin             │          │ Row Level Security:      │
│ • Notes internes 🔒      │          │ Voit UNIQUEMENT son      │
│ • Calendrier             │          │ projet (RLS Policy)      │
│ • Voir TOUS les projets  │          │                          │
│                          │          │ Permissions Limitées:    │
│ Auth: Email + Password   │          │ • Lire données perso     │
│ (Supabase Auth)          │          │ • Éditer profil perso    │
│                          │          │ • Envoyer messages       │
│ Visibilité: TOTALE ✓     │          │ • Ouvrir tickets         │
│ Modification: TOTALE ✓   │          │ • Pas de suppression     │
│ Suppression: TOTALE ✓    │          │ • Upload limité          │
└──────────────────────────┘          └──────────────────────────┘
```

---

## 👑 1. PORTAIL ADMINISTRATEUR

### 1.1 Authentification Admin

**Méthode**: Email + Mot de passe (Supabase Auth)

```javascript
// auth-service.js
async loginAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  // Vérifier que l'utilisateur est ADMIN
  const profile = await supabase.from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .eq('role', 'admin');
    
  if (profile.role !== 'admin') {
    throw new Error('Access denied: Admin credentials required');
  }
}
```

### 1.2 Tableau de Bord Admin

**URL**: `admin/index.html`

**Fonctionnalités**:
- ✅ Liste de TOUS les projets
- ✅ Statuts: En cours, En pause, Terminé
- ✅ Progression globale (%)
- ✅ Boutons d'action:
  - 📝 Créer un nouveau projet
  - ✏️ Éditer un projet
  - 🗑️ Supprimer un projet
  - 👁️ Voir détails complets

### 1.3 Création de Projet

**URL**: `admin/create-project.html`

**Données à Saisir**:
```javascript
{
  ID=UUID: "059484a6-08c9-4c71-aa38-13b6c7881c19",              // Auto-généré
  name: "Rénovation Villa",
  client_name: "Jean Dupont",
  client_email: "jean@example.com",
  location: "Paris, 75001",
  type: "Construction",          // construction | energy | it | consultancy | supply
  budget: 250000,
  start_date: "2026-02-20",
  end_date: "2026-06-30",
  manager: "Admin Name",
  pin: "123456",                 // Généré aléatoirement ou choisi
  description: "Rénovation complète...",
  status: "planning",            // planning | in_progress | paused | completed
  progress: 0,
  phases: [],                    // À remplir après création
  documents: []
}
```

### 1.4 Gestion des Phases (Timeline)

**URL**: `admin/project-details.html?id=PROJECT_ID`

**Onglet: Timeline**

L'Admin peut:
1. ✅ **Créer des phases**
   - Nom de la phase (ex: "Fondations", "Gros œuvre")
   - Description détaillée
   - Date de début estimée
   - Date de fin estimée
   - Statut: Planifiée / En cours / Terminée

2. ✅ **Mettre à jour l'état**
   - Marquer comme "Terminée"
   - Ajouter des notes de progression
   - Justifier les retards

3. ✅ **Ajouter des détails**
   - Photos de la phase (avant/après)
   - Statistiques (% complétion)
   - Points clés achevés

**Structure Data**:
```javascript
{
  id: "phase-1",
  project_id: "P-2026-001",
  title: "Fondations",
  description: "Préparation du terrain...",
  start_date: "2026-02-20",
  end_date: "2026-03-15",
  status: "completed",           // planned | in_progress | completed
  progress: 100,                 // 0-100
  notes: "Phase complétée à temps",
  images: ["url1", "url2"],
  created_by: "admin_id"
}
```

### 1.5 Gestion des Documents Officiels

**URL**: `admin/project-details.html` → Onglet "Documents"

L'Admin peut:
1. ✅ **Ajouter des documents**
   - Devis
   - Plans architecturaux
   - Contrats
   - Factures
   - Rapports

2. ✅ **Organiser**
   - Par catégorie
   - Par date
   - Nommage explicite

3. ✅ **Contrôler l'accès**
   - Publier pour le client
   - Garder privé (notes internes)
   - Archiver

**Structure Data**:
```javascript
{
  id: "doc-1",
  project_id: "P-2026-001",
  filename: "Devis_Villa_Dupont_2026.pdf",
  file_url: "storage/...",
  type: "devis",                 // devis | plans | contract | invoice | report
  category: "official",          // official | internal | private
  visibility: "client",          // client | admin_only | private
  uploaded_by: "admin_id",
  uploaded_at: "2026-02-20T10:00:00Z",
  size_mb: 2.5
}
```

### 1.6 Notes Internes Admin 🔒

**URL**: Sidebar de chaque projet

**Caractéristiques**:
- 📝 Bloc de texte libre pour chaque projet
- 🔒 **COMPLÈTEMENT INVISIBLE AU CLIENT**
- 💾 Sauvegarde automatique
- 📌 Peut contenir:
  - Problèmes non résolus
  - Conversations internes
  - Plans d'action
  - Confidences du client
  - Détails sensibles

**Implémentation**:
```javascript
// Base de données
{
  id: "note-1",
  project_id: "P-2026-001",
  admin_id: "admin-123",
  content: "À discuter: retard sur fondations...",
  visibility: "admin_only",      // JAMAIS exposé à l'API client
  created_at: "...",
  updated_at: "..."
}

// RLS Policy
CREATE POLICY admin_notes_access ON internal_notes
  USING (
    auth.uid() IN (
      SELECT user_id FROM admin_profiles
      WHERE role = 'admin'
    )
  );
```

### 1.7 Gestion des Tickets Support

**URL**: `admin/tickets.html`

L'Admin:
1. ✅ Voit tous les tickets de tous les clients
2. ✅ Filtre par statut: Ouvert / En cours / Résolu
3. ✅ Peut marquer comme "Résolu"
4. ✅ Répondre directement dans les tickets

### 1.8 Chat Admin

**URL**: `admin/chat.html`

L'Admin:
1. ✅ Voit toutes les conversations
2. ✅ Filtre par projet
3. ✅ Envoie des messages
4. ✅ Envoie des pièces jointes
5. ✅ Notifications en temps réel (Supabase Realtime)

### 1.9 CRM Clients

**URL**: `admin/clients.html`

L'Admin:
1. ✅ Liste de tous les clients
2. ✅ Voir les projets associés
3. ✅ Historique de communication
4. ✅ Contact direct

---

## 👤 2. PORTAIL CLIENT

### 2.1 Authentification Client

**Méthode**: Project ID + PIN (Accès "invité sécurisé")

```javascript
// auth-service.js
async loginClient(projectId, pin) {
  // RPC function sécurisée (Security Definer)
  const { data, error } = await supabase.rpc('login_client', {
    p_id: projectId,
    p_pin: pin
  });
  
  if (error || !data) {
    throw new Error('Invalid Project ID or PIN');
  }
  
  // Stocker dans sessionStorage (pas localStorage)
  sessionStorage.setItem('client_project_id', projectId);
  sessionStorage.setItem('client_pin', pin);
  
  return data;  // { id, name, client_name, status, progress, end_date, ... }
}
```

**Logique de Sécurité**:
- ✅ Pas de compte utilisateur créé
- ✅ PIN = passcode unique par projet
- ✅ Authentification sans état (stateless)
- ✅ Expiration après fermeture du navigateur

### 2.2 Tableau de Bord Client

**URL**: `client/index.html` (Après login)

**Affichages (LECTURE SEULE)**:

1. **Cercle de Progression**
   ```
   Progression globale du projet: 45%
   ```
   - Représentation visuelle (cercle)
   - Statut: En cours / En pause / Terminé
   - Dernière mise à jour

2. **Informations Clés**
   - Nom du projet
   - Date de livraison estimée
   - Gestionnaire (Admin)
   - Budget (optionnel: montant ou "Confidentiel")

3. **Activités Récentes**
   - Dernières phases complétées
   - Messages non lus
   - Tickets ouverts

4. **Boutons d'Action**
   - 📋 Voir la Timeline
   - 📄 Voir les Documents
   - 💬 Chat
   - 🎫 Mes Tickets
   - 👤 Mon Profil

### 2.3 Timeline Client (Lecture Seule)

**URL**: `client/timeline.html`

**Affichage**:
- Historique chronologique des phases
- Pour CHAQUE phase:
  - ✅ Titre et description
  - 📅 Dates (prévues vs réelles)
  - 📊 Progression (%)
  - 📸 Photos (avant/après si disponibles)
  - 💬 Notes/Mises à jour

**Permissions**:
- ✅ Lire tout
- ❌ Modifier quoi que ce soit
- ❌ Supprimer
- ❌ Ajouter de nouvelles phases

**Implémentation**:
```javascript
// Composant lecture-seule
const phases = await ProjectStore.getPhases(projectId);

phases.forEach(phase => {
  // Afficher, PAS d'input d'édition
  renderPhaseCard({
    title: phase.title,
    status: phase.status,
    images: phase.images,
    readOnly: true  // ← Clé!
  });
});
```

### 2.4 Documents Client (Lecture & Téléchargement)

**URL**: `client/documents.html`

**Affichage**:
- Liste des documents publiés par l'Admin
- Catégories: Devis, Plans, Contrats, Factures, Rapports
- Pour chaque document:
  - Nom
  - Date d'ajout
  - Taille
  - Bouton de téléchargement

**Permissions**:
- ✅ Lire la liste
- ✅ Télécharger
- ❌ Supprimer
- ❌ Renommer
- ❌ Ajouter (sauf via chat)

**Filtrage RLS**:
```sql
-- Seuls les documents PUBLIÉS pour le client
SELECT * FROM documents
WHERE project_id = $1
  AND visibility = 'client'
  AND status = 'published'
ORDER BY created_at DESC;
```

### 2.5 Chat Client ✍️

**URL**: `client/chat.html`

**Fonctionnalités**:
1. ✅ Envoyer des messages
2. ✅ Envoyer des photos
3. ✅ Voir l'historique
4. ✅ Notifications en temps réel

**Permissions**:
- ✅ Créer un message
- ✅ Modifier ses propres messages
- ✅ Envoyer des images (< 5MB)
- ❌ Supprimer ses messages
- ❌ Voir les messages des autres clients
- ❌ Modifier les messages de l'admin

**Structure Data**:
```javascript
{
  id: "msg-1",
  project_id: "P-2026-001",
  sender_id: "client_session_id",
  sender_role: "client",         // client | admin
  sender_name: "Jean Dupont",
  content: "Avez-vous une photo du chantier?",
  photo_url: null,
  read: false,
  created_at: "2026-02-20T14:30:00Z"
}
```

**RLS Policies**:
```sql
-- Client peut lire/envoyer messages de son projet uniquement
CREATE POLICY client_messages_access ON messages
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE id = current_setting('app.project_id')
    )
  );
```

### 2.6 Tickets Client ✍️

**URL**: `client/tickets.html`

**Fonctionnalités**:
1. ✅ Créer un ticket
2. ✅ Voir ses propres tickets
3. ✅ Voir les réponses de l'admin
4. ✅ Marquer comme "Résolu" (suggestion)

**Formulaire**:
```javascript
{
  title: "Problème avec la fondation",
  description: "L'équipe a trouvé une fissure...",
  category: "problem",           // problem | question | suggestion
  priority: "high",              // low | medium | high
  photo: File                    // Optional upload
}
```

**Permissions**:
- ✅ Créer ses propres tickets
- ✅ Voir ses propres tickets
- ✅ Modifier ses propres tickets (non résolu)
- ✅ Joindre des photos
- ❌ Voir les tickets d'autres clients
- ❌ Voir les tickets internes de l'admin
- ❌ Supprimer un ticket

### 2.7 Profil Client (Édition Limitée)

**URL**: `client/profile.html`

**Informations Modifiables**:
```javascript
{
  phone: "+33 6 12 34 56 78",
  photo_url: "...",
  preferred_contact: "email"     // email | phone | chat
}
```

**Permissions**:
- ✅ Changer sa photo
- ✅ Changer son téléphone
- ✅ Changer ses préférences de contact
- ❌ Changer son nom (c'est celui enregistré par l'admin)
- ❌ Changer le PIN du projet
- ❌ Voir/Modifier budget, dates, phases

---

## 🔐 3. SÉCURITÉ & ROW LEVEL SECURITY (RLS)

### 3.1 Principes RLS

**Concept**: Chaque ligne de données est protégée par une politique au niveau de la base de données.

```sql
-- Exemple pour les projets
CREATE POLICY "Admin sees all projects" ON projects
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM admin_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Client sees only their project" ON projects
  FOR SELECT USING (
    (SELECT COUNT(*) FROM client_access 
     WHERE project_id = id 
     AND client_pin = current_setting('app.client_pin')) > 0
  );
```

### 3.2 Isolation des Données

```
Admin A voit → Projet 1, 2, 3, 4, 5
Admin B voit → Projet 1, 2, 3, 4, 5
Client A → UNIQUEMENT Projet 1
Client B → UNIQUEMENT Projet 2
Client C → UNIQUEMENT Projet 3
```

### 3.3 Checklist Sécurité

- ✅ RLS activé sur TOUTES les tables
- ✅ Authentification robuste (Supabase Auth)
- ✅ PIN unique par projet
- ✅ Pas de suppression par clients
- ✅ Audit trail (logs des accès)
- ✅ Images compressées & validées
- ✅ HTTPS en production

---

## 📊 4. MODÈLE DE DONNÉES

### 4.1 Tables Principales

```
┌─────────────┐
│  profiles   │
├─────────────┤
│ id (PK)     │
│ user_id     │
│ role        │ → admin | client
│ name        │
│ email       │
│ phone       │
│ photo_url   │
│ created_at  │
└─────────────┘
         │
         ├─────────────────────┐
         ↓                      ↓
    ┌─────────┐        ┌───────────┐
    │ projects│        │  clients  │
    ├─────────┤        ├───────────┤
    │ id      │        │ project_id│
    │ name    │        │ name      │
    │ status  │        │ email     │
    │ progress│        │ phone     │
    │ budget  │        │ address   │
    │ phases[]│        └───────────┘
    │ docs[]  │
    │ pin     │
    └─────────┘
         │
    ┌────┴─────────┬──────────┬──────────┐
    ↓              ↓          ↓          ↓
┌────────┐  ┌──────────┐  ┌────────┐  ┌────────┐
│ phases │  │ documents│  │messages│  │tickets │
├────────┤  ├──────────┤  ├────────┤  ├────────┤
│ id     │  │ id       │  │ id     │  │ id     │
│ title  │  │ filename │  │ content│  │ title  │
│ dates  │  │ url      │  │ sender │  │ status │
│ status │  │ type     │  │ read   │  │ priority
│ images │  │ visible[]   │ time   │  │ replies│
└────────┘  └──────────┘  └────────┘  └────────┘
```

### 4.2 Relations Clés

```
1 Admin  ──→  N Projects  ──→  1 Client
             ↓
        N Phases, N Documents, N Messages, N Tickets
        
1 Client ──→  1 Project (RLS garantit)
```

---

## 🔄 5. FLUX D'INTERACTION PRINCIPAUX

### 5.1 Scénario: Créer & Gérer un Projet

```
Admin
│
├─→ Accéder admin/index.html
│   └─→ Se connecter (Email + Password)
│
├─→ Cliquer "New Project"
│   └─→ admin/create-project.html
│
├─→ Remplir le formulaire
│   ├─→ Nom, Client, Budget, Dates
│   ├─→ Générer PIN (auto ou manuel)
│   └─→ Cliquer "Create"
│
├─→ Dashboard met à jour (projet visible)
│
├─→ Éditer le projet (clic "Edit")
│   └─→ admin/project-details.html?id=P-2026-001
│
├─→ Ajouter Phases (Timeline tab)
│   ├─→ + Phase: "Fondations"
│   ├─→ Dates estimées
│   └─→ Save
│
├─→ Ajouter Documents (Documents tab)
│   ├─→ Upload Devis.pdf
│   ├─→ Marquer "Visible pour le client"
│   └─→ Save
│
├─→ Envoyer un message (Chat tab)
│   ├─→ "Bonjour, bienvenue sur le portail!"
│   └─→ Send
│
└─→ Écrire une Note Interne
    ├─→ "À vérifier: budget serait dépassé"
    └─→ (Invisible au client)
```

### 5.2 Scénario: Client Consulte son Projet

```
Client
│
├─→ Accéder client/index.html
│   └─→ Se connecter (Project ID + PIN)
│
├─→ Dashboard s'affiche
│   ├─→ Voir progression: 25%
│   ├─→ Voir statut: "En cours"
│   ├─→ Voir date: "30 Juin 2026"
│   └─→ Voir activités récentes
│
├─→ Cliquer "Timeline"
│   └─→ client/timeline.html
│       ├─→ Voir phase 1: "Fondations" ✓ Complétée
│       └─→ Voir phase 2: "Gros œuvre" 📸 3 photos
│
├─→ Cliquer "Documents"
│   └─→ client/documents.html
│       ├─→ Devis_2026.pdf (télécharger)
│       ├─→ Plans_Architecture.pdf (télécharger)
│       └─→ Contrat_Signé.pdf (télécharger)
│
├─→ Cliquer "Chat"
│   └─→ client/chat.html
│       ├─→ Lire: "Bienvenue sur le portail!"
│       ├─→ Envoyer: "J'ai une question sur..."
│       ├─→ Joindre photo
│       └─→ See replying in real-time
│
├─→ Cliquer "Tickets"
│   └─→ client/tickets.html
│       ├─→ Créer ticket: "Fissure trouvée"
│       ├─→ Priority: High
│       └─→ Admin répond
│
└─→ Cliquer "Mon Profil"
    └─→ client/profile.html
        ├─→ Changer photo
        ├─→ Changer téléphone
        └─→ Changer préférences contact
```

---

## 🛡️ 6. RÈGLES DE PERMISSIONS CONSOLIDÉES

### Admin

| Action | Projets | Phases | Docs | Messages | Tickets | Notes |
|--------|---------|--------|------|----------|---------|-------|
| Lire | ✅ TOUS | ✅ TOUS | ✅ TOUS | ✅ TOUS | ✅ TOUS | ✅ OK |
| Créer | ✅ | ✅ | ✅ | ✅ | Voir | ✅ |
| Modifier | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Supprimer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Client

| Action | Timeline | Docs | Chat | Tickets | Profil | Phases |
|--------|----------|------|------|---------|--------|--------|
| Lire | ✅ | ✅ | ✅ | ✅ Perso | ✅ | ❌ |
| Créer | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Modifier | ❌ | ❌ | ✅ Perso | ✅ Perso | ✅ Profil | ❌ |
| Supprimer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 📱 7. RESPONSIVE & UX

### Admin
- Desktop-first (2 colonnes)
- Tablet-friendly (responsive grid)
- Mobile (single column, menu hamburger)

### Client
- Mobile-first (dashboard lisible sur petit écran)
- Cards intuitives
- Progressions visuelles claires
- Pas de surcharge d'info

---

## ✅ CHECKLIST DE MISE EN ŒUVRE

- [ ] RLS policies configurées dans Supabase
- [ ] Tables créées (profiles, projects, phases, etc.)
- [ ] RPC functions (login_client, get_project_details_for_client)
- [ ] Authentification Admin en place
- [ ] Authentification Client en place
- [ ] Dashboard Admin responsive
- [ ] Dashboard Client responsive
- [ ] Chat Realtime (Supabase Realtime)
- [ ] Upload documents avec storage Supabase
- [ ] Notes internes invisibles aux clients
- [ ] Tous les styles Tailwind OK
- [ ] Tests de sécurité (client A ne voit pas client B)

---

**Version**: 1.0.0  
**Date**: 18 février 2026  
**Status**: Architecture Finalisée ✅
