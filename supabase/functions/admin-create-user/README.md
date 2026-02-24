# admin-create-user (Edge Function)

Crée/met à jour un compte `admin` ou `superadmin` via `service_role`, sans dépendre du quota d'email transactionnel côté `signUp` client.

## Pré-requis

- Supabase CLI installé
- Projet lié: `supabase link --project-ref <PROJECT_REF>`

## Déploiement

```bash
supabase functions deploy admin-create-user --project-ref <PROJECT_REF>
```

## Secrets (si nécessaire)

En hébergé Supabase, `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont généralement disponibles automatiquement.

Si vous utilisez un autre environnement:

```bash
supabase secrets set \
  SUPABASE_URL=https://<PROJECT_REF>.supabase.co \
  SUPABASE_ANON_KEY=<ANON_KEY> \
  SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

## Test rapide

- Se connecter en `superadmin`
- Ouvrir `superadmin/dashboard.html`
- Créer un admin depuis "Création rapide d'admin"

## Fallback legacy (optionnel)

Par défaut, le front refuse le fallback client legacy pour rester en mode "zéro dépendance quota email".

Activer temporairement le fallback legacy:

```bash
VITE_ALLOW_LEGACY_ADMIN_SIGNUP_FALLBACK=1
```
