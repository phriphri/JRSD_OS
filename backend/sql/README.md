# 🗄️ Base de données — J-RSD OS

Documentation complète de la couche base de données du projet J-RSD OS.

---

## 📋 Sommaire

1. [Prérequis](#prérequis)
2. [Exécuter depuis le terminal VS Code](#exécuter-depuis-le-terminal-vs-code)
3. [Configuration (.env)](#configuration-env)
4. [Démarrer MySQL (WAMP64)](#démarrer-mysql-wamp64)
5. [Initialiser la base de données](#initialiser-la-base-de-données)
6. [Schéma de la table `users`](#schéma-de-la-table-users)
7. [Système de migrations](#système-de-migrations)
8. [Connexion dans le code (pool MySQL)](#connexion-dans-le-code-pool-mysql)
8. [Sécurité](#sécurité)
9. [Commandes utiles (MySQL CLI)](#commandes-utiles-mysql-cli)
10. [Dépannage](#dépannage)

---

## Exécuter depuis le terminal VS Code

> Suivez ces étapes dans l'ordre à chaque démarrage du projet.

### Étape 1 — Ouvrir un terminal dans VS Code

Dans VS Code : **`Ctrl + Shift + ` `** pour ouvrir le terminal intégré.  
Cliquez sur **`+`** pour ouvrir un **nouveau terminal** si nécessaire.

---

### Étape 2 — Initialiser la base de données *(une seule fois)*

Cette commande crée la base `jrsd_os` et la table `users` en appliquant toutes les migrations SQL :

```powershell
cd C:\Users\HP\Documents\versions\jrsd\backend
npm run db:init
```

**Sortie attendue :**
```
📡  Connexion MySQL établie.

▶   Migration 001 — 001_create_users_table.sql
    ✅  Migration 001 appliquée avec succès.

🎉  Toutes les migrations ont été exécutées.
```

> ℹ️ Si la table existe déjà (relancement), le script l'indique sans erreur et continue.

---

### Étape 3 — Démarrer le serveur backend

Dans le **même terminal** (ou un nouveau) :

```powershell
npm run dev
```

**Sortie attendue :**
```
✅  MySQL connecté → localhost:3306 / base : "jrsd_os"

🚀  Serveur J-RSD OS → http://localhost:3001
    Mode        : development
    Rate limit  : 10 req/15min sur /auth/login & /register
```

---

### Étape 4 — Démarrer le frontend *(terminal séparé)*

Ouvrez un **second terminal** (`+`) et lancez Vite depuis la racine du projet :

```powershell
cd C:\Users\HP\Documents\versions\jrsd
npm run dev
```

Le frontend sera disponible sur **`http://localhost:5173`**

> ⚠️ **Important** : Les deux commandes `npm run dev` sont différentes :
> | Terminal | Répertoire | Lance | URL |
> |---|---|---|---|
> | Terminal 1 | `backend/` | Express + nodemon | `http://localhost:3001` |
> | Terminal 2 | racine du projet | Vite (React) | `http://localhost:5173` |

---

### Étape 5 — (Optionnel) Accéder à MySQL via le CLI

Pour inspecter la base directement, ouvrez un troisième terminal :

```powershell
C:\wamp64\bin\mysql\mysql8.3.0\bin\mysql.exe -u root
```

Puis dans le client MySQL :
```sql
USE jrsd_os;
SHOW TABLES;
SELECT id, nom_prenom, email, role, created_at FROM users;
```

---

## Prérequis

| Logiciel | Version | Rôle |
|---|---|---|
| **WAMP64** | ≥ 3.x | Serveur MySQL local sur Windows |
| **MySQL** | 8.3.0 | Base de données relationnelle |
| **Node.js** | ≥ 18 | Runtime du backend |
| **mysql2** | ≥ 3.x | Driver MySQL pour Node.js |

---

## Configuration (.env)

Le fichier `backend/.env` contient toutes les variables de connexion.  
⚠️ **Ce fichier ne doit jamais être commité dans Git.**

```env
# Base de données MySQL (WAMP64 — MySQL 8.3.0)
DB_HOST=localhost       # Adresse du serveur MySQL
DB_PORT=3306            # Port par défaut de MySQL
DB_USER=root            # Utilisateur MySQL
DB_PASSWORD=            # Mot de passe (vide par défaut sous WAMP)
DB_NAME=jrsd_os         # Nom de la base de données
```

> 💡 **Mot de passe WAMP** : par défaut, l'utilisateur `root` de WAMP n'a pas de mot de passe.  
> Si vous avez défini un mot de passe, renseignez-le dans `DB_PASSWORD`.

---

## Démarrer MySQL (WAMP64)

MySQL est géré comme un **service Windows** nommé `wampmysqld64`.

### Option 1 — Via l'interface WAMP (recommandé)
Lancez `C:\wamp64\wampmanager.exe` et attendez que l'icône dans la barre des tâches soit **verte** 🟢.

### Option 2 — Via PowerShell (administrateur)

```powershell
# Démarrer le service
Start-Service wampmysqld64

# Vérifier le statut
Get-Service wampmysqld64

# Arrêter le service
Stop-Service wampmysqld64
```

### Vérifier que MySQL écoute sur le port 3306

```powershell
netstat -ano | findstr ":3306"
# Résultat attendu :
# TCP    0.0.0.0:3306    0.0.0.0:0    LISTENING    <PID>
```

---

## Initialiser la base de données

Une seule commande crée la base `jrsd_os` et applique toutes les migrations SQL :

```bash
# Depuis le dossier backend/
cd backend
npm run db:init
```

**Ce que fait ce script (`src/scripts/initDb.js`) :**
1. Se connecte à MySQL sans sélectionner de base (pour pouvoir créer `jrsd_os`)
2. Scanne le dossier `sql/migrations/` par ordre alphabétique
3. Exécute chaque fichier `.sql` trouvé
4. Gère l'idempotence : si une table existe déjà, la migration est ignorée sans erreur

**Sortie attendue :**
```
📡  Connexion MySQL établie.

▶   Migration 001 — 001_create_users_table.sql
    ✅  Migration 001 appliquée avec succès.

🎉  Toutes les migrations ont été exécutées.
```

---

## Schéma de la table `users`

```sql
CREATE TABLE IF NOT EXISTS users (
    id         INT           NOT NULL AUTO_INCREMENT,
    nom_prenom VARCHAR(150)  NOT NULL,
    email      VARCHAR(255)  NOT NULL,
    password   VARCHAR(255)  NOT NULL,   -- Hash bcrypt (jamais en clair)
    fonction   VARCHAR(150)  NULL,
    role       ENUM('admin', 'employe') NOT NULL DEFAULT 'employe',
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)     -- Unicité garantie au niveau DB
);
```

### Description des colonnes

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | `INT` | PK, AUTO_INCREMENT | Identifiant unique de l'utilisateur |
| `nom_prenom` | `VARCHAR(150)` | NOT NULL | Nom complet de l'utilisateur |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Adresse email (identifiant de connexion) |
| `password` | `VARCHAR(255)` | NOT NULL | **Hash bcrypt** — jamais le mot de passe en clair |
| `fonction` | `VARCHAR(150)` | NULL | Titre de poste (ex: "Développeur", "RH") |
| `role` | `ENUM` | NOT NULL | `'admin'` ou `'employe'` — contrôle d'accès |
| `created_at` | `TIMESTAMP` | DEFAULT NOW | Date de création du compte |
| `updated_at` | `TIMESTAMP` | ON UPDATE | Mis à jour automatiquement à chaque modification |

---

## Système de migrations

Les migrations sont des fichiers SQL versionnés dans `sql/migrations/`.  
Elles sont exécutées dans l'ordre alphabétique par le script `db:init`.

### Convention de nommage

```
sql/migrations/
├── 001_create_users_table.sql      ← Première migration
├── 002_add_avatar_to_users.sql     ← Deuxième migration (exemple)
└── 003_create_departments_table.sql ← etc.
```

### Ajouter une nouvelle migration

1. Créer un fichier dans `sql/migrations/` avec le prochain numéro :
   ```
   002_nom_descriptif.sql
   ```

2. Écrire le SQL en utilisant `IF NOT EXISTS` ou `IF EXISTS` pour l'idempotence :
   ```sql
   -- Description : Ajout de la colonne avatar
   ALTER TABLE users
   ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) NULL AFTER fonction;
   ```

3. Exécuter la migration :
   ```bash
   npm run db:init
   ```

---

## Connexion dans le code (pool MySQL)

Le pool de connexions est configuré dans `src/config/db.js`.

### Utilisation dans les contrôleurs

```javascript
const { pool } = require('../config/db');

// ✅ Toujours utiliser pool.execute() — requête préparée
const [rows] = await pool.execute(
  'SELECT id, email, role FROM users WHERE email = ? LIMIT 1',
  [email]   // ← Paramètre lié, jamais concaténé dans la chaîne SQL
);

// ❌ Ne JAMAIS faire ça (injection SQL)
const [rows] = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`  // INTERDIT
);
```

### Configuration du pool

| Paramètre | Valeur | Explication |
|---|---|---|
| `connectionLimit` | `10` | Maximum 10 connexions simultanées |
| `waitForConnections` | `true` | Les requêtes attendent si le pool est plein |
| `idleTimeout` | `60000` | Ferme les connexions inactives après 60s |
| `enableKeepAlive` | `true` | Maintient la connexion TCP active |
| `timezone` | `+00:00` | Toutes les dates sont stockées en UTC |

---

## Sécurité

### 1. Injections SQL — `pool.execute()`

Toutes les requêtes utilisent des **requêtes préparées** via `pool.execute()`.  
Les paramètres utilisateur sont envoyés **séparément** de la requête SQL, ce qui rend toute injection impossible.

```javascript
// Le ? est un placeholder — MySQL traite la valeur séparément
pool.execute('SELECT * FROM users WHERE email = ?', [userInput]);
```

### 2. Hachage des mots de passe — `bcrypt`

Les mots de passe ne sont **jamais** stockés en clair.  
`bcrypt` avec un facteur de coût de **10 rounds** est utilisé :

```javascript
// Inscription : hachage avant insertion
const hash = await bcrypt.hash(password, 10);

// Connexion : comparaison sécurisée
const match = await bcrypt.compare(plainPassword, storedHash);
```

Le champ `password` dans MySQL contient uniquement des hashes de la forme :  
`$2b$10$...` (60 caractères — d'où `VARCHAR(255)`)

### 3. Unicité email

L'unicité de l'email est garantie à **deux niveaux** :
- **Application** : vérification avant insertion dans `authController.js`
- **Base de données** : contrainte `UNIQUE KEY uq_users_email (email)`

### 4. Mot de passe jamais exposé

La fonction `sanitizeUser()` du contrôleur supprime systématiquement le champ `password` avant tout retour API.

---

## Commandes utiles (MySQL CLI)

Accéder au client MySQL de WAMP :

```bash
C:\wamp64\bin\mysql\mysql8.3.0\bin\mysql.exe -u root -p
```

### Requêtes fréquentes

```sql
-- Sélectionner la base de données
USE jrsd_os;

-- Voir toutes les tables
SHOW TABLES;

-- Inspecter la structure de la table users
DESCRIBE users;

-- Lister tous les utilisateurs (sans les mots de passe)
SELECT id, nom_prenom, email, fonction, role, created_at FROM users;

-- Compter les utilisateurs par rôle
SELECT role, COUNT(*) as total FROM users GROUP BY role;

-- Supprimer un utilisateur par email (si besoin)
DELETE FROM users WHERE email = 'email@example.com';

-- Réinitialiser toute la table (DANGER — perd toutes les données)
TRUNCATE TABLE users;
```

---

## Dépannage

### ❌ `ECONNREFUSED` — Connexion refusée

**Cause** : MySQL n'est pas démarré.

```powershell
# Démarrer le service MySQL (PowerShell admin)
Start-Service wampmysqld64

# Vérifier
netstat -ano | findstr ":3306"
```

### ❌ `ER_ACCESS_DENIED_ERROR` — Accès refusé

**Cause** : Identifiants incorrects dans `.env`.

- Vérifiez `DB_USER` et `DB_PASSWORD` dans `backend/.env`
- Sous WAMP, `root` n'a pas de mot de passe par défaut → `DB_PASSWORD=`

### ❌ `ENOENT: no such file or directory, scandir '...sql/migrations'`

**Cause** : Le dossier `sql/migrations/` n'existe pas ou le chemin est incorrect.

```bash
# Vérifier que le dossier existe
ls backend/sql/migrations/
```

### ❌ `ER_TABLE_EXISTS_ERROR`

Ce n'est **pas une vraie erreur** — le script `db:init` gère ce cas et indique simplement que la migration a déjà été appliquée.

### ❌ Message d'erreur vide dans la console

Ajoutez `console.error(err)` (l'objet complet) pour voir le code d'erreur MySQL :  
`ECONNREFUSED`, `ER_ACCESS_DENIED_ERROR`, `ETIMEDOUT`, etc.

---

*Dernière mise à jour : Mai 2026 — J-RSD OS Backend v1.0.0*
