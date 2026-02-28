# Installation sur Windows (sans Docker)

## Ce qu'il faut installer (une seule fois)

### 1. Laragon (PHP + MySQL + Apache)

1. Aller sur **https://laragon.org/download/**
2. Telecharger **Laragon Full** (~ 180 MB)
3. Installer avec les options par defaut
4. Laragon installe automatiquement : PHP 8.1, MySQL 8, Apache, Node.js, Git, Composer

### 2. Node.js (si pas inclus dans Laragon)

1. Aller sur **https://nodejs.org**
2. Telecharger la version **LTS** (20.x ou 22.x)
3. Installer avec les options par defaut

---

## Installation du projet

### Etape 1 — Telecharger le projet

Ouvrir **Laragon** → cliquer sur **Terminal** (en bas), puis taper :

```
cd C:\laragon\www
git clone https://github.com/AbdellahiAhmed/Pointe_de_Vente.git
cd Pointe_de_Vente
```

### Etape 2 — Demarrer Laragon

Cliquer sur le bouton **Start All** dans Laragon. Cela demarre Apache + MySQL.

### Etape 3 — Creer la base de donnees

1. Dans Laragon, cliquer sur **Database** (icone en bas)
2. HeidiSQL s'ouvre → connexion root (pas de mot de passe)
3. Clic droit → **Creer nouvelle base de donnees** → nom : `polymer`
4. Cliquer OK

### Etape 4 — Configurer le Backend

Dans le terminal Laragon :

```
cd C:\laragon\www\Pointe_de_Vente\back
```

Creer le fichier `.env.local` :

```
copy NUL .env.local
notepad .env.local
```

Coller ce contenu dans le notepad et sauvegarder :

```
DATABASE_URL="mysql://root:@127.0.0.1:3306/polymer?serverVersion=mariadb-10.6.0"
```

> **Note :** Laragon utilise `root` sans mot de passe par defaut. Le port est `3306` (pas 3307 comme Docker).

Puis installer les dependances et creer les tables :

```
composer update --no-interaction
php bin/console lexik:jwt:generate-keypair
php bin/console doctrine:migrations:migrate --no-interaction
```

> **Note :** On utilise `composer update` (pas `install`) car la version de PHP sur votre machine peut differer de celle du developpeur.

### Etape 5 — (Optionnel) Charger les donnees de test

```
php bin/console doctrine:fixtures:load --no-interaction
```

> Cela cree un utilisateur **admin / admin** avec un magasin et un terminal.

### Etape 6 — Configurer Apache dans Laragon

1. Dans Laragon → Menu → **Apache** → **sites-enabled**
2. Creer un fichier `pos.conf` avec ce contenu :

```apache
<VirtualHost *:8000>
    DocumentRoot "C:/laragon/www/Pointe_de_Vente/back/public"
    ServerName localhost

    <Directory "C:/laragon/www/Pointe_de_Vente/back/public">
        AllowOverride All
        Require all granted
        FallbackResource /index.php
    </Directory>
</VirtualHost>
```

3. Dans Laragon → Menu → **Apache** → **httpd.conf** → ajouter cette ligne a la fin :

```
Listen 8000
```

4. Cliquer **Stop** puis **Start All** pour relancer Apache.

**Alternative simple (sans toucher Apache) :**

```
cd C:\laragon\www\Pointe_de_Vente\back
php -S localhost:8000 -t public
```

> Cette commande lance un mini-serveur PHP. Laisser la fenetre ouverte.

### Etape 7 — Lancer le Frontend

Ouvrir un **nouveau terminal** Laragon (ou cmd) :

```
cd C:\laragon\www\Pointe_de_Vente\front
npm install
npm start
```

Le frontend demarre sur **http://localhost:3000**

---

## Utilisation

Ouvrir le navigateur et aller sur :

| Page | URL |
|------|-----|
| **POS (caisse)** | http://localhost:3000 |
| **Admin** | http://localhost:3000 (changer VITE_APP_TYPE=admin dans front/.env) |
| **API Backend** | http://localhost:8000/api |

### Premiere connexion

**Si vous avez charge les fixtures (etape 5) :**
- Utilisateur : `admin`
- Mot de passe : `admin`

**Si la base est vide :**
- L'application affiche un formulaire d'activation
- Code d'activation : `MCSPVD`
- Remplir le nom du magasin, terminal, et creer un compte admin

---

## Demarrage quotidien

Chaque jour, pour utiliser le POS :

1. Ouvrir **Laragon** → cliquer **Start All**
2. Ouvrir un terminal et lancer le backend :
   ```
   cd C:\laragon\www\Pointe_de_Vente\back
   php -S localhost:8000 -t public
   ```
3. Ouvrir un autre terminal et lancer le frontend :
   ```
   cd C:\laragon\www\Pointe_de_Vente\front
   npm start
   ```
4. Ouvrir **http://localhost:3000** dans le navigateur

---

## Script de demarrage rapide

Pour simplifier le demarrage quotidien, creer un fichier `demarrer-pos.bat` sur le Bureau :

```bat
@echo off
echo ===================================
echo   POS Pointe de Vente - Demarrage
echo ===================================
echo.

echo [1/3] Demarrage de Laragon (MySQL)...
start "" "C:\laragon\laragon.exe" --minimized

timeout /t 5 /nobreak >nul

echo [2/3] Demarrage du Backend (API)...
start "POS-Backend" cmd /k "cd /d C:\laragon\www\Pointe_de_Vente\back && php -S localhost:8000 -t public"

timeout /t 3 /nobreak >nul

echo [3/3] Demarrage du Frontend (Interface)...
start "POS-Frontend" cmd /k "cd /d C:\laragon\www\Pointe_de_Vente\front && npm start"

timeout /t 10 /nobreak >nul

echo.
echo Ouverture du navigateur...
start http://localhost:3000

echo.
echo ===================================
echo   POS demarre avec succes !
echo   Ne fermez pas les fenetres noires.
echo ===================================
pause
```

> Double-cliquer ce fichier pour tout lancer automatiquement.

---

## Mise a jour du projet

Quand une nouvelle version est disponible :

```
cd C:\laragon\www\Pointe_de_Vente
git pull
cd back
composer install
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console cache:clear
cd ..\front
npm install
npm run build
```

---

## En cas de probleme

| Probleme | Solution |
|----------|----------|
| `port 8000 already in use` | Fermer l'autre application sur le port 8000, ou utiliser `php -S localhost:8080 -t public` |
| `port 3000 already in use` | Fermer l'autre application, ou taper `npx vite --port 3001` |
| MySQL ne demarre pas | Verifier dans Laragon que MySQL est bien demarre (point vert) |
| `SQLSTATE connection refused` | Verifier que `.env.local` contient la bonne URL de base de donnees |
| Page blanche sur localhost:3000 | Verifier que le backend tourne sur le port 8000 |
| `npm` non reconnu | Installer Node.js depuis https://nodejs.org |
| `composer` non reconnu | Installer Composer depuis https://getcomposer.org |
