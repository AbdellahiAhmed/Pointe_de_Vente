# Guide d'Installation Locale — POS Pointe de Vente

## Prérequis

Installez ces outils avant de commencer :

| Outil | Version | Lien |
|-------|---------|------|
| **Docker Desktop** | 4.x+ | https://www.docker.com/products/docker-desktop |
| **Node.js** | 18+ | https://nodejs.org (choisir LTS) |
| **npm** | 9+ | Inclus avec Node.js |
| **Git** | 2.x+ | https://git-scm.com |

---

## Étape 1 — Cloner le projet

```bash
git clone https://github.com/AbdellahiAhmed/Pointe_de_Vente.git
cd Pointe_de_Vente
```

---

## Étape 2 — Lancer le Backend (Docker)

### 2.1 Démarrer les conteneurs

```bash
cd back
docker compose up -d
```

Cela démarre 3 conteneurs :
- **dev-nginx-polymer** — serveur web sur le port `8000`
- **dev-php-polymer** — PHP-FPM
- **dev-mariadb-polymer** — base de données MariaDB sur le port `3307`

Attendez ~30 secondes que MariaDB soit prête.

### 2.2 Installer les dépendances PHP

```bash
docker exec -it dev-php-polymer bash
cd polymer
composer install
```

### 2.3 Générer les clés JWT

```bash
# Toujours à l'intérieur du conteneur PHP
php bin/console lexik:jwt:generate-keypair
```

Si les clés existent déjà, ajoutez `--overwrite`.

### 2.4 Créer la base de données

```bash
# Toujours à l'intérieur du conteneur PHP
php bin/console doctrine:database:create --if-not-exists
php bin/console doctrine:migrations:migrate --no-interaction
```

### 2.5 (Optionnel) Charger les données de test

```bash
php bin/console doctrine:fixtures:load --no-interaction
```

> Cela crée un utilisateur **admin / admin** avec un magasin "Main" et un terminal "A1".

### 2.6 Sortir du conteneur

```bash
exit
```

---

## Étape 3 — Lancer le Frontend

Ouvrez un **nouveau terminal** :

```bash
cd front
npm install
npm start
```

Le frontend démarre sur **http://localhost:3000**

Les appels API (`/api/...`) sont automatiquement redirigés vers le backend Docker (port 8000).

---

## Étape 4 — Première connexion

### Si vous avez chargé les fixtures (étape 2.5)

Ouvrez **http://localhost:3000** et connectez-vous :

- **Utilisateur** : `admin`
- **Mot de passe** : `admin`

### Si la base est vide (sans fixtures)

L'application affiche un formulaire d'activation. Remplissez :

1. **Code d'activation** : la valeur de `APP_ACTIVATION_CODE` dans `back/.env` (par défaut : `CHANGE_ME`)
2. **Nom du magasin**
3. **Code terminal**
4. **Nom d'utilisateur** et **mot de passe** pour le compte administrateur

---

## Résumé des ports

| Service | URL |
|---------|-----|
| Frontend (POS) | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| Base de données | localhost:3307 (user: `root`, pass: `root`, db: `polymer`) |

---

## Commandes utiles

```bash
# Voir les logs des conteneurs
docker compose -f back/docker-compose.yaml logs -f

# Arrêter les conteneurs
cd back && docker compose down

# Relancer les conteneurs
cd back && docker compose up -d

# Vider le cache Symfony
docker exec dev-php-polymer php /var/www/html/polymer/bin/console cache:clear

# Appliquer de nouvelles migrations
docker exec dev-php-polymer php /var/www/html/polymer/bin/console doctrine:migrations:migrate --no-interaction
```

---

## En cas de problème

| Problème | Solution |
|----------|----------|
| `port 8000 already in use` | Fermez l'application qui utilise le port, ou changez le port dans `back/docker-compose.yaml` |
| `port 3000 already in use` | Modifiez le port dans `front/vite.config.js` (ligne `port: 3000`) |
| `CORS error` dans le navigateur | Vérifiez que le backend tourne sur le port 8000 |
| `npm install` échoue | Supprimez `front/node_modules` et `front/package-lock.json`, puis relancez `npm install` |
| `Connection refused` à la DB | Attendez que MariaDB démarre (~30s), puis relancez la commande |
