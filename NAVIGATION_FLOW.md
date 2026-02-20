# Navigation Flow - TDE Group Platform

## Vue d'ensemble

Le système comprend deux espaces distincts :
- **Espace Admin** : Gestion complète des projets (ERP/CRM)
- **Portail Client** : Consultation et suivi de projet

---

## 1. Espace Admin (Pages)

### A. Point d'Entrée
- **`admin-dashboard.html`** : Dashboard principal
  - Accès : Direct ou via n'importe quelle page admin
  - Actions disponibles :
    - Voir tous les projets
    - Créer un nouveau projet → `create-project.html`
    - Éditer un projet → `admin-project-details.html?id=XXX`
    - Supprimer un projet
    - Accéder au CRM → `admin-clients.html`
    - Accéder au Support → `admin-tickets.html`

### B. Création de Projet
- **`create-project.html`**
  - Formulaire de création
  - **Redirection après création** : `admin-dashboard.html` (pour voir le projet créé)
  - Bouton "Cancel" : Retour à `admin-dashboard.html`

### C. Gestion de Projet
- **`admin-project-details.html?id=PROJECT_ID`**
  - Accessible via le bouton "Edit" du dashboard
  - 3 Onglets : Settings, Progress, Media
  - Bouton "Save" : Sauvegarde et reste sur la page
  - Bouton "Back" (header) : Retour à `admin-dashboard.html`

### D. CRM & Support
- **`admin-clients.html`** : Liste des clients
  - Bouton "View Project" → `admin-project-details.html?id=XXX`
  
- **`admin-tickets.html`** : Inbox des tickets
  - Bouton "Mark Resolved" : Action locale (pas de redirection)

### E. Navigation Sidebar (Commune à toutes les pages Admin)
```
├── Dashboard (admin-dashboard.html)
├── New Project (create-project.html)
├── ─────────────────────
├── Clients (CRM) (admin-clients.html)
├── Support Inbox (admin-tickets.html)
├── ─────────────────────
└── Client Portal (my-project.html) ← Sortie vers l'espace client
```

---

## 2. Portail Client

### A. Connexion
- **`my-project.html`** (Vue Login)
  - Formulaire : ID Projet + PIN
  - **Succès** : Transition vers Dashboard Client (même page)
  - **Échec** : Message d'erreur, reste sur login
  - Bouton "Create New Project" : Redirection vers `create-project.html` (Admin)

### B. Dashboard Client
- **`my-project.html`** (Vue Dashboard)
  - 4 Onglets : Overview, Timeline, Tickets, Documents
  - Bouton "Logout" : Retour à la vue Login (même page)
  - **Pas de lien vers l'Admin** (sécurité)

---

## 3. Flux Utilisateur Typiques

### Scénario Admin : Créer et Gérer un Projet
1. `admin-dashboard.html` (Dashboard)
2. Clic "New Project" → `create-project.html`
3. Remplir formulaire → Clic "Create Project"
4. **Redirection automatique** → `admin-dashboard.html` (projet visible)
5. Clic "Edit" (icône crayon) → `admin-project-details.html?id=P-2026-XXX`
6. Modifier phases/photos → Clic "Save All"
7. Clic "Back" → `admin-dashboard.html`

### Scénario Client : Consulter son Projet
1. `my-project.html` (Login)
2. Entrer ID + PIN → Clic "Sign In"
3. **Transition** → Dashboard Client (même page)
4. Navigation entre onglets (Overview, Timeline, etc.)
5. Clic "Logout" → Retour au Login

### Scénario Admin : Gérer le Support
1. `admin-dashboard.html`
2. Sidebar → Clic "Support Inbox" → `admin-tickets.html`
3. Voir les tickets, marquer comme résolu
4. Sidebar → Retour "Dashboard" → `admin-dashboard.html`

---

## 4. Règles de Navigation

✅ **Toujours actif** : La page courante est mise en surbrillance dans la sidebar  
✅ **Cohérence** : Toutes les pages admin ont la même sidebar  
✅ **Séparation** : Pas de lien Admin → Client (sauf "Client Portal" pour tester)  
✅ **Persistance** : Les données sont sauvegardées dans `localStorage` (survit aux rechargements)
