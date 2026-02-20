# 🧪 GUIDE DE TEST COMPLET

## Phase 1: Tests d'authentification

### Test 1.1: Supabase Connection
```javascript
// Dans la console browser (F12)
await window.supabase.from('profiles').select('count').limit(1);
// Devrait retourner: {data: null, error: null} ou {data: [...], error: null}
```

**Résultat attendu**: Aucune erreur de connexion

### Test 1.2: Admin Login
```
URL: http://localhost:5173/admin
Email: admin@tdegroup.com
Password: [le mot de passe créé]

Résultat attendu:
✓ Redirect vers /admin/dashboard.html
✓ Dashboard affiché avec projects list
✓ Sidebar navigation visible
```

**Console vérifier**: `window.AuthService.isAdmin()` retourne `true`

### Test 1.3: Client Login (PIN)
```
URL: http://localhost:5173/client
Project ID: [copier d'une ligne dans Supabase: SELECT id FROM projects]
PIN: 123456

Résultat attendu:
✓ Redirect vers /client/dashboard.html  
✓ Client dashboard affiché
✓ Timeline visible
✓ Documents visibles
```

**Console vérifier**: `window.AuthService.isClient()` retourne `true`

---

## Phase 2: Tests de permissions RLS

### Test 2.1: Admin voit TOUS les projets

```javascript
// Admin login
const adminProjects = await window.supabase
    .from('projects')
    .select('*');
console.log('Admin projects:', adminProjects.data.length);
// Devrait voir 1+ projects
```

### Test 2.2: Client voit UNIQUEMENT son projet

```javascript
// Client login avec PIN
const clientSession = JSON.parse(localStorage.getItem('tde_client_session'));
const clientProjectId = clientSession.projectId;

// Try to access another project (if exists)
const otherProjects = await window.supabase
    .from('projects')
    .select('*')
    .neq('id', clientProjectId);

console.log('Client sees other projects:', otherProjects.data ? otherProjects.data.length : 0);
// Devrait retourner: data: [], error: null (client ne voit rien)
```

### Test 2.3: Client NE VOIT PAS les notes internes

```javascript
// Client login
const internalNotes = await window.supabase
    .from('internal_notes')
    .select('*');

console.log('Internal notes visible to client:', internalNotes.data ? internalNotes.data.length : 0);
// Devrait retourner: error "new row violates row-level security policy"
```

---

## Phase 3: Tests des services

### Test 3.1: DataStore - Get Projects

```javascript
import { dataStore } from '../src/data-store.js';

// Admin
const allProjects = await dataStore.getAll();
console.log('All projects:', allProjects.length);
// Devrait voir 1+ projects

// Client
const clientProject = await dataStore.getById(clientProjectId);
console.log('Client project:', clientProject.name);
// Devrait voir le projet du client
```

### Test 3.2: DataStore - Get Phases

```javascript
const phases = await dataStore.getPhases(projectId);
console.log('Phases:', phases);
// Devrait afficher toutes les phases du projet
```

### Test 3.3: ChatService - Send Message

```javascript
import { chatService } from '../src/chat-service.js';

const result = await chatService.sendMessage(
    projectId,
    'client', // role
    'Jean Client', // name
    'Hello admin!' // message
);

console.log('Message sent:', result);
// Devrait afficher success: true
```

### Test 3.4: ChatService - Get Conversation

```javascript
const messages = await chatService.getConversation(projectId);
console.log('Messages:', messages);
// Devrait afficher tous les messages du projet
```

---

## Phase 4: Tests d'interface utilisateur

### Test 4.1: Admin Dashboard
- [ ] Page charge sans erreur
- [ ] Sidebar navigation visible
- [ ] Projects list affichée
- [ ] Quick actions visibles
- [ ] Activity feed chargé
- [ ] Responsive (test sur mobile)

### Test 4.2: Admin Create Project
- [ ] Cliquer "Create Project"
- [ ] Formulaire s'ouvre
- [ ] Remplir tous les champs
- [ ] PIN généré automatiquement
- [ ] Cliquer "Create"
- [ ] Vérifier le projet apparaît dans la liste

### Test 4.3: Admin Edit Project
- [ ] Ouvrir un projet
- [ ] Cliquer "Edit"
- [ ] Modifier les informations
- [ ] Cliquer "Save"
- [ ] Vérifier les changements sont sauvegardés

### Test 4.4: Admin Manage Phases
- [ ] Ouvrir un projet
- [ ] Aller à "Phases"
- [ ] Ajouter une phase
- [ ] Modifier une phase
- [ ] Marquer une phase comme complétée
- [ ] Vérifier l'ordre est correct

### Test 4.5: Admin Upload Document
- [ ] Aller à "Documents"
- [ ] Cliquer "Upload"
- [ ] Choisir un fichier
- [ ] Entrer une description
- [ ] Cliquer "Upload"
- [ ] Vérifier le document apparaît

### Test 4.6: Admin Internal Notes
- [ ] Aller à "Internal Notes"
- [ ] Ajouter une note
- [ ] Vérifier que les clients ne peuvent pas voir cette note
- [ ] Éditer la note
- [ ] Supprimer la note

### Test 4.7: Client View Timeline
- [ ] Client login
- [ ] Timeline affichée avec les phases
- [ ] Progression visible (% bar)
- [ ] Dates correctes
- [ ] Statuts corrects

### Test 4.8: Client Download Documents
- [ ] Documents visibles dans la liste
- [ ] Cliquer sur un document
- [ ] Télécharger le fichier
- [ ] Vérifier le fichier est correct

### Test 4.9: Client Send Message
- [ ] Chat visiblen
- [ ] Écrire un message
- [ ] Cliquer "Send"
- [ ] Message apparaît dans la conversation
- [ ] Admin voit le message

### Test 4.10: Client Manage Profile
- [ ] Aller à "Profile"
- [ ] Modifier photo (si upload disponible)
- [ ] Modifier téléphone
- [ ] Cliquer "Save"
- [ ] Vérifier les changements

---

## Phase 5: Tests de sécurité

### Test 5.1: Brute Force Protection
- [ ] 5 tentatives de login avec mauvais PIN
- [ ] Vérifier le compte n'est pas bloqué (ou compte bloqué après X tentatives)

### Test 5.2: SQL Injection
- [ ] Essayer d'injecter du SQL: `' OR '1'='1`
- [ ] Doit être échappé et rejeté

### Test 5.3: CORS
- [ ] Faire une requête depuis un autre domaine
- [ ] Doit être rejetée (CORS)

### Test 5.4: Session Hijacking
- [ ] Copier le token JWT du localStorage
- [ ] Essayer de l'utiliser d'une autre IP/device
- [ ] Doit être rejeté (optionnel selon config)

---

## Phase 6: Tests de performance

### Test 6.1: Page Load Time
```javascript
// Dans console
console.time('page-load');
// ... attendez que la page charge ...
console.timeEnd('page-load');
// Devrait être < 3 secondes
```

### Test 6.2: API Response Time
```javascript
console.time('api-response');
await window.supabase.from('projects').select('*');
console.timeEnd('api-response');
// Devrait être < 500ms
```

### Test 6.3: Real-time Chat Latency
- [ ] Envoyer un message avec two clients
- [ ] Vérifier que le message apparaît presque instantanément (< 1s)

---

## ✅ Checklist de validation finale

### Sécurité
- [ ] RLS policies en place et testées
- [ ] Admin ne peut pas modifier les données des autres
- [ ] Client ne peut voir que ses propres données
- [ ] Notes internes invisibles aux clients
- [ ] Tokens JWT valident l'identité

### Fonctionnalité
- [ ] Admin CRUD complet (Create, Read, Update, Delete)
- [ ] Client Read-only (sauf profil et messages)
- [ ] Chat fonctionne en temps réel
- [ ] Phases timeline correctes
- [ ] Documents upload/download fonctionnent
- [ ] Tickets system fonctionne

### Performance
- [ ] Pages chargent < 3s
- [ ] API responses < 500ms
- [ ] Chat messages < 1s
- [ ] No memory leaks en console

### Responsive Design
- [ ] Desktop (1920px) ✓
- [ ] Tablet (768px) ✓
- [ ] Mobile (375px) ✓

### Browser Compatibility
- [ ] Chrome/Chromium ✓
- [ ] Firefox ✓
- [ ] Safari ✓
- [ ] Edge ✓

---

## 📊 Résultat attendu

Après tous les tests:
- ✅ 0 erreurs en console
- ✅ 0 RLS violations
- ✅ 0 broken links
- ✅ Tous les workflows fonctionnent
- ✅ Performance acceptable

**Status**: ✅ **READY FOR PRODUCTION**
