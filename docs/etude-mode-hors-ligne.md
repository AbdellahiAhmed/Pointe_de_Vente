# Etude de Faisabilité Technique : Mode Hors-Ligne et Accès à Distance du Système POS

**Projet :** Pointe de Vente — Système de caisse pour boutiques, restaurants et cafés en Mauritanie

**Date :** 23 février 2026

**Préparé par :** Équipe technique Pointe de Vente

**Destinataire :** Superviseur de projet

---

## 1. Contexte et Problématique

Le système Pointe de Vente est actuellement déployé avec une architecture web classique :

- **Backend :** Symfony 5.4 avec API Platform (serveur PHP-FPM + Nginx)
- **Frontend :** React 18 avec Vite et TailwindCSS
- **Base de données :** MariaDB dans un environnement Docker
- **Devise :** MRU (Ouguiya mauritanien)

**Le problème principal** : la connexion Internet en Mauritanie est instable. Des coupures fréquentes empêchent les vendeurs d'enregistrer les ventes, ce qui entraîne des pertes de données et des interruptions de service. Par ailleurs, le superviseur et les gérants ont besoin de consulter les ventes, les statistiques et l'état du stock à distance, même en déplacement.

**Les deux besoins fondamentaux sont donc :**

1. **Fonctionnement local sans Internet** — le point de vente doit continuer à fonctionner même en cas de coupure.
2. **Accès à distance** — consulter les rapports, les ventes et le stock depuis n'importe quel endroit disposant d'une connexion.
3. **Synchronisation automatique** — quand Internet revient, les données locales doivent se synchroniser automatiquement avec le serveur central.
4. **Support multi-clients** — le système doit pouvoir gérer plusieurs boutiques ou entreprises indépendantes.

---

## 2. État Actuel du Système

Avant d'évaluer les solutions, il est important de noter ce qui existe déjà dans notre système :

| Composant | État actuel | Commentaire |
|---|---|---|
| Application React (Frontend) | Fonctionnelle | Interface de caisse et back-office |
| API Symfony (Backend) | Fonctionnelle | Gère les ventes, produits, stock, utilisateurs |
| Base de données MariaDB | Fonctionnelle | Stockage centralisé de toutes les données |
| LocalForage (IndexedDB) | Déjà intégré | Le frontend utilise déjà IndexedDB pour mettre en cache les données produits |
| HTTPS / Nom de domaine | Non encore configuré | Nécessaire pour l'accès à distance sécurisé |
| Service Worker (hors-ligne) | Non encore implémenté | Nécessaire pour le mode hors-ligne complet |

**Point clé :** Environ 60 % de l'infrastructure nécessaire pour le mode hors-ligne est déjà en place. Le frontend stocke déjà des données localement via IndexedDB (localforage). Il reste à ajouter la couche de mise en cache de l'application elle-même et la file d'attente de synchronisation.

---

## 3. Les Trois Options Étudiées

### 3.1 Option A : PWA avec File de Synchronisation (RECOMMANDÉE)

#### Principe

Une **PWA** (Progressive Web App) est une application web qui se comporte comme une application native. Elle peut fonctionner sans Internet en stockant l'application et les données directement dans le navigateur.

```
┌─────────────────────────────────────────────────────┐
│                   NAVIGATEUR WEB                     │
│                                                      │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │  Application │  │   Stockage Local (IndexedDB) │  │
│  │  React (POS) │  │                              │  │
│  │  mise en     │  │  • Produits & catégories     │  │
│  │  cache par   │  │  • Ventes en attente         │  │
│  │  Service     │  │  • Stock local               │  │
│  │  Worker      │  │  • File de synchronisation   │  │
│  └──────┬───────┘  └──────────────┬───────────────┘  │
│         │                         │                   │
└─────────┼─────────────────────────┼───────────────────┘
          │                         │
          │    ┌──────────────┐     │
          │    │  INTERNET    │     │
          │    │  (quand      │     │
          └────┤  disponible) ├─────┘
               └──────┬───────┘
                      │
          ┌───────────┴───────────┐
          │   SERVEUR CENTRAL     │
          │   (Cloud / VPS)       │
          │                       │
          │  • Symfony API        │
          │  • MariaDB            │
          │  • Accès HTTPS        │
          │  • Rapports & Stats   │
          └───────────────────────┘
```

#### Comment cela fonctionne concrètement

**Étape 1 — Mise en cache de l'application (Service Worker)**

Lors de la première connexion, le navigateur télécharge et stocke toute l'application (pages, images, scripts). Ensuite, même sans Internet, l'application se lance normalement depuis le cache local.

**Étape 2 — Stockage des données hors-ligne (IndexedDB)**

Les données essentielles (produits, catégories, prix, stock) sont stockées dans IndexedDB, une base de données intégrée au navigateur. Notre système utilise déjà `localforage` pour cela — il suffit d'étendre son utilisation aux ventes.

**Étape 3 — File d'attente de synchronisation**

Quand un vendeur enregistre une vente sans Internet :
1. La vente est enregistrée localement dans IndexedDB avec un horodatage précis.
2. Elle est ajoutée à une **file d'attente de synchronisation**.
3. Un indicateur visuel montre au vendeur que la vente est "en attente de synchronisation".

**Étape 4 — Synchronisation automatique (Background Sync API)**

Dès que la connexion Internet revient :
1. Le navigateur détecte automatiquement le retour d'Internet.
2. Les ventes en attente sont envoyées une par une au serveur central.
3. Chaque vente confirmée par le serveur est retirée de la file d'attente.
4. Le stock local est mis à jour avec les données du serveur.

**Étape 5 — Accès à distance**

Le serveur central est accessible via un nom de domaine sécurisé (HTTPS). Le superviseur peut consulter les ventes, rapports et statistiques depuis n'importe quel appareil connecté à Internet.

#### Gestion des conflits

Un cas important : que se passe-t-il si deux vendeurs modifient le même stock en même temps, chacun hors-ligne ?

- Chaque transaction porte un horodatage précis (date et heure de la vente).
- Le serveur traite les ventes dans l'ordre chronologique.
- Si un conflit de stock survient (par exemple, un produit est vendu deux fois alors qu'il n'en restait qu'un), le serveur signale le problème et le manager peut le résoudre.
- La règle générale : **la dernière écriture gagne**, mais les alertes sont enregistrées pour vérification.

#### Avantages

- **Aucune installation locale nécessaire** — fonctionne dans un navigateur standard (Chrome, Firefox, Edge).
- **Fonctionne sur tout appareil** — ordinateur, tablette, téléphone.
- **60 % de l'infrastructure existe déjà** — localforage est en place, l'API est fonctionnelle.
- **Coût de déploiement très faible** — un seul serveur central suffit pour plusieurs clients.
- **Mises à jour automatiques** — toute modification du système est propagée automatiquement aux points de vente.
- **Installation simple** — le vendeur ouvre une URL et l'application s'installe comme une application sur son appareil.

#### Limites

- **Capacité de stockage du navigateur** : entre 50 Mo et 100 Mo selon le navigateur et l'appareil. C'est largement suffisant pour les données textuelles (produits, ventes), mais les images de produits en haute résolution devront être optimisées.
- **Navigateur moderne requis** : Chrome 49+, Firefox 44+, Edge 17+, Safari 11.1+. Les navigateurs très anciens ne sont pas compatibles.
- **Pas de base de données SQL complète** : les requêtes complexes (rapports détaillés avec jointures multiples) doivent être effectuées côté serveur. Le POS en mode hors-ligne gère uniquement la saisie de ventes et la consultation du catalogue.

---

### 3.2 Option B : Réplication MariaDB Master-Slave

#### Principe

Installer un serveur MariaDB complet dans chaque boutique, qui se synchronise avec un serveur central dans le cloud.

```
┌─────────────────┐       ┌─────────────────┐
│  BOUTIQUE 1     │       │  BOUTIQUE 2     │
│                 │       │                 │
│  ┌───────────┐  │       │  ┌───────────┐  │
│  │ MariaDB   │  │       │  │ MariaDB   │  │
│  │ (Esclave) │  │       │  │ (Esclave) │  │
│  └─────┬─────┘  │       │  └─────┬─────┘  │
│        │        │       │        │        │
│  ┌─────┴─────┐  │       │  ┌─────┴─────┐  │
│  │ Symfony   │  │       │  │ Symfony   │  │
│  │ + Nginx   │  │       │  │ + Nginx   │  │
│  └───────────┘  │       │  └───────────┘  │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │    ┌──────────────┐     │
         └────┤   INTERNET   ├─────┘
              └──────┬───────┘
                     │
         ┌───────────┴───────────┐
         │   SERVEUR CENTRAL     │
         │   (Cloud / VPS)       │
         │                       │
         │  MariaDB (Maître)     │
         │  Symfony API          │
         │  Rapports & Stats     │
         └───────────────────────┘
```

#### Avantages

- **Performance maximale** : toutes les données sont accessibles localement sans aucune latence.
- **Pas de limite de stockage** : la base de données locale peut contenir l'intégralité des données (historique complet, images, etc.).
- **Requêtes SQL complètes** : tous les rapports et statistiques peuvent être générés localement.

#### Limites

- **Installation physique requise** : chaque boutique nécessite un serveur local (mini-PC ou ordinateur dédié) avec Docker, MariaDB, PHP, Nginx.
- **Administration complexe** : la réplication MariaDB nécessite une configuration précise et une surveillance constante. Les pannes de réplication sont fréquentes et difficiles à diagnostiquer à distance.
- **Coût élevé par client** : matériel + installation + maintenance pour chaque boutique.
- **Mises à jour manuelles** : chaque mise à jour du système doit être déployée individuellement sur chaque serveur local.
- **Conflits de réplication** : la réplication master-slave ne gère pas bien les écritures simultanées depuis plusieurs points. Il faudrait passer en mode master-master, ce qui est encore plus complexe.
- **Expertise technique locale nécessaire** : en cas de problème, un technicien doit intervenir physiquement ou à distance sur le serveur de la boutique.

---

### 3.3 Option C : Hybride (PWA pour le POS + Synchronisation API complète)

#### Principe

Combiner les avantages de l'Option A et de l'Option B :
- Le **point de vente (POS)** fonctionne en mode PWA (comme l'Option A) pour les opérations quotidiennes.
- Une **synchronisation API périodique** transfère l'intégralité des données (historique complet, images, rapports détaillés) vers le serveur central.

#### Avantages

- **Le meilleur des deux mondes** : simplicité de la PWA pour les ventes quotidiennes, complétude des données sur le serveur central.
- **Rapports complets à distance** : le serveur central dispose de toutes les données pour générer des rapports détaillés.

#### Limites

- **Complexité de développement** : il faut développer et maintenir deux systèmes de synchronisation (temps réel pour les ventes, périodique pour les données complètes).
- **Temps de développement plus long** : environ 50 % de travail supplémentaire par rapport à l'Option A seule.
- **Avantage marginal** : dans la pratique, l'Option A avec une synchronisation bien conçue couvre déjà 95 % des besoins.

---

## 4. Comparaison des Options

| Critère | Option A (PWA) | Option B (Réplication) | Option C (Hybride) |
|---|---|---|---|
| **Fonctionnement hors-ligne** | Oui (ventes + catalogue) | Oui (complet) | Oui (ventes + catalogue) |
| **Accès à distance** | Oui (serveur central) | Oui (serveur central) | Oui (serveur central) |
| **Synchronisation auto** | Oui (Background Sync) | Oui (réplication MySQL) | Oui (double mécanisme) |
| **Multi-clients** | Facile (un serveur central) | Complexe (un serveur/client) | Facile (un serveur central) |
| **Installation par client** | Aucune (navigateur) | Serveur local complet | Aucune (navigateur) |
| **Coût par client** | ~0 MRU | ~15 000 - 25 000 MRU | ~0 MRU |
| **Coût serveur central (VPS)** | ~3 000 MRU/mois | ~3 000 MRU/mois | ~3 000 MRU/mois |
| **Complexité d'administration** | Faible | Élevée | Moyenne |
| **Mises à jour** | Automatiques | Manuelles par site | Automatiques |
| **Temps de développement** | 4-6 semaines | 8-12 semaines | 6-8 semaines |
| **Infrastructure existante** | ~60 % en place | ~20 % en place | ~60 % en place |
| **Limite de stockage local** | 50-100 Mo (navigateur) | Illimitée (disque dur) | 50-100 Mo (navigateur) |
| **Adapté au contexte mauritanien** | Excellent | Difficile | Bon |

---

## 5. Estimation des Coûts

### 5.1 Coûts de Développement (une seule fois)

| Poste | Option A (PWA) | Option B (Réplication) | Option C (Hybride) |
|---|---|---|---|
| Service Worker + cache | 1 semaine | — | 1 semaine |
| File de synchronisation (IndexedDB) | 1-2 semaines | — | 1-2 semaines |
| Background Sync + gestion des conflits | 1-2 semaines | — | 1-2 semaines |
| Indicateurs visuels (statut réseau, file d'attente) | 3-4 jours | — | 3-4 jours |
| Configuration réplication MariaDB | — | 2-3 semaines | — |
| API de synchronisation complète | — | 1 semaine | 2 semaines |
| Installation et configuration Docker par site | — | 1-2 jours/site | — |
| Tests et validation | 1 semaine | 2 semaines | 1,5 semaines |
| Configuration HTTPS + domaine | 2-3 jours | 2-3 jours | 2-3 jours |
| **Total développement** | **4-6 semaines** | **8-12 semaines** | **6-8 semaines** |

### 5.2 Coûts Récurrents (par mois)

| Poste | Option A | Option B | Option C |
|---|---|---|---|
| VPS cloud (serveur central) | ~3 000 MRU | ~3 000 MRU | ~3 000 MRU |
| Nom de domaine + certificat SSL | ~500 MRU/an | ~500 MRU/an | ~500 MRU/an |
| Maintenance serveurs locaux | 0 MRU | ~2 000 MRU/site/mois | 0 MRU |
| **Total mensuel (5 clients)** | **~3 000 MRU** | **~13 000 MRU** | **~3 000 MRU** |

### 5.3 Coûts Matériel par Client

| Poste | Option A | Option B | Option C |
|---|---|---|---|
| Matériel supplémentaire | Aucun | Mini-PC (~20 000 MRU) | Aucun |
| Installation sur site | Aucune | ~5 000 MRU | Aucune |
| **Total par nouveau client** | **0 MRU** | **~25 000 MRU** | **0 MRU** |

---

## 6. Recommandation

### L'Option A (PWA avec File de Synchronisation) est fortement recommandée.

**Justifications :**

1. **Adapté au contexte mauritanien** : aucune infrastructure locale à installer ni à maintenir. Le vendeur utilise simplement son navigateur. C'est crucial dans un contexte où l'assistance technique locale peut être difficile à mobiliser.

2. **Infrastructure déjà en place** : le système utilise déjà `localforage` (IndexedDB) pour mettre en cache les données produits. L'application React est une SPA (Single Page Application) qui se prête naturellement à la conversion en PWA. Le travail restant est estimé à environ 40 % du total.

3. **Coût minimal** : un seul serveur cloud suffit pour tous les clients. Pas d'achat de matériel, pas d'installation physique, pas de maintenance sur site.

4. **Passage à l'échelle** : ajouter un nouveau client revient à créer un compte sur le serveur central. Pas besoin d'envoyer un technicien pour installer un serveur local.

5. **Capacité suffisante** : la limite de 50-100 Mo d'IndexedDB est largement suffisante pour stocker des milliers de produits et des centaines de ventes en attente de synchronisation. Pour référence, 1 000 ventes avec leurs détails occupent environ 2 Mo.

6. **Fiabilité prouvée** : des systèmes de caisse PWA sont utilisés avec succès dans de nombreux pays où la connectivité est similaire à celle de la Mauritanie (Afrique de l'Ouest, Asie du Sud-Est).

---

## 7. Plan de Mise en Oeuvre — Option A

### Phase 1 : Service Worker et Cache de l'Application (Semaine 1)

- Configurer le plugin PWA de Vite (`vite-plugin-pwa`) pour générer automatiquement le Service Worker.
- Définir la stratégie de cache : cache-first pour les assets statiques (JavaScript, CSS, images), network-first pour les données API.
- Ajouter un fichier `manifest.json` pour permettre l'installation de l'application sur l'écran d'accueil.
- Tester le fonctionnement hors-ligne : l'application doit se lancer sans Internet après la première visite.

### Phase 2 : File de Synchronisation des Ventes (Semaines 2-3)

- Étendre l'utilisation de `localforage` pour stocker les ventes créées hors-ligne.
- Implémenter une file d'attente de synchronisation avec gestion des priorités et des tentatives.
- Ajouter un compteur visible de ventes en attente de synchronisation.
- Implémenter l'indicateur de statut réseau (en ligne / hors-ligne) dans l'interface.
- Stocker localement les mouvements de stock pour synchronisation ultérieure.

### Phase 3 : Synchronisation Automatique (Semaines 3-4)

- Implémenter la synchronisation via la Background Sync API (avec un mécanisme de repli basé sur un intervalle régulier pour les navigateurs qui ne supportent pas cette API).
- Gérer les conflits : horodatage des transactions, résolution côté serveur, alertes pour les cas ambigus.
- Ajouter des endpoints API dédiés à la synchronisation côté Symfony (`/api/sync/sales`, `/api/sync/stock`, `/api/sync/status`).
- Tester avec des scénarios réalistes : coupure pendant une vente, reconnexion partielle, ventes simultanées depuis deux appareils.

### Phase 4 : Accès à Distance et Sécurité (Semaine 5)

- Configurer un nom de domaine et un certificat SSL (Let's Encrypt).
- Sécuriser l'API avec des jetons JWT et des permissions par rôle.
- Configurer le VPS pour un accès fiable et sécurisé.
- Tester l'accès à distance depuis un téléphone mobile (réseau 4G mauritanien).

### Phase 5 : Tests et Déploiement (Semaine 6)

- Tests complets en conditions réelles : simuler des coupures Internet, des ventes en rafale, des reconnexions.
- Tests multi-appareils : vérifier le fonctionnement sur Chrome (Android), Safari (iOS), Firefox.
- Déploiement progressif : commencer avec un seul client pilote avant de généraliser.
- Documentation utilisateur en français.

---

## 8. Support Multi-Clients

L'architecture PWA avec serveur central se prête naturellement au multi-clients (multi-tenancy) :

- Chaque client (boutique, restaurant, café) dispose de son propre espace isolé sur le serveur central.
- Les données sont séparées par un identifiant client dans la base de données.
- Le superviseur dispose d'un tableau de bord global permettant de voir tous les clients.
- Chaque client accède à son POS via une URL dédiée (par exemple : `boutique1.pointe-de-vente.mr`, `cafe2.pointe-de-vente.mr`) ou via un identifiant de connexion.

---

## 9. Risques et Mesures d'Atténuation

| Risque | Probabilité | Impact | Mesure d'atténuation |
|---|---|---|---|
| Navigateur ancien incompatible | Faible | Moyen | Tester et fournir une liste de navigateurs compatibles. Chrome est disponible sur tous les appareils. |
| Perte de données IndexedDB (réinitialisation du navigateur) | Faible | Élevé | Synchronisation fréquente quand Internet est disponible. Avertissement à l'utilisateur si des données non synchronisées existent. |
| Conflit de stock (ventes simultanées hors-ligne) | Moyen | Moyen | Résolution automatique par horodatage + alertes pour vérification manuelle. |
| Dépassement de la limite de stockage | Très faible | Faible | Surveillance de l'espace utilisé. Nettoyage automatique des anciennes données synchronisées. |
| Panne du serveur central | Faible | Moyen | Sauvegardes automatiques quotidiennes. Le POS continue de fonctionner hors-ligne même si le serveur est en panne. |

---

## 10. Prochaines Étapes

Si cette étude est approuvée, voici les actions à entreprendre dans l'ordre :

1. **Validation de l'approche** — Confirmer le choix de l'Option A (PWA) avec le superviseur.

2. **Mise en place du VPS** — Commander un serveur cloud (recommandation : Hetzner ou OVH, environ 3 000 MRU/mois) et y configurer l'environnement Docker existant.

3. **Configuration du domaine** — Enregistrer un nom de domaine (par exemple `pointe-de-vente.mr`) et configurer le certificat SSL.

4. **Développement Phase 1** — Commencer par le Service Worker et le cache de l'application (1 semaine).

5. **Test pilote** — Après les phases 1 et 2 (environ 3 semaines), déployer chez un client pilote pour validation en conditions réelles.

6. **Itération** — Ajuster le système en fonction des retours du client pilote.

7. **Déploiement général** — Après validation, étendre à l'ensemble des clients.

**Calendrier prévisionnel :**

| Étape | Durée | Date estimée |
|---|---|---|
| Validation et décision | 1 semaine | Début mars 2026 |
| Mise en place VPS + domaine | 3-5 jours | Mi-mars 2026 |
| Développement (Phases 1-4) | 5 semaines | Mi-mars à mi-avril 2026 |
| Test pilote | 1-2 semaines | Fin avril 2026 |
| Ajustements | 1 semaine | Début mai 2026 |
| Déploiement général | Progressif | Mai 2026 |

---

## 11. Conclusion

Le mode hors-ligne avec accès à distance est non seulement réalisable, mais une grande partie de l'infrastructure est déjà en place. L'approche PWA (Option A) est la solution la plus adaptée au contexte mauritanien : elle ne nécessite aucune installation locale, fonctionne sur tout appareil disposant d'un navigateur moderne, et son coût de déploiement par client est quasi nul.

Le développement estimé à 4-6 semaines permettra d'offrir une expérience fiable aux vendeurs, même en cas de coupure Internet prolongée, tout en donnant au superviseur un accès complet aux données depuis n'importe où dans le monde.

---

*Document préparé le 23 février 2026 — Pointe de Vente, Mauritanie*
