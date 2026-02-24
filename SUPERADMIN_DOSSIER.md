# Dossier Super Admin

## Objectif
Mettre en place un espace `super admin` avec des capacités avancées non accessibles aux admins standard.

## Pages et services
- `superadmin/dashboard.html`: tableau de bord super admin.
- `superadmin/login.html`: page de connexion dédiée super admin.
- `src/superadmin-service.js`: opérations réservées super admin.
- `src/auth-service.js`: détection du rôle `superadmin` et garde d'accès.
- `superadmin/create-admin.html`: page legacy protégée super admin.

## Capacités Super Admin (implémentées)
- Créer un admin ou super admin.
- Changer le rôle d'un admin (`admin` <-> `superadmin`).
- Supprimer un compte admin (profil).
- Supprimer tous les projets d'un client via son email.
- Consulter un overview global: admins, superadmins, clients uniques, projets actifs/en pause.

## Capacités Admin simple (sans superadmin)
- Accès au dashboard admin standard (`admin/index.html`, `admin/dashboard.html`).
- Gestion opérationnelle (projets, tickets, messages, calendrier, rapports).
- Pas d'accès à la console `superadmin/dashboard.html`.

## Sécurité et garde d'accès
- `superadmin/dashboard.html` redirige vers `superadmin/login.html` si l'utilisateur n'est pas super admin.
- Le lien latéral "Super Admin" est affiché uniquement pour le rôle super admin.
- Les méthodes de `src/superadmin-service.js` vérifient le rôle super admin avant chaque action.
- Mode stealth activé:
  - accès superadmin conditionné par un code d'accès local (`src/superadmin-stealth.js`),
  - redirection discrète vers `/client/login.html` si le code n'est pas présent/valide,
  - support URL discrète via `?k=<code>` ou `#<code>`,
  - effacement du code local à la déconnexion.

## Point critique géré: création d'admin sans quota email
- La création passe désormais par une Edge Function `admin-create-user` avec `service_role`.
- Effets:
  - plus de dépendance au quota d'emails transactionnels de `signUp` côté client,
  - création/mise à jour/promotion d'admin centralisée en backend,
  - session superadmin conservée (pas de bascule implicite).
- Fallback legacy:
  - désactivé par défaut pour forcer le mode sécurisé,
  - activable temporairement via `VITE_ALLOW_LEGACY_ADMIN_SIGNUP_FALLBACK=1`.

## Bonus dashboard super admin
- KPI visuels (admins, superadmins, clients, projets actifs).
- Tables actions rapides (promotion, suppression).
- Actions de navigation rapide vers pages admin clés.

## Améliorations ajoutées (v2)
- Filtres avancés:
  - filtre par rôle dans la table admins (`all/admin/superadmin`),
  - filtre par statut dans la table clients (`active/in_progress/planning/paused/completed/cancelled`).
- KPI enrichis:
  - ajout du `taux actifs` (ratio projets actifs / projets totaux),
  - affichage horodaté de la dernière synchronisation.
- Exports améliorés:
  - export snapshot JSON global (existant),
  - export CSV admins,
  - export CSV clients consolidés.
- Auto-refresh piloté:
  - bouton ON/OFF en topbar,
  - persistance locale de la préférence,
  - rafraîchissement périodique silencieux (60s).
- Audit local superadmin (bonus):
  - journal local des actions sensibles (création admin, changement de rôle, suppression, exports, toggles),
  - stockage `localStorage`,
  - purge manuelle via bouton.
- Robustesse UX:
  - garde simple sur mot de passe (min 8 caractères) avant création admin,
  - encapsulation des actions sensibles avec gestion d’erreurs UI.

## Déploiement Edge Function
1. `supabase link --project-ref <PROJECT_REF>`
2. `supabase functions deploy admin-create-user --project-ref <PROJECT_REF>`
3. Vérifier les secrets si besoin (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Tester depuis `superadmin/dashboard.html` (création rapide).

## RPC superadmin (auth users)
- Script à exécuter dans Supabase SQL Editor: `ENABLE_SUPERADMIN_AUTH_USERS_RPC.sql`
- Ajouts:
  - `get_superadmin_auth_users(p_search, p_limit)` pour lister les comptes `auth.users` (superadmin uniquement).
  - `promote_auth_user_to_admin(p_user_id, p_role, p_full_name)` pour promouvoir un compte authentifié en `admin/superadmin` + renseigner le nom.

## Dashboard Superadmin (v3)
- KPI étendus:
  - comptes auth globaux,
  - connexions sur 24h.
- Bloc `Intelligence Superadmin`:
  - qualité des comptes (confirmés/non confirmés),
  - activité récente non-admin,
  - hygiène IAM (auth sans profil, admins incomplets),
  - concentration portefeuille client.
- Gestion auth users avancée:
  - filtres métier (`non confirmés`, `sans profil`, `actifs 7j non-admin`, `admins`),
  - sélection multiple + promotion en lot (`admin` / `superadmin`).

## Recommandations suivantes (pro)
1. Ajouter une suppression Auth complète (`auth.users`) via service role backend.
2. Journal d'audit super admin persistant en base (`who did what`).
3. Ajouter confirmations modales (au lieu de `confirm/alert`) pour homogénéité UX.
