# Version Restaurant - Spécifications Techniques

## 1. Vue d'ensemble

La version restaurant du POS étend le système de point de vente existant avec des fonctionnalités spécifiques à la restauration : gestion des tables, commandes par table, personnalisation des plats, envoi en cuisine et gestion de salle.

### Architecture proposée

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Plan de   │  │ Commande │  │ Écran Cuisine │ │
│  │ salle     │  │ par table│  │ (KDS)         │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
├─────────────────────────────────────────────────┤
│                   Backend API                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Tables   │  │ Modifiers│  │ KDS WebSocket │ │
│  │ CRUD     │  │ Engine   │  │ Events        │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
├─────────────────────────────────────────────────┤
│              Base de données                     │
│  RestaurantTable, TableZone, OrderModifier,     │
│  KitchenOrder, KitchenStation                   │
└─────────────────────────────────────────────────┘
```

---

## 2. Gestion des tables

### 2.1 Entités

#### RestaurantTable
| Champ | Type | Description |
|---|---|---|
| id | int | Identifiant unique |
| name | string | Nom de la table (ex: "Table 1", "Terrasse 3") |
| zone | ManyToOne(TableZone) | Zone/étage de la table |
| seats | int | Nombre de places |
| posX | float | Position X sur le plan (pourcentage) |
| posY | float | Position Y sur le plan (pourcentage) |
| shape | enum(round, square, rectangle) | Forme de la table |
| status | enum(free, occupied, reserved, dirty) | État actuel |
| currentOrder | ManyToOne(Order) | Commande en cours |
| store | ManyToOne(Store) | Magasin/restaurant |

#### TableZone
| Champ | Type | Description |
|---|---|---|
| id | int | Identifiant unique |
| name | string | Nom de la zone (ex: "Salle principale", "Terrasse", "Étage 1") |
| store | ManyToOne(Store) | Magasin/restaurant |
| sortOrder | int | Ordre d'affichage |

### 2.2 API Endpoints

```
GET    /api/restaurant/tables           # Liste des tables avec statut
POST   /api/restaurant/tables           # Créer une table
PUT    /api/restaurant/tables/{id}      # Modifier une table
DELETE /api/restaurant/tables/{id}      # Supprimer une table
PATCH  /api/restaurant/tables/{id}/status  # Changer le statut

GET    /api/restaurant/zones            # Liste des zones
POST   /api/restaurant/zones            # Créer une zone
PUT    /api/restaurant/zones/{id}       # Modifier une zone
DELETE /api/restaurant/zones/{id}       # Supprimer une zone

POST   /api/restaurant/tables/{id}/merge/{targetId}   # Fusionner deux tables
POST   /api/restaurant/tables/{id}/transfer/{targetId} # Transférer vers une autre table
POST   /api/restaurant/tables/{id}/split               # Séparer une table fusionnée
```

### 2.3 Interface - Plan de salle

L'interface plan de salle affiche une vue graphique des tables avec :
- Drag & drop pour positionner les tables (mode édition admin)
- Indicateurs de couleur par statut :
  - Vert : libre
  - Rouge : occupée
  - Orange : réservée
  - Gris : à nettoyer
- Affichage du montant en cours sur chaque table occupée
- Clic sur une table = ouvrir/créer la commande
- Filtrage par zone (onglets en haut)

---

## 3. Commande par table

### 3.1 Flux de commande

```
Sélectionner table → Ajouter des produits → Personnaliser (modifiers)
    → Envoyer en cuisine → Ajouter d'autres produits → Encaisser
```

### 3.2 Modifications par rapport au POS actuel

Le module `Order` existant doit être étendu :

```php
// Ajouts à l'entité Order
class Order {
    // ... champs existants ...

    #[ORM\ManyToOne(targetEntity: RestaurantTable::class)]
    private ?RestaurantTable $table = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $guestCount = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $waiterName = null;

    #[ORM\OneToMany(targetEntity: KitchenOrder::class, mappedBy: 'order')]
    private Collection $kitchenOrders;
}
```

### 3.3 Gestion multi-envoi

Une commande de restaurant peut avoir plusieurs envois en cuisine (entrées, puis plats, puis desserts). Chaque envoi est un `KitchenOrder`.

---

## 4. Personnalisation des commandes (Modifiers)

### 4.1 Entités

#### ProductModifierGroup
| Champ | Type | Description |
|---|---|---|
| id | int | Identifiant unique |
| name | string | Nom du groupe (ex: "Cuisson", "Sauce", "Accompagnement") |
| required | bool | Obligatoire avant envoi en cuisine |
| multiSelect | bool | Plusieurs choix possibles |
| minSelections | int | Nombre minimum de sélections (0 = optionnel) |
| maxSelections | int | Nombre maximum de sélections (0 = illimité) |

#### ProductModifier
| Champ | Type | Description |
|---|---|---|
| id | int | Identifiant unique |
| name | string | Nom du modifier (ex: "Saignant", "Sans oignon", "Frites") |
| group | ManyToOne(ProductModifierGroup) | Groupe parent |
| priceAdjustment | decimal | Ajustement de prix (ex: +500 MRU pour supplément fromage) |

#### Relation Product ↔ ModifierGroup
- `Product` a une relation ManyToMany avec `ProductModifierGroup`
- Un produit "Burger" peut avoir les groupes : "Cuisson", "Sauce", "Supplément"

#### OrderProductModifier
| Champ | Type | Description |
|---|---|---|
| id | int | Identifiant unique |
| orderProduct | ManyToOne(OrderProduct) | Ligne de commande |
| modifier | ManyToOne(ProductModifier) | Modifier sélectionné |
| quantity | int | Quantité (défaut 1) |

### 4.2 Interface de personnalisation

Quand un produit avec modifiers est ajouté au panier :
1. Un modal s'ouvre automatiquement
2. Affiche les groupes de modifiers du produit
3. L'utilisateur sélectionne les options
4. Le prix est mis à jour en temps réel
5. Les modifiers s'affichent sous le nom du produit dans le panier

Exemple d'affichage panier :
```
Burger Classic                    2,500 MRU
  → Cuisson: Saignant
  → Sans oignon
  → Supplément fromage           +500 MRU
```

### 4.3 API Endpoints

```
GET    /api/modifier-groups              # Liste des groupes
POST   /api/modifier-groups              # Créer un groupe
PUT    /api/modifier-groups/{id}         # Modifier un groupe
DELETE /api/modifier-groups/{id}         # Supprimer un groupe

GET    /api/modifiers                    # Liste des modifiers
POST   /api/modifiers                    # Créer un modifier
PUT    /api/modifiers/{id}              # Modifier
DELETE /api/modifiers/{id}              # Supprimer
```

---

## 5. Envoi en cuisine (KDS - Kitchen Display System)

### 5.1 Entités

#### KitchenStation
| Champ | Type | Description |
|---|---|---|
| id | int | Identifiant unique |
| name | string | Nom du poste (ex: "Grill", "Friteuse", "Bar", "Desserts") |
| categories | ManyToMany(Category) | Catégories de produits gérées |
| store | ManyToOne(Store) | Restaurant |

#### KitchenOrder
| Champ | Type | Description |
|---|---|---|
| id | int | Identifiant unique |
| order | ManyToOne(Order) | Commande parent |
| station | ManyToOne(KitchenStation) | Poste de cuisine |
| items | OneToMany(KitchenOrderItem) | Articles à préparer |
| status | enum(pending, preparing, ready, served) | État |
| sentAt | datetime | Heure d'envoi |
| preparedAt | datetime | Heure de préparation |
| servedAt | datetime | Heure de service |
| priority | int | Priorité (1=urgent, 5=normal) |

#### KitchenOrderItem
| Champ | Type | Description |
|---|---|---|
| id | int | Identifiant unique |
| kitchenOrder | ManyToOne(KitchenOrder) | Envoi parent |
| orderProduct | ManyToOne(OrderProduct) | Ligne de commande |
| quantity | int | Quantité |
| notes | text | Notes spéciales |
| status | enum(pending, preparing, ready) | État par article |

### 5.2 Flux cuisine

```
1. Serveur ajoute produits à la commande de la table
2. Serveur clique "Envoyer en cuisine"
3. Le système distribue automatiquement les articles vers les postes concernés
   (basé sur les catégories des produits → KitchenStation)
4. L'écran cuisine affiche les commandes par poste
5. Le cuisinier marque les articles comme "prêt"
6. Quand tous les articles d'un envoi sont prêts → notification au serveur
7. Le serveur marque comme "servi"
```

### 5.3 Interface KDS (Kitchen Display System)

L'écran cuisine est une interface distincte, accessible sur tablette/écran dédié :

- URL : `/kitchen/{stationId}`
- Affiche les tickets de commande en colonnes chronologiques
- Chaque ticket contient :
  - Numéro de table
  - Heure d'envoi + chronomètre
  - Liste des articles avec modifiers
  - Notes spéciales en rouge
- Code couleur du chronomètre :
  - Vert : < 10 min
  - Orange : 10-20 min
  - Rouge : > 20 min
- Actions : "En préparation", "Prêt", "Rappel" (re-imprimer ticket)
- Communication en temps réel via WebSocket (Mercure ou Socket.io)

### 5.4 API Endpoints

```
POST   /api/kitchen/send                 # Envoyer une commande en cuisine
GET    /api/kitchen/stations/{id}/orders  # Commandes d'un poste
PATCH  /api/kitchen/orders/{id}/status    # Mettre à jour le statut
GET    /api/kitchen/orders/{id}           # Détail d'un envoi
```

### 5.5 WebSocket Events

```
kitchen.order.new      → Nouvelle commande reçue au poste
kitchen.order.updated  → Statut mis à jour
kitchen.order.urgent   → Commande marquée urgente
kitchen.order.recall   → Rappel de commande
table.status.changed   → Statut de table modifié (visible sur le plan)
```

---

## 6. Fonctionnalités avancées

### 6.1 Fusion de tables

Quand des clients veulent s'installer ensemble :
1. Sélectionner la table source
2. Cliquer "Fusionner"
3. Sélectionner la table de destination
4. Les commandes sont combinées en une seule
5. Les deux tables apparaissent comme un bloc sur le plan

### 6.2 Transfert de table

Pour déplacer des clients vers une autre table :
1. Sélectionner la table source
2. Cliquer "Transférer"
3. Sélectionner la table libre de destination
4. La commande est déplacée, l'ancienne table passe en "à nettoyer"

### 6.3 Division de l'addition

Options de paiement pour les tables :
- **Paiement total** : un seul client paie tout
- **Division égale** : montant / nombre de convives
- **Division par article** : chaque convive choisit ses articles
- **Montant libre** : chaque convive paie un montant choisi

### 6.4 Ticket par table

Le ticket restaurant contient des informations supplémentaires :
- Numéro de table
- Nom du serveur
- Nombre de couverts
- Détail par envoi (entrées, plats, desserts séparés)
- Heure de chaque envoi

---

## 7. Estimation de l'effort

| Module | Complexité | Estimation |
|---|---|---|
| Entités & migrations | Moyenne | - |
| API tables & zones | Faible | - |
| Plan de salle (drag & drop) | Haute | - |
| Modifiers (backend + frontend) | Haute | - |
| KDS basique (sans WebSocket) | Moyenne | - |
| KDS avec WebSocket temps réel | Haute | - |
| Fusion/transfert de tables | Moyenne | - |
| Division de l'addition | Haute | - |
| Ticket restaurant | Faible | - |

### Ordre de développement recommandé

1. **Tables & Zones** - Entités, CRUD, API
2. **Plan de salle** - Interface graphique avec statuts
3. **Commande par table** - Extension du module Order existant
4. **Modifiers** - Personnalisation des produits
5. **KDS basique** - Envoi en cuisine sans temps réel
6. **KDS temps réel** - WebSocket avec Mercure
7. **Fonctionnalités avancées** - Fusion, transfert, division

---

## 8. Dépendances techniques

### Backend
- **Mercure** (recommandé) ou **Socket.io** pour le temps réel KDS
- **Symfony Mercure Bundle** pour l'intégration Symfony
- Pas de nouvelle dépendance majeure côté API

### Frontend
- **react-dnd** ou **@dnd-kit** pour le drag & drop du plan de salle
- **Reconnecting WebSocket** client pour le KDS
- Pas de librairie lourde supplémentaire nécessaire

### Infrastructure
- Hub Mercure (conteneur Docker) pour le WebSocket
- Écran/tablette dédié pour le KDS (navigateur web standard)
