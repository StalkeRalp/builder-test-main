# 👑 GUIDE OPÉRATIONNEL - ADMINISTRATEUR

## Table des Matières
1. [Démarrage Rapide](#démarrage-rapide)
2. [Gestion des Projets](#gestion-des-projets)
3. [Gestion des Phases](#gestion-des-phases)
4. [Gestion des Documents](#gestion-des-documents)
5. [Communication avec Clients](#communication-avec-clients)
6. [Notes Internes](#notes-internes)
7. [Rapports & Export](#rapports--export)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Démarrage Rapide

### Accéder au Portail Admin

1. **URL**: `http://localhost:5173/admin/index.html` (dev) ou `https://admin.tdegroup.com` (prod)

2. **Authentification**:
   - Email: `admin@tdegroup.com`
   - Password: **(défini lors du setup Supabase)**

3. **Dashboard**:
   Vous êtes maintenant sur le tableau de bord principal.

### Navigation Sidebar

```
┌─────────────────────────┐
│ TDE GROUP               │ ← Logo
├─────────────────────────┤
│ 📊 Dashboard            │ ← Vous êtes ici
│ ➕ New Project          │ ← Créer un projet
│ ─────────────────────   │
│ 👥 Clients (CRM)        │ ← Gérer clients
│ 🎫 Support              │ ← Gérer tickets
│ ─────────────────────   │
│ 👤 My Profile           │ ← Votre profil
│ 📅 Calendar             │ ← Agenda des projets
│ 💬 Chat                 │ ← Messages avec clients
│ 📋 Messages             │ ← Inbox
│ ─────────────────────   │
│ 👥 My Project (Client)  │ ← Voir comme client
│ 🚪 Logout               │ ← Se déconnecter
└─────────────────────────┘
```

---

## 📋 Gestion des Projets

### 1. Créer un Projet

**Étapes**:

1. Cliquer sur "➕ New Project" dans la sidebar
2. Remplir le formulaire:

```
PROJECT INFORMATION
├─ Project Name: "Rénovation Villa Dupont"
├─ Project Type: "Construction" ▼
├─ Location: "Paris, 75001"
├─ Description: "Rénovation complète de villa..."
├─ Start Date: "20/02/2026"
└─ End Date: "30/06/2026"

CLIENT INFORMATION
├─ Client Name: "Jean Dupont"
├─ Client Email: "jean@example.com"
└─ Client Phone: "+33 6 12 34 56 78"

PROJECT DETAILS
├─ Budget: "250000 €"
├─ Manager: "You" (auto-rempli)
└─ Status: "Planning" ▼

ACCESS & SECURITY
├─ Project ID: "P-2026-001" (auto-généré)
├─ Generate PIN: [Button "🔐 Generate PIN"]
│                   ↓
│                 "123456" (6 chiffres aléatoires)
└─ □ Copy PIN to Clipboard
```

3. Cliquer "Create Project"

4. **Redirection automatique** au Dashboard (projet visible dans la liste)

### 2. Éditer un Projet

**Étapes**:

1. Sur Dashboard, trouver le projet
2. Cliquer l'icône ✏️ (Edit)
3. Vous êtes sur `admin/project-details.html?id=P-2026-001`

**Onglets disponibles**:

#### Onglet 1: Overview
```
Project: P-2026-001
Name: Rénovation Villa Dupont
Status: [Planning ▼] → In Progress, Paused, Completed
Progress: [    50%    ] (slider 0-100%)

Client: Jean Dupont
Email: jean@example.com
Manager: You

Budget: €250,000
Start: 20/02/2026
End: 30/06/2026

🔒 PIN: 123456 [Copy] [Regenerate]
```

#### Onglet 2: Timeline
```
PHASES

Phase 1: Fondations
├─ Start: 20/02/2026
├─ End: 15/03/2026
├─ Status: [✅ Completed ▼]
├─ Progress: [████████░░] 100%
└─ [✏️ Edit] [🗑️ Delete]

+ Add Phase

[Save Changes]
```

#### Onglet 3: Documents
```
DOCUMENTS

[📁 Official Documents]

📄 Devis_Villa_Dupont.pdf (2.3MB)
├─ Visibility: [Public ▼] (Public, Admin Only, Private)
├─ Status: [Published ▼]
├─ Uploaded: 20/02/2026 10:30
└─ [🗑️ Delete]

+ Upload Document
```

#### Onglet 4: Notes (Private 🔒)
```
INTERNAL NOTES (ADMIN ONLY)

[Text Area - Rich Text Editor]

"Client asked about payment schedule...
To discuss: possible delay on budget..."

[Auto-save]
```

### 3. Voir les Projets

**Sur Dashboard**:
```
┌──────────────────────────────────────────┐
│ PROJECTS                                 │
├──────────────────────────────────────────┤
│ ✅ P-2026-001: Rénovation Villa  45%    │
│    Jean Dupont | €250k | Due: 30 Jun   │
│    [👁️] [✏️] [🗑️]                    │
│                                          │
│ ⏸️  P-2026-002: Centrale Solaire   30%  │
│    SARL Énergie | €500k | Due: 31 Dec  │
│    [👁️] [✏️] [🗑️]                    │
│                                          │
│ ⏱️  P-2026-003: Cybersécurité       0%  │
│    TechCorp Inc | €100k | Due: 30 Apr  │
│    [👁️] [✏️] [🗑️]                    │
└──────────────────────────────────────────┘
```

**Filtrer**:
- 🔍 Search: Taper nom ou client
- 📊 Status: Tous, Planning, In Progress, Paused, Completed
- 📅 Date: Triés par date de livraison

### 4. Supprimer un Projet

1. Hover sur projet → Cliquer 🗑️
2. Confirmation: "Êtes-vous sûr? Cette action est définitive."
3. Cliquer "Delete Project"
4. ✅ Projet archivé/supprimé

---

## 📊 Gestion des Phases

### Qu'est-ce qu'une Phase?

Une **phase** = une étape du projet dans la timeline.

```
Timeline Client            Phases Admin
───────────────           ────────────
Fondations ✅    ←→     Phase 1: Fondations (100%)
Gros œuvre 📸     ←→     Phase 2: Gros œuvre (60%)
Finitions ⏳      ←→     Phase 3: Finitions (0%)
```

### Créer une Phase

1. Éditer un projet (onglet "Timeline")
2. Cliquer "+ Add Phase"
3. Remplir le formulaire:

```
PHASE INFORMATION
├─ Title: "Fondations"
├─ Description: "Préparation et excavation du terrain"
├─ Status: [Planned ▼]
├─ Start Date: "20/02/2026"
└─ End Date: "15/03/2026"

PROGRESS
├─ Overall Progress: [████░░░░░░] 40%
└─ Key Milestones: 
    □ Permit obtained
    □ Equipment arrived
    □ Foundation complete

MEDIA
├─ Add Images: [📸 Choose File]
├─ (Photos visibles au client)
```

4. Cliquer "Save Phase"

### Mettre à Jour une Phase

1. Éditer projet → Onglet "Timeline"
2. Cliquer ✏️ sur la phase
3. Changer le statut: "Planned" → "In Progress" → "Completed"
4. Ajouter des photos (avant/après)
5. Ajouter des notes de progression
6. Cliquer "Save"

**Quand une phase devient "Completed"**:
- ✅ La timeline client se met à jour
- ✅ Progression globale du projet peut augmenter
- ✅ Client reçoit une notification

### Exemple de Timeline Client

```
20 FEB     15 MAR
│──────────│
Fondations ✅ (Complétée 100%)
  "Préparation et excavation..."
  📸 [Photo 1] [Photo 2] [Photo 3]
  "Travaux complétés à temps"

16 MAR     30 APR
│──────────────────────│
Gros œuvre 📸 (En cours 60%)
  "Construction de la structure principale..."
  ⏳ Phase en cours
  "Démarrage jeudi..."

1 MAY      30 JUN
│─────────────────────────────────────│
Finitions ⏳ (Planifiée)
  "Peinture, revêtements, installations..."
```

---

## 📄 Gestion des Documents

### Types de Documents

| Type | Exemple | Visibilité |
|------|---------|-----------|
| Devis | Devis_Villa.pdf | Public / Admin Only |
| Plans | Plans_Architecture.pdf | Public |
| Contrat | Contrat_Signé.pdf | Public |
| Facture | Facture_Acompte.pdf | Admin Only (Confidentiel) |
| Rapport | Rapport_Progression.pdf | Public |
| Interne | Stratégie_Pricing.pdf | Admin Only 🔒 |

### Ajouter un Document

1. Éditer projet → Onglet "Documents"
2. Cliquer "+ Upload Document"
3. Remplir le formulaire:

```
DOCUMENT INFORMATION
├─ File: [Choose File...] (Devis.pdf - 2.3MB)
├─ Document Type: [Devis ▼]
│   (Devis, Plans, Contract, Invoice, Report, Other)
├─ Name: "Devis Initial Villa Dupont"
│
VISIBILITY
├─ Visible to Client: [✓ Yes] ☐ No
│  (Yes = client peut télécharger)
│  (No = admin only, caché au client)
│
└─ [Upload Document]
```

4. Document apparaît dans la liste

### Organiser les Documents

**Par Catégorie**:
```
OFFICIAL DOCUMENTS
├─ Devis Initial (2.3MB)          [✓ Public]
├─ Plans Architecture (4.5MB)     [✓ Public]
├─ Contrat Signé (1.2MB)          [✓ Public]
└─ Rapport Fondations (3.1MB)     [✓ Public]

CONFIDENTIAL (Admin Only)
├─ Facture Acompte (0.8MB)        [✗ Private]
├─ Stratégie Pricing (0.5MB)      [✗ Private]
└─ Contrat Modifié (1.2MB)        [✗ Private]
```

### Modifier un Document

1. Cliquer sur le document
2. Options:
   - 📝 Renommer
   - 📂 Changer catégorie
   - 👁️ Publier/Masquer pour client
   - ⬇️ Télécharger (vous)
   - 🗑️ Supprimer

### Supprimer un Document

1. Hover sur document → Cliquer 🗑️
2. Confirmation
3. ✅ Suppression définitive

---

## 💬 Communication avec Clients

### 1. Chat Admin

**URL**: Sidebar → "💬 Chat"

**Fonctionnalités**:
```
CONVERSATIONS

P-2026-001: Rénovation Villa (Jean Dupont)
├─ Last message: "Merci pour les photos!"
├─ 1 unread message
└─ [Click to open]

P-2026-002: Centrale Solaire (SARL Énergie)
├─ Last message: "Quand démarrage prévu?"
├─ 3 unread messages
└─ [Click to open]
```

**Envoyer un Message**:
1. Cliquer sur la conversation
2. Remplir le champ message
3. Joindre pièce (optionnel)
4. Cliquer "Send"

```
Message: "Bonjour Jean, les fondations sont complétées!"
Attachments: [📸 Photo_Fondations.jpg]
[Send]
```

### 2. Tickets Support

**URL**: Sidebar → "🎫 Support"

**Affichage**:
```
TICKETS

🔴 HIGH PRIORITY (3)
├─ T-2026-001: "Fissure trouvée"
│  Client: Jean Dupont | Project: P-2026-001
│  Status: [Open ▼]
│  [View] [Reply] [Resolve]

🟡 MEDIUM PRIORITY (5)
├─ T-2026-002: "Couleur différente"
│  ...

🟢 LOW PRIORITY (2)
├─ T-2026-003: "Question sur délai"
│  ...
```

**Répondre à un Ticket**:
1. Cliquer sur le ticket
2. Voir le message du client
3. Remplir votre réponse
4. Cliquer "Reply"
5. Optionnellement: "Mark as Resolved"

### 3. CRM Clients

**URL**: Sidebar → "👥 Clients (CRM)"

**Affichage**:
```
CLIENTS

Jean Dupont
├─ Email: jean@example.com
├─ Phone: +33 6 12 34 56 78
├─ Project: P-2026-001 (Rénovation Villa)
├─ Status: Active
└─ [View Profile] [Send Message] [View Project]

SARL Énergie
├─ Email: contact@sarl-energie.fr
├─ Project: P-2026-002 (Centrale Solaire)
├─ Status: Active
└─ [View Profile] [Send Message] [View Project]
```

---

## 📝 Notes Internes

### Qu'est-ce qu'une Note Interne?

Une **note interne** = memo privé pour vous et les autres admins. **INVISIBLE AU CLIENT**.

**Exemples d'utilisation**:
- "À discuter: client demande réduction budgétaire"
- "Alert: retard possible sur livraison peinture"
- "Stratégie: proposer extension en mai"
- "Note personnelle: manager doit revoir les chiffres"

### Ajouter une Note

1. Éditer projet → Onglet "Notes"
2. Cliquer dans le champ texte
3. Taper votre note:

```
"Client semblait préoccupé par le budget lors du dernier appel.
À vérifier: devis supplémentaire pour travaux non prévus?
Action: Envoyer devis modifier jeudi."
```

4. ✅ Auto-sauvegarde (message "Saved")

### Permissions

- ✅ Admin A: Peut lire, modifier, supprimer les notes
- ✅ Admin B: Peut lire, modifier, supprimer les notes
- ❌ Client: NE VOIT JAMAIS les notes (RLS Policy)

---

## 📊 Rapports & Export

### Générer un Rapport

**URL**: Sidebar → Rapport (si disponible) ou Dashboard

```
EXPORT OPTIONS

Rapport de Progression
├─ Période: [1 JAN 2026] à [28 FEB 2026]
├─ Format: [PDF ▼] (PDF, CSV, Excel)
├─ Inclure: 
│  ☑ Tous les projets
│  ☑ Phases complétées
│  ☑ Documents
│  ☐ Messages privés
│  ☐ Notes internes
└─ [Generate Report]

↓ (Télécharge "TDE_Report_2026-02-28.pdf")
```

### Dashboard Analytics 

```
STATISTICS

Total Projects: 12
├─ Planning: 2
├─ In Progress: 7
├─ Paused: 1
└─ Completed: 2

Total Budget: €2,400,000
Average Progress: 42%
On-time Delivery: 85%
```

---

## 🔧 Troubleshooting

### Problème: "Project not found"
```
Cause: Vous avez mal copié le Project ID
Solution:
1. Aller au Dashboard
2. Copier le bon ID (ex: P-2026-001)
3. Ressayer
```

### Problème: "Client can't login"
```
Cause possible: PIN incorrect ou expiré
Solution:
1. Éditer le projet
2. Cliquer "Regenerate PIN"
3. Envoyer le nouveau PIN au client (via chat/email)
```

### Problème: "Phase not updating for client"
```
Cause: Phase non marquée "Completed" ou non sauvegardée
Solution:
1. Éditer projet → Timeline
2. Vérifier status = "Completed"
3. Vérifier "Save" a été cliqué
4. Attendre 5-10 secondes (sync)
```

### Problème: "Document not visible to client"
```
Cause: Visibility = "Admin Only"
Solution:
1. Éditer le document
2. Changer à "Visible to Client"
3. Save
4. Client doit rafraîchir la page
```

### Problème: "Message not delivered"
```
Cause: Problème de connexion Supabase Realtime
Solution:
1. Vérifier votre connexion internet
2. Rafraîchir la page (F5)
3. Rééssayer envoyer
4. Si persiste: contacter support technique
```

### Problème: "Can't change my password"
```
Cause: Session expirée
Solution:
1. Cliquer "Logout" (Sidebar)
2. Se reconnecter
3. Aller Profile → Change Password
4. Remplir ancien + nouveau password
```

---

## ⏱️ Workflow Journalier Recommandé

### Matin (9h00)
```
1. Se connecter admin/index.html
2. Vérifier Dashboard → notifications
3. Voir les tickets ouverts
4. Répondre aux messages urgents
```

### Milieu de journée (12h00)
```
1. Mettre à jour les phases (photos, progression)
2. Publier les nouveaux documents
3. Envoyer les mises à jour clients
```

### Fin de journée (17h00)
```
1. Réviser les notes internes
2. Archiver les tickets résolus
3. Planifier le lendemain
```

### Hebdo (Vendredi 16h)
```
1. Générer rapport progression
2. Envoyer récap à clients importants
3. Réviser budget vs prévisions
```

---

## 📞 Support & Contact

**Question sur le système?**
- Consultez cette documentation
- Voir FAQ dans le menu aide
- Email: support@tdegroup.com
- Chat: support@tdegroup.com

**Bug trouvé?**
- Signaler avec screenshots
- Email: bugs@tdegroup.com

**Sécurité compromise?**
- ⚠️ URGENT: security@tdegroup.com

---

**Version**: 1.0.0  
**Dernière révision**: 18 février 2026  
**Status**: Production Ready ✅
