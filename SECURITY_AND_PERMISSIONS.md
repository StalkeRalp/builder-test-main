# 🔐 GUIDE DE SÉCURITÉ & PERMISSIONS

## Table des Matières
1. [Principes de Base](#principes-de-base)
2. [Authentification](#authentification)
3. [Row Level Security (RLS)](#row-level-security-rls)
4. [Permissions Détaillées](#permissions-détaillées)
5. [Scénarios d'Attaque & Défenses](#scénarios-dattaque--défenses)
6. [Checklist Sécurité](#checklist-sécurité)

---

## 🎯 Principes de Base

### 1. **Séparation des Rôles**
- **Admin** = Super-utilisateur, contrôle total
- **Client** = Observateur actif, accès limité à son projet

### 2. **Rule of Least Privilege**
Chaque utilisateur ne peut accéder qu'aux données STRICTEMENT nécessaires.

### 3. **Defense in Depth**
Protection à plusieurs niveaux:
- Authentification
- Authorization (Permissions)
- Data Isolation (RLS)
- Encryption (HTTPS)

### 4. **Audit Trail**
Tous les accès importants sont loggés.

---

## 🔑 Authentification

### Admin Authentication

**Méthode**: Email + Mot de passe via Supabase Auth

```javascript
// Steps
1. Admin se connecte via admin/login.html
2. Email + Password envoyés à Supabase Auth
3. Supabase valide et retourne JWT token
4. Token stocké dans localStorage
5. Chaque requête API inclut le token
6. Vérification du rôle "admin" en base de données
```

**Sécurité**:
- ✅ Mot de passe hashé (Bcrypt)
- ✅ JWT tokens avec expiration
- ✅ HTTPS obligatoire (en production)
- ✅ Sessions expirables
- ✅ Impossible de voir les passwords en base

### Client Authentication

**Méthode**: Project ID + PIN (Stateless, sans compte)

```javascript
// Steps
1. Client accède client/index.html
2. Entre Project ID + PIN
3. RPC function 'login_client' appelée
4. Supabase valide:
   a. Project ID existe
   b. PIN = PIN de ce projet
   c. Projet n'est pas archivé
5. Si OK → Session établie
6. Données de session dans sessionStorage (temporaire)
```

**Sécurité**:
- ✅ Pas de création de compte
- ✅ PIN unique par projet (6+ chiffres)
- ✅ Validation en RPC (security definer)
- ✅ SessionStorage = données perdues à fermeture du navigateur
- ✅ Pas de localStorage = pas de persistence dangereuse

### Différence Clé

```
Admin: Authentication Stateful
├─→ Crée un compte
├─→ Mot de passe complexe
├─→ Persistance à travers sessions
├─→ Peut rester connecté longtemps

Client: Authentication Stateless
├─→ Pas de compte
├─→ Identifiant simple (Project ID + PIN)
├─→ Session éphémère
├─→ Déconnexion = fermeture navigateur
```

---

## 🏛️ Row Level Security (RLS)

### Concept

RLS = Politique de sécurité au niveau de la **BASE DE DONNÉES** (pas juste l'application).

**Avantage**: Même si le frontend est contourné, la DB refuse l'accès.

### Implémentation

#### 1. Admin Access Pattern

```sql
-- Table: projects
CREATE POLICY "admin_select_all_projects" ON projects
  FOR SELECT
  USING (
    -- Vérifier que l'utilisateur connecté est ADMIN
    auth.uid() IN (
      SELECT user_id 
      FROM admin_profiles 
      WHERE role = 'admin'
    )
  );

CREATE POLICY "admin_insert_projects" ON projects
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM admin_profiles 
      WHERE role = 'admin'
    )
  );

CREATE POLICY "admin_update_projects" ON projects
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM admin_profiles 
      WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM admin_profiles 
      WHERE role = 'admin'
    )
  );

CREATE POLICY "admin_delete_projects" ON projects
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM admin_profiles 
      WHERE role = 'admin'
    )
  );
```

#### 2. Client Access Pattern

```sql
-- Table: projects (client view)
CREATE POLICY "client_select_own_project" ON projects
  FOR SELECT
  USING (
    -- Vérifier que le PIN fourni est correct
    EXISTS (
      SELECT 1 
      FROM client_sessions 
      WHERE project_id = id
        AND client_pin_hash = crypt($1, client_pin_hash)
        AND created_at > NOW() - INTERVAL '24 hours'
    )
  );

-- Client CANNOT INSERT, UPDATE, DELETE projects
-- (Pas de CREATE POLICY → Accès refusé)
```

#### 3. Internal Notes (Admin Only)

```sql
-- Table: internal_notes
CREATE POLICY "admin_full_access_notes" ON internal_notes
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM admin_profiles WHERE role = 'admin'
    )
  );

-- Client CANNOT see this table
-- (Pas de CREATE POLICY → Accès refusé)
```

#### 4. Messages (Isolation par Project)

```sql
-- Table: messages
CREATE POLICY "users_see_own_project_messages" ON messages
  FOR SELECT
  USING (
    -- Admin voit tous les messages
    (auth.uid() IN (
      SELECT user_id FROM admin_profiles WHERE role = 'admin'
    ))
    -- Client voit UNIQUEMENT messages de son projet
    OR
    (project_id IN (
      SELECT id FROM projects 
      WHERE client_pin = current_setting('app.client_pin')
    ))
  );

CREATE POLICY "users_insert_own_messages" ON messages
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects 
      WHERE client_pin = current_setting('app.client_pin')
    )
  );
```

### Schéma d'Accès Complet

```
ADMIN
├─ SELECT projects → OK (all rows)
├─ INSERT projects → OK
├─ UPDATE projects → OK
├─ DELETE projects → OK
├─ SELECT internal_notes → OK
├─ INSERT internal_notes → OK
├─ UPDATE messages → OK (tous les messages)
└─ SELECT documents → OK (publics et privés)

CLIENT A
├─ SELECT projects → OK (UNIQUEMENT "Projet A")
├─ INSERT projects → ❌ DENY
├─ UPDATE projects → ❌ DENY
├─ DELETE projects → ❌ DENY
├─ SELECT internal_notes → ❌ DENY
├─ SELECT messages → OK (UNIQUEMENT messages Projet A)
├─ INSERT messages → OK (UNIQUEMENT Projet A)
├─ UPDATE documents → ❌ DENY
└─ SELECT documents → OK (publics de Projet A)

CLIENT B
├─ SELECT projects → OK (UNIQUEMENT "Projet B")
├─ SELECT messages → OK (UNIQUEMENT messages Projet B)
├─ ❌ CANNOT SEE Projet A, messages A, docs A
```

---

## 📋 Permissions Détaillées

### ADMIN PERMISSIONS MATRIX

#### Projets
| Action | Permission | Notes |
|--------|-----------|-------|
| Lire tous les projets | ✅ | Visibilité totale |
| Créer un projet | ✅ | Génère Project ID + PIN |
| Éditer les détails | ✅ | Nom, budget, dates, etc. |
| Mettre à jour statut | ✅ | Planning → In Progress → Completed |
| Mettre à jour progression | ✅ | 0% → 100% |
| Supprimer un projet | ✅ | Archive ou suppression physique |
| Exporter données | ✅ | CSV/PDF reports |

#### Phases
| Action | Permission | Notes |
|--------|-----------|-------|
| Créer une phase | ✅ | Fondations, Gros œuvre, etc. |
| Éditer une phase | ✅ | Dates, description, statut |
| Ajouter photos | ✅ | Avant/après du chantier |
| Marquer "Complétée" | ✅ | Met à jour timeline client |
| Supprimer une phase | ✅ | Rare, mais possible |
| Voir commentaires clients | ✅ | Via chat/tickets |

#### Documents
| Action | Permission | Notes |
|--------|-----------|-------|
| Ajouter documents | ✅ | Devis, Plans, Contrats, etc. |
| Définir visibilité | ✅ | Public, Admin only, Private |
| Publier pour client | ✅ | Client peut voir et télécharger |
| Garder privé | ✅ | Invisible au client |
| Modifier document | ✅ | Renommer, remplacer |
| Supprimer document | ✅ | Permanent |
| Voir qui l'a téléchargé | ✅ | Audit trail optionnel |

#### Tickets Support
| Action | Permission | Notes |
|--------|-----------|-------|
| Voir tous les tickets | ✅ | Tous les clients |
| Répondre aux tickets | ✅ | Direct aux clients |
| Marquer "Résolu" | ✅ | Ferme le ticket |
| Créer ticket interne | ✅ | Invisible au client |
| Supprimer ticket | ✅ | Archive ou suppression |

#### Chat
| Action | Permission | Notes |
|--------|-----------|-------|
| Envoyer messages | ✅ | À tout client |
| Envoyer pièces jointes | ✅ | Docs, images, etc. |
| Éditer ses messages | ✅ | Avant/après |
| Voir conversations | ✅ | Toutes les conversations |
| Archiver conversations | ✅ | Garde trace mais masque |
| Mentionner clients | ✅ | Notifications push |

#### Notes Internes
| Action | Permission | Notes |
|--------|-----------|-------|
| Lire notes privées | ✅ | 🔒 INVISIBLE AU CLIENT |
| Ajouter notes | ✅ | Confidentialité stricte |
| Éditer notes | ✅ | Historique sauvegardé |
| Supprimer notes | ✅ | Mais log conservé |

---

### CLIENT PERMISSIONS MATRIX

#### Timeline (Lecture Seule)
| Action | Permission | Notes |
|--------|-----------|-------|
| Voir phases | ✅ | Lire les infos |
| Voir progression | ✅ | Comprendre avancement |
| Voir photos | ✅ | Aperçu du chantier |
| Créer phase | ❌ | Admin seul |
| Éditer phase | ❌ | Admin seul |
| Supprimer phase | ❌ | Admin seul |

#### Documents (Lecture & DL)
| Action | Permission | Notes |
|--------|-----------|-------|
| Lister documents | ✅ | Voir quoi disponible |
| Télécharger | ✅ | Récupérer fichier |
| Prévisualiser | ✅ | PDF inline viewer |
| Supprimer doc | ❌ | Admin seul |
| Renommer | ❌ | Admin seul |
| Ajouter doc | ❌ | Sauf via chat |
| Voir docs privés | ❌ | Admin only, invisible |

#### Chat (Envoi & Lecture)
| Action | Permission | Notes |
|--------|-----------|-------|
| Envoyer messages | ✅ | Librement |
| Joindre photos | ✅ | < 5 MB |
| Lire conversation | ✅ | Historique complet |
| Éditer ses messages | ✅ | Ses propres messages |
| Supprimer ses messages | ❌ | Conservation audit |
| Voir autres conversations | ❌ | Isolation RLS |
| Envoyer vers admin | ✅ | Direct |
| @mention admin | ❌ | Pas nécessaire |

#### Tickets (Création & Lecture)
| Action | Permission | Notes |
|--------|-----------|-------|
| Créer ticket | ✅ | Soumettre problème |
| Voir ses tickets | ✅ | Lister ses demandes |
| Voir réponse admin | ✅ | Lire les replies |
| Joindre photos | ✅ | < 5 MB par ticket |
| Éditer ticket (ouvert) | ✅ | Si pas encore résolu |
| Supprimer ticket | ❌ | Trace audit |
| Voir tickets clients | ❌ | Isolation RLS |
| Marquer résolu | ⚠️ | Suggestion uniquement |
| Réouvrir résolu | ✅ | Si problème persiste |

#### Profil (Édition Limitée)
| Action | Permission | Notes |
|--------|-----------|-------|
| Changer photo | ✅ | Avatar personnel |
| Changer téléphone | ✅ | Numéro de contact |
| Changer email | ❌ | Défini par Admin |
| Changer PIN | ❌ | Admin seul |
| Changer nom | ❌ | Enregistrement Admin |
| Voir budget | ⚠️ | Optionnel (config Admin) |
| Voir dates projet | ✅ | Info de base |
| Modifier dates | ❌ | Admin seul |

---

## 🚨 Scénarios d'Attaque & Défenses

### Scénario 1: Client A Tente d'Accéder Projet B

**Attaque**:
```javascript
// Hacker essaie de modifier l'URL
// client/index.html?project=PROJET-B
// Ou modifier sessionStorage
sessionStorage.setItem('client_project_id', 'PROJET-B');
```

**Défense - RLS**:
```sql
-- Base de données valide quand même
-- Toute requête SELECT projects WHERE id = 'PROJET-B'
-- Est refusée car:
-- - Client A n'a pas le PIN de PROJET-B
-- - RLS policy checke le PIN
-- - ❌ QUERY DENIED

Result: "Permission denied" même si le code l'essaie
```

**Résultat**: ✅ SÉCURISÉ

---

### Scénario 2: Client Tente de Supprimer un Document

**Attaque**:
```javascript
// Hacker tente un DELETE
await supabase
  .from('documents')
  .delete()
  .eq('id', 'doc-123')
```

**Défense - No Policy**:
```sql
-- Table: documents
-- Pas de CREATE POLICY pour DELETE
-- Seul l'Admin a une policy
-- Client reçoit: "You do not have permission to perform DELETE"
```

**Résultat**: ✅ SÉCURISÉ

---

### Scénario 3: Client Tente de Lire les Notes Internes

**Attaque**:
```javascript
// Hacker tente de lire la table entière
const notes = await supabase
  .from('internal_notes')
  .select('*')
```

**Défense - Table Restriction**:
```sql
-- Table: internal_notes
-- CREATE POLICY pour ADMIN uniquement
-- Client n'a pas de policy du tout
-- SELECT retourne: "No rows returned" ou erreur permission
```

**Résultat**: ✅ SÉCURISÉ

---

### Scénario 4: Admin Essaie d'Accéder comme Client

**Attaque**:
```javascript
// Admin veut voir le "vrai" view client
sessionStorage.setItem('client_project_id', 'PROJET-123');
sessionStorage.setItem('client_pin', '999999');
// Essaie le endpoint client
```

**Défense - Role Check**:
```javascript
// Application check:
const session = await supabase.auth.getSession();
if (session.user) {
  const profile = await supabase.from('profiles').select('role');
  if (profile.role === 'admin') {
    // Admin ne peut PAS aller sur client portal
    window.location = '/admin/index.html';
  }
}
```

**Résultat**: ✅ SÉCURISÉ

---

### Scénario 5: SQL Injection (Parameterized Queries)

**Attaque**:
```javascript
// Tentative classique d'injection SQL
const projectId = "PROJ'; DROP TABLE projects; --";
await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId);
```

**Défense - Supabase Parameterized**:
```javascript
// Supabase JS client utilise les paramètres liés (prepared statements)
// La chaîne est traitée comme une valeur, pas du code SQL
// Result: Recherche le projet avec ID littéral "PROJ'; DROP TABLE projects; --"
// Aucun DROP exécuté ✅
```

**Résultat**: ✅ SÉCURISÉ

---

### Scénario 6: Man-in-the-Middle (HTTP)

**Attaque**:
```
Client → Hacker en MITM → Supabase
Hacker intercept JWT token et données
```

**Défense - HTTPS**:
```
- HTTPS obligatoire en production
- Certificat SSL/TLS chiffre la communication
- MITM ne peut pas intercepter (clé de chiffrement inconnue)
- HSTS header force HTTPS toujours
```

**Résultat**: ✅ SÉCURISÉ

---

## ✅ Checklist Sécurité

### Configuration Initiale
- [ ] Supabase RLS **ACTIVÉ** (pas désactivé!)
- [ ] Authentification Admin configurée
- [ ] PIN generation sécurisé (crypto-random, pas simple counter)
- [ ] Passwords Admin hashen (Bcrypt, pas MD5!)
- [ ] HTTPS en production (certificat SSL/TLS)

### Row Level Security (RLS)
- [ ] Policies pour Admin: SELECT, INSERT, UPDATE, DELETE (all tables)
- [ ] Policies pour Client: SELECT (projects, messages, documents only)
- [ ] **Pas** de policies pour Client: internal_notes, phases (DELETE)
- [ ] Vérification role "admin" dans les conditions
- [ ] Tests: Client A ❌ voit Client B

### Authentification
- [ ] Admin: Email + Password Supabase Auth
- [ ] Client: Project ID + PIN RPC validation
- [ ] JWT tokens expiration configurée
- [ ] Refresh tokens en place
- [ ] Sessions timeout après inactivité

### Sessions & Persistence
- [ ] Admin: localStorage pour JWT (persistence OK)
- [ ] Client: sessionStorage pour PIN (éphémère)
- [ ] Logout efface les données
- [ ] Cross-tab verification (un client ne peux pas share PIN)

### Données Sensibles
- [ ] Budget masqué si nécessaire
- [ ] Notes internes RLS-protected
- [ ] Emails clients chiffrés optionnellement
- [ ] Pas de passwords en logs
- [ ] Pas de PINs en logs

### Upload & Storage
- [ ] Fichiers uploadés dans Supabase Storage (pas dans DB)
- [ ] Limite de taille (< 10MB par document)
- [ ] Validation MIME type
- [ ] Virus scanning optionnel
- [ ] Antivirus pour images (pas de malware embeds)

### API & Endpoints
- [ ] Tous les endpoints utilisent Supabase client (pas d'API custom)
- [ ] Paramètres liés (prepared statements)
- [ ] Pas de query string sensibles (avoid GET avec passwords)
- [ ] Rate limiting sur auth endpoints
- [ ] CORS configuré correctement

### Audit & Monitoring
- [ ] Logs d'accès (qui, quand, quoi)
- [ ] Alertes sur activités suspectes
- [ ] Backup quotidiens de la base
- [ ] Versioning des documents importants
- [ ] Récupération d'erreurs discrète (pas de stack trace au client)

### Testing
- [ ] Test d'accès non-autorisé (client A vs B)
- [ ] Test de suppression interdite
- [ ] Test de modification interdite
- [ ] Test de token expiration
- [ ] Test de logout
- [ ] Penetration testing optionnel

### Documentation
- [ ] Políticas RLS documentées
- [ ] Guide sécurité pour admins
- [ ] Procédure changement de mot de passe
- [ ] Procédure reset PIN client
- [ ] Politique de rétention des données

---

## 📞 Support & Escalation

### Si un client signale un problème de sécurité:
1. Prendre au sérieux
2. Arrêter l'exploitation immédiatement
3. Notifier l'équipe technique
4. Analyser les logs
5. Patcher la faille
6. Informer le client de la correction

### Contacts Urgents:
- Security Team: security@tdegroup.com
- CTO: cto@tdegroup.com
- Incident Line: +33 XX XX XX XX

---

**Version**: 1.0.0  
**Dernière révision**: 18 février 2026  
**Status**: Approuvé ✅  
**Classification**: CONFIDENTIEL - Usage Interne
