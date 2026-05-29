-- ============================================================
--  J-RSD OS — Migration SQL
--  Version    : 001
--  Date       : 2026-05-24
--  Description: Création initiale de la table `users`
--
--  Pour exécuter :
--    node src/scripts/initDb.js
--  ou directement dans MySQL :
--    SOURCE backend/sql/migrations/001_create_users_table.sql;
-- ============================================================

-- Création de la base si absente
CREATE DATABASE IF NOT EXISTS jrsd_os
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jrsd_os;

-- Table de suivi des migrations (bonne pratique)
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(20)  NOT NULL,
  applied_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────────
--  Table : users
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  -- Clé primaire
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,

  -- Identité
  nom_prenom  VARCHAR(150)   NOT NULL                    COMMENT 'Nom complet (prénom + nom)',
  email       VARCHAR(255)   NOT NULL                    COMMENT 'Adresse email — identifiant unique',

  -- Sécurité : bcrypt hash (≈ 60 chars), jamais le mot de passe en clair
  password    VARCHAR(255)   NOT NULL                    COMMENT 'Hash bcrypt du mot de passe',

  -- Métier
  fonction    VARCHAR(150)   DEFAULT NULL                COMMENT 'Titre du poste (ex: Chef de projet)',
  role        ENUM('admin', 'employe') NOT NULL
              DEFAULT 'employe'                          COMMENT 'Rôle applicatif : admin | employe',

  -- Horodatage
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,

  -- Contraintes
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),

  -- Index pour accélerer les recherches par rôle
  INDEX idx_users_role (role)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Utilisateurs de J-RSD OS';

-- Enregistrement de la migration
INSERT IGNORE INTO schema_migrations (version) VALUES ('001');

-- ──────────────────────────────────────────────────────────────
--  ROLLBACK (commenté — décommentez pour annuler la migration)
-- ──────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS users;
-- DELETE FROM schema_migrations WHERE version = '001';
