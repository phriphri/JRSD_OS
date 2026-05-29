# J-RSD OS — Backend API

Serveur Express.js connecté à MySQL pour l'authentification de J-RSD OS.

## Stack

| Couche | Technologie |
|---|---|
| Serveur | Express.js 4 |
| Base de données | MySQL 8 via `mysql2/promise` |
| Hachage mot de passe | `bcryptjs` (12 rounds) |
| Authentification | JWT (`jsonwebtoken`) |
| Validation | `express-validator` |

## Structure des fichiers

```
backend/
├── .env                        ← Variables d'environnement (ne pas committer)
├── .gitignore
├── package.json
├── sql/
│   └── create_users_table.sql  ← Script de création de la table users
└── src/
    ├── server.js               ← Point d'entrée Express
    ├── config/
    │   └── db.js               ← Pool de connexions MySQL
    ├── routes/
    │   └── auth.js             ← Routes /register, /login, /me
    └── scripts/
        └── initDb.js           ← Script d'init de la base
```

## Démarrage rapide

### 1. Configurer les variables d'environnement

Éditez `backend/.env` avec vos identifiants MySQL :

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=jrsd_os
JWT_SECRET=une_longue_chaine_aleatoire_secrete
```

### 2. Créer la base de données

**Option A — Script automatique :**
```bash
cd backend
npm run db:init
```

**Option B — Manuel dans MySQL Workbench ou phpMyAdmin :**
```sql
-- Exécuter le contenu de : backend/sql/create_users_table.sql
```

### 3. Démarrer le serveur

```bash
cd backend

# Développement (avec rechargement automatique)
npm run dev

# Production
npm start
```

Le serveur démarre sur **http://localhost:3001**

## Endpoints API

| Méthode | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/health` | Santé du serveur | ❌ |
| `POST` | `/api/auth/register` | Inscription | ❌ |
| `POST` | `/api/auth/login` | Connexion | ❌ |
| `GET` | `/api/auth/me` | Profil courant | ✅ JWT |

## Exemples de requêtes

### Inscription
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom_prenom": "Alexandre Dupont",
    "email": "alexandre.dupont@company.com",
    "password": "MotDePasse123!",
    "fonction": "Directeur",
    "role": "admin"
  }'
```

### Connexion
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alexandre.dupont@company.com",
    "password": "MotDePasse123!"
  }'
```

### Réponse attendue (login)
```json
{
  "success": true,
  "message": "Connexion réussie.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nom_prenom": "Alexandre Dupont",
    "email": "alexandre.dupont@company.com",
    "fonction": "Directeur",
    "role": "admin"
  }
}
```

## Schéma de la table `users`

```sql
CREATE TABLE users (
  id          INT            NOT NULL AUTO_INCREMENT,
  nom_prenom  VARCHAR(150)   NOT NULL,
  email       VARCHAR(255)   NOT NULL UNIQUE,
  password    VARCHAR(255)   NOT NULL,   -- hash bcrypt
  fonction    VARCHAR(150)   DEFAULT NULL,
  role        ENUM('admin', 'employe') NOT NULL DEFAULT 'employe',
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
```
