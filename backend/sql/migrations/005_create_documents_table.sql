-- ============================================================
--  J-RSD OS — Migration SQL
--  Version    : 005
--  Date       : 2026-05-29
--  Description: Recréation de la table `documents` avec structure flexible
--
--  Pour exécuter :
--    node src/scripts/initDb.js
--  ou directement dans MySQL :
--    SOURCE backend/sql/migrations/005_create_documents_table.sql;
-- ============================================================

USE jrsd_os;

-- Suppression de l'ancienne table documents (si elle existe)
DROP TABLE IF EXISTS documents;

-- ──────────────────────────────────────────────────────────────
--  Table : documents
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  -- Clé primaire
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,

  -- Informations du fichier
  name        VARCHAR(255)   NOT NULL                    COMMENT 'Nom d\'affichage du fichier',
  file_path   VARCHAR(500)   NOT NULL                    COMMENT 'Chemin du fichier sur le serveur',
  file_type   VARCHAR(50)    NOT NULL                    COMMENT 'Extension ou type MIME (ex: pdf, xlsx, png, docx)',

  -- Propriétaire
  uploaded_by INT UNSIGNED   NOT NULL                    COMMENT 'FK vers users(id) — celui qui a téléversé',

  -- Visibilité ciblée
  target_type ENUM('all', 'team', 'project') NOT NULL DEFAULT 'all'
              COMMENT 'Niveau de visibilité : all (tout le monde), team (équipe), project (projet)',
  target_id   INT UNSIGNED   DEFAULT NULL                COMMENT 'ID de l\'équipe ou du projet (NULL si target_type = all)',

  -- Horodatage
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Contraintes
  PRIMARY KEY (id),
  INDEX idx_documents_target (target_type, target_id),
  INDEX idx_documents_uploader (uploaded_by),

  CONSTRAINT fk_documents_uploader
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Documents et fichiers partagés avec visibilité flexible';

-- Enregistrement de la migration
INSERT IGNORE INTO schema_migrations (version) VALUES ('005');

-- ──────────────────────────────────────────────────────────────
--  ROLLBACK (commenté — décommentez pour annuler la migration)
-- ──────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS documents;
-- DELETE FROM schema_migrations WHERE version = '005';
