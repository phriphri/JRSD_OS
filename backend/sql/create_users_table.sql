-- =============================================================
--  J-RSD OS — Script de création de la base de données
--  Table : users
--  Moteur : MySQL 8+
-- =============================================================

-- Créer la base si elle n'existe pas encore
CREATE DATABASE IF NOT EXISTS jrsd_os
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jrsd_os;

-- -------------------------------------------------------------
--  Table : users
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT            NOT NULL AUTO_INCREMENT,
  nom_prenom  VARCHAR(150)   NOT NULL,
  email       VARCHAR(255)   NOT NULL,
  password    VARCHAR(255)   NOT NULL,          -- bcrypt hash (60 chars)
  fonction    VARCHAR(150)   DEFAULT NULL,       -- ex. "Chef de projet"
  role        ENUM('admin', 'employe') NOT NULL DEFAULT 'employe',
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
--  Données de seed (optionnel — mots de passe à re-hasher
--  avec bcrypt avant de pousser en prod)
-- -------------------------------------------------------------
-- INSERT INTO users (nom_prenom, email, password, fonction, role) VALUES
--   ('Alexandre Dupont', 'alexandre.dupont@company.com', '$2b$12$HASH', 'Directeur',       'admin'),
--   ('Marie Laurent',    'marie.laurent@company.com',    '$2b$12$HASH', 'Manager Projet',  'employe'),
--   ('Lucas Martin',     'lucas.martin@company.com',     '$2b$12$HASH', 'Développeur',     'employe'),
--   ('Sophie Dubois',    'sophie.dubois@company.com',    '$2b$12$HASH', 'Designer UX',     'employe');
