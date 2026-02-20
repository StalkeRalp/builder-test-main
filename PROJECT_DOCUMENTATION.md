# 📘 Documentation Complète - Projet TDE Group

Ce document détaille l'architecture, la structure et les fonctionnalités techniques du site web TDE Group, y compris le nouveau module client "MyProject".

## 1. Description du Projet
Le projet est une plateforme web multi-services vitrine pour **TDE Group**. Il a évolué pour inclure un **Extranet Client (MyProject)** interactif.

### Objectifs
-   Présenter les 5 piliers de services (Construction, Énergie, IT, Conseil, Logistique).
-   Offrir un canal de communication fluide (EmailJS).
-   Fournir aux clients un suivi de projet en temps réel (MyProject).

## 2. Architecture Technique

### Stack Technologique
-   **Frontend** : HTML5, JavaScript (ES6+), CSS3.
-   **Framework CSS** : TailwindCSS v4 (Utility-first).
-   **Build Tool** : Vite v7 (Hot Module Replacement, Build optimisé).
-   **Services Tiers** :
    -   **EmailJS** : Envoi de formulaires sans backend serveur.
    -   **Lucide Icons** : Pack d'icônes SVG légères.
    -   **Google Fonts** : Inter (Texte) & Poppins (Titres).

### Structure des Fichiers
```bash
/
├── index.html              # Page d'accueil (Porte d'entrée)
├── construction.html       # Service: Construction
├── energy.html             # Service: Énergie
├── it-services.html        # Service: IT & Tech
├── supply.html             # Service: Logistique
├── consultancy.html        # Service: Conseil
├── suggestions.html        # Formulaire de contact (EmailJS)
├── my-project.html         # [NOUVEAU] Extranet Client / Tableau de bord
├── src/
│   ├── main.js             # Logique globale (Menu mobile, etc.)
│   ├── my-project.js       # Logique spécifique au dashboard client
│   └── style.css           # Imports Tailwind & styles personnalisés
├── public/                 # Assets statiques (Images, Logos)
│   ├── images/
│   ├── building/
│   └── ...
├── tailwind.config.js      # Configuration du Design System
└── vite.config.js          # Configuration du Bundler
```

## 3. Détails des Modules

### A. Site Vitrine (Public)
Chaque page HTML suit une structure cohérente :
1.  **Header** : Navigation responsive, Logo, Bouton "Contact".
2.  **Hero Section** : Image de fond avec overlay dégradé (`bg-premium-gradient`).
3.  **Contenu** : Sections détaillant les services.
4.  **Footer** : Liens rapides et copyright.

### B. Module "MyProject" (Privé)
Ce module est une **Single Page Application (SPA)** simulée au sein d'un fichier HTML unique.
-   **Fichier** : `my-project.html`
-   **Logique** : `src/my-project.js`
-   **Architecture** :
    -   **Vue Connexion** : Formulaire sécurisé avec ID et PIN.
    -   **Vue Dashboard** : Interface riche masquée par défaut (`.hidden`), révélée après connexion.
    -   **Onglets** : Système de navigation interne (Overview, Timeline, Tickets) géré en JS (`switchTab()`).
-   **Sécurité** :
    -   Validation d'un **Access Code (PIN)** à 6 chiffres.
    -   Feedback visuel (Shake animation) en cas d'erreur.

### C. Gestion des Tickets
-   Formulaire dynamique dans une modale.
-   Champs requis : *Sujet, Détails, Phase du Contrat, Priorité*.
-   Simulation d'envoi asynchrone avec feedback utilisateur (Toast notification).

## 4. Design System (Tailwind)

Le design est centralisé dans `tailwind.config.js`.

### Palette de Couleurs
-   **Primary** : `#4c1d95` (Violet Profond) - Identité de marque.
-   **Secondary** : `#5b21b6` (Violet Vif) - Interactions.
-   **Accent** : `#a78bfa` (Violet Clair) - Détails subtils.
-   **Dark** : `#2e1065` (Presque Noir) - Fonds sombres.

### Typographie
-   **Display** : `Poppins` - Pour les titres impactants.
-   **Body** : `Inter` - Pour la lisibilité du texte courant.

### Animations
-   `animate-fade-in` : Apparition douce des sections.
-   `animate-slide-up` : Entrée dynamique des cartes.
-   `animate-pulse-slow` : Effet "vivant" sur les arrière-plans.

## 5. Flux de Données (Actuel vs Futur)

### Actuel (Frontend Only)
1.  **Formulaires** : Les données sont envoyées directement via l'API publique EmailJS (pour suggestions.html).
2.  **MyProject** : Les données (Projets, Tickets) sont "mockées" (simulées) dans le JavaScript pour la démonstration. Aucune base de données n'est connectée.

### Futur (Backend Recommendé)
Pour rendre le module "MyProject" persistant, l'architecture évoluera vers :
-   **Backend** : Firebase ou Node.js/Express.
-   **Base de Données** : Firestore ou MongoDB.
-   **Auth** : TDE Group Auth (au lieu du code PIN statique).

---
*Généré automatiquement par votre Assistant IA - TDE Group*
