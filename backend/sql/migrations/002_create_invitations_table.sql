-- ============================================================
--  J-RSD OS — Migration SQL
--  Version    : 002
--  Date       : 2026-05-25
--  Description: Création de la table `workspace_invitations`
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  code        VARCHAR(50)    NOT NULL UNIQUE COMMENT 'Code secret d\'invitation',
  expires_at  DATETIME       NOT NULL        COMMENT 'Date d\'expiration du code',
  is_used     BOOLEAN        NOT NULL DEFAULT FALSE COMMENT 'Indique si le code a été utilisé',
  
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Codes d\'invitation pour l\'inscription';

-- Enregistrement de la migration
INSERT IGNORE INTO schema_migrations (version) VALUES ('002');
