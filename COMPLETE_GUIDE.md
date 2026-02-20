# 📚 Guide Complet du Projet TDE Group

## Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [Structure du Projet](#structure-du-projet)
5. [Guide d'Utilisation](#guide-dutilisation)
6. [Troubleshooting](#troubleshooting)

---

## Vue d'Ensemble

**TDE Group** est une plateforme web moderne offrant une **vitrine publique** et un **portail client privé** pour une entreprise multi-services.

### Fonctionnalités Principales
- 🌐 Site vitrine responsif (5 services)
- 📧 Formulaire de contact avec EmailJS
- 👨‍💼 Portail Admin complet (CRUD projets)
- 👥 Portail Client sécurisé (suivi de projet)
- ⚡ Real-time chat et notifications
- 📊 Dashboard avec analytics
- 🔐 Authentification Supabase

---

## Architecture

### Niveaux d'Accès

```
┌─────────────────────────────────────────────────────────┐
│                    SITE PUBLIC                          │
│  (index.html, services, suggestions)                    │
│  → Accessible par tous, pas d'authentification          │
└─────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────┴──────────────────┐
        ↓                                      ↓
┌──────────────────┐              ┌──────────────────┐
│   ADMIN PORTAL   │              │ CLIENT PORTAL    │
│   admin/         │              │ client/          │
│  ┌────────────┐  │              │ ┌────────────┐  │
│  │  Dashboard │  │              │ │  Dashboard │  │
│  │  Create    │  │              │ │  Timeline  │  │
│  │  Edit      │  │              │ │  Tickets   │  │
│  │  CRM       │  │              │ │  Documents │  │
│  │  Support   │  │              │ │  Chat      │  │
│  └────────────┘  │              │ └────────────┘  │
│                  │              │                 │
│  Auth: Email +   │              │ Auth: ID + PIN  │
│        Password  │              │                 │
└──────────────────┘              └──────────────────┘
```

### Stack Technique

```
Frontend Layer
├── HTML5 + CSS3
├── JavaScript (ES6+)
└── TailwindCSS 4.1.18

Build & DevOps
├── Vite 7.2.4 (Build tool)
├── PostCSS (CSS processing)
└── Autoprefixer (Browser support)

Backend & Services
├── Supabase (Auth + Database + Realtime)
├── EmailJS (Formulaires)
└── Lucide Icons (UI Icons)

Styling
├── TailwindCSS (Utility-first)
├── Custom Design System
└── Animations & Effects
```

---

## Installation & Setup

### 1. Prérequis
```bash
# Vérifier les versions
node --version    # v18+
npm --version     # v8+
```

### 2. Clone & Installation
```bash
# Cloner le repo
git clone https://github.com/StalkeRalp/builder-test-main.git
cd builder-test-main

# Installer les dépendances
npm install
```

### 3. Configuration Supabase
Créer un fichier `.env.local` à la racine:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Setup Base de Données
Exécuter les scripts SQL dans Supabase:
- `enable_client_login.sql` - Active authentification clients
- `add_internal_notes.sql` - Ajoute système de notes
- `secure_data_access.sql` - Configure RLS policies

### 5. Lancer le Serveur
```bash
npm run dev
# Serveur sur http://localhost:5173
```

---

## Structure du Projet

```
builder-test-main/
│
├── 📄 Pages Publiques
│   ├── index.html              # 🏠 Accueil
│   ├── construction.html       # 🏗️ Service Construction
│   ├── energy.html             # ⚡ Service Énergie
│   ├── it-services.html        # 💻 Service IT
│   ├── consultancy.html        # 📊 Service Conseil
│   ├── supply.html             # 📦 Service Logistique
│   └── suggestions.html        # 💬 Contact & Suggestions
│
├── 👨‍💼 admin/                  # Portail Admin
│   ├── index.html              # Dashboard admin
│   ├── login.html              # Login admin
│   ├── create-project.html     # Créer un projet
│   ├── project-details.html    # Éditer un projet
│   ├── clients.html            # Gestion CRM
│   ├── tickets.html            # Support inbox
│   ├── profile.html            # Profil admin
│   ├── calendar.html           # Calendrier
│   ├── chat.html               # Chat admin
│   ├── messages.html           # Messages
│   └── components/
│       ├── sidebar.js          # Navigation admin
│       └── toast.js            # Notifications
│
├── 👥 client/                  # Portail Client
│   ├── index.html              # Login & Dashboard
│   ├── login.html              # Alternative login page
│   ├── dashboard.html          # Vue principale
│   ├── tickets.html            # Mes tickets
│   ├── documents.html          # Mes documents
│   ├── profile.html            # Mon profil
│   ├── timeline.html           # Timeline projet
│   ├── chat.html               # Chat avec admin
│   └── components/
│       └── toast.js            # Notifications
│
├── 🔧 src/                     # Source code
│   ├── main.js                 # Logique globale
│   ├── my-project.js           # Logique dashboard client
│   ├── style.css               # Imports & styles globaux
│   ├── supabase-client.js      # Config Supabase
│   ├── auth-service.js         # Authentification
│   ├── data-store.js           # Gestion des données
│   ├── profile-service.js      # Profils utilisateurs
│   ├── chat-service.js         # Messaging
│   ├── client-layout.js        # Layout client
│   └── components/
│       ├── toast.js            # Component toast
│       └── sidebar.js          # Component sidebar
│
├── 📷 photos/                  # Images (non compilées)
│   ├── construction/
│   ├── it service/
│   └── transport/
│
├── 🎨 public/                  # Assets statiques
│   ├── images/
│   ├── building/
│   ├── energy/
│   ├── IT/
│   ├── market/
│   └── transport/
│
├── 📧 email-templates/         # Templates EmailJS
│   ├── confirm-signup.html
│   └── invite-user.html
│
├── ⚙️ Configuration
│   ├── vite.config.js          # Config build Vite
│   ├── tailwind.config.js      # Design system
│   ├── postcss.config.js       # PostCSS config
│   ├── package.json            # Dépendances npm
│   └── .env.local              # Variables d'env (local)
│
├── 📚 Documentation
│   ├── README.md               # Overview projet
│   ├── PROJECT_DOCUMENTATION.md # Documentation technique
│   ├── NAVIGATION_FLOW.md      # Flux de navigation
│   ├── ERROR_LOG_AND_FIXES.md  # Log des erreurs corrigées
│   └── COMPLETE_GUIDE.md       # Ce fichier
│
└── 📋 SQL Scripts
    ├── enable_client_login.sql
    ├── add_internal_notes.sql
    └── secure_data_access.sql
```

---

## Guide d'Utilisation

### Accès PUBLIC

**URL**: `http://localhost:5173`

1. Accueil avec présentation des 5 services
2. Cliquer sur un service pour voir les détails
3. Formulaire "Suggestions" → Email envoyé via EmailJS

### Accès ADMIN

**URL**: `http://localhost:5173/admin/index.html`

**Login Par Défaut**:
```
Email: admin@tdegroup.com
Password: (Défini lors du setup Supabase)
```

**Actions Disponibles**:
- ✅ Créer un projet
- ✅ Éditer un projet
- ✅ Voir tous les clients
- ✅ Gérer les tickets support
- ✅ Chat avec clients
- ✅ Calendrier des projets

### Accès CLIENT

**URL**: `http://localhost:5173/client/index.html`

**Login**:
```
Project ID: PROJET-ALPHA-01 (exemple)
PIN: 123456 (défini lors de la création du projet)
```

**Vues Disponibles**:
- 📊 Overview (résumé du projet)
- 📈 Timeline (phase par phase)
- 🎫 Tickets (mes demandes)
- 📄 Documents (mes fichiers)
- 💬 Chat (communication avec admin)

---

## Services Disponibles

### 1. Authentification (auth-service.js)

```javascript
// Admin login
await AuthService.loginAdmin(email, password)

// Client login
await AuthService.loginClient(projectId, pin)
```

### 2. Gestion des Données (data-store.js)

```javascript
// Projets
ProjectStore.getAll()
ProjectStore.getById(id)
ProjectStore.add(project)
ProjectStore.update(id, updates)
ProjectStore.delete(id)

// Tickets
ProjectStore.addTicket(projectId, ticket)
ProjectStore.getTickets(projectId)
ProjectStore.updateTicket(ticketId, updates)
```

### 3. Chat (chat-service.js)

```javascript
// Envoyer un message
ChatService.sendMessage(projectId, role, name, content)

// Récupérer la conversation
ChatService.getConversation(projectId)

// Subscribe aux updates
ChatService.subscribeToProject(projectId, callback)
```

### 4. Profils (profile-service.js)

```javascript
// Admin
ProfileService.getAdminProfile()
ProfileService.updateAdminProfile(updates)

// Client
ProfileService.getClientProfile(projectId)
```

---

## Configuration Design System

### Tailwind Config (tailwind.config.js)

**Couleurs Personnalisées**:
```javascript
colors: {
  tde: {
    primary: '#4c1d95',   // Violet 900
    secondary: '#5b21b6', // Violet 800
    accent: '#a78bfa',    // Violet 400
    light: '#f5f3ff',     // Violet 50
    dark: '#2e1065',      // Violet 950
  }
}
```

**Typographie**:
```javascript
fontFamily: {
  sans: ['Inter', 'sans-serif'],    // Texte
  display: ['Poppins', 'sans-serif'], // Titres
}
```

**Animations**:
```javascript
animation: {
  'fade-in': 'fadeIn 0.6s ease-out',
  'slide-up': 'slideUp 0.6s ease-out',
  'pulse-slow': 'pulse 3s infinite',
}
```

---

## Déploiement

### Build Production
```bash
npm run build
# → dist/ folder généré
```

### Hosting Options
1. **Vercel** (Recommandé)
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Netlify**
   ```bash
   npm i -g netlify-cli
   netlify deploy
   ```

3. **Self-hosted** (serveur)
   ```bash
   # Copier contenu de dist/ au serveur
   scp -r dist/* user@server:/var/www/tdegroup
   ```

---

## Troubleshooting

### ❌ Erreur: "Supabase configuration missing"
```
Solution:
1. Vérifier .env.local existe
2. Vérifier VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
3. npm run dev
```

### ❌ Erreur: "Login failed"
```
Solution pour Admin:
1. Vérifier email/password en Supabase
2. Vérifier le rôle est "admin"
3. Check console pour le message d'erreur exact

Solution pour Client:
1. Vérifier Project ID existe
2. Vérifier PIN est correct (6 chiffres)
3. Vérifier les RLS policies sont activées
```

### ❌ Styles TailwindCSS non appliqués
```
Solution:
1. Vérifier tailwind.config.js content paths
2. Vérifier @import "tailwindcss" en src/style.css
3. npm run dev (HMR recharge)
4. Si persiste: npm run build && npm run preview
```

### ❌ EmailJS non fonctionnelle
```
Solution:
1. Vérifier le script dans suggestions.html
2. Vérifier emailjs.init("PUBLIC_KEY")
3. Check navigateur console pour erreurs
4. Vérifier compte EmailJS existe
```

### ❌ Chat/Realtime non mise à jour
```
Solution:
1. Vérifier Supabase Realtime activé
2. Vérifier les RLS policies sur messages table
3. Vérifier la connexion Supabase
```

---

## Performance Tips

### Optimisations Appliquées
- ✅ Vite HMR pour développement rapide
- ✅ Code splitting automatique
- ✅ Image lazy-loading
- ✅ CSS tree-shaking avec Tailwind
- ✅ Minification production

### Recommandations
1. Utiliser `npm run dev` en développement
2. Lazy-load les images grandes
3. Paginer les listes longues
4. Monitorer Lighthouse scores

---

## Support & Contact

- 📧 Email: support@tdegroup.com
- 🌐 Website: https://tdegroup.com
- 📱 GitHub: https://github.com/StalkeRalp/builder-test-main

---

## Changelog

### v1.0.0 (18 Février 2026)
- ✅ Setup initial du projet
- ✅ Configuration Vite, Tailwind, PostCSS
- ✅ Portail Admin complet
- ✅ Portail Client sécurisé
- ✅ Authentification Supabase
- ✅ Chat en temps réel
- ✅ Design system professionnel

---

**Last Updated**: 18 février 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
