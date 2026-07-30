-- ============================================================
--  J-RSD OS — Migration SQL
--  Version    : 010
--  Description: Ajout de la colonne statut à la table users
-- ============================================================

-- Ajout de la colonne statut (idempotent)
-- Vérifie d'abord si la colonne existe
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'statut'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE users ADD COLUMN statut ENUM(''actif'', ''suspendu'') NOT NULL DEFAULT ''actif'' COMMENT ''Statut du compte : actif | suspendu''',
  'SELECT ''Column statut already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Enregistrement de la migration
INSERT IGNORE INTO schema_migrations (version) VALUES ('010');
