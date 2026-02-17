# PRD: VelociPOS - Système Point de Vente Ultra-Performant

**Version:** 1.0.0
**Date:** 25 janvier 2026
**Auteur:** Product Manager / Architecte Logiciel
**Statut:** Draft pour validation

---

## 1. Executive Summary

### 1.1 Vision produit

VelociPOS est une application web Point de Vente (POS) moderne, ultra-rapide et commercialisable (SaaS), conçue pour les magasins de détail multi-sites. L'application se distingue par sa **performance exceptionnelle** (latence perçue < 200ms), son interface **premium et intuitive**, et son architecture **scalable**.

### 1.2 Proposition de valeur

- **Ultra-rapide** : Chaque interaction semble instantanée grâce au cache local (IndexedDB) et à l'optimisation aggressive
- **Multi-store / Multi-terminal** : Gestion centralisée de plusieurs points de vente
- **Indépendant** : Fonctionne sans ERP, API-first pour intégrations futures
- **Commercialisable** : Architecture multi-tenant ready (Phase 2)
- **Moderne** : UI/UX premium, pas d'aspect "logiciel comptable"

### 1.3 Objectifs business

| Objectif | Métrique | Cible |
|----------|----------|-------|
| Performance perçue | Temps réponse UI actions POS | < 200ms |
| Adoption | Temps formation vendeur | < 30 min |
| Fiabilité | Uptime | 99.9% |
| Scalabilité | Produits supportés | 10k+ par store |

### 1.4 Stack technique recommandée

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Frontend | React 18 + TypeScript + Vite | Performance, écosystème, LTS |
| State | Zustand + React Query | Léger, cache intelligent |
| UI | Tailwind CSS + Radix UI | Moderne, accessible, rapide |
| Cache local | IndexedDB (Dexie.js) | Lookup instantané produits |
| Backend | Node.js 20 LTS + Fastify | Performance, TypeScript natif |
| ORM | Prisma | Type-safe, migrations |
| Database | PostgreSQL 16 | Robuste, JSON, full-text search |
| Cache | Redis 7 | Sessions, cache, pub/sub |
| Auth | JWT (access) + httpOnly cookie (refresh) | Sécurité, stateless |
| Container | Docker + Docker Compose | Dev/Prod parity |

---

## 2. Personas & Use Cases

### 2.1 Personas clés

#### Persona 1: Vendeur (Caissier)
- **Profil** : Employé de magasin, compétences IT basiques
- **Objectifs** : Encaisser rapidement, éviter les erreurs, servir le client
- **Frustrations** : Systèmes lents, interfaces complexes, bugs en rush
- **Besoins** : Interface simple, raccourcis clavier, feedback instantané

#### Persona 2: Manager de magasin
- **Profil** : Responsable opérationnel, gère équipe et stock
- **Objectifs** : Superviser ventes, gérer stock, analyser performance
- **Frustrations** : Manque de visibilité temps réel, rapports incomplets
- **Besoins** : Dashboard, alertes stock bas, rapports clôture

#### Persona 3: Administrateur (Propriétaire/IT)
- **Profil** : Décideur, configure le système
- **Objectifs** : Paramétrer, sécuriser, analyser globalement
- **Frustrations** : Systèmes rigides, intégrations difficiles
- **Besoins** : Configuration flexible, audit trail, multi-store

### 2.2 Use Cases principaux

| ID | Use Case | Persona | Priorité |
|----|----------|---------|----------|
| UC-001 | Encaisser une vente cash | Vendeur | P0 |
| UC-002 | Scanner un produit et l'ajouter au panier | Vendeur | P0 |
| UC-003 | Appliquer une remise sur ligne | Vendeur | P0 |
| UC-004 | Ouvrir la journée/caisse | Vendeur/Manager | P0 |
| UC-005 | Clôturer la journée avec comptage | Vendeur/Manager | P0 |
| UC-006 | Créer/modifier un produit | Manager | P0 |
| UC-007 | Ajuster le stock (entrée/sortie) | Manager | P0 |
| UC-008 | Enregistrer un paiement différé | Vendeur | P1 |
| UC-009 | Payer via Bankily/Sadad | Vendeur | P1 |
| UC-010 | Importer des produits (CSV) | Admin | P1 |
| UC-011 | Consulter rapports de ventes | Manager/Admin | P1 |
| UC-012 | Gérer les utilisateurs et rôles | Admin | P1 |
| UC-013 | Effectuer un remboursement | Manager | P1 |
| UC-014 | Transférer stock entre stores | Manager | P2 |

---

## 3. Scope (In/Out)

### 3.1 In Scope - MVP (P0)

- [x] Authentification (login/logout)
- [x] Sélection Store + Terminal
- [x] Gestion produits (CRUD) avec prix min/max
- [x] Catégories produits
- [x] Recherche produit (texte + code-barres)
- [x] Panier (ajout, quantité, suppression, remise ligne)
- [x] Paiement cash uniquement
- [x] Impression reçu (navigateur)
- [x] Ouverture/Clôture journée (basique)
- [x] Stock : visualisation et ajustements simples
- [x] Calcul taxes (TVA)
- [x] Cache local IndexedDB pour produits

### 3.2 In Scope - Phase 1 (P1)

- [x] RBAC complet (Vendeur/Manager/Admin)
- [x] Paiement différé (crédit client)
- [x] Paiement partiel
- [x] Intégration Bankily
- [x] Intégration Sadad
- [x] Calcul PMP (Prix Moyen Pondéré)
- [x] Import produits CSV/Excel
- [x] Gestion clients
- [x] Rapports (ventes, stock, clôture)
- [x] Cash withdrawal (retrait caisse)
- [x] Remboursements
- [x] Audit log complet
- [x] Journal mouvements stock

### 3.3 In Scope - Phase 2 (P2)

- [ ] Multi-tenant (SaaS)
- [ ] Mode offline avancé (sync)
- [ ] Application mobile (PWA)
- [ ] Programme fidélité
- [ ] Transferts inter-stores
- [ ] Gestion fournisseurs/achats
- [ ] API publique documentée

### 3.4 Out of Scope (explicite)

- Comptabilité générale
- Paie / RH
- E-commerce / vente en ligne
- Gestion de production
- CRM avancé

---

## 4. User Stories par Module

### 4.1 Module Authentification (AUTH)

#### US-AUTH-001: Connexion utilisateur
**En tant que** utilisateur,
**Je veux** me connecter avec mon email et mot de passe,
**Afin d'** accéder au système de manière sécurisée.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: User Login
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter valid email "vendeur@store.com"
    And I enter valid password "SecurePass123!"
    And I click the login button
    Then I should be redirected to store selection
    And I should see my name in the header
    And a JWT token should be stored securely

  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I enter invalid email or password
    And I click the login button
    Then I should see an error message "Email ou mot de passe incorrect"
    And I should remain on the login page
    And the attempt should be logged

  Scenario: Account lockout after failed attempts
    Given I have failed login 5 times
    When I try to login again
    Then I should see "Compte temporairement bloqué"
    And I should wait 15 minutes before retrying
```

#### US-AUTH-002: Sélection Store et Terminal
**En tant que** utilisateur connecté,
**Je veux** sélectionner mon magasin et terminal de travail,
**Afin de** commencer ma session de vente.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Store and Terminal Selection
  Scenario: Select store and terminal
    Given I am logged in
    And I have access to stores "Magasin Centre" and "Magasin Nord"
    When I select "Magasin Centre"
    Then I should see available terminals for this store
    When I select "Terminal 1"
    Then I should be redirected to POS main screen
    And the header should show "Magasin Centre - Terminal 1"

  Scenario: Terminal already in use
    Given "Terminal 1" is currently used by another user
    When I try to select "Terminal 1"
    Then I should see "Terminal occupé par [User]"
    And I should be able to force takeover if I'm a Manager
```

#### US-AUTH-003: Déconnexion sécurisée
**En tant que** utilisateur,
**Je veux** me déconnecter proprement,
**Afin de** sécuriser mon accès.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Secure Logout
  Scenario: Logout with open session
    Given I am logged in with an open cash session
    When I click logout
    Then I should see a warning "Session de caisse ouverte"
    And I should be asked to close the session or transfer

  Scenario: Clean logout
    Given I am logged in without open session
    When I click logout
    Then my tokens should be invalidated
    And I should be redirected to login page
    And the logout should be logged in audit
```

---

### 4.2 Module POS (Point de Vente)

#### US-POS-001: Recherche produit instantanée
**En tant que** vendeur,
**Je veux** rechercher un produit par nom ou référence,
**Afin de** l'ajouter rapidement au panier.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Instant Product Search
  Scenario: Search by product name
    Given I am on the POS screen
    And the product catalog is loaded in IndexedDB
    When I type "coca" in the search field
    Then I should see matching products in < 100ms
    And results should show name, price, and stock
    And I can press Enter to add the first result

  Scenario: Search with no results
    Given I am on the POS screen
    When I search for "xyznonexistent"
    Then I should see "Aucun produit trouvé"
    And I should see a suggestion to check spelling

  Scenario: Search performance under load
    Given there are 10,000 products in the catalog
    When I search for "pro"
    Then results should appear in < 100ms
    And maximum 20 results should be displayed initially
```

#### US-POS-002: Scan code-barres
**En tant que** vendeur,
**Je veux** scanner un code-barres produit,
**Afin de** l'ajouter instantanément au panier.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Barcode Scanning
  Scenario: Scan valid barcode
    Given I am on the POS screen
    And product with barcode "3760001234567" exists
    When I scan barcode "3760001234567"
    Then the product should be added to cart in < 50ms
    And I should hear a success beep sound
    And the quantity should increment if already in cart

  Scenario: Scan unknown barcode
    Given I am on the POS screen
    When I scan barcode "0000000000000"
    Then I should see "Produit non trouvé"
    And I should hear an error beep sound
    And the barcode should be logged for review

  Scenario: Rapid consecutive scans
    Given I am on the POS screen
    When I scan 5 different products in rapid succession
    Then all 5 products should be in the cart
    And each addition should take < 50ms
    And the total should be correct
```

#### US-POS-003: Gestion du panier
**En tant que** vendeur,
**Je veux** gérer les articles dans le panier,
**Afin de** finaliser la vente correctement.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Cart Management
  Scenario: Add product to cart
    Given I am on the POS screen
    When I add product "Coca-Cola 33cl" at 1.50€
    Then the cart should show 1x "Coca-Cola 33cl"
    And the subtotal should be 1.50€
    And UI update should occur in < 50ms

  Scenario: Change quantity
    Given I have "Coca-Cola 33cl" in cart with quantity 1
    When I change quantity to 5
    Then the line total should be 7.50€
    And the change should reflect in < 50ms

  Scenario: Apply line discount (percentage)
    Given I have "Coca-Cola 33cl" x5 at 7.50€
    When I apply 10% discount to this line
    Then the line total should be 6.75€
    And the discount should be visible on the line

  Scenario: Apply line discount (fixed amount)
    Given I have "Coca-Cola 33cl" x5 at 7.50€
    When I apply 1€ fixed discount to this line
    Then the line total should be 6.50€

  Scenario: Remove item from cart
    Given I have 3 items in cart
    When I remove the second item
    Then I should have 2 items in cart
    And totals should be recalculated in < 50ms

  Scenario: Clear entire cart
    Given I have items in cart
    When I press "Clear Cart" button or Escape key
    Then I should see a confirmation dialog
    When I confirm
    Then the cart should be empty
```

#### US-POS-004: Contrôle prix min/max
**En tant que** système,
**Je veux** vérifier que les prix sont dans les limites autorisées,
**Afin de** prévenir les erreurs ou fraudes.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Price Boundary Control
  Scenario: Price within bounds
    Given product "TV Samsung" has min_price=400€ and max_price=600€
    When I add it to cart at standard price 500€
    Then it should be added without warning

  Scenario: Price below minimum - block
    Given product "TV Samsung" has min_price=400€
    And I am a Vendeur (no override permission)
    When I try to set price to 350€
    Then I should see "Prix inférieur au minimum autorisé (400€)"
    And the action should be blocked
    And I should see option "Demander autorisation manager"

  Scenario: Price below minimum - manager override
    Given product "TV Samsung" has min_price=400€
    And I am a Manager
    When I set price to 350€
    Then I should see a warning "Prix sous le minimum"
    And I should be asked for confirmation with reason
    When I confirm with reason "Client fidèle VIP"
    Then the price should be applied
    And an audit log should be created

  Scenario: Price above maximum
    Given product "TV Samsung" has max_price=600€
    When I try to set price to 700€
    Then I should see "Prix supérieur au maximum autorisé"
    And the action should be blocked
```

#### US-POS-005: Paiement cash
**En tant que** vendeur,
**Je veux** encaisser un paiement en espèces,
**Afin de** finaliser la vente.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Cash Payment
  Scenario: Exact cash payment
    Given my cart total is 25.50€
    When I click "Payer"
    And I select "Espèces"
    And I enter amount 25.50€
    And I confirm payment
    Then the sale should be completed in < 200ms
    And the receipt should be generated
    And cash drawer should open (if connected)
    And the cart should be cleared

  Scenario: Cash payment with change
    Given my cart total is 25.50€
    When I select "Espèces"
    And I enter amount 30€
    Then I should see "Rendu: 4.50€"
    When I confirm payment
    Then the sale should be completed
    And the receipt should show "Reçu: 30€, Rendu: 4.50€"

  Scenario: Quick cash buttons
    Given my cart total is 17.30€
    When I click "Payer"
    Then I should see quick buttons: 17.30€, 20€, 50€, 100€
    When I click "20€"
    Then amount field should be filled with 20€
    And change should show 2.70€

  Scenario: Insufficient cash
    Given my cart total is 25.50€
    When I enter amount 20€
    Then I should see "Montant insuffisant"
    And the confirm button should be disabled
```

#### US-POS-006: Paiement différé (crédit client)
**En tant que** vendeur,
**Je veux** enregistrer une vente à crédit,
**Afin de** permettre au client de payer plus tard.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Deferred Payment (Credit)
  Scenario: Create credit sale for existing customer
    Given my cart total is 150€
    And customer "Mohammed Ali" is selected
    When I select payment method "Crédit"
    Then I should see current customer balance
    And I should see credit limit if defined
    When I confirm
    Then the sale should be completed
    And customer balance should increase by 150€
    And receipt should show "CREDIT - À PAYER"

  Scenario: Credit sale without customer
    Given my cart total is 150€
    And no customer is selected
    When I select "Crédit"
    Then I should see "Veuillez sélectionner un client"
    And I should not be able to proceed

  Scenario: Credit exceeds limit
    Given customer "Mohammed Ali" has credit_limit=500€
    And customer current balance is 400€
    And my cart total is 150€
    When I select "Crédit"
    Then I should see "Dépassement limite crédit (50€ au-dessus)"
    And I should need Manager approval to proceed
```

#### US-POS-007: Paiement partiel / mixte
**En tant que** vendeur,
**Je veux** accepter plusieurs méthodes de paiement pour une vente,
**Afin de** m'adapter aux besoins du client.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Split Payment
  Scenario: Pay with cash and credit
    Given my cart total is 100€
    When I add payment "Espèces" 60€
    Then remaining should show 40€
    When I add payment "Crédit" 40€
    Then remaining should show 0€
    And I should be able to confirm

  Scenario: Pay with three methods
    Given my cart total is 100€
    When I add payment "Espèces" 30€
    And I add payment "Bankily" 50€
    And I add payment "Crédit" 20€
    Then the sale should be completable
    And receipt should list all three payments

  Scenario: Remove partial payment
    Given I have added "Espèces" 60€ to payments
    When I click remove on this payment
    Then it should be removed
    And remaining should be recalculated
```

#### US-POS-008: Impression reçu
**En tant que** vendeur,
**Je veux** imprimer ou réimprimer un reçu,
**Afin de** fournir une preuve d'achat au client.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Receipt Printing
  Scenario: Print receipt after sale
    Given I have completed a sale
    Then receipt preview should appear automatically
    And I should see print button
    When I click print
    Then the receipt should be sent to configured printer

  Scenario: Reprint receipt
    Given sale #12345 was completed earlier
    When I search for sale #12345
    And I click "Réimprimer reçu"
    Then the original receipt should be reprinted
    And it should be marked "DUPLICATA"

  Scenario: Email receipt
    Given I have completed a sale
    And customer has email "client@email.com"
    When I click "Envoyer par email"
    Then receipt PDF should be sent to customer email
```

---

### 4.3 Module Produits (PROD)

#### US-PROD-001: Créer un produit
**En tant que** manager,
**Je veux** créer un nouveau produit,
**Afin de** l'ajouter au catalogue.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Create Product
  Scenario: Create product with all required fields
    Given I am on the products page
    And I have Manager role
    When I click "Nouveau produit"
    And I fill in:
      | Field | Value |
      | Nom | Coca-Cola 33cl |
      | SKU | COC-33-001 |
      | Code-barres | 5449000000996 |
      | Prix de vente | 1.50 |
      | Prix minimum | 1.20 |
      | Prix maximum | 2.00 |
      | Catégorie | Boissons |
      | Taxe | TVA 20% |
    And I click "Enregistrer"
    Then the product should be created
    And it should appear in the product list
    And it should be synced to IndexedDB within 5s

  Scenario: Barcode already exists
    Given barcode "5449000000996" is already used
    When I try to create product with this barcode
    Then I should see "Code-barres déjà utilisé par [Product]"
    And save should be blocked

  Scenario: Create product as Vendeur (forbidden)
    Given I am a Vendeur
    When I try to access product creation
    Then I should see "Accès non autorisé"
    Or the menu option should not be visible
```

#### US-PROD-002: Modifier un produit
**En tant que** manager,
**Je veux** modifier les informations d'un produit,
**Afin de** maintenir le catalogue à jour.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Edit Product
  Scenario: Edit product price
    Given product "Coca-Cola 33cl" exists with price 1.50€
    When I edit and change price to 1.75€
    And I save
    Then the new price should be active
    And an audit log should record the change
    And IndexedDB should be updated

  Scenario: Edit product with active cart reference
    Given product "Coca-Cola 33cl" is in an active cart
    When I change its price
    Then active carts should keep the old price
    And new additions should use the new price
```

#### US-PROD-003: Import produits CSV
**En tant qu'** admin,
**Je veux** importer des produits depuis un fichier CSV,
**Afin de** peupler rapidement le catalogue.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Product CSV Import
  Scenario: Successful import
    Given I have a CSV file with 100 valid products
    When I upload the file
    Then I should see a preview of the data
    And I should be able to map columns:
      | CSV Column | System Field |
      | nom | name |
      | prix | sell_price |
      | code | barcode |
    When I click "Importer"
    Then 100 products should be created
    And I should see a success summary

  Scenario: Import with validation errors
    Given my CSV has 100 rows, 5 with invalid data
    When I upload and preview
    Then I should see 5 rows highlighted in red
    And I should see specific errors per row
    And I should be able to:
      - Fix errors in preview
      - Skip invalid rows
      - Cancel import

  Scenario: Import with duplicate barcodes
    Given my CSV has barcodes that already exist
    When I import
    Then I should choose: skip, update existing, or fail
```

---

### 4.4 Module Stock (STOCK)

#### US-STOCK-001: Visualiser stock
**En tant que** manager,
**Je veux** voir le stock actuel de tous les produits,
**Afin de** gérer les approvisionnements.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: View Stock
  Scenario: View stock list
    Given I am on the stock page
    Then I should see a list of products with:
      | Column | Description |
      | Produit | Product name |
      | SKU | Product reference |
      | Stock actuel | Current quantity |
      | Stock min | Alert threshold |
      | PMP | Weighted average price |
      | Valeur | Stock value (qty * PMP) |
    And I should be able to filter by category
    And I should be able to search

  Scenario: Stock alert
    Given product "Coca-Cola 33cl" has stock=5 and min_stock=10
    Then it should be highlighted in orange/red
    And it should appear in "Stock bas" dashboard widget
```

#### US-STOCK-002: Ajustement de stock
**En tant que** manager,
**Je veux** ajuster le stock d'un produit,
**Afin de** corriger les écarts d'inventaire.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Stock Adjustment
  Scenario: Positive adjustment (found stock)
    Given product "Coca-Cola 33cl" has stock=10
    When I create adjustment:
      | Type | Entrée |
      | Quantité | 5 |
      | Raison | Inventaire - stock trouvé |
    Then stock should become 15
    And a StockMovement should be created with:
      | type | ADJUSTMENT_IN |
      | quantity | 5 |
      | reason | Inventaire - stock trouvé |
      | user | Current user |

  Scenario: Negative adjustment (shrinkage)
    Given product "Coca-Cola 33cl" has stock=10
    When I create adjustment:
      | Type | Sortie |
      | Quantité | 3 |
      | Raison | Casse |
    Then stock should become 7
    And movement should be recorded

  Scenario: Adjustment requires reason
    Given I try to adjust stock
    When I leave the reason field empty
    Then I should see "La raison est obligatoire"
    And save should be blocked
```

#### US-STOCK-003: Journal mouvements stock
**En tant que** manager,
**Je veux** voir l'historique des mouvements de stock,
**Afin de** tracer toutes les entrées/sorties.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Stock Movement Log
  Scenario: View movement history
    Given product "Coca-Cola 33cl" has had stock changes
    When I view its movement history
    Then I should see all movements:
      | Date | Type | Quantité | Stock après | Raison | Utilisateur |
    And movements should be sorted by date descending
    And I should be able to filter by type and date range

  Scenario: Movement types tracked
    Then the following movement types should exist:
      | Type | Description |
      | SALE | Vente client |
      | RETURN | Retour client |
      | ADJUSTMENT_IN | Entrée ajustement |
      | ADJUSTMENT_OUT | Sortie ajustement |
      | TRANSFER_IN | Transfert entrant |
      | TRANSFER_OUT | Transfert sortant |
      | PURCHASE | Réception achat |
```

#### US-STOCK-004: Calcul PMP (Prix Moyen Pondéré)
**En tant que** système,
**Je veux** calculer automatiquement le PMP,
**Afin de** valoriser correctement le stock.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Weighted Average Cost (PMP)
  Scenario: PMP calculation on purchase
    Given product "Coca-Cola 33cl":
      | Stock actuel | 100 |
      | PMP actuel | 0.80€ |
    When I receive a purchase:
      | Quantité | 50 |
      | Prix unitaire | 0.90€ |
    Then new PMP should be:
      | Formula | (100 * 0.80 + 50 * 0.90) / 150 |
      | Result | 0.833€ (arrondi 3 décimales) |
    And stock should be 150

  Scenario: PMP with zero stock
    Given product "Coca-Cola 33cl" has stock=0 and PMP=0.80€
    When I receive purchase: qty=50, price=0.95€
    Then PMP should become 0.95€
    And previous PMP should be ignored

  Scenario: PMP on sale (no change)
    Given product has stock=100 and PMP=0.85€
    When I sell 10 units
    Then PMP should remain 0.85€
    And stock should be 90

  Scenario: PMP on return to supplier
    Given product has stock=100, PMP=0.85€
    When I return 20 units to supplier at 0.90€
    Then PMP should remain 0.85€ (no recalc on return)
    And stock should be 80

  Scenario: PMP rounding rules
    Then PMP should be:
      - Calculated with full precision
      - Stored with 4 decimal places
      - Displayed with 2 decimal places
      - Used with full precision for calculations
```

---

### 4.5 Module Caisse/Journée (CASH)

#### US-CASH-001: Ouverture de journée
**En tant que** vendeur/manager,
**Je veux** ouvrir une session de caisse,
**Afin de** commencer à vendre.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Opening Cash Session
  Scenario: Open new session
    Given no session is open for Terminal 1
    When I click "Ouvrir la caisse"
    Then I should enter the opening cash amount
    When I enter 200€ and confirm
    Then a new CashSession should be created:
      | terminal | Terminal 1 |
      | opening_balance | 200€ |
      | opened_by | Current user |
      | opened_at | Current timestamp |
      | status | OPEN |
    And I should be able to start selling

  Scenario: Session already open
    Given a session is already open for Terminal 1
    When I try to open a new session
    Then I should see "Session déjà ouverte"
    And I should see option to continue or close existing

  Scenario: Open session without cash count (Manager only)
    Given I am a Manager
    When I open session with "Pas de comptage" option
    Then opening_balance should be set to previous closing balance
    And a note should be recorded
```

#### US-CASH-002: Clôture de journée
**En tant que** vendeur/manager,
**Je veux** clôturer la session de caisse,
**Afin de** comptabiliser la journée.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Closing Cash Session
  Scenario: Close session with cash count
    Given session is open with:
      | Opening balance | 200€ |
      | Cash sales | 500€ |
      | Expected cash | 700€ |
    When I click "Clôturer la caisse"
    Then I should see summary of the day:
      | Ventes cash | 500€ |
      | Ventes Bankily | 150€ |
      | Ventes Sadad | 80€ |
      | Ventes crédit | 200€ |
      | Total ventes | 930€ |
      | Espèces attendues | 700€ |
    When I count and enter 695€
    Then I should see "Écart: -5€"
    When I provide reason "Erreur de rendu monnaie"
    And I confirm closing
    Then session should be closed
    And closing report should be generated

  Scenario: Close session with cash withdrawal
    Given expected cash is 700€
    When I withdraw 500€ for bank deposit
    Then I should record:
      | withdrawal_amount | 500€ |
      | reason | Dépôt banque |
    And expected remaining cash should be 200€
    And a CashMovement record should be created

  Scenario: Generate closing report
    Given session is closed
    Then I should be able to print/PDF a report with:
      - Session dates/times
      - User who opened/closed
      - Sales breakdown by payment method
      - Cash movements (withdrawals)
      - Expected vs actual cash
      - Variance and reason
      - Signature lines
```

#### US-CASH-003: Retrait de caisse (Cash Drop)
**En tant que** manager,
**Je veux** retirer du cash pendant la journée,
**Afin de** sécuriser les fonds.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Cash Drop
  Scenario: Perform cash drop
    Given session is open with 500€ cash sales
    When I click "Retrait caisse"
    And I enter amount 400€
    And I enter reason "Dépôt coffre"
    And I confirm
    Then a CashMovement should be created:
      | type | WITHDRAWAL |
      | amount | 400€ |
      | reason | Dépôt coffre |
      | user | Current user |
    And expected cash should decrease by 400€

  Scenario: Cash drop requires manager
    Given I am a Vendeur
    When I try to perform cash drop
    Then I should see "Autorisation manager requise"
    And I should be able to request manager PIN
```

---

### 4.6 Module Clients (CUST)

#### US-CUST-001: Gérer les clients
**En tant que** vendeur/manager,
**Je veux** gérer une base clients,
**Afin de** suivre les crédits et fidéliser.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Customer Management
  Scenario: Create customer
    Given I am on customer page
    When I click "Nouveau client"
    And I fill in:
      | Nom | Mohammed Ali |
      | Téléphone | +222 12345678 |
      | Email | mali@email.com |
      | Limite crédit | 1000€ |
    And I save
    Then customer should be created
    And initial balance should be 0€

  Scenario: View customer balance
    Given customer "Mohammed Ali" has:
      | Credit purchases | 500€ |
      | Payments received | 300€ |
    When I view customer details
    Then I should see "Solde: 200€"
    And I should see transaction history

  Scenario: Record customer payment
    Given customer "Mohammed Ali" has balance 200€
    When I record payment of 150€
    Then balance should become 50€
    And a payment record should be created
```

---

### 4.7 Module Rapports (RPT)

#### US-RPT-001: Rapport de ventes
**En tant que** manager,
**Je veux** voir les rapports de ventes,
**Afin d'** analyser la performance.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Sales Reports
  Scenario: Daily sales report
    Given I select date range "Aujourd'hui"
    Then I should see:
      | Nombre de ventes | 45 |
      | Chiffre d'affaires | 2,350€ |
      | Panier moyen | 52.22€ |
      | Top produits | List |
      | Ventes par heure | Chart |
      | Ventes par vendeur | Table |

  Scenario: Export report
    Given I have generated a sales report
    When I click "Exporter"
    Then I should be able to download as:
      - PDF
      - Excel
      - CSV
```

---

### 4.8 Module Administration (ADMIN)

#### US-ADMIN-001: Gestion des utilisateurs
**En tant qu'** admin,
**Je veux** gérer les utilisateurs et leurs rôles,
**Afin de** contrôler les accès.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: User Management
  Scenario: Create user
    Given I am Admin
    When I create user:
      | Nom | Ahmed Sow |
      | Email | asow@store.com |
      | Rôle | Vendeur |
      | Stores | Magasin Centre |
    Then user should be created
    And temporary password should be generated
    And user should change password on first login

  Scenario: Deactivate user
    Given user "Ahmed Sow" is active
    When I deactivate this user
    Then user should not be able to login
    And active sessions should be terminated
    And user data should be preserved for audit

  Scenario: Change user role
    Given user "Ahmed Sow" is Vendeur
    When I change role to Manager
    Then new permissions should apply immediately
    And an audit log should be created
```

#### US-ADMIN-002: Gestion des rôles (RBAC)
**En tant qu'** admin,
**Je veux** définir les permissions par rôle,
**Afin de** sécuriser l'application.

**Critères d'acceptation (Gherkin):**
```gherkin
Feature: Role-Based Access Control
  Scenario: Default roles and permissions
    Then the following roles should exist:
      | Role | Permissions |
      | Vendeur | POS: vente, recherche, panier |
      |        | Clients: lecture, création |
      |        | Stock: lecture seule |
      | Manager | All Vendeur permissions |
      |         | Produits: CRUD |
      |         | Stock: ajustements |
      |         | Rapports: lecture |
      |         | Caisse: clôture, retrait |
      |         | Override: prix min/max |
      | Admin | All Manager permissions |
      |       | Users: CRUD |
      |       | Settings: all |
      |       | Audit: lecture |
      |       | Import/Export |

  Scenario: UI respects permissions
    Given I am Vendeur
    When I view the application
    Then I should not see "Produits" menu
    And I should not see "Admin" menu
    And "Clôture caisse" should require manager PIN
```

---

## 5. Parcours Détaillés (User Flows)

### 5.1 Flow: Vente complète (Happy Path)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUX DE VENTE STANDARD                          │
└─────────────────────────────────────────────────────────────────────────┘

[1. LOGIN]
    │
    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Email     │───▶│   Store     │───▶│  Terminal   │
│   Password  │    │  Selection  │    │  Selection  │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │   CAISSE FERMÉE ?       │
                              │   → Ouvrir la caisse    │
                              │   → Entrer fond caisse  │
                              └───────────┬─────────────┘
                                          │
[2. POS MAIN SCREEN]                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────┐  ┌────────────────────────────────────────────┐  │
│  │ [Recherche___🔍] │  │              PANIER                        │  │
│  │                  │  │  ┌────────────────────────────────────┐    │  │
│  │ ┌──────────────┐ │  │  │ Coca-Cola 33cl    x2     3.00€    │    │  │
│  │ │  Boissons    │ │  │  │ Pain baguette     x1     0.80€    │    │  │
│  │ │  Snacks      │ │  │  │ Chips Lays        x1    -10% 1.35€│    │  │
│  │ │  Épicerie    │ │  │  └────────────────────────────────────┘    │  │
│  │ │  Hygiène     │ │  │                                            │  │
│  │ └──────────────┘ │  │  Sous-total:              5.15€            │  │
│  │                  │  │  TVA (20%):               0.86€            │  │
│  │ ┌──────┬──────┐  │  │  ══════════════════════════════════        │  │
│  │ │ Prod │ Prod │  │  │  TOTAL:                   6.01€            │  │
│  │ │  1   │  2   │  │  │                                            │  │
│  │ ├──────┼──────┤  │  │  ┌─────────┐  ┌─────────────────────┐      │  │
│  │ │ Prod │ Prod │  │  │  │ ANNULER │  │      PAYER (F12)    │      │  │
│  │ │  3   │  4   │  │  │  └─────────┘  └─────────────────────┘      │  │
│  │ └──────┴──────┘  │  └────────────────────────────────────────────┘  │
│  └──────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │ [Scan produit OU clic produit OU recherche]
    │ < 50ms pour ajout panier
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PRODUIT AJOUTÉ                                                         │
│  → Feedback visuel immédiat (highlight vert)                           │
│  → Son "bip" succès                                                    │
│  → Total recalculé instantanément                                      │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │ [Clic PAYER ou F12]
    ▼
[3. ÉCRAN PAIEMENT]
┌─────────────────────────────────────────────────────────────────────────┐
│                         PAIEMENT                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Total à payer:                           6.01€                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ ESPÈCES  │ │ BANKILY  │ │  SADAD   │ │  CRÉDIT  │                   │
│  │    💵    │ │    📱    │ │    📱    │ │    📝    │                   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Montant reçu: [________6.01€_________]                         │   │
│  │                                                                  │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │   │
│  │  │ 6.01€  │ │  10€   │ │  20€   │ │  50€   │ (Boutons rapides)  │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘                    │   │
│  │                                                                  │   │
│  │  Rendu monnaie:                               0.00€             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│           ┌─────────────────────────────────────────┐                   │
│           │           CONFIRMER (Entrée)            │                   │
│           └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │ [Confirmation < 200ms]
    ▼
[4. REÇU]
┌─────────────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════╗                              │
│  ║         MAGASIN CENTRE                ║                              │
│  ║      123 Rue du Commerce              ║                              │
│  ║         Tel: 12345678                 ║                              │
│  ╠═══════════════════════════════════════╣                              │
│  ║  Date: 25/01/2026      Ticket: #1234  ║                              │
│  ║  Vendeur: Ahmed                       ║                              │
│  ╠═══════════════════════════════════════╣                              │
│  ║  Coca-Cola 33cl    x2          3.00€  ║                              │
│  ║  Pain baguette     x1          0.80€  ║                              │
│  ║  Chips Lays        x1   -10%   1.35€  ║                              │
│  ╠═══════════════════════════════════════╣                              │
│  ║  Sous-total:               5.15€      ║                              │
│  ║  TVA 20%:                  0.86€      ║                              │
│  ║  TOTAL:                    6.01€      ║                              │
│  ╠═══════════════════════════════════════╣                              │
│  ║  Espèces:                 10.00€      ║                              │
│  ║  Rendu:                    3.99€      ║                              │
│  ╠═══════════════════════════════════════╣                              │
│  ║         MERCI DE VOTRE VISITE         ║                              │
│  ╚═══════════════════════════════════════╝                              │
│                                                                         │
│   [Imprimer]    [Email]    [Nouvelle vente (Espace)]                   │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │ [Espace ou auto après 3s]
    ▼
[Retour POS Main Screen - Panier vide]
```

### 5.2 Flow: Clôture de caisse

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FLUX CLÔTURE DE CAISSE                             │
└─────────────────────────────────────────────────────────────────────────┘

[Menu] → [Clôture Caisse]
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    RÉSUMÉ DE LA JOURNÉE                                 │
│  ────────────────────────────────────────────────────────────────────  │
│  Session ouverte: 25/01/2026 08:00 par Ahmed                           │
│  Durée: 10h 30min                                                       │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  VENTES                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Nombre de tickets:                    45                       │   │
│  │  Chiffre d'affaires brut:         2,350.00€                     │   │
│  │  Remises accordées:                  -85.00€                    │   │
│  │  Chiffre d'affaires net:          2,265.00€                     │   │
│  │  TVA collectée:                      377.50€                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ENCAISSEMENTS                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Espèces:                          1,500.00€                    │   │
│  │  Bankily:                            450.00€                    │   │
│  │  Sadad:                              215.00€                    │   │
│  │  Crédit client:                      100.00€                    │   │
│  │  ─────────────────────────────────────────────                  │   │
│  │  Total encaissé:                   2,265.00€                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  MOUVEMENTS CAISSE                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Fond de caisse (ouverture):         200.00€                    │   │
│  │  + Ventes espèces:                 1,500.00€                    │   │
│  │  - Retraits:                        -800.00€                    │   │
│  │  ─────────────────────────────────────────────                  │   │
│  │  Espèces attendues:                  900.00€                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│           [Continuer vers comptage]                                     │
└─────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      COMPTAGE DE CAISSE                                 │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Billets                              Pièces                            │
│  ┌─────────────────────────┐         ┌─────────────────────────┐       │
│  │  200€ x [__0__] = 0€    │         │  2€  x [__5__] = 10€    │       │
│  │  100€ x [__3__] = 300€  │         │  1€  x [__8__] = 8€     │       │
│  │   50€ x [__7__] = 350€  │         │  0.50€ x [__4__] = 2€   │       │
│  │   20€ x [__5__] = 100€  │         │  0.20€ x [__3__] = 0.60€│       │
│  │   10€ x [__8__] = 80€   │         │  0.10€ x [__2__] = 0.20€│       │
│  │    5€ x [__6__] = 30€   │         │  0.05€ x [__4__] = 0.20€│       │
│  └─────────────────────────┘         └─────────────────────────┘       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Total compté:                       881.00€                    │   │
│  │  Espèces attendues:                  900.00€                    │   │
│  │  ─────────────────────────────────────────────                  │   │
│  │  ÉCART:                              -19.00€  ⚠️                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Commentaire écart: [_Erreurs de rendu monnaie_________________]       │
│                                                                         │
│           [Annuler]              [Valider clôture]                      │
└─────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ CAISSE CLÔTURÉE                                                     │
│                                                                         │
│  Session #2026-01-25-001 clôturée avec succès                          │
│  Écart enregistré: -19.00€                                              │
│                                                                         │
│  [Imprimer rapport]    [Télécharger PDF]    [Fermer]                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. UI/UX Specifications

### 6.1 Principes de design

| Principe | Description |
|----------|-------------|
| **Speed First** | Chaque interaction < 200ms perçu |
| **Clean Premium** | Moderne, épuré, pas "logiciel ERP" |
| **Touch Ready** | Boutons larges (min 44px), zones de tap |
| **Keyboard First** | Raccourcis pour toutes actions POS |
| **Error Prevention** | Confirmation pour actions destructives |
| **Feedback Instant** | Visuel + audio pour chaque action |

### 6.2 Palette de couleurs

```
Primary:     #2563EB (Blue 600)      - Actions principales
Secondary:   #64748B (Slate 500)     - Actions secondaires
Success:     #22C55E (Green 500)     - Confirmations, stock OK
Warning:     #F59E0B (Amber 500)     - Alertes, stock bas
Error:       #EF4444 (Red 500)       - Erreurs, actions destructives
Background:  #F8FAFC (Slate 50)      - Fond principal
Surface:     #FFFFFF                  - Cartes, modales
Text:        #1E293B (Slate 800)     - Texte principal
```

### 6.3 Typographie

```
Font Family: Inter (Google Fonts)
- Headings: 600 weight
- Body: 400 weight
- Monospace (prix, totaux): JetBrains Mono

Sizes:
- H1: 24px / 32px line-height
- H2: 20px / 28px
- H3: 16px / 24px
- Body: 14px / 20px
- Small: 12px / 16px
- Price (POS): 24px bold
- Total (POS): 32px bold
```

### 6.4 Composants clés

#### 6.4.1 Product Card (POS Grid)
```
┌─────────────────────────┐
│  ┌───────────────────┐  │
│  │                   │  │
│  │      [Image]      │  │  96x96px ou placeholder
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  Coca-Cola 33cl         │  Font: 14px, truncate 2 lines
│  1.50€                  │  Font: 18px bold, Primary color
│  Stock: 45              │  Font: 12px, Slate 500
└─────────────────────────┘
Min width: 120px
Touch target: entire card
Hover: subtle shadow + scale 1.02
```

#### 6.4.2 Cart Line Item
```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                       │
│  │[Img] │  Coca-Cola 33cl                          ┌───┐       │
│  │      │  1.50€ x 2                               │ 🗑 │       │
│  └──────┘                              3.00€       └───┘       │
│           [-] [__2__] [+]                                       │
└─────────────────────────────────────────────────────────────────┘
Swipe left: reveal delete button (mobile)
Click quantity: open numpad modal
```

#### 6.4.3 Payment Button
```
┌─────────────────────┐
│                     │
│      💵             │  Icon: 32px
│    ESPÈCES          │  Label: 14px 600
│                     │
└─────────────────────┘
Size: 100x80px minimum
States: default, hover, active, selected, disabled
Selected: Primary border + light primary background
```

### 6.5 États des écrans

#### Loading State
```
┌─────────────────────────────────────┐
│                                     │
│         ⟳ (spinner animé)          │
│                                     │
│     Chargement des produits...      │
│                                     │
└─────────────────────────────────────┘
- Skeleton loaders pour listes
- Spinner centré pour actions
- Progress bar pour imports
```

#### Empty State
```
┌─────────────────────────────────────┐
│                                     │
│         📦 (icon stylisé)          │
│                                     │
│      Aucun produit trouvé           │
│                                     │
│   Essayez avec d'autres termes      │
│   ou scannez un code-barres         │
│                                     │
└─────────────────────────────────────┘
- Illustration simple
- Message explicatif
- Action suggérée
```

#### Error State
```
┌─────────────────────────────────────┐
│  ⚠️  Erreur de connexion            │
│                                     │
│  Impossible de contacter le serveur │
│                                     │
│  [Réessayer]    [Mode hors ligne]   │
└─────────────────────────────────────┘
- Icône d'erreur
- Message clair
- Actions de récupération
```

### 6.6 Raccourcis clavier (POS)

| Raccourci | Action | Contexte |
|-----------|--------|----------|
| `F1` | Aide / raccourcis | Global |
| `F2` | Recherche produit (focus) | POS |
| `F3` | Sélectionner client | POS |
| `F4` | Appliquer remise | Ligne sélectionnée |
| `F5` | Actualiser catalogue | POS |
| `F8` | Suspendre vente | POS avec panier |
| `F9` | Reprendre vente | POS |
| `F10` | Ouvrir tiroir caisse | POS |
| `F12` ou `Enter` | Passer au paiement | Panier non vide |
| `Escape` | Annuler / Retour | Modal, Paiement |
| `+` / `-` | Augmenter/Diminuer quantité | Ligne sélectionnée |
| `Delete` | Supprimer ligne | Ligne sélectionnée |
| `Ctrl+Z` | Annuler dernière action | POS |
| `↑` / `↓` | Naviguer panier | POS |
| `1-9` (pavé num) | Boutons montant rapide | Paiement |

### 6.7 Responsive Breakpoints

| Breakpoint | Largeur | Utilisation |
|------------|---------|-------------|
| Mobile | < 640px | Non supporté POS (warning) |
| Tablet | 640px - 1024px | POS simplifié |
| Desktop | 1024px - 1440px | POS standard |
| Large | > 1440px | POS étendu (plus de produits visibles) |

---

## 7. Data Model

### 7.1 Diagramme conceptuel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA MODEL - VelociPOS                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐       ┌──────────┐       ┌──────────┐
│   User   │──────▶│   Role   │       │  Store   │
└──────────┘  N:1  └──────────┘       └──────────┘
     │                                      │
     │ N:M                                  │ 1:N
     ▼                                      ▼
┌──────────┐                          ┌──────────┐
│UserStore │                          │ Terminal │
└──────────┘                          └──────────┘
                                           │
                                           │ 1:N
                                           ▼
┌──────────┐       ┌──────────┐      ┌────────────┐
│ Category │◀──────│ Product  │      │CashSession │
└──────────┘  N:1  └──────────┘      └────────────┘
                        │                  │
                        │ 1:N              │ 1:N
                        ▼                  ▼
                  ┌───────────┐      ┌────────────┐
                  │   Stock   │      │CashMovement│
                  └───────────┘      └────────────┘
                        │
                        │ 1:N
                        ▼
                  ┌─────────────┐
                  │StockMovement│
                  └─────────────┘

┌──────────┐       ┌──────────┐       ┌───────────┐
│ Customer │◀──────│  Order   │──────▶│ OrderItem │
└──────────┘  N:1  └──────────┘  1:N  └───────────┘
                        │
                        │ 1:N
                        ▼
                  ┌──────────┐
                  │ Payment  │
                  └──────────┘

┌──────────┐
│ AuditLog │  (Standalone - logs all sensitive actions)
└──────────┘
```

### 7.2 Schéma détaillé des tables

#### Table: User
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role_id         UUID NOT NULL REFERENCES roles(id),
    is_active       BOOLEAN DEFAULT true,
    must_change_pwd BOOLEAN DEFAULT true,
    failed_attempts INT DEFAULT 0,
    locked_until    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id),
    INDEX idx_users_active (is_active)
);
```

#### Table: Role
```sql
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) UNIQUE NOT NULL,  -- 'VENDEUR', 'MANAGER', 'ADMIN'
    permissions JSONB NOT NULL,                -- {"pos.sell": true, "products.edit": false, ...}
    created_at  TIMESTAMP DEFAULT NOW()
);
```

#### Table: Store
```sql
CREATE TABLE stores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    address     TEXT,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    tax_id      VARCHAR(50),
    currency    VARCHAR(3) DEFAULT 'EUR',
    timezone    VARCHAR(50) DEFAULT 'Europe/Paris',
    is_active   BOOLEAN DEFAULT true,
    settings    JSONB DEFAULT '{}',  -- Store-specific settings
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),

    INDEX idx_stores_active (is_active)
);
```

#### Table: Terminal
```sql
CREATE TABLE terminals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    name            VARCHAR(50) NOT NULL,
    current_user_id UUID REFERENCES users(id),
    is_active       BOOLEAN DEFAULT true,
    last_activity   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(store_id, name),
    INDEX idx_terminals_store (store_id)
);
```

#### Table: UserStore (Many-to-Many)
```sql
CREATE TABLE user_stores (
    user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, store_id)
);
```

#### Table: Category
```sql
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID NOT NULL REFERENCES stores(id),
    name        VARCHAR(100) NOT NULL,
    parent_id   UUID REFERENCES categories(id),
    sort_order  INT DEFAULT 0,
    color       VARCHAR(7),  -- Hex color for UI
    icon        VARCHAR(50), -- Icon name
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT NOW(),

    UNIQUE(store_id, name, parent_id),
    INDEX idx_categories_store (store_id),
    INDEX idx_categories_parent (parent_id)
);
```

#### Table: Product
```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    category_id     UUID REFERENCES categories(id),
    sku             VARCHAR(50) NOT NULL,
    barcode         VARCHAR(50),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    sell_price      DECIMAL(12,4) NOT NULL,
    min_price       DECIMAL(12,4),           -- Prix minimum autorisé
    max_price       DECIMAL(12,4),           -- Prix maximum autorisé
    cost_price      DECIMAL(12,4),           -- Prix d'achat (dernier)
    pmp             DECIMAL(12,4) DEFAULT 0, -- Prix Moyen Pondéré
    tax_rate        DECIMAL(5,2) DEFAULT 0,  -- Taux TVA (ex: 20.00)
    is_active       BOOLEAN DEFAULT true,
    is_stockable    BOOLEAN DEFAULT true,    -- false for services
    image_url       VARCHAR(500),
    unit            VARCHAR(20) DEFAULT 'unit', -- unit, kg, l, etc.
    min_stock       INT DEFAULT 0,           -- Seuil alerte stock bas
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(store_id, sku),
    UNIQUE(store_id, barcode) WHERE barcode IS NOT NULL,
    INDEX idx_products_store (store_id),
    INDEX idx_products_category (category_id),
    INDEX idx_products_barcode (barcode),
    INDEX idx_products_name_gin ON products USING gin(to_tsvector('french', name)),
    INDEX idx_products_active (store_id, is_active)
);
```

#### Table: Stock
```sql
CREATE TABLE stock (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID NOT NULL REFERENCES stores(id),
    product_id  UUID NOT NULL REFERENCES products(id),
    quantity    DECIMAL(12,3) NOT NULL DEFAULT 0,
    reserved    DECIMAL(12,3) DEFAULT 0,  -- Pour commandes en attente
    updated_at  TIMESTAMP DEFAULT NOW(),

    UNIQUE(store_id, product_id),
    INDEX idx_stock_store_product (store_id, product_id),
    INDEX idx_stock_low ON stock(store_id)
        WHERE quantity <= (SELECT min_stock FROM products WHERE id = product_id)
);
```

#### Table: StockMovement
```sql
CREATE TABLE stock_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    product_id      UUID NOT NULL REFERENCES products(id),
    type            VARCHAR(20) NOT NULL,  -- SALE, RETURN, ADJUSTMENT_IN, ADJUSTMENT_OUT, TRANSFER_IN, TRANSFER_OUT, PURCHASE
    quantity        DECIMAL(12,3) NOT NULL, -- Positive or negative
    quantity_before DECIMAL(12,3) NOT NULL,
    quantity_after  DECIMAL(12,3) NOT NULL,
    unit_cost       DECIMAL(12,4),          -- Cost at time of movement
    reference_type  VARCHAR(50),            -- 'order', 'adjustment', 'transfer', 'purchase'
    reference_id    UUID,                   -- ID of related document
    reason          TEXT,
    user_id         UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),

    INDEX idx_stockmov_store_product (store_id, product_id),
    INDEX idx_stockmov_type (type),
    INDEX idx_stockmov_created (created_at DESC),
    INDEX idx_stockmov_reference (reference_type, reference_id)
);
```

#### Table: Customer
```sql
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    code            VARCHAR(20),            -- Customer code
    name            VARCHAR(200) NOT NULL,
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    tax_id          VARCHAR(50),            -- NIF for B2B
    credit_limit    DECIMAL(12,2) DEFAULT 0,
    balance         DECIMAL(12,2) DEFAULT 0, -- Current credit balance (positive = owes)
    is_active       BOOLEAN DEFAULT true,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(store_id, code) WHERE code IS NOT NULL,
    INDEX idx_customers_store (store_id),
    INDEX idx_customers_phone (phone),
    INDEX idx_customers_name_gin ON customers USING gin(to_tsvector('french', name))
);
```

#### Table: Order (Vente)
```sql
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    terminal_id     UUID NOT NULL REFERENCES terminals(id),
    session_id      UUID REFERENCES cash_sessions(id),
    order_number    VARCHAR(20) NOT NULL,   -- Formatted: 2026-001234
    customer_id     UUID REFERENCES customers(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'COMPLETED', -- PENDING, COMPLETED, REFUNDED, CANCELLED
    subtotal        DECIMAL(12,2) NOT NULL,
    discount_total  DECIMAL(12,2) DEFAULT 0,
    tax_total       DECIMAL(12,2) NOT NULL,
    total           DECIMAL(12,2) NOT NULL,
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(store_id, order_number),
    INDEX idx_orders_store (store_id),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_session (session_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created (created_at DESC)
);
```

#### Table: OrderItem
```sql
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    product_name    VARCHAR(200) NOT NULL,  -- Snapshot at time of sale
    product_sku     VARCHAR(50),
    quantity        DECIMAL(12,3) NOT NULL,
    unit_price      DECIMAL(12,4) NOT NULL, -- Price at time of sale
    cost_price      DECIMAL(12,4),          -- PMP at time of sale (for margin)
    discount_type   VARCHAR(10),            -- PERCENT, FIXED
    discount_value  DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_rate        DECIMAL(5,2) NOT NULL,
    tax_amount      DECIMAL(12,2) NOT NULL,
    line_total      DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),

    INDEX idx_orderitems_order (order_id),
    INDEX idx_orderitems_product (product_id)
);
```

#### Table: Payment
```sql
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id),
    method          VARCHAR(20) NOT NULL,   -- CASH, BANKILY, SADAD, CREDIT
    amount          DECIMAL(12,2) NOT NULL,
    received_amount DECIMAL(12,2),          -- For cash (amount given by customer)
    change_amount   DECIMAL(12,2),          -- For cash
    reference       VARCHAR(100),           -- Transaction ID for Bankily/Sadad
    status          VARCHAR(20) DEFAULT 'COMPLETED', -- PENDING, COMPLETED, FAILED, REFUNDED
    metadata        JSONB,                  -- Provider-specific data
    created_at      TIMESTAMP DEFAULT NOW(),

    INDEX idx_payments_order (order_id),
    INDEX idx_payments_method (method),
    INDEX idx_payments_reference (reference)
);
```

#### Table: CashSession
```sql
CREATE TABLE cash_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    terminal_id     UUID NOT NULL REFERENCES terminals(id),
    opened_by       UUID NOT NULL REFERENCES users(id),
    closed_by       UUID REFERENCES users(id),
    status          VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED
    opening_balance DECIMAL(12,2) NOT NULL,
    closing_balance DECIMAL(12,2),
    expected_cash   DECIMAL(12,2),
    actual_cash     DECIMAL(12,2),
    variance        DECIMAL(12,2),
    variance_reason TEXT,
    opened_at       TIMESTAMP DEFAULT NOW(),
    closed_at       TIMESTAMP,

    INDEX idx_sessions_store (store_id),
    INDEX idx_sessions_terminal (terminal_id),
    INDEX idx_sessions_status (status),
    INDEX idx_sessions_opened (opened_at DESC)
);
```

#### Table: CashMovement
```sql
CREATE TABLE cash_movements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES cash_sessions(id),
    type        VARCHAR(20) NOT NULL,  -- OPENING, SALE, WITHDRAWAL, DEPOSIT, CLOSING
    amount      DECIMAL(12,2) NOT NULL,
    reason      TEXT,
    user_id     UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),

    INDEX idx_cashmov_session (session_id),
    INDEX idx_cashmov_type (type)
);
```

#### Table: AuditLog
```sql
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID REFERENCES stores(id),
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,  -- 'product.price_changed', 'order.voided', etc.
    entity_type VARCHAR(50),            -- 'product', 'order', 'user', etc.
    entity_id   UUID,
    old_values  JSONB,
    new_values  JSONB,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),

    INDEX idx_audit_store (store_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at DESC)
);
```

### 7.3 Règles de calcul PMP

```typescript
/**
 * Calcul du Prix Moyen Pondéré (PMP)
 *
 * Formule: PMP = (Stock_actuel * PMP_actuel + Qté_entrée * Prix_entrée) / (Stock_actuel + Qté_entrée)
 *
 * Règles:
 * 1. Arrondi: 4 décimales pour stockage, 2 pour affichage
 * 2. Stock à zéro: Le nouveau PMP = prix de la nouvelle entrée
 * 3. Sorties (ventes): Ne modifient PAS le PMP
 * 4. Retours fournisseurs: Ne modifient PAS le PMP
 * 5. Ajustements négatifs: Ne modifient PAS le PMP
 * 6. Ajustements positifs SANS coût: Utilisent le PMP actuel
 */

interface PMPCalculation {
  currentStock: number;
  currentPMP: number;
  incomingQty: number;
  incomingPrice: number;
}

function calculatePMP({ currentStock, currentPMP, incomingQty, incomingPrice }: PMPCalculation): number {
  // Cas 1: Stock actuel à zéro
  if (currentStock <= 0) {
    return roundToDecimals(incomingPrice, 4);
  }

  // Cas 2: Calcul standard
  const totalValue = (currentStock * currentPMP) + (incomingQty * incomingPrice);
  const totalQty = currentStock + incomingQty;

  // Éviter division par zéro
  if (totalQty <= 0) {
    return currentPMP;
  }

  return roundToDecimals(totalValue / totalQty, 4);
}

function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
```

---

## 8. API Specification

### 8.1 Architecture API

```
Base URL: /api/v1
Format: JSON
Auth: Bearer JWT (header) + httpOnly refresh cookie
Rate Limit: 1000 req/min (standard), 100 req/min (auth endpoints)
```

### 8.2 Endpoints par module

#### 8.2.1 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/refresh` | Refresh access token | Cookie |
| POST | `/auth/logout` | Invalidate tokens | Yes |
| GET | `/auth/me` | Get current user info | Yes |
| POST | `/auth/change-password` | Change password | Yes |

**POST /auth/login**
```json
// Request
{
  "email": "user@store.com",
  "password": "SecurePass123!"
}

// Response 200
{
  "access_token": "eyJhbG...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "user@store.com",
    "firstName": "Ahmed",
    "lastName": "Sow",
    "role": "VENDEUR"
  }
}

// Response 401
{
  "error": "INVALID_CREDENTIALS",
  "message": "Email ou mot de passe incorrect"
}
```

#### 8.2.2 Stores & Terminals

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/stores` | List user's stores | Yes |
| GET | `/stores/:id` | Get store details | Yes |
| GET | `/stores/:id/terminals` | List store terminals | Yes |
| POST | `/stores/:id/terminals/:tid/claim` | Claim terminal | Yes |
| POST | `/stores/:id/terminals/:tid/release` | Release terminal | Yes |

#### 8.2.3 Products

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/products` | List products (paginated) | Yes | All |
| GET | `/products/catalog` | Full catalog for IndexedDB sync | Yes | All |
| GET | `/products/:id` | Get product details | Yes | All |
| GET | `/products/barcode/:code` | Find by barcode | Yes | All |
| POST | `/products` | Create product | Yes | Manager+ |
| PUT | `/products/:id` | Update product | Yes | Manager+ |
| DELETE | `/products/:id` | Soft delete product | Yes | Admin |
| POST | `/products/import` | Import from CSV | Yes | Admin |

**GET /products/catalog**
```json
// Response 200
{
  "products": [
    {
      "id": "uuid",
      "sku": "COC-33",
      "barcode": "5449000000996",
      "name": "Coca-Cola 33cl",
      "sellPrice": 1.50,
      "minPrice": 1.20,
      "maxPrice": 2.00,
      "taxRate": 20,
      "categoryId": "uuid",
      "categoryName": "Boissons",
      "stock": 45,
      "imageUrl": null
    }
  ],
  "lastSync": "2026-01-25T10:30:00Z",
  "totalCount": 1523
}
```

#### 8.2.4 Categories

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/categories` | List categories | Yes | All |
| POST | `/categories` | Create category | Yes | Manager+ |
| PUT | `/categories/:id` | Update category | Yes | Manager+ |
| DELETE | `/categories/:id` | Delete category | Yes | Admin |

#### 8.2.5 Orders (POS)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/orders` | Create order (sale) | Yes | All |
| GET | `/orders/:id` | Get order details | Yes | All |
| GET | `/orders` | List orders (paginated) | Yes | Manager+ |
| POST | `/orders/:id/refund` | Refund order | Yes | Manager+ |
| POST | `/orders/:id/void` | Void order | Yes | Manager+ |
| GET | `/orders/:id/receipt` | Get receipt data | Yes | All |

**POST /orders**
```json
// Request
{
  "terminalId": "uuid",
  "sessionId": "uuid",
  "customerId": "uuid | null",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "unitPrice": 1.50,
      "discountType": "PERCENT",
      "discountValue": 10
    }
  ],
  "payments": [
    {
      "method": "CASH",
      "amount": 3.00,
      "receivedAmount": 5.00
    }
  ],
  "notes": "Client régulier"
}

// Response 201
{
  "id": "uuid",
  "orderNumber": "2026-000123",
  "status": "COMPLETED",
  "subtotal": 3.00,
  "discountTotal": 0.30,
  "taxTotal": 0.45,
  "total": 3.15,
  "paidAmount": 3.15,
  "change": 1.85,
  "createdAt": "2026-01-25T14:30:00Z"
}
```

#### 8.2.6 Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/payments/bankily/initiate` | Start Bankily payment | Yes |
| POST | `/payments/bankily/callback` | Bankily webhook | No* |
| GET | `/payments/bankily/:id/status` | Check payment status | Yes |
| POST | `/payments/sadad/initiate` | Start Sadad payment | Yes |
| POST | `/payments/sadad/callback` | Sadad webhook | No* |

**Payment Flow (Bankily/Sadad)**
```
1. POS → POST /payments/bankily/initiate
   {orderId, amount, customerPhone}

2. Backend → Bankily API (initiate)
   Returns: {transactionId, status: "PENDING"}

3. POS shows "Waiting for payment confirmation..."

4. Customer confirms on phone

5. Bankily → POST /payments/bankily/callback
   {transactionId, status: "SUCCESS"}

6. Backend updates payment + notifies POS via WebSocket

7. POS completes sale
```

#### 8.2.7 Stock & Inventory

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/stock` | List stock levels | Yes | All |
| GET | `/stock/:productId` | Get product stock | Yes | All |
| POST | `/stock/adjust` | Create adjustment | Yes | Manager+ |
| GET | `/stock/movements` | List movements | Yes | Manager+ |
| GET | `/stock/movements/:productId` | Product movements | Yes | Manager+ |

**POST /stock/adjust**
```json
// Request
{
  "productId": "uuid",
  "type": "ADJUSTMENT_IN",
  "quantity": 10,
  "reason": "Inventaire - stock trouvé",
  "unitCost": 0.85
}

// Response 200
{
  "id": "uuid",
  "productId": "uuid",
  "type": "ADJUSTMENT_IN",
  "quantity": 10,
  "quantityBefore": 45,
  "quantityAfter": 55,
  "newPMP": 0.8523
}
```

#### 8.2.8 Cash Sessions

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/sessions/open` | Open cash session | Yes | All |
| GET | `/sessions/current` | Get current session | Yes | All |
| POST | `/sessions/close` | Close session | Yes | All* |
| POST | `/sessions/:id/withdraw` | Cash withdrawal | Yes | Manager+ |
| GET | `/sessions/:id/report` | Get closing report | Yes | Manager+ |

#### 8.2.9 Customers

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/customers` | List customers | Yes | All |
| GET | `/customers/:id` | Get customer | Yes | All |
| POST | `/customers` | Create customer | Yes | All |
| PUT | `/customers/:id` | Update customer | Yes | Manager+ |
| POST | `/customers/:id/payment` | Record payment | Yes | All |
| GET | `/customers/:id/transactions` | Transaction history | Yes | All |

#### 8.2.10 Reports

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/reports/sales` | Sales report | Yes | Manager+ |
| GET | `/reports/products` | Product performance | Yes | Manager+ |
| GET | `/reports/stock` | Stock report | Yes | Manager+ |
| GET | `/reports/customers` | Customer report | Yes | Manager+ |
| GET | `/reports/cashflow` | Cash flow report | Yes | Manager+ |

#### 8.2.11 Users & Roles (Admin)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/users` | List users | Yes | Admin |
| POST | `/users` | Create user | Yes | Admin |
| PUT | `/users/:id` | Update user | Yes | Admin |
| DELETE | `/users/:id` | Deactivate user | Yes | Admin |
| GET | `/roles` | List roles | Yes | Admin |
| PUT | `/roles/:id/permissions` | Update permissions | Yes | Admin |

---

## 9. Non-Functional Requirements

### 9.1 Performance SLOs

#### 9.1.1 Frontend (UI)

| Métrique | Cible | Mesure |
|----------|-------|--------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Time to Interactive (TTI) | < 3s | Lighthouse |
| Recherche produit (IndexedDB) | < 100ms | Performance API |
| Scan code-barres → panier | < 50ms | Performance API |
| Ajout produit → panier | < 50ms | Performance API |
| Changement quantité | < 50ms | Performance API |
| Transition paiement | < 200ms | Performance API |
| Rendu liste 100 produits | < 100ms | React Profiler |

#### 9.1.2 Backend (API)

| Métrique | Cible | Mesure |
|----------|-------|--------|
| GET /products/barcode/:code | < 50ms p95 | APM |
| GET /products/catalog | < 2s (full sync) | APM |
| POST /orders | < 200ms p95 | APM |
| GET /reports/* | < 1s p95 | APM |
| Autres endpoints | < 200ms p95 | APM |

#### 9.1.3 Base de données

| Métrique | Cible |
|----------|-------|
| Index sur barcode lookup | < 5ms |
| Pas de N+1 queries | Enforced via ORM |
| Connection pool | 20-50 connections |
| Query timeout | 30s max |

### 9.2 Scalabilité

| Dimension | MVP | Phase 1 | Phase 2 |
|-----------|-----|---------|---------|
| Produits par store | 1,000 | 10,000 | 50,000 |
| Catégories par store | 50 | 500 | 1,000 |
| Ventes historiques | 10,000 | 100,000 | 1,000,000 |
| Users concurrents | 10 | 50 | 200 |
| Stores | 1 | 10 | 100 |

### 9.3 Sécurité

#### 9.3.1 Authentification & Autorisation

| Requirement | Implementation |
|-------------|----------------|
| Password hashing | Argon2id (memory: 64MB, iterations: 3) |
| JWT access token | 15 min expiry, RS256 signing |
| Refresh token | httpOnly cookie, 7 days, rotation |
| Session invalidation | Token blacklist (Redis) |
| Account lockout | 5 failed attempts → 15 min lock |
| RBAC | Permission checks on every request |

#### 9.3.2 Protection des données

| Requirement | Implementation |
|-------------|----------------|
| HTTPS | Enforced (HSTS) |
| SQL Injection | Parameterized queries (Prisma) |
| XSS | Content Security Policy, React escaping |
| CSRF | SameSite cookies, CSRF tokens |
| Rate limiting | 1000 req/min standard, 100 auth |
| Input validation | Zod schemas on all inputs |

#### 9.3.3 Audit & Compliance

| Requirement | Implementation |
|-------------|----------------|
| Audit logging | All sensitive actions logged |
| Data retention | Configurable per entity type |
| PII protection | Encryption at rest for sensitive fields |
| Backup | Daily automated backups |
| GDPR | Data export, deletion capabilities |

### 9.4 Observabilité

#### 9.4.1 Logging

```typescript
// Log levels and usage
{
  error: "System errors, exceptions, failed operations",
  warn: "Potential issues, degraded performance",
  info: "Business events (sale completed, session opened)",
  debug: "Development debugging (disabled in production)"
}

// Structured log format
{
  timestamp: "2026-01-25T14:30:00.000Z",
  level: "info",
  service: "velocipod-api",
  traceId: "abc123",
  userId: "uuid",
  storeId: "uuid",
  action: "order.created",
  duration: 45,
  metadata: { orderId: "uuid", total: 25.50 }
}
```

#### 9.4.2 Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by endpoint, method, status |
| `http_request_duration_ms` | Histogram | Request latency distribution |
| `pos_sales_total` | Counter | Total sales count |
| `pos_sales_amount_total` | Counter | Total sales value |
| `db_query_duration_ms` | Histogram | Database query latency |
| `cache_hits_total` | Counter | Redis cache hits |
| `active_sessions` | Gauge | Current open cash sessions |

#### 9.4.3 Alerting

| Alert | Condition | Severity |
|-------|-----------|----------|
| High error rate | > 1% 5xx in 5min | Critical |
| Slow API | p95 > 500ms for 5min | Warning |
| Database connection | < 5 available | Critical |
| Disk space | > 80% used | Warning |
| Memory usage | > 85% | Warning |

### 9.5 Disponibilité

| Metric | Target |
|--------|--------|
| Uptime | 99.9% (8.76h downtime/year) |
| RTO (Recovery Time) | < 1 hour |
| RPO (Recovery Point) | < 1 hour (hourly backups) |
| Maintenance window | Sunday 02:00-04:00 UTC |

---

## 10. Roadmap

### 10.1 Phase 0 - MVP Démo (P0)

**Objectif:** Application fonctionnelle pour démonstration et tests internes

**Fonctionnalités:**
- [x] Infrastructure Docker (dev environment)
- [x] Auth basique (login/logout, JWT)
- [x] Sélection Store/Terminal
- [x] CRUD Produits (sans import)
- [x] CRUD Catégories
- [x] Écran POS principal
  - [x] Recherche produit (texte)
  - [x] Grille catégories
  - [x] Gestion panier
  - [x] Taxes basiques
- [x] Paiement cash uniquement
- [x] Reçu (impression navigateur)
- [x] Ouverture/Clôture caisse (basique)
- [x] Stock: visualisation
- [x] IndexedDB sync (catalogue local)

**Livrables:**
- Application déployable en local (Docker Compose)
- Documentation développeur
- Tests unitaires core (> 70% coverage)

### 10.2 Phase 1 - Commercial (P1)

**Objectif:** Application commercialisable avec features complètes

**Fonctionnalités:**
- [ ] RBAC complet (3 rôles, permissions granulaires)
- [ ] UI masquant actions non autorisées
- [ ] Paiement différé (crédit client)
- [ ] Paiement partiel / mixte
- [ ] Intégration Bankily (API + callbacks)
- [ ] Intégration Sadad (API + callbacks)
- [ ] Calcul PMP automatique
- [ ] Gestion clients complète
- [ ] Import produits (CSV/Excel + mapping)
- [ ] Rapports:
  - [ ] Ventes journalières
  - [ ] Performance produits
  - [ ] État stock
  - [ ] Clôture caisse (PDF)
- [ ] Stock: ajustements, journal mouvements
- [ ] Cash withdrawal (retrait caisse)
- [ ] Remboursements
- [ ] Audit log complet
- [ ] Scan code-barres (caméra)

**Livrables:**
- Application déployable en production (Docker)
- Documentation utilisateur
- Tests E2E scénarios critiques
- Guide d'installation client

### 10.3 Phase 2 - Expansion (P2)

**Objectif:** Features avancées et scalabilité SaaS

**Fonctionnalités:**
- [ ] Multi-tenant (isolation données, billing)
- [ ] Mode offline avancé (sync bidirectionnel)
- [ ] PWA installable
- [ ] Application mobile (React Native ou PWA)
- [ ] Transferts inter-stores
- [ ] Programme fidélité basique
- [ ] Gestion fournisseurs
- [ ] Bons de commande
- [ ] Réceptions achats
- [ ] API publique documentée (OpenAPI)
- [ ] Webhooks pour intégrations
- [ ] Thèmes personnalisables

**Livrables:**
- Plateforme SaaS multi-tenant
- Documentation API publique
- SDK d'intégration
- Dashboard admin SaaS

---

## 11. Risques & Mitigations

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|-------------|--------|------------|
| R1 | Performance IndexedDB insuffisante avec > 10k produits | Moyenne | Haute | Pagination virtuelle, index optimisés, tests de charge |
| R2 | Intégration Bankily/Sadad retardée (API non disponible) | Haute | Moyenne | Développer en mock, prévoir fallback manuel |
| R3 | Complexité RBAC sous-estimée | Moyenne | Moyenne | Commencer simple (3 rôles fixes), itérer |
| R4 | Calcul PMP incorrect edge cases | Moyenne | Haute | Tests exhaustifs, validation comptable |
| R5 | Impression thermique incompatible | Moyenne | Basse | Support navigateur natif, ESC/POS en P1 |
| R6 | Adoption utilisateur difficile (UI trop différente) | Moyenne | Haute | User testing early, formation, hotline |
| R7 | Données corrompues sync IndexedDB | Basse | Haute | Validation checksum, resync forcé, backup serveur |
| R8 | Faille sécurité (injection, XSS) | Basse | Critique | Audit sécurité, dépendances à jour, CSP strict |

---

## 12. Definition of Done & Test Plan

### 12.1 Definition of Done (DoD)

Une User Story est "Done" quand:

- [ ] Code implémenté et fonctionnel
- [ ] Code review approuvée (1+ reviewer)
- [ ] Tests unitaires écrits (coverage > 80% sur nouveau code)
- [ ] Tests d'intégration pour les APIs
- [ ] Tests E2E pour les parcours critiques
- [ ] Documentation mise à jour (si applicable)
- [ ] Pas de régression sur tests existants
- [ ] Performance validée (pas de dégradation)
- [ ] Accessible (WCAG 2.1 AA pour les nouvelles UI)
- [ ] Déployable (build réussit, migrations OK)

### 12.2 Test Plan E2E - Scénarios POS

#### Scénario E2E-001: Vente cash complète
```gherkin
Feature: Complete Cash Sale E2E

  Background:
    Given I am logged in as "vendeur@store.com"
    And I have selected "Magasin Centre" and "Terminal 1"
    And a cash session is open with 200€ opening balance
    And the product catalog is synced to IndexedDB

  Scenario: Complete sale with search, discount, and cash payment
    # Add products
    When I search for "Coca"
    Then I should see "Coca-Cola 33cl" in results within 100ms
    When I click on "Coca-Cola 33cl"
    Then it should be added to cart within 50ms
    And cart should show 1x Coca-Cola 33cl at 1.50€

    When I scan barcode "3760001234567" (Pain baguette)
    Then "Pain baguette" should be added within 50ms
    And cart should show 2 items

    # Modify quantity
    When I change "Coca-Cola 33cl" quantity to 3
    Then the line should show 3 x 1.50€ = 4.50€ within 50ms

    # Apply discount
    When I apply 10% discount to "Coca-Cola 33cl"
    Then the line should show 4.05€ (4.50€ - 10%)

    # Proceed to payment
    When I press F12 or click "Payer"
    Then I should see the payment screen within 200ms
    And total should be 4.85€ (4.05€ + 0.80€)

    # Complete cash payment
    When I select "Espèces"
    And I enter 10€
    Then I should see "Rendu: 5.15€"
    When I confirm payment
    Then the sale should complete within 200ms
    And I should see the receipt
    And order should be saved in database
    And stock should be decremented (3 Coca, 1 Pain)

    # Verify receipt
    Then receipt should show:
      | Item | Qty | Price |
      | Coca-Cola 33cl | 3 | 4.05€ |
      | Pain baguette | 1 | 0.80€ |
      | Total | | 4.85€ |
      | Espèces | | 10.00€ |
      | Rendu | | 5.15€ |
```

#### Scénario E2E-002: Vente avec paiement différé
```gherkin
Feature: Credit Sale E2E

  Scenario: Sale with credit payment for existing customer
    Given I am logged in as vendor
    And customer "Mohammed Ali" exists with balance 100€ and limit 500€
    And I have items in cart totaling 150€

    When I click "Client"
    And I search for "Mohammed"
    And I select "Mohammed Ali"
    Then customer should be linked to cart
    And I should see "Solde actuel: 100€"

    When I proceed to payment
    And I select "Crédit"
    Then I should see "Nouveau solde: 250€"
    And I should see "Limite: 500€ (OK)"

    When I confirm payment
    Then sale should complete
    And customer balance should be 250€
    And payment record should show method "CREDIT"
```

#### Scénario E2E-003: Ouverture et clôture de caisse
```gherkin
Feature: Cash Session E2E

  Scenario: Open session, make sales, close with variance
    # Opening
    Given I am logged in as vendor
    And no session is open for Terminal 1
    When I click "Ouvrir la caisse"
    And I enter opening balance 200€
    And I confirm
    Then session should be created with status OPEN
    And I should be able to make sales

    # Make some sales
    When I complete 3 cash sales totaling 150€
    Then expected cash should be 350€

    # Cash drop
    When manager performs cash drop of 200€
    Then cash movement should be recorded
    And expected cash should be 150€

    # Closing
    When I click "Clôturer la caisse"
    Then I should see summary:
      | Opening | 200€ |
      | Cash sales | 150€ |
      | Withdrawals | -200€ |
      | Expected | 150€ |

    When I count and enter 145€
    Then I should see "Écart: -5€"
    When I enter reason "Erreur de monnaie"
    And I confirm closing
    Then session should be CLOSED
    And variance should be -5€
    And closing report should be available
```

#### Scénario E2E-004: Contrôle prix min/max
```gherkin
Feature: Price Boundary Control E2E

  Scenario: Block sale below minimum price
    Given product "TV Samsung" has min_price 400€
    And I am logged in as Vendeur

    When I add "TV Samsung" to cart
    And I try to change price to 350€
    Then I should see error "Prix inférieur au minimum (400€)"
    And price should remain unchanged

    When I click "Demander autorisation"
    Then manager PIN dialog should appear
    When manager enters valid PIN
    And provides reason "Client VIP promotion"
    Then price should be changed to 350€
    And audit log should record the override
```

#### Scénario E2E-005: Paiement mixte
```gherkin
Feature: Split Payment E2E

  Scenario: Pay with cash and Bankily
    Given I have items totaling 100€
    When I proceed to payment

    # First payment - Cash
    When I select "Espèces"
    And I enter 40€
    And I click "Ajouter paiement"
    Then I should see:
      | Espèces | 40€ |
      | Restant | 60€ |

    # Second payment - Bankily
    When I select "Bankily"
    And I enter customer phone "+22212345678"
    And I click "Envoyer demande"
    Then I should see "En attente de confirmation..."

    # Simulate Bankily callback
    When Bankily confirms payment of 60€
    Then I should see payment confirmed
    And remaining should be 0€

    When I confirm final
    Then sale should complete
    And two payment records should exist
```

#### Scénario E2E-006: Import produits CSV
```gherkin
Feature: Product Import E2E

  Scenario: Import products with validation errors
    Given I am logged in as Admin
    And I have a CSV file with 100 products (5 with errors)

    When I go to Products > Import
    And I upload the CSV file
    Then I should see preview with 100 rows
    And 5 rows should be highlighted in red

    When I click on row with error
    Then I should see specific error message
    And I should be able to edit the value

    When I fix 3 errors and keep 2 for skip
    And I click "Importer (ignorer erreurs)"
    Then 98 products should be imported
    And I should see summary:
      | Importés | 98 |
      | Ignorés | 2 |
      | Erreurs | 0 |
```

### 12.3 Test Performance

```typescript
// Performance test suite (k6 or similar)

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up
    { duration: '5m', target: 50 },  // Steady state
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration{endpoint:barcode}': ['p95<50'],
    'http_req_duration{endpoint:create_order}': ['p95<200'],
    'http_req_duration{endpoint:products}': ['p95<200'],
  },
};

export default function () {
  // Barcode lookup
  const barcodeRes = http.get(
    `${BASE_URL}/api/v1/products/barcode/5449000000996`,
    { tags: { endpoint: 'barcode' } }
  );
  check(barcodeRes, { 'barcode status 200': (r) => r.status === 200 });

  // Create order
  const orderRes = http.post(
    `${BASE_URL}/api/v1/orders`,
    JSON.stringify(sampleOrder),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'create_order' }
    }
  );
  check(orderRes, { 'order status 201': (r) => r.status === 201 });

  sleep(1);
}
```

---

## 13. Appendix

### 13.1 Glossaire

| Terme | Définition |
|-------|------------|
| POS | Point of Sale - Point de Vente |
| PMP | Prix Moyen Pondéré - Weighted Average Cost |
| SKU | Stock Keeping Unit - Référence produit |
| RBAC | Role-Based Access Control |
| IndexedDB | Base de données navigateur pour cache local |
| SLO | Service Level Objective |
| MVP | Minimum Viable Product |

### 13.2 Références

- [Bankily API Documentation](#) (à obtenir)
- [Sadad API Documentation](#) (à obtenir)
- [React Performance Best Practices](https://react.dev/learn)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)

---

**Document généré pour exécution par Claude Code Max**

Chaque User Story contient des critères d'acceptation testables en format Gherkin. Les spécifications de performance sont mesurables. Le modèle de données est complet avec les index requis.

Pour démarrer l'implémentation:
1. Créer la structure du projet (React + Fastify + Prisma)
2. Configurer Docker Compose
3. Implémenter les US du module AUTH en premier
4. Puis POS → PROD → STOCK → CASH
