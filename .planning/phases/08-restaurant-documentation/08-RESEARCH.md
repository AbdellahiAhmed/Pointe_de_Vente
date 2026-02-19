# Phase 8: Restaurant Documentation - Research

**Researched:** 2026-02-19
**Domain:** Restaurant POS extension — technical design documentation (no code)
**Confidence:** HIGH

## Summary

Phase 8 produces a single Markdown design document describing how VelociPOS would be extended to handle restaurant operations: table management, modifier/customization system, kitchen order flow, and kitchen display screen. The output is a deliverable for academic presentation — it must read as a credible, professional technical specification, not a feature list.

The core challenge is mapping well-established restaurant POS industry concepts (table zones, KOT/KDS, modifier groups) onto VelociPOS's existing Symfony 5.4 + Doctrine ORM + API Platform + Mercure architecture. The document must show how new entities extend, not replace, the existing `Order`, `OrderProduct`, `Product`, `Store`, `Terminal`, and `User` entities. Real-time kitchen updates map naturally to Mercure SSE, which is already in the Symfony ecosystem standard stack.

The document must be in French (primary language of the project throughout), with Arabic section headers where applicable (matching the bilingual pattern established in Phases 6 and 7 using i18next). A professional structure uses `##`-level headings for major sections, `###` for sub-sections, entity diagrams described in ASCII or Mermaid, and data flow diagrams as sequence descriptions.

**Primary recommendation:** Structure the document as a formal technical specification with six major sections: Introduction/Scope, Data Model Extension, Table Management Module, Modifier System, Kitchen Order Flow, and Kitchen Display Screen. Each section must describe entities, state machines, API endpoints (hypothetical), and UI flows — sufficient for a reviewer to understand implementation without any code being present.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REST-01 | Un document technique décrit l'extension restaurant : gestion des tables, modifiers, commandes cuisine, écran cuisine | Research confirms the four subsystems are well-defined in industry (table zone+status FSM, modifier group hierarchy, KOT flow, KDS ticket lifecycle). Each maps to concrete entity designs and data flows the document must describe. |
| REST-02 | Le document est en format professionnel et bilingue (FR/AR si applicable) | Professional technical document format: `##` section hierarchy, Mermaid/ASCII diagrams, entity tables, API endpoint tables. Bilingual: French body text with Arabic section header translations provided inline, matching the i18next FR/AR pattern used throughout the project. |
</phase_requirements>

## Restaurant POS Industry Concepts (what the document must cover)

### 1. Table Management — Industry Standard

**Zone / Section model** (HIGH confidence — verified across Lightspeed, Square, TouchBistro, multiple vendors):
- A restaurant floor is divided into **zones** (e.g., Salle principale, Terrasse, Bar)
- Each zone contains **tables** with: number, capacity (min/max covers), shape (round/square/rectangular), and current status
- Table status is a finite state machine: `LIBRE` → `OCCUPEE` → `ADDITION_DEMANDEE` → `LIBRE`
- Staff see a visual floor plan with color-coded table status

**Cover count**: number of guests seated at a table — drives per-cover revenue analytics.

**Table merge**: multiple tables combined for large parties — produces a single unified order.

### 2. Modifier System — Industry Standard

**Modifier Group / Modifier** hierarchy (HIGH confidence — verified: Toast API schema, Square for Restaurants, Quantic, multiple POS vendors):

```
Product (ex: "Burger")
└── ModifierGroup (ex: "Cuisson")   ← attached to product
    ├── minSelections: 1, maxSelections: 1, required: true
    └── Modifiers: ["Saignant", "A point", "Bien cuit"]

Product (ex: "Pizza Margherita")
└── ModifierGroup (ex: "Suppléments")
    ├── minSelections: 0, maxSelections: 5, required: false
    └── Modifiers: ["Fromage extra (+0 MRU)", "Champignons (+15 MRU)", "Jambon (+20 MRU)"]
```

- Modifiers can add a price delta (positive, zero, or negative for substitutions)
- An `OrderProduct` (existing entity) captures selected modifiers as `OrderItemModifier` records
- Modifiers appear verbatim on kitchen tickets — the kitchen sees "Burger | A point | Sans oignon"

### 3. Kitchen Order Flow (KOT)

**KOT (Kitchen Order Ticket)** — the fundamental unit sent to the kitchen when items are submitted:
- Triggered when waiter "fires" the order (explicit action, not at payment)
- One KOT per "send to kitchen" action on one table's order
- Contains: table number, seat/cover number, items with modifiers, submission timestamp
- Status: `RECU` → `EN_PREPARATION` → `PRET` → `LIVRE`

**Station routing**: items route to the relevant kitchen station (ex: grill, friture, froid) based on product category. The document describes this as a `stationCible` field on the Product or Category.

### 4. Kitchen Display Screen (KDS)

**KDS** (HIGH confidence — verified: Oracle MICROS, Toast, Lightspeed, WebstaurantStore):
- A screen in the kitchen showing pending KOTs in chronological/priority order
- Layout: ticket cards with table number, cover count, items + modifiers, elapsed time
- Color-coding: green (new), yellow (in progress), red (delayed > threshold)
- Staff "bump" a ticket to advance it to next status
- When status = `PRET`, POS server or front-of-house screen notified
- Real-time updates: server pushes status changes to all KDS screens and waiter tablets

## Architecture Patterns (for describing the extension)

### Entity Extension Strategy — How new entities attach to existing ones

The document must describe this pattern: new restaurant entities extend, not replace, the existing VelociPOS entities.

```
Existing entities (unchanged):
- Store         → receives a new hasRestaurantMode: bool flag
- Terminal      → receives a new type: enum('POS', 'KDS', 'WAITER') field
- Order         → receives tableId, coverCount, orderType: enum('EMPORTER', 'SUR_PLACE')
- OrderProduct  → receives array of OrderItemModifier references

New entities:
- Zone          → belongs to Store, has name, position (for floor plan)
- RestaurantTable → belongs to Zone, has number, capacity, shape, currentStatus
- ModifierGroup → ManyToMany with Product, has name, minSelections, maxSelections, required
- Modifier      → belongs to ModifierGroup, has name, priceAdjustment
- OrderItemModifier → belongs to OrderProduct, has Modifier reference, priceAtSale snapshot
- KitchenTicket → derived from Order + filtered items, has status, stationCible, timestamps
```

### Real-Time Architecture — Mercure SSE

The project already uses Mercure (Symfony ecosystem standard). The document describes:
- When a waiter fires a KOT, the Symfony backend publishes a Mercure update to topic `/kitchen/tickets`
- All KDS screens (subscribed to that topic via SSE) receive the update instantly
- When kitchen bumps a ticket to `PRET`, Mercure publishes to `/pos/ready-alerts`
- The POS/waiter app receives the alert and shows a notification

```
Waiter app (React)
    → POST /api/kitchen-tickets (fire order)
        → CommandHandler publishes Update to Mercure hub
            → Mercure hub broadcasts to all KDS screens (SSE)
                → KDS React app receives ticket card in real-time

Kitchen staff bumps ticket:
    → PATCH /api/kitchen-tickets/{id}/status
        → CommandHandler publishes Update to Mercure hub
            → Mercure hub broadcasts to /pos/ready-alerts
                → Waiter app shows "Table 5 — Plat prêt" notification
```

### CQRS Commands — matching existing patterns

The existing codebase uses `CreateOrderCommandHandler` pattern. The restaurant extension document should describe:
- `FireKitchenTicketCommand` — triggered by waiter, creates KitchenTicket, publishes Mercure update
- `BumpTicketStatusCommand` — triggered by kitchen staff on KDS, advances status, publishes Mercure update
- `UpdateTableStatusCommand` — triggered on order open/close, updates RestaurantTable.currentStatus

### API Platform Endpoints (hypothetical)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/zones | List floor zones for a store |
| POST | /api/zones | Create zone |
| GET | /api/restaurant-tables | List tables with current status |
| PATCH | /api/restaurant-tables/{id}/status | Update table status |
| GET | /api/modifier-groups | List modifier groups (filterable by product) |
| POST | /api/kitchen-tickets | Fire KOT to kitchen |
| GET | /api/kitchen-tickets | KDS poll endpoint (Mercure preferred) |
| PATCH | /api/kitchen-tickets/{id}/status | Bump ticket status |

### Role-Based Access — extending existing Voter pattern

| Role | Permissions added |
|------|------------------|
| ROLE_VENDEUR | Open/close table orders, fire KOT, view KDS |
| ROLE_MANAGER | All VENDEUR + configure zones, tables, modifier groups |
| ROLE_ADMIN | All + activate/deactivate restaurant mode per store |

## Document Structure (what the plan must produce)

The document to write in plan 08-01 must have this structure:

```
# Extension Restaurant de VelociPOS — Document Technique
## المطعم (Arabic header)

## 1. Introduction et Périmètre
   - Objectif du document
   - Périmètre fonctionnel (ce qui est couvert, ce qui est hors scope)
   - Architecture de référence (résumé du système actuel)

## 2. Extension du Modèle de Données
   ### 2.1 Entités existantes modifiées
   ### 2.2 Nouvelles entités
   ### 2.3 Diagramme entité-relation

## 3. Gestion des Tables / إدارة الطاولات
   ### 3.1 Zones et plan de salle
   ### 3.2 Cycle de vie d'une table (machine à états)
   ### 3.3 Interface de gestion des tables (description UI)
   ### 3.4 Fusion de tables

## 4. Système de Modifiers / نظام الإضافات
   ### 4.1 Structure ModifierGroup / Modifier
   ### 4.2 Affectation aux produits
   ### 4.3 Capture sur commande (OrderItemModifier)
   ### 4.4 Affichage sur ticket cuisine

## 5. Flux de Commande Cuisine (KOT) / تدفق أوامر المطبخ
   ### 5.1 Envoi d'un KOT
   ### 5.2 États du KOT
   ### 5.3 Routage par station
   ### 5.4 Diagramme de séquence (waiter → backend → KDS)

## 6. Écran Cuisine (KDS) / شاشة المطبخ
   ### 6.1 Architecture temps-réel (Mercure SSE)
   ### 6.2 Interface de l'écran cuisine (description)
   ### 6.3 Code couleur et alertes
   ### 6.4 Notification "Plat prêt" vers la salle

## 7. Considérations d'Implémentation Future
   ### 7.1 Migration de base de données
   ### 7.2 Activation par magasin (feature flag)
   ### 7.3 Impact sur les rapports existants
```

## Bilingual Format Pattern

The project uses i18next with `lang.fr.json` and `lang.ar.json`. The document convention for bilingual headings:

```markdown
## 3. Gestion des Tables / إدارة الطاولات

Content in French as primary language. Arabic section headers appear as inline annotations
using the forward-slash separator pattern, matching the project's dual-language identity.
```

This matches the project's established FR/AR display pattern without requiring full Arabic body text (REST-02 says "si applicable" — headers in Arabic with French body is the correct interpretation for a technical specification).

## Common Pitfalls for the Document Writer

### Pitfall 1: Describing Implementation Details as Requirements
**What goes wrong:** The document describes Symfony class names and PHP code instead of architecture concepts.
**How to avoid:** Describe entities, flows, and interfaces at the design level. "Le système utilisera une commande CQRS" not "class FireKitchenTicketCommand extends AbstractCommand."

### Pitfall 2: Missing the State Machine Descriptions
**What goes wrong:** Table status is described as a list of values, not as a state machine with valid transitions.
**How to avoid:** Every stateful entity (RestaurantTable, KitchenTicket) must have an explicit state diagram showing which transitions are allowed and what triggers each transition.

### Pitfall 3: Omitting the Modifier-to-Kitchen-Ticket Connection
**What goes wrong:** Modifiers are described for the POS input screen but the document does not show how they appear on the KOT/KDS.
**How to avoid:** Include a concrete example showing a KOT ticket with modifiers fully rendered: "Table 4 — Burger x2 | Cuisson: A point | Sans oignon."

### Pitfall 4: Vague Real-Time Description
**What goes wrong:** "Le KDS affiche les commandes en temps réel" without explaining the mechanism.
**How to avoid:** Name Mercure SSE explicitly, show the publish/subscribe topic structure, and describe what data payload is pushed.

### Pitfall 5: Disconnection from Existing Entities
**What goes wrong:** The document describes a parallel restaurant system that ignores the existing `Order`, `OrderProduct`, `Store`, `Terminal` entities.
**How to avoid:** Every section must anchor back to existing entities. "La commande restaurant est une extension de l'entité `Order` existante, enrichie de `tableId` et `coverCount`."

## Code Examples (Entity Designs for Documentation Reference)

These are for the document writer to reference when describing entity structures — they describe the design intent, not actual PHP code to include.

### RestaurantTable Entity Design
```
RestaurantTable:
  id: integer (PK)
  zone: Zone (ManyToOne)
  numero: integer          -- table number displayed in UI
  capaciteMin: integer     -- minimum covers
  capaciteMax: integer     -- maximum covers
  forme: enum(RONDE, CARREE, RECTANGULAIRE)
  statut: enum(LIBRE, OCCUPEE, ADDITION_DEMANDEE)
  ordreActuel: Order (nullable, OneToOne) -- FK to existing Order entity
  createdAt, updatedAt (TimestampableTrait)
```

### ModifierGroup + Modifier Design
```
ModifierGroup:
  id: integer (PK)
  nom: string
  selectionsMin: integer   -- 0 = optional
  selectionsMax: integer   -- null = unlimited
  requis: boolean
  produits: Product[] (ManyToMany -- existing Product entity)

Modifier:
  id: integer (PK)
  groupe: ModifierGroup (ManyToOne)
  nom: string
  ajustementPrix: decimal(10,2) -- can be 0, positive, or negative
  isActif: boolean
```

### OrderItemModifier Design (extends existing OrderProduct)
```
OrderItemModifier:
  id: integer (PK)
  orderProduct: OrderProduct (ManyToOne -- existing entity)
  modifier: Modifier (ManyToOne)
  prixAuMomentVente: decimal(10,2) -- snapshot, same pattern as costAtSale
  nomSnapshot: string              -- denormalized name, survives modifier rename/delete
```

### KitchenTicket Design
```
KitchenTicket:
  id: integer (PK)
  order: Order (ManyToOne -- existing entity)
  statut: enum(RECU, EN_PREPARATION, PRET, LIVRE)
  stationCible: string          -- ex: "Grill", "Froid", "Bar"
  dateEnvoi: datetime
  datePreparationDebut: datetime (nullable)
  datePret: datetime (nullable)
  dateLivraison: datetime (nullable)
  items: KitchenTicketItem[]    -- denormalized snapshot at fire time

KitchenTicketItem (value object / embedded):
  produitNom: string
  quantite: decimal
  modifiers: string[]  -- ["Cuisson: A point", "Sans oignon"]
```

### Table Status State Machine
```
States:      LIBRE ──────────────────────────────────────────────────────┐
              │                                                            │
Trigger:    "Ouvrir table"                                          "Clôturer vente"
              │                                                            │
             OCCUPEE                                                       │
              │                                                            │
Trigger:    "Demander addition"                                           │
              │                                                            │
             ADDITION_DEMANDEE ──"Clôturer vente"───────────────────────►LIBRE
```

### KOT Status State Machine
```
States:      RECU ─"Commencer préparation"─► EN_PREPARATION ─"Marquer prêt"─► PRET ─"Livrer"─► LIVRE
              │                                                                   │
         (affichage vert)                                                  (notification POS)
         (KDS reçoit Mercure update)                                       (Mercure update /pos/ready-alerts)
```

## State of the Art

| Old Approach | Current Approach | Impact on Document |
|--------------|------------------|-------------------|
| Kitchen printer (paper tickets) | KDS touchscreen with bump | Document must describe KDS as the modern standard, not paper tickets |
| Polling for order updates | Mercure SSE (already in stack) | Document can reference Mercure directly — it's the project's existing real-time transport |
| Hardcoded modifiers in product description | ModifierGroup/Modifier entity hierarchy | Document shows structured data model, not free-text customization |
| Single-status order | KOT lifecycle with station routing | Document shows multi-step kitchen workflow |

## Open Questions

1. **How many modifier levels?**
   - What we know: Industry supports nested modifiers (Otter: "Nested Modifiers" feature). Toast supports `ModifierGroup` within `ModifierGroup`.
   - What's unclear: Whether the academic document should describe single-level or nested modifier groups.
   - Recommendation: Describe single-level (one ModifierGroup per product, flat list of Modifiers) for simplicity. Note nested modifiers as a future extension.

2. **Split ticket between kitchen stations**
   - What we know: Restaurants route items to different stations (grill sends steak, froid sends salad).
   - What's unclear: Whether the document should describe station-level KDS screens (one per station) or a single KDS screen for the whole kitchen.
   - Recommendation: Describe the simpler case (one unified KDS) as the baseline, with station routing as a configurable advanced option.

3. **Floor plan visualization technology**
   - What we know: The React frontend uses TailwindCSS + Ant Design. Building an SVG floor plan editor is substantial work.
   - What's unclear: Whether the document should describe a full drag-and-drop floor plan editor or a simpler list-based table management UI.
   - Recommendation: Describe a list-based table management UI (tables in a zone listed as cards) as the implementation, and note that a graphical floor plan is a possible future enhancement. This keeps the document grounded in what's achievable.

## Sources

### Primary (HIGH confidence)
- Toast API — ModifierGroup schema definition verified: https://doc.toasttab.com/openapi/menusv3/tag/Data-definitions/schema/ModifierGroup/
- Symfony Mercure documentation (current): https://symfony.com/doc/current/mercure.html
- Vertabelo / Red Gate — Restaurant data model (KOT, dine_in_table_sitting entities): https://www.red-gate.com/blog/serving-delicious-food-and-data-a-data-model-for-restaurants/

### Secondary (MEDIUM confidence)
- Oracle KDS documentation — KDS architecture, bump workflow, station routing: https://www.oracle.com/food-beverage/restaurant-pos-systems/kds-kitchen-display-systems/
- Lightspeed — Floor plan zone/table management: https://k-series-support.lightspeedhq.com/hc/en-us/articles/1260804656709
- Square for Restaurants — Modifier group structure: https://squareup.com/help/us/en/article/6426-modifiers-and-categories-with-square-for-restaurants
- Quantic POS — Modifier/group definitions: https://getquantic.com/support/modifiers-groups-and-modifiers-fs/
- GeeksforGeeks — Restaurant Management System design: https://www.geeksforgeeks.org/system-design/design-restaurant-management-system-system-design/
- WebstaurantStore — KDS guide: https://www.webstaurantstore.com/article/1002/kitchen-display-systems.html

### Tertiary (LOW confidence)
- WebSearch results on KDS status flow (New → Preparing → Ready → Completed): multiple commercial vendor sites, not independently verified against a single authoritative spec

## Metadata

**Confidence breakdown:**
- Restaurant industry concepts (table management, modifiers, KDS): HIGH — verified across multiple major POS vendors
- Mercure SSE real-time architecture: HIGH — official Symfony docs
- Entity extension design: HIGH — directly derived from reading existing VelociPOS entity code
- Document structure/format: MEDIUM — derived from technical writing best practices + academic document conventions
- Bilingual (FR/AR) heading pattern: HIGH — matches existing project i18n pattern in lang.fr.json / lang.ar.json

**Research date:** 2026-02-19
**Valid until:** Stable domain — 90 days (restaurant POS patterns do not change rapidly)
