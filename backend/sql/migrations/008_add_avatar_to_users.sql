-- ============================================================
--  J-RSD OS — Migration SQL
--  Version    : 008
--  Description: Ajout colonne avatar dans la table users
-- ============================================================

USE jrsd_os;

ALTER TABLE users
  ADD COLUMN avatar VARCHAR(255) DEFAULT NULL COMMENT 'Chemin relatif vers l avatar de l utilisateur';

INSERT IGNORE INTO schema_migrations (version) VALUES ('008');
