# VelociPOS - Pointe de Vente

## What This Is

Système de Point de Vente (POS) complet pour boutiques et restaurants en Mauritanie. Application web dual : une interface caissier tactile pour les ventes quotidiennes et un tableau de bord admin pour la gestion (produits, stock, rapports, utilisateurs). Backend Symfony + API REST, frontend React bilingue (français/arabe).

## Core Value

Le caissier peut enregistrer une vente rapidement et de manière fiable, avec un suivi précis du stock et des bénéfices pour le gérant.

## Requirements

### Validated

- ✓ Authentification JWT (login/logout, tokens persistants) — existing
- ✓ Gestion des produits (CRUD, variantes, prix, codes-barres, images) — existing
- ✓ Gestion des catégories et marques — existing
- ✓ Interface POS avec panier (ajout, quantité, remise, taxe) — existing
- ✓ Calcul automatique des totaux (sous-total, taxes, remises) — existing
- ✓ Enregistrement des commandes avec détails (produits, paiements, taxes) — existing
- ✓ Gestion des clients (CRUD, historique) — existing
- ✓ Gestion des fournisseurs et achats (Purchase, PurchaseOrder) — existing
- ✓ Gestion du stock par magasin (ProductStore, ProductInventory) — existing
- ✓ Gestion des dépenses (Expense) — existing
- ✓ Clôture de caisse basique (Closing) — existing
- ✓ Types de paiement configurables (Payment) — existing
- ✓ Multi-magasin et multi-terminal — existing
- ✓ Rapports basiques (ventes, bénéfice, journalier) — existing
- ✓ Internationalisation FR/AR (i18next) — existing
- ✓ Cache offline produits (localforage/IndexedDB) — existing
- ✓ Recherche produits floue (Fuse.js) — existing
- ✓ Clavier virtuel tactile — existing
- ✓ API Platform + endpoints REST custom — existing

### Active

- [ ] Rôles et permissions (VENDEUR, MANAGER, ADMIN)
- [ ] PMP/CMAP automatique (recalcul à chaque achat)
- [ ] Alertes stock bas (seuil configurable, badge POS)
- [ ] Rapports complets (par catégorie, par vendeur, panier moyen, top produits)
- [ ] Rapport Z professionnel (cycle 24h, standard caisse)
- [ ] Paiements pré-configurés Mauritanie (Espèces, Bankily, Masrivi, Sedad, Crédit)
- [ ] Refonte UI POS professionnelle (design moderne, tactile-friendly)
- [ ] Refonte UI Admin (dashboard KPIs, graphiques rapports)
- [ ] Affichage professionnel des images produits
- [ ] Alertes stock visibles dans le POS
- [ ] PMP visible (fiche produit + rapports bénéfice)
- [ ] Traduction arabe complète (tous les écrans)
- [ ] Documentation extension restaurant (tables, modifiers, écran cuisine)

### Out of Scope

- Extension restaurant réelle — documenter seulement, ne PAS implémenter
- Application mobile native — web-first suffit, l'interface est tactile
- OAuth / SSO — email/password suffit pour le contexte mauritanien
- Chat en temps réel — pas pertinent pour un POS
- Notifications push — pas nécessaire pour v1
- Tests unitaires complets — hors périmètre superviseur (structure de test existante suffit)

## Context

- Projet académique à finaliser pour présentation au responsable/superviseur
- Le code existant est fonctionnel mais incomplet sur les 8 sections du cahier des charges
- Le superviseur a demandé des fonctionnalités supplémentaires : PMP, Rapport Z, rôles, alertes stock
- Le marché cible (Mauritanie) utilise des moyens de paiement mobiles : Bankily, Masrivi, Sedad
- L'interface doit être professionnelle et comparable aux solutions comme Square, Toast, Lightspeed
- Le support RTL (arabe) est partiellement implémenté mais pas complet
- Le calcul PMP existe partiellement dans `PurchaseEvent.php` mais n'est pas exposé

## Constraints

- **Tech stack**: Symfony 5.4 + React 18 + MariaDB (existant, pas de migration)
- **Docker**: Backend sur PHP-FPM + Nginx + MariaDB (docker-compose existant)
- **Patterns**: CQRS obligatoire pour le backend (convention établie)
- **i18n**: FR (défaut) + AR (RTL) — toutes les interfaces
- **API**: REST via `/api/admin/*` pour les endpoints custom, API Platform pour le CRUD auto
- **Auth**: JWT via LexikJWT, tokens stockés en cookies côté frontend
- **Présentation**: Le projet doit être présentable et professionnel

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 3 rôles : VENDEUR, MANAGER, ADMIN | Séparation claire des responsabilités par profil | — Pending |
| PMP recalcul automatique à chaque achat | Formule standard : (ancien_stock × ancien_PMP + qté × prix) / stock_total | — Pending |
| Paiements mobiles mauritaniens pré-configurés | Marché local : Bankily, Masrivi, Sedad sont standards | — Pending |
| Alertes stock : badge POS + seuil configurable (défaut 10) | Superviseur veut alertes visuelles dans le POS | — Pending |
| Recherche design POS moderne (Square/Toast/Lightspeed) | Refonte UI professionnelle demandée | — Pending |
| Restaurant = documentation seulement | Superviseur veut voir la réflexion, pas l'implémentation | — Pending |
| Ne jamais inclure Co-Authored-By dans les commits | Préférence utilisateur explicite | ✓ Good |

---
*Last updated: 2026-02-17 after initialization*
