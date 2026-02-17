# Requirements: VelociPOS

**Defined:** 2026-02-17
**Core Value:** Le caissier peut enregistrer une vente rapidement et de manière fiable, avec un suivi précis du stock et des bénéfices pour le gérant.

## v1 Requirements

### Rôles & Permissions (RBAC)

- [ ] **RBAC-01**: L'administrateur peut créer/modifier/supprimer des utilisateurs et leur assigner un rôle (VENDEUR, MANAGER, ADMIN)
- [ ] **RBAC-02**: Le VENDEUR peut uniquement accéder au POS (ventes, panier, caisse) et voir le stock en lecture seule
- [ ] **RBAC-03**: Le MANAGER peut accéder aux rapports, gérer le stock, les produits, les clients, et clôturer la caisse
- [ ] **RBAC-04**: L'ADMIN a accès total (paramètres, utilisateurs, magasins, terminaux)
- [ ] **RBAC-05**: Les permissions sont enforced côté backend (Symfony Voters) et côté frontend (guards UI)
- [ ] **RBAC-06**: La hiérarchie des rôles est configurée dans security.yaml (ADMIN > MANAGER > VENDEUR)

### PMP / Coût Moyen Pondéré

- [ ] **PMP-01**: Le PMP se recalcule automatiquement à chaque achat validé selon la formule : (ancien_stock × ancien_PMP + qté_achetée × prix_achat) / stock_total
- [ ] **PMP-02**: Le champ Product.cost est migré de type string vers decimal(10,4)
- [ ] **PMP-03**: OrderProduct stocke le costAtSale (coût au moment de la vente) pour des rapports historiques fiables
- [ ] **PMP-04**: Le PMP est visible dans la fiche produit (admin)
- [ ] **PMP-05**: Les rapports de bénéfice utilisent costAtSale et non le coût actuel du produit

### Alertes Stock

- [ ] **STOCK-01**: Chaque produit a un seuil d'alerte configurable (défaut: 10)
- [ ] **STOCK-02**: Un endpoint API retourne les produits dont le stock est sous le seuil
- [ ] **STOCK-03**: Un badge visuel dans le POS indique le nombre de produits en alerte
- [ ] **STOCK-04**: La liste des produits en alerte est accessible dans l'admin avec filtre par magasin

### Rapports

- [ ] **RAPT-01**: Rapport des ventes amélioré : détail par catégorie, par mode de paiement, nombre de tickets, panier moyen
- [ ] **RAPT-02**: Rapport de bénéfice utilisant le PMP (prix vente - costAtSale), marge brute par produit
- [ ] **RAPT-03**: Rapport journalier amélioré : top produits, top vendeurs, comparaison J-1
- [ ] **RAPT-04**: Rapport par vendeur (performance individuelle : CA, nombre de tickets, panier moyen)
- [ ] **RAPT-05**: Rapport par catégorie (ventes et bénéfice par catégorie de produit)

### Rapport Z / Clôture de Caisse

- [ ] **ZRPT-01**: Le Rapport Z a un numéro séquentiel non-réinitialisable
- [ ] **ZRPT-02**: Le Rapport Z couvre un cycle de session (ouverture → fermeture) par terminal
- [ ] **ZRPT-03**: Le Rapport Z inclut : entête (magasin, terminal, dates), résumé des ventes (brut, remises, net, retours, panier moyen), ventilation par mode de paiement
- [ ] **ZRPT-04**: Le Rapport Z inclut la réconciliation de caisse (fond d'ouverture, espèces reçues, ajouts/retraits, attendu vs compté, écart)
- [ ] **ZRPT-05**: Le Rapport Z inclut le comptage des coupures (dénominations MRU)
- [ ] **ZRPT-06**: Le Rapport Z est persisté comme snapshot immutable (pas recalculé)
- [ ] **ZRPT-07**: Le Rapport Z est imprimable/téléchargeable en PDF (FR et AR)
- [ ] **ZRPT-08**: Seul MANAGER ou ADMIN peut générer/clôturer un Rapport Z

### Paiements Mauritanie

- [ ] **PAY-01**: Les types de paiement Bankily, Masrivi, Sedad, Espèces et Crédit sont pré-configurés en base
- [ ] **PAY-02**: Chaque type de paiement a un attribut (cash/mobile/credit) pour la ventilation dans le Rapport Z

### UI POS Professionnelle

- [ ] **UIPOS-01**: L'écran POS a un design professionnel moderne inspiré de Square/Toast/Lightspeed
- [ ] **UIPOS-02**: La grille produits affiche les images de manière professionnelle
- [ ] **UIPOS-03**: Le panier, le checkout et les boutons de paiement sont optimisés pour le tactile
- [ ] **UIPOS-04**: L'interface est responsive et fonctionne sur tablette/écran tactile

### UI Admin Professionnelle

- [ ] **UIADM-01**: Le dashboard admin affiche des KPIs réels (CA du jour, tickets, panier moyen, stock bas)
- [ ] **UIADM-02**: Les pages de rapports utilisent des graphiques professionnels (Nivo)
- [ ] **UIADM-03**: L'interface de gestion des utilisateurs intègre les nouveaux rôles

### Traduction Arabe

- [ ] **I18N-01**: Toutes les clés de traduction existantes sont traduites en arabe
- [ ] **I18N-02**: Toutes les nouvelles fonctionnalités (rapports, alertes, rôles, Z-Report) sont traduites en arabe
- [ ] **I18N-03**: Le layout RTL fonctionne correctement sur tous les écrans (TailwindCSS logical properties)
- [ ] **I18N-04**: Ant Design utilise ConfigProvider direction="rtl" en mode arabe

### Documentation Restaurant

- [ ] **REST-01**: Un document technique décrit l'extension restaurant : gestion des tables, modifiers, commandes cuisine, écran cuisine
- [ ] **REST-02**: Le document est en format professionnel et bilingue (FR/AR si applicable)

### Corrections Données

- [ ] **DATA-01**: Les rapports excluent les commandes suspendues (isSuspended) des calculs de revenus
- [ ] **DATA-02**: Les colonnes financières de Closing migrent de float vers decimal(20,2)
- [ ] **DATA-03**: Le Rapport Z filtre correctement les commandes par session (pas de données parasites)

## v2 Requirements

### Notifications

- **NOTF-01**: Alertes stock par email/SMS pour les managers
- **NOTF-02**: Notification in-app quand un produit passe sous le seuil

### Intégrations

- **INTG-01**: Intégration API Bankily pour confirmation automatique des paiements
- **INTG-02**: Consolidation Z-Report multi-terminal

### Restaurant (Implémentation)

- **REST-10**: Gestion des tables avec plan de salle drag & drop
- **REST-11**: Système de modifiers (taille, cuisson, extras)
- **REST-12**: Écran cuisine en temps réel (Mercure SSE)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Application mobile native | Web responsive + tactile suffit pour le marché cible |
| OAuth / SSO | Email/password suffit pour le contexte mauritanien |
| Chat en temps réel | Pas pertinent pour un POS |
| Tests unitaires complets | Hors demande du superviseur |
| Restaurant implémentation | Superviseur veut la documentation, pas le code |
| Intégration API paiements mobiles | APIs pas documentées publiquement en Mauritanie |
| Consolidation multi-terminal Z-Report | Complexité élevée pour v1, per-terminal est le standard |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RBAC-01 | Phase 1 | Pending |
| RBAC-02 | Phase 1 | Pending |
| RBAC-03 | Phase 1 | Pending |
| RBAC-04 | Phase 1 | Pending |
| RBAC-05 | Phase 1 | Pending |
| RBAC-06 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| PMP-01 | Phase 3 | Pending |
| PMP-02 | Phase 3 | Pending |
| PMP-03 | Phase 3 | Pending |
| PMP-04 | Phase 3 | Pending |
| PMP-05 | Phase 3 | Pending |
| STOCK-01 | Phase 4 | Pending |
| STOCK-02 | Phase 4 | Pending |
| STOCK-03 | Phase 4 | Pending |
| STOCK-04 | Phase 4 | Pending |
| PAY-01 | Phase 4 | Pending |
| PAY-02 | Phase 4 | Pending |
| ZRPT-01 | Phase 5 | Pending |
| ZRPT-02 | Phase 5 | Pending |
| ZRPT-03 | Phase 5 | Pending |
| ZRPT-04 | Phase 5 | Pending |
| ZRPT-05 | Phase 5 | Pending |
| ZRPT-06 | Phase 5 | Pending |
| ZRPT-07 | Phase 5 | Pending |
| ZRPT-08 | Phase 5 | Pending |
| RAPT-01 | Phase 5 | Pending |
| RAPT-02 | Phase 5 | Pending |
| RAPT-03 | Phase 5 | Pending |
| RAPT-04 | Phase 5 | Pending |
| RAPT-05 | Phase 5 | Pending |
| I18N-01 | Phase 6 | Pending |
| I18N-02 | Phase 6 | Pending |
| I18N-03 | Phase 6 | Pending |
| I18N-04 | Phase 6 | Pending |
| UIPOS-01 | Phase 7 | Pending |
| UIPOS-02 | Phase 7 | Pending |
| UIPOS-03 | Phase 7 | Pending |
| UIPOS-04 | Phase 7 | Pending |
| UIADM-01 | Phase 7 | Pending |
| UIADM-02 | Phase 7 | Pending |
| UIADM-03 | Phase 7 | Pending |
| REST-01 | Phase 8 | Pending |
| REST-02 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 after roadmap creation*
