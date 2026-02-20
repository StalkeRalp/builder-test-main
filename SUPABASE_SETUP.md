# 🚀 SUPABASE SETUP GUIDE

## Étape 1: Créer un projet Supabase

1. Allez à https://app.supabase.com/
2. Cliquez sur "New Project"
3. Remplissez les informations:
   - **Name**: `tde-group-main`
   - **Database Password**: Créez un mot de passe fort et **gardez-le**
   - **Region**: Choisissez la région la plus proche (`EU-West` pour la France)
4. Attendez la création (2-3 minutes)

## Étape 2: Copier les clés API

1. Allez dans **Settings → API**
2. Copiez:
   - **Project URL** → `VITE_SUPABASE_URL` dans `.env.local`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY` dans `.env.local`
   - **service_role secret** → Gardez-le pour plus tard (backend seulement)

Exemple `.env.local`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Étape 3: Créer la base de données

1. Allez dans **SQL Editor** (sidebar gauche)
2. Cliquez sur "New query"
3. Ouvrez le fichier `DATABASE_SCHEMA.sql` de ce projet
4. Copiez **TOUT** le contenu SQL
5. Collez dans l'éditeur SQL de Supabase
6. Cliquez **Run** ✅

Le système créera:
- ✅ Tables (profiles, projects, phases, documents, messages, tickets, notes, logs)
- ✅ RLS Policies (sécurité au niveau des lignes)
- ✅ Indexes (pour la performance)
- ✅ Fonctions (login_client, update_project_progress, add_internal_note)
- ✅ Realtime (pour le chat en temps réel)

## Étape 4: Configurer l'authentification Email

1. Allez dans **Authentication → Providers**
2. Vérifiez que **Email** est activé ✅
3. Allez dans **Authentication → Templates**
4. (Optionnel) Personnalisez les templates de confirmation

## Étape 5: Créer le premier utilisateur Admin

### Option A: Via Supabase UI (recommandé pour tester)

1. Allez dans **Authentication → Users**
2. Cliquez **Invite user**
3. Entrez un email et cliquez **Send invite**
4. Acceptez l'invite dans votre email
5. Créez un mot de passe

### Option B: Via code (production)

Utilisez le script SQL dans `secure_data_access.sql` du projet.

## Étape 6: Ajouter des clients (projects members)

1. Allez dans **SQL Editor → New query**
2. Copiez ce code:

```sql
-- Create project member (client)
INSERT INTO public.project_members (project_id, email, role)
VALUES (
    (SELECT id FROM public.projects LIMIT 1), -- First project
    'client@example.com',
    'viewer'
);
```

3. Remplacez `client@example.com` par l'email du client réel
4. Cliquez **Run**

## Étape 7: Générer PIN pour client

```sql
-- Generate 6-digit PIN for a project
UPDATE public.projects
SET access_pin = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE id = (SELECT id FROM public.projects LIMIT 1);

-- View the PIN
SELECT id, name, access_pin FROM public.projects LIMIT 1;
```

## Étape 8: Vérifier la connexion

Lancez le développement:
```bash
npm install
npm run dev
```

Ouvrez http://localhost:5173 dans votre navigateur.

La console devrait afficher:
```
✅ Supabase connected successfully
```

## ✅ Troubleshooting

### Erreur: "VITE_SUPABASE_URL is not defined"
- Vérifiez que `.env.local` existe
- Redémarrez le serveur dev (`npm run dev`)

### Erreur: "RLS violation"
- Vérifiez que les RLS policies sont correctes
- Assurez-vous que l'utilisateur a les bonnes permissions

### Erreur: "Access denied (403)"
- L'utilisateur n'existe pas encore
- Ou les RLS policies ne sont pas configurées correctement

## 📝 Prochaines étapes

1. ✅ Supabase configuré
2. ⏭️ Tester authentification (admin login)
3. ⏭️ Tester accès client (PIN)
4. ⏭️ Tester RLS (isolation données)
5. ⏭️ Déployer en production

**Document de référence**: Voir [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md) pour le déploiement en production.
