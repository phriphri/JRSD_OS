-- ============================================================
--  J-RSD OS — Migration SQL
--  Version    : 007
--  Description: Ajout colonne cv_url dans la table users
-- ============================================================

USE jrsd_os;

ALTER TABLE users
  ADD COLUMN cv_url VARCHAR(500) DEFAULT NULL
    COMMENT 'Chemin relatif vers le CV (PDF ou PNG) de l''utilisateur';

INSERT IGNORE INTO schema_migrations (version) VALUES ('007');
