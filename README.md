# 🏢 TDE Group - Multi-Services Website

![TDE Group](https://img.shields.io/badge/TDE-Group-purple?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?style=for-the-badge&logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1.18-38B2AC?style=for-the-badge&logo=tailwind-css)
![EmailJS](https://img.shields.io/badge/EmailJS-Integrated-green?style=for-the-badge)

Site web professionnel multi-services pour **TDE Group**, une entreprise offrant des solutions dans les domaines de la construction, de l'énergie, des technologies de l'information, du conseil et de la logistique.

## 📋 Table des matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Technologies utilisées](#-technologies-utilisées)
- [Installation](#-installation)
- [Commandes disponibles](#-commandes-disponibles)
- [Structure du projet](#-structure-du-projet)
- [Pages disponibles](#-pages-disponibles)
- [Configuration EmailJS](#-configuration-emailjs)
- [Déploiement](#-déploiement)
- [Auteurs](#-auteurs)

## 🎯 Aperçu

TDE Group est un site web moderne et responsive présentant les services d'une entreprise multi-disciplinaire. Le site met en avant :

- **Design moderne** avec animations fluides et effets glassmorphism
- **Navigation intuitive** avec menu responsive
- **Galeries d'images** pour chaque service
- **Formulaire de suggestions** avec envoi d'emails via EmailJS
- **Performance optimisée** avec Vite et TailwindCSS

## ✨ Fonctionnalités

### 🎨 Design & UX
- ✅ Design responsive (mobile, tablette, desktop)
- ✅ Animations et transitions fluides
- ✅ Effets hover interactifs
- ✅ Glassmorphism et gradients modernes
- ✅ Icônes Lucide intégrées

### 📄 Pages
- ✅ Page d'accueil avec présentation des services
- ✅ Pages dédiées pour chaque service :
  - Construction & Infrastructure
  - Énergie & Solutions électriques
  - Services IT & Cybersécurité
  - Conseil en affaires
  - Approvisionnement & Logistique
- ✅ Page de suggestions anonymes

### 📧 Formulaire de contact
- ✅ Envoi d'emails via EmailJS
- ✅ Validation des champs
- ✅ Animations de succès/erreur
- ✅ Redirection automatique après envoi
- ✅ Champ nom optionnel

## 🛠 Technologies utilisées

### Frontend
- **[Vite](https://vitejs.dev/)** `v7.2.4` - Build tool ultra-rapide
- **[TailwindCSS](https://tailwindcss.com/)** `v4.1.18` - Framework CSS utility-first
- **HTML5** - Structure sémantique
- **JavaScript (ES6+)** - Interactivité

### Bibliothèques
- **[Lucide Icons](https://lucide.dev/)** - Icônes modernes
- **[EmailJS](https://www.emailjs.com/)** - Service d'envoi d'emails
- **[Unsplash](https://unsplash.com/)** - Images haute qualité

### Outils de développement
- **PostCSS** - Traitement CSS
- **Autoprefixer** - Compatibilité navigateurs

## 📦 Installation

### Prérequis
- **Node.js** version 18 ou supérieure
- **npm** ou **yarn**

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone https://github.com/StalkeRalp/builder-test-main.git
cd builder-test-main
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration EmailJS** (optionnel)
   
   Si vous souhaitez modifier la configuration EmailJS, éditez le fichier `suggestions.html` :
   ```javascript
   emailjs.init("VOTRE_PUBLIC_KEY");
   
   emailjs.sendForm(
       'VOTRE_SERVICE_ID',
       'VOTRE_TEMPLATE_ID',
       form
   )
   ```

## 🚀 Commandes disponibles

### Développement

Lance le serveur de développement avec rechargement automatique :
```bash
npm run dev
```
Le site sera accessible sur `http://localhost:5173`

### Build de production

Compile le projet pour la production :
```bash
npm run build
```
Les fichiers optimisés seront générés dans le dossier `dist/`

### Prévisualisation de production

Prévisualise le build de production localement :
```bash
npm run preview
```

### Commandes Git

Ajouter et commiter les changements :
```bash
git add .
git commit -m "Votre message de commit"
git push
```

## 📁 Structure du projet

```
builder-test-main/
├── public/                    # Fichiers statiques
│   ├── images/               # Images générales
│   ├── building/             # Images construction
│   ├── energy/               # Images énergie
│   ├── IT/                   # Images IT
│   ├── market/               # Images conseil
│   └── transport/            # Images logistique
├── src/                      # Code source
│   ├── main.js              # Point d'entrée JavaScript
│   └── style.css            # Styles globaux
├── index.html               # Page d'accueil
├── construction.html        # Page construction
├── energy.html              # Page énergie
├── it-services.html         # Page IT
├── consultancy.html         # Page conseil
├── supply.html              # Page logistique
├── suggestions.html         # Page suggestions
├── package.json             # Dépendances npm
├── tailwind.config.js       # Configuration Tailwind
├── vite.config.js           # Configuration Vite
└── README.md                # Ce fichier
```

## 📄 Pages disponibles

| Page | URL | Description |
|------|-----|-------------|
| Accueil | `/` | Présentation générale et services |
| Construction | `/construction.html` | Services de construction et infrastructure |
| Énergie | `/energy.html` | Solutions énergétiques et électriques |
| IT Services | `/it-services.html` | Services informatiques et cybersécurité |
| Conseil | `/consultancy.html` | Conseil en affaires et stratégie |
| Logistique | `/supply.html` | Approvisionnement et transport |
| Suggestions | `/suggestions.html` | Formulaire de suggestions anonymes |

## 📧 Configuration EmailJS

Le formulaire de suggestions utilise **EmailJS** pour envoyer des emails. Configuration actuelle :

- **Public Key** : `qd_1OXHxfJaEOUh7O`
- **Service ID** : `service_r7jr1vz`
- **Template ID** : `template_0dnx6fs`
- **Email destinataire** : `nkadambatonga12@gmail.com`

### Champs du formulaire
- **Nom** (optionnel) - `name`
- **Email** (requis) - `email`
- **Message** (requis) - `message`

## 🌐 Déploiement

### Déploiement sur Vercel

1. Installer Vercel CLI :
```bash
npm install -g vercel
```

2. Déployer :
```bash
vercel
```

### Déploiement sur Netlify

1. Build le projet :
```bash
npm run build
```

2. Glisser-déposer le dossier `dist/` sur [Netlify Drop](https://app.netlify.com/drop)

### Déploiement sur GitHub Pages

1. Installer gh-pages :
```bash
npm install --save-dev gh-pages
```

2. Ajouter dans `package.json` :
```json
"scripts": {
  "deploy": "vite build && gh-pages -d dist"
}
```

3. Déployer :
```bash
npm run deploy
```

## 🎨 Personnalisation

### Couleurs
Les couleurs principales sont définies dans `tailwind.config.js` :
```javascript
colors: {
  'tde-primary': '#1e1b4b',
  'tde-secondary': '#7c3aed',
  'tde-accent': '#a78bfa',
  'tde-light': '#f3f4f6'
}
```

### Polices
Le projet utilise :
- **Inter** - Texte général
- **Poppins** - Titres et éléments display

## 👥 Auteurs

- **StalkeRalp** - Développeur principal
- **TDE Group** - Client

## 📝 Licence

Ce projet est la propriété de **TDE Group**. Tous droits réservés © 2026.

---

## 🆘 Support

Pour toute question ou problème :
- 📧 Email : nkadambatonga12@gmail.com
- 🌐 GitHub : [StalkeRalp/builder-test-main](https://github.com/StalkeRalp/builder-test-main)

---

**Fait avec ❤️ par TDE Group**
